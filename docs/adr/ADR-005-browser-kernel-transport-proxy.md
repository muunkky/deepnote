# ADR-005: Proxy the browser↔kernel execution stream through the Node `serve` server (HTTP + WebSocket), not a direct browser→kernel connection

> **Status**: Accepted | **Date**: 2026-06-11 | **Deciders**: CAMERON

## Context

Milestone **m3** (master PRD `docs/prds/PRD-003-local-deepnote-ui.md`) delivers a locally-runnable
Deepnote web UI: a browser SPA that opens a `.deepnote` project, renders it block-by-block, lets the
user edit and run cells against a local kernel, and streams rich outputs (a dataframe table, a plot,
stdout) back into the notebook live. Scenario 2 of the PRD is the load-bearing interaction — "edit a
cell, hit Run, watch output stream in" — and the PRD makes the loop's _felt_ latency a first-class
success criterion: on the **reference workload**, output must appear in-place **< 2 s on a warm
kernel** (PRD Success Criteria, "Live execution loop"; roadmap `m3/s3/live-execution`).

Underneath that interaction sits a question this ADR must answer: **how does the browser actually
talk to the kernel?** The execution capability already exists and runs headless. `ExecutionEngine`
(`packages/runtime-core/src/execution-engine.ts`) drives a project end-to-end and exposes a streaming
event surface — `onBlockStart`, `onBlockDone`, `onOutput`, `onServerStarting`/`onServerReady`
(execution-engine.ts:72–77). It composes `server-starter.ts` (which spawns the
`deepnote-toolkit` Jupyter server and finds free ports) and `KernelClient`
(`packages/runtime-core/src/kernel-client.ts`), which connects to the toolkit's Jupyter WebSocket and
translates Jupyter IOPub messages into `IOutput`s. `run.ts` is the proven composition of all of this
for the _headless_ path. What does not yet exist is the wire between a browser and that engine.

Three genuinely different transport topologies are on the table, and the PRD names all three:

1. **Proxy through the Node server.** The browser talks _only_ to the Node `serve` server over
   HTTP + a WebSocket. The server holds the `ExecutionEngine`, which holds the Jupyter-WS connection
   to the toolkit kernel. The chain is `browser ⇄ Node(ws) ⇄ ExecutionEngine ⇄ Jupyter-WS ⇄ kernel`.
   The browser never sees a Jupyter message; it speaks a small app-level event contract.
2. **Direct browser→kernel.** The browser opens its own WebSocket straight to the toolkit's Jupyter
   server and speaks the Jupyter wire protocol itself, bypassing the Node server for execution.
3. **In-browser WASM kernel.** No local toolkit server at all; a WebAssembly Python kernel
   (Pyodide-class) runs the code inside the page. This is a _different execution backend_, not just a
   different transport — and it is named directly in upstream epic
   [#162](https://github.com/deepnote/deepnote/issues/162) ("the runtime should work in the browser
   via WebAssembly"), which the PRD requires this ADR to engage rather than ignore.

The forces in tension:

- **Latency vs. structure.** The proxy adds **one extra hop** (browser ⇄ Node ⇄ kernel) over the
  hypothetical direct path. The PRD's "Browser↔kernel transport choice is wrong" risk row names the
  failure mode precisely: "Sluggish loop (fails the < 2 s bar) **or** an exposed kernel port." The
  whole point of a "Cloud-like" loop is that it feels instant; if proxying meaningfully slowed the
  loop, that would be a product-visible regression. So the latency cost of the extra hop is the
  question on which the proxy-vs-direct decision turns.
- **Trust boundary.** The PRD's localhost-trust model (NG4; Technical Considerations, "Localhost
  trust boundary") trusts the local user and binds the server to `localhost`. Where the kernel port
  is reachable from — only the Node process, or also the browser — is a security-posture choice, not
  an implementation detail.
- **Where the Jupyter protocol lives.** `KernelClient` already implements the Jupyter wire protocol
  in Node — JSON-WebSocket negotiation, IOPub message handling, `execute_input`/`stream`/
  `execute_result`/`display_data`/`error` → `IOutput` translation, kernel-death detection
  (kernel-client.ts:223–296). A direct connection would re-implement that surface a second time, in
  the browser.
- **#162's WASM direction.** The maintainers may envision an in-browser WASM kernel as _the_ browser
  execution model. The PRD requires this ADR to weigh that and frame the server path as
  **complementary to — not competing with** — an eventual WASM kernel, so the m3 wedge reads as
  additive to #162, not orthogonal-or-redundant.

Because the < 2 s bar is "load-bearing for the P0 transport ADR" and "must be measured against this
fixture early, not asserted" (PRD Success Criteria), a **transport spike** measured the proxy path
empirically before this ADR was written. Its findings (`docs/spikes/nom-005/SPIKE-FINDINGS.md`) are
the evidence this decision rests on, and the numbers are summarized in Rationale below.

This ADR owns **server architecture + the browser↔kernel transport only**. It does **not** decide the
UI framework or bundler (that is **ADR-006**), nor the server/SPA package layout — where the server
package lives and how the SPA stays sliceable (that is **ADR-007**, which places the server in
`packages/runtime-server` and the SPA in a fork-only `apps/*` tree). Those are separate P0 sibling
ADRs; this one references them and does not pre-empt them.

## Decision

We will adopt the **proxy-through-Node-server transport as the default and only** browser↔kernel path
for the m3 local UI. The browser communicates exclusively with the Node `serve` server; the server
owns the `ExecutionEngine` and the kernel connection.

Concretely:

1. **HTTP for request/response; a WebSocket for the execution event stream.** Two protocols, split by
   shape, matching the API sketched in the PRD (Scenario 5) and roadmap `m3/s1/serve-api`:
   - **HTTP** carries the discrete, request/response operations: `GET /api/project` (project metadata
     - notebook/block tree), `POST /api/notebooks/{nb}/blocks/{id}/run` (trigger a run),
       `POST /api/project/save` (write the `.deepnote` file). Synchronous, cacheable, idempotent-where-
       applicable.
   - **A WebSocket** (`WS /api/stream`) carries the asynchronous, ordered execution **event stream**:
     `block-start`, `output`, `block-done` (and kernel-failure events). This is the back-channel over
     which `ExecutionEngine`'s `onBlockStart`/`onOutput`/`onBlockDone` callbacks are forwarded to the
     browser, one app-level message per engine event, in order (roadmap `m3/s1/serve-api/
execute-stream-ws`: "deliver every event over the WebSocket in order, with no dropped or
     reordered events").

2. **The browser speaks a small, backend-agnostic app-level event contract — never the Jupyter wire
   protocol.** The contract is exactly the one prototyped in the spike:
   `run` → `block-start` / `output` / `block-done`. The Node server is the sole speaker of the
   Jupyter protocol (via the existing `KernelClient`); it translates between Jupyter IOPub messages
   and the app-level contract. The browser receives already-formed `IOutput`s and app-level lifecycle
   events. No `@jupyterlab/services`, no Jupyter-WS negotiation, no kernel-death detection logic ships
   to the browser.

3. **The kernel port stays off the browser; the localhost-trust boundary is the Node server.** Only
   the Node `serve` server is reachable from the browser. The toolkit's Jupyter port (allocated by
   `findConsecutiveAvailablePorts`, `server-starter.ts:129`) is connected to **only** by the
   in-process `ExecutionEngine`/`KernelClient` and is never handed to the page. This preserves the
   PRD's NG4 / localhost-bind constraint: a single bound surface (the Node server) is the trust
   boundary, not two.

4. **Reuse `ExecutionEngine` + `server-starter.ts` + `KernelClient` as `run.ts` composes them; do
   not re-implement Jupyter in the browser.** The server wraps the same engine wiring the CLI uses —
   interpreter/kernel resolution, `startServer`, `engine.start()`, `engine.runProject(...)` with the
   streaming callbacks — and forwards each callback over the WebSocket. The browser side is a thin
   consumer of the app-level event stream.

5. **The proxy is the server-side CLI/runtime execution path, complementary to — not competing with
   — an eventual in-browser WASM kernel.** This decision is for the **local-toolkit-kernel** path,
   which is squarely #162's `deepnote/deepnote` "file format, conversion tools, and CLI" ownership and
   a natural extension of `run.ts`. The app-level `run`/`block-start`/`output`/`block-done` contract
   is **backend-agnostic**: a future WASM backend would implement the _same_ client contract (running
   in the page instead of forwarding to a kernel), so the SPA's renderer/execution layer would not
   need reworking to gain a WASM backend. **This decision does not foreclose a WASM path; it defines
   the event contract a WASM backend would also satisfy.**

We **reject a direct browser→kernel connection as the default** (see Rationale and Alternatives), and
we **do not build a WASM backend in m3** (out of scope; it is a different execution backend, not a
faster transport for this one).

## Rationale

The recommendation is decided by the spike's measurements against the one objection that had real
weight: the proxy's "extra hop." Strip that objection away and the proxy's structural advantages
(reuse, trust boundary, protocol locality) stand unopposed. The spike strips it away.

### Key Factors

1. **The proxy's only claimed downside — the extra hop — is empirically negligible. This is the
   decision.** The transport spike (`docs/spikes/nom-005/SPIKE-FINDINGS.md`) measured the _actual_
   proxy path — `browser ⇄ Node(ws) ⇄ ExecutionEngine ⇄ Jupyter-WS ⇄ kernel`, wrapping the repo's
   built `@deepnote/runtime-core` `ExecutionEngine` exactly as `run.ts` does — against the PRD's
   reference workload (a warm kernel running a measured block that emits a stdout line plus a pandas
   `df.head()` HTML table). The headline result: **proxy-through-Node median ≈ 62 ms** end-to-end
   (run sent → `block-done` received), full observed range 50–74 ms — clearing the **2000 ms** bar by
   **roughly 30×**, with ~1.9 s of headroom for real-world variance. Crucially, an in-process,
   **no-WebSocket** baseline (the same block through the engine with the browser⇄Node hop removed)
   measured **≈ 58 ms median** — _statistically indistinguishable_ from the proxy path — and the
   proxy's run→`block-start` slice was **< 2 ms every iteration**. The conclusion is direct: nearly
   all of the ~60 ms is kernel execution plus the Jupyter-WS round-trip, a cost the proxy path and a
   hypothetical direct path **share**; the browser⇄Node hop the proxy adds is sub-millisecond on
   localhost and lost in the noise. The "it adds a hop" objection is retired with data, not asserted
   away.

2. **A direct connection buys < 1 ms and costs a worse security posture plus a duplicated protocol.**
   Because the shared kernel+Jupyter-WS cost dominates, a direct browser→kernel path would shave the
   sub-millisecond hop and nothing more — no meaningful latency win on the reference workload. Against
   that non-benefit it incurs two real costs the proxy avoids: (a) the toolkit's Jupyter port must be
   reachable from the browser, widening the trust surface from one bound process to two and cutting
   against the PRD's localhost-trust boundary (NG4); and (b) the Jupyter wire protocol — JSON-WS
   negotiation, IOPub handling, the IOPub→`IOutput` translation, kernel-death detection — already
   implemented once in `KernelClient` (kernel-client.ts) would be re-implemented a second time in the
   browser. Paying with code and exposure for no speed is a bad trade.

3. **Reuse of `ExecutionEngine` keeps one Jupyter implementation and one failure-surfacing seam.** The
   server forwards `ExecutionEngine`'s existing `onBlockStart`/`onOutput`/`onBlockDone` callbacks
   straight onto the WebSocket; the engine remains the single place the Jupyter protocol is spoken.
   This also gives failure handling one seam: `run.ts`'s typed failure categories
   (`missing-kernel` / `kernel-launch` / `kernel-died` / `in-block`) already flow through the engine
   (`KernelClient` raises typed `KernelDiedError`/`KernelLaunchError`/`KernelNotRegisteredError`,
   kernel-client.ts:143–193, 243–289), so they can be forwarded over the same WebSocket and rendered
   as the PRD's actionable banners, rather than re-derived browser-side from raw Jupyter messages.
   This directly serves the PRD's "Failure-category fidelity" success criterion and roadmap
   `m3/s1/serve-api/execute-stream-ws`.

4. **The proxy choice does not foreclose WASM — it pre-defines the contract WASM would implement.**
   Framing the proxy as the local-toolkit-kernel execution path (the CLI/runtime wedge #162 assigns
   to `deepnote/deepnote`) makes it _additive_ to a future in-browser WASM kernel rather than a
   competitor. Because the SPA consumes a backend-agnostic app-level event contract
   (`run`/`block-start`/`output`/`block-done`), a WASM backend that satisfied the same contract from
   inside the page would not require reworking the renderer/execution UI. So choosing the proxy now is
   not a bet against WASM; it is the choice that keeps the door open to it at zero re-architecture
   cost — which is exactly the complementary-not-competing posture the PRD requires (Background &
   Context, "browser-via-WASM"; Open Questions, "Transport: proxy vs. direct").

We are explicitly trading **a sub-millisecond extra hop** (where direct nominally wins) for **a single
trust boundary, a single Jupyter implementation, and a single failure-surfacing seam** (where the
proxy wins decisively). The spike shows the thing we give up is worth < 1 ms on the reference
workload; the things we keep are worth real code, real security posture, and real maintainability.

## Consequences

### Positive

- **The < 2 s "Cloud-like" bar is met with ~30× margin on the reference workload, measured not
  asserted.** The PRD's load-bearing latency criterion is satisfied with ~1.9 s of headroom on the
  reference workload (stdout line + a 5-row `df.head()` HTML table), robust to machine/scheduler
  variance on the measured workload (a busier laptop, GC pauses, a colder scheduler). The spike
  measured this one fixed workload and scoped large-figure output out explicitly, so the margin claim
  is bounded to it — but the proxy-vs-direct conclusion is not, because large-output transfer cost is
  topology-neutral (both proxy and direct ship the same bytes).
- **Zero Jupyter-protocol logic in the browser.** The browser ships a thin app-level event consumer;
  `KernelClient`'s wire-protocol code is not duplicated. This materially shrinks the SPA's execution-
  wiring surface (PRD Phase P3 / roadmap `m3/s3/live-execution`).
- **One bound trust surface.** Only the Node `serve` server is reachable from the browser; the kernel
  port stays in-process. The localhost-trust boundary (NG4) is a single seam, easier to reason about
  and to harden (localhost-bind, no `0.0.0.0` default).
- **One failure-surfacing seam.** `run.ts`'s typed `failureCategory` discriminants flow through the
  engine and over the same WebSocket — the PRD's failure-category fidelity comes "for free" rather
  than re-derived browser-side.
- **WASM stays open at no cost.** The backend-agnostic event contract means an eventual WASM kernel is
  an additional backend behind the same SPA contract, not a re-architecture — keeping the wedge
  additive to #162.
- **The transport matches the package layout (ADR-007) and the wedge story.** A server that owns the
  engine and exposes HTTP + WS is exactly the `@deepnote/runtime-server` package ADR-007 describes —
  the upstream-contributable wedge, a natural extension of `run.ts`.

### Negative

- **The Node server is now a stateful, long-lived execution broker, not a one-shot.** Unlike
  `deepnote run`, the `serve` server holds a live engine + kernel connection and a client WebSocket
  across the session. It must surface kernel death to the UI (not just the console), clean up on
  Ctrl-C (`engine.stop()`), and manage WS lifecycle — the operability concerns the PRD's
  "Observability for a long-lived local process" already flags. _Acceptable_ because that long-lived
  posture is inherent to _any_ interactive local-UI server (direct and WASM need an equivalent
  session-management story), and the engine already exposes `stop()` for clean shutdown.
- **The proxy fronts a single shared kernel with no native concurrency model — concurrent runs must
  be serialized at the server.** The broker holds exactly one kernel: `KernelClient` owns a single
  `session`/`kernel` (kernel-client.ts:87–88) and `ExecutionEngine.runProject` executes blocks
  sequentially in one async call (execution-engine.ts:249), with no queue, mutex, or in-flight guard
  anywhere in `runtime-core`. An interactive UI, by contrast, is inherently concurrent — a user can
  hit Run on block B while A is mid-run, and reactive re-runs fan a chain of dependent blocks (PRD
  Scenario 3). Issued against this engine as-is, a second run would race the first on the same kernel,
  interleaving IOPub traffic onto one output handler. **This is a direct consequence of the
  proxy-broker decision, not an incidental detail:** by making the server the sole speaker to one
  kernel, this ADR makes the server the place that must own concurrency. Concurrent runs therefore
  have to be **serialized (queued, or rejected while one is in flight) at the server** — and roadmap
  `m3/s1/serve-api/execute-stream-ws`'s "no dropped or reordered events" guarantee depends on exactly
  that serialization. _Acceptable_, and in fact a point **in favor of** the proxy over a direct
  topology: the engine's sequential model is already correct for the serialized case, and the server
  is the **natural** owner of a run queue — there is one connection to one kernel to order against. A
  direct browser→kernel topology would have to coordinate ordering across N independent,
  browser-owned kernel connections, a strictly harder problem. The serialization _policy_ (queue vs.
  reject-while-busy, depth, cancellation) is design-doc detail and is deferred to the s1 design doc;
  the existence of the constraint is named here because the proxy choice creates it.
- **All execution traffic funnels through one Node process.** Output bytes (including large display
  data) pass through the server rather than going browser↔kernel directly. _Acceptable_ because the
  spike confirms the hop is sub-millisecond for the reference workload, and for large-figure / multi-
  MB output the transfer cost is identical for proxy and direct (both ship the same bytes — the spike
  scopes large-figure latency out explicitly, as does the PRD: "bounded by transfer size, a separate
  concern").
- **A bug in the proxy layer can break execution even when the kernel is healthy.** The extra layer
  is one more place a defect can live (event ordering, back-pressure, WS reconnection). _Acceptable_
  and bounded: the engine's **sequential** event surface is small and already tested, and the
  app-level contract is the thin part — but the new **concurrency/serialization seam** this decision
  introduces (the server-side run queue) is net-new and **not yet tested**, so the broker is a real
  surface the direct path would not have.
- **Buffered output lives in the Node heap, so back-pressure is a memory consideration.** Because the
  broker relays bytes kernel→server→browser, output sits in the Node process between the two hops;
  the engine and kernel client already accumulate a run's outputs in memory (the per-block
  `outputs`/`collectedOutputs` arrays — kernel-client.ts:230, execution-engine.ts:246), and under WS
  back-pressure (a slow browser, or large/rapid outputs the socket can't drain as fast as the kernel
  emits) those bytes accumulate further in the server. _Acceptable_ and bounded by a flow-control /
  high-water-mark policy (pause relaying, or shed/coalesce) — design-doc detail deferred to s1 — but
  it is a real memory dimension the direct path would not put on the server.
- **A kernel that dies mid-run must be surfaced as a terminal failure event, or the WS consumer
  hangs.** `KernelClient` raises a typed `KernelDiedError` when the kernel goes `dead` during an
  in-flight execute (kernel-client.ts:243–249); because the browser sees only the app-level stream,
  the server must translate that into an explicit terminal failure event on the WebSocket (the
  `kernel-died` discriminant) so the SPA stops waiting and renders the actionable banner, rather than
  leaving the run visually pending forever. This is the long-lived-broker analogue of `run.ts`'s
  console surfacing, and it is required by the same failure-category-fidelity criterion.

### Neutral

- **The app-level event contract becomes a first-class API surface.** `run`/`block-start`/`output`/
  `block-done` is now a contract the SPA depends on (and, per ADR-007, the type surface
  `@deepnote/runtime-server` exports). This is neither good nor bad on its own — it is the API the
  wedge ships — but it is a surface that must be versioned deliberately.
- **WASM remains a deliberately deferred, open option.** Choosing the proxy neither builds nor
  precludes WASM; the decision simply records that the WASM backend is out of m3 scope and would reuse
  this contract if pursued.

## Alternatives Considered

### Alternative 1: Direct browser→kernel connection

**Description**: The browser opens its own WebSocket directly to the `deepnote-toolkit` Jupyter
server and speaks the Jupyter wire protocol itself (a browser port of `KernelClient`'s logic),
bypassing the Node server for the execution stream. The Node server might still serve `GET
/api/project` and `POST /api/project/save`, but execution would not flow through it.

**Pros**:

- Removes the one extra hop the proxy adds — the lowest-latency topology in principle.
- The Node server does the least work for execution; it is not an execution broker.
- `KernelClient.connect` already accepts an arbitrary server URL (kernel-client.ts:110), so the
  toolkit endpoint is, in principle, addressable from elsewhere.

**Cons**:

- **The latency advantage is < 1 ms and irrelevant on the reference workload.** The spike's in-
  process (no-WS) baseline (≈ 58 ms) and the proxy path (≈ 62 ms) are statistically
  indistinguishable; the browser⇄Node hop is sub-millisecond. Direct buys essentially nothing in
  speed because the cost is dominated by kernel execution + the Jupyter-WS round-trip, which direct
  also pays.
- **It exposes the kernel port to the browser**, widening the trust surface from one bound process to
  two and cutting against the PRD's localhost-trust boundary (NG4).
- **It duplicates the Jupyter wire protocol in the browser** — JSON-WS negotiation, IOPub handling,
  IOPub→`IOutput` translation, kernel-death detection — code that already exists once in
  `KernelClient`. That is net-new, hard-to-estimate work and a second place for protocol bugs to live.
- **Failure categories would be re-derived browser-side** from raw Jupyter messages rather than
  forwarded from the engine's typed errors, threatening the PRD's failure-category-fidelity criterion.

**Why not chosen**: The spike retires its only advantage. Direct trades a sub-millisecond,
workload-irrelevant latency saving for a worse security posture and a duplicated protocol
implementation — more code and more exposure for no measurable speed. The PRD's own risk row frames
the danger as "sluggish loop **or** an exposed kernel port"; the proxy avoids the second without
incurring the first.

### Alternative 2: In-browser WASM kernel (Pyodide-class), no local toolkit server

**Description**: Run a WebAssembly Python kernel (Pyodide or similar) inside the browser page;
execution happens in the tab, with no local `deepnote-toolkit` server or Jupyter WS at all. This is
the model #162 names ("the runtime should work in the browser via WebAssembly").

**Pros**:

- No network hop at all for execution — code runs in the page.
- No local Python/toolkit install required; lowers the setup bar for a pure-browser demo.
- Aligns with a direction the upstream maintainers have explicitly stated (#162), so it reads as
  on-strategy.

**Cons**:

- **It is a different execution backend, not a transport for _this_ one.** The whole point of the m3
  wedge is to run the project against the **local toolkit kernel** the CLI already drives — that is
  #162's `deepnote/deepnote` CLI/runtime ownership and the natural extension of `run.ts`. A WASM
  kernel does not make the local-kernel path faster; it replaces it.
- **Fidelity and capability gaps.** A WASM Python environment is not the user's local venv — native
  extensions, the project's installed packages, integrations/DB drivers, and file-system access
  differ from `deepnote run`'s execution semantics. The PRD's whole value proposition is "run it the
  way `deepnote run` does, locally," which a WASM kernel does not preserve.
- **Large net-new surface** (WASM toolchain, package loading, sandbox limitations) for a milestone
  whose backend already exists and runs headless.

**Why not chosen**: It does not answer the question this ADR asks. The question is "how does the
browser talk to the **local toolkit kernel**," and a WASM kernel removes that kernel rather than
transporting to it. The right posture — which this ADR adopts — is to make the proxy transport
**complementary to** an eventual WASM backend: the backend-agnostic `run`/`block-start`/`output`/
`block-done` event contract is precisely the contract a future WASM backend would implement behind
the same SPA, so the proxy choice keeps WASM open without building it in m3. WASM is a future backend,
not the m3 transport.

### Alternative 3: Do nothing — keep execution headless (terminal-only), no browser transport

**Description**: Decline to build a browser execution transport at all; the open runtime stays the
headless `deepnote run` (ANSI to the terminal) plus the upload-to-Cloud `deepnote open`. The status
quo.

**Pros**:

- Zero new transport surface, zero new security boundary, zero new long-lived process to operate.
- Nothing to maintain beyond what exists.

**Cons**:

- **It forfeits the entire milestone.** The PRD's whole reason to exist is that "there is no local,
  interactive, browser-based way to read and run a `.deepnote` project against the open runtime." A
  browser transport is the prerequisite for Scenarios 1–4 and for the live execution loop
  (`m3/s3`). Doing nothing means the local-first segment still has only the terminal or the Cloud.

**Why not chosen**: The status quo is exactly the gap PRD-003 sets out to close. "Do nothing" is
included for completeness, but it is not a viable answer to a milestone whose premise is that the
interactive local loop must exist.

## Implementation Notes

These are practical consequences of the decision; they sit ahead of the s1 design doc and do not
constrain its detail.

- **Server composition mirrors `run.ts`.** The `serve` server resolves the interpreter, calls
  `startServer` (`server-starter.ts`), constructs `ExecutionEngine`, and `engine.start()`s — the same
  sequence `run.ts` uses. On a `POST .../run` (or a `run` WS message), it calls
  `engine.runProject(file, { blockId, onBlockStart, onOutput, onBlockDone })` and forwards each
  callback as one app-level WS message. This is the path the spike's `server.mjs` prototyped.
- **Two protocols, one server.** HTTP handlers for `GET /api/project`, `POST .../run`,
  `POST /api/project/save`; a WebSocket endpoint (`WS /api/stream`) for the ordered event stream.
  Event ordering and no-drop delivery are the s1 contract (roadmap `m3/s1/serve-api/
execute-stream-ws`); back-pressure and reconnection policy are design-doc detail.
- **App-level event contract** (the SPA's only execution vocabulary):
  `{type:"run", blockId}` (client→server), then `{type:"block-start", ...}`,
  `{type:"output", blockId, output: IOutput}`, `{type:"block-done", ...}`, plus a failure event
  carrying the `failureCategory` discriminant (server→client). Backend-agnostic by design — a WASM
  backend would emit the same shapes.
- **Kernel port stays in-process.** The toolkit Jupyter port (`findConsecutiveAvailablePorts`) is
  connected to only by the engine; it is never returned to the browser. The Node server binds
  `localhost` (not `0.0.0.0`) by default (PRD localhost-bind constraint).
- **Failure forwarding.** Surface `KernelDiedError` / `KernelLaunchError` / `KernelNotRegisteredError`
  (and in-block errors) as typed failure events over the WS, carrying the
  `missing-kernel`/`kernel-launch`/`kernel-died`/`in-block` category so the SPA renders the PRD's
  actionable banners.
- **Lifecycle / shutdown.** The server is long-lived: `engine.stop()` on Ctrl-C; surface kernel death
  to the UI, not just the console (PRD "Observability for a long-lived local process").
- **Where this lives** is **ADR-007's** call (`packages/runtime-server` + the `serve` command in
  `packages/cli`); **what framework/bundler the SPA uses** is **ADR-006's** call. This ADR assumes
  both and does not restate them.
- **Out of scope here**: large-figure/multi-MB output latency (transfer-size bound, identical for
  proxy and direct — PRD scopes it out); building a WASM backend; the SPA's renderer internals; the
  reactive re-execution loop (PRD P5).

## Validation

This was the right call if, when the live execution loop ships (PRD Phase P3, roadmap
`m3/s3/live-execution`):

- **The < 2 s bar is met against the reference workload, measured early.** Two reviewers running the
  PRD's fixture (warm kernel; stdout line + pandas `df.head()` HTML table) agree the in-place output
  appears **< 2 s**. The spike's ≈ 62 ms median predicts this with ~30× margin; the live UI's measured
  end-to-end latency should land in the same order of magnitude (tens to low-hundreds of ms), not
  seconds. _(Signal to revisit: if the real UI loop is repeatedly above ~500 ms on the reference
  workload on a CI-baseline laptop, the proxy layer — not the kernel — is suspect and the topology
  deserves re-measurement.)_
- **The kernel port is provably off the browser.** No code path returns the toolkit Jupyter port to
  the page; the only browser-reachable bound socket is the Node `serve` server. Assertable by
  inspection and by a network check that the browser makes zero requests to the kernel port.
- **No Jupyter-protocol code ships to the browser.** The SPA's execution wiring consumes the
  app-level event contract only; `@jupyterlab/services` / Jupyter-WS negotiation appears **only** in
  the Node server (i.e. `KernelClient` is not ported to the browser). Greppable.
- **Failure-category fidelity holds end-to-end.** A missing kernel, a launch failure, a mid-run
  kernel death, and an in-block exception each arrive at the SPA as distinguishable failure events
  carrying the correct discriminant (PRD "Failure-category fidelity"; roadmap `execute-stream-ws`).
- **The contract proved backend-agnostic if WASM is ever pursued.** Should a WASM backend be built
  later, it satisfies the same `run`/`block-start`/`output`/`block-done` contract without the SPA's
  renderer/execution layer changing — confirming the complementary-not-competing framing.

**Signals to revisit this decision:**

- The reference-workload loop fails the < 2 s bar in the real UI (proxy overhead turned out to matter
  after all — contradicting the spike).
- A workload class emerges where the proxy hop is _not_ dominated by kernel cost (e.g. extremely
  high-frequency tiny outputs where per-message WS overhead compounds) and direct would measurably
  win. _Rough trigger:_ a single run that emits more than ~hundreds-to-thousands of discrete output
  events and whose end-to-end latency is observed to scale with **event count** rather than with
  compute time — that signature points at per-message broker/WS overhead and warrants re-measuring
  the topology (and likely a batching/coalescing policy).
- Maintainers signal that the in-browser WASM kernel is the _only_ browser execution model they will
  accept upstream — in which case the WASM backend (Alternative 2) is re-opened, reusing this
  contract.

## Related Decisions

- **PRD-003** (`docs/prds/PRD-003-local-deepnote-ui.md`) — the m3 master PRD; this ADR resolves its
  P0 "Server architecture & transport" decision and is gated by roadmap nodes
  `m3/s1/serve-api/execute-stream-ws` and `m3/s3/live-execution`.
- **ADR-006** (`docs/adr/ADR-006-spa-framework-and-bundler.md`) — UI framework + bundler (React +
  Vite in `apps/studio`). Sibling P0 ADR; this ADR's app-level event contract is what that SPA consumes,
  but the framework choice is theirs, not this one's.
- **ADR-007** (`docs/adr/ADR-007-server-spa-package-layout.md`) — server/SPA package layout
  (`packages/runtime-server` + a fork-only `apps/*` SPA). Sibling P0 ADR; the proxy server this ADR
  decides _is_ the `@deepnote/runtime-server` it describes. Orthogonal to layout: whatever the
  transport, the server lives in `packages/runtime-server`.
- **ADR-001 through ADR-004** (`docs/adr/`) — interpreter resolution and kernel/degradation behavior
  the `serve` server reuses unchanged (the same `ExecutionEngine`/`KernelClient` path); the transport
  choice does not alter them.
- **Spike** (`docs/spikes/nom-005/SPIKE-FINDINGS.md`) — the empirical measurement this decision rests
  on (proxy ≈ 62 ms median vs. in-process ≈ 58 ms; browser⇄Node hop < 2 ms; clears < 2 s by ~30×).

## References

- Upstream epic [deepnote/deepnote #162 — "Make Deepnote a first-class notebook runtime"](https://github.com/deepnote/deepnote/issues/162)
  — names both the CLI/runtime ownership the server path occupies and the "browser via WebAssembly"
  direction this ADR frames the proxy as complementary to.
- Jupyter Server WebSocket protocols (the wire protocol `KernelClient` speaks and the browser does
  **not**) — <https://jupyter-server.readthedocs.io/en/latest/developers/websocket-protocols.html>
- `@jupyterlab/services` (the Jupyter client the Node `KernelClient` wraps) —
  <https://jupyterlab.readthedocs.io/en/stable/api/modules/services.html>
- Pyodide (the WASM-Python class of backend, Alternative 2) — <https://pyodide.org/>
- WebSocket protocol (RFC 6455) — <https://datatracker.ietf.org/doc/html/rfc6455>
- Source references: `packages/runtime-core/src/execution-engine.ts` (streaming callbacks),
  `packages/runtime-core/src/server-starter.ts` (`startServer` / `findConsecutiveAvailablePorts`),
  `packages/runtime-core/src/kernel-client.ts` (Jupyter-WS client + typed kernel errors),
  `packages/cli/src/commands/run.ts` (the composition this server mirrors).

---

## Revision History

| Date       | Status   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-06-11 | Proposed | Initial proposal                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-06-12 | Proposed | Adversarial-review pass (verdict: Request Changes — decision APPROVED, consequence/claim fixes only). Named the single-kernel/no-concurrency serialization constraint as a Negative; scoped the latency claim to the reference workload; added buffered-output-memory and kernel-death-mid-run consequences; softened the "already tested" reassurance; gave the high-frequency-output revisit signal a measurable trigger; fixed stale `apps/web` → `apps/studio`. Stage unchanged (NOM). |
