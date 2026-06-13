# ADR-002: Launch non-Python kernels through the existing `deepnote-toolkit` Jupyter server by threading a kernel name into the session-start call

> **Status**: Accepted | **Date**: 2026-06-11 | **Deciders**: CAMERON (approved via adversarial adr-reviewer gate)

## Context

`@deepnote/runtime-core` executes a notebook by spawning a Jupyter server and starting one
kernel session against it. Two facts fix the current behavior to Python:

- **The server.** `ExecutionEngine.start()` → `startServer()` spawns `python -m deepnote_toolkit
server --jupyter-port <p> --ls-port <p+1>` (`packages/runtime-core/src/server-starter.ts:50-58`)
  and health-checks `GET /api` (`:164`). `ServerOptions` carries no kernel/language field.
- **The kernel.** `KernelClient.connect()` talks to that server through `@jupyterlab/services`
  (`ServerConnection`, `KernelManager`, `SessionManager`) and starts the session with
  `kernel: { name: 'python3' }` **hardcoded** — `connect()` takes no kernel parameter
  (`packages/runtime-core/src/kernel-client.ts:55,74-79`).

PRD-002 wants a user to run a single-language **non-Python** notebook end to end through this
same runtime. The open architectural question the PRD flagged as its top Medium risk —
_"changing the kernel name is necessary but maybe not sufficient; the bespoke toolkit server may
not be able to host a foreign kernel"_ — gates the whole effort: if the server cannot host a
non-Python kernel, Phase 1 is "build a new launch path"; if it can, Phase 1 is "stop hardcoding
one string." The two cost wildly different amounts and imply different architectures, so the
decision cannot be made on reasoning alone.

A second force is consistency with the just-accepted **ADR-001**. That ADR established that the
_spec_ of what to run rides on `RuntimeConfig` (`pythonEnv`) and that the **engine owns turning a
spec into a running process** — the resolver selects, the engine spawns. ADR-001 resolves _which
Python runs the toolkit server_; it says nothing about _which kernel that server launches for
execution_. `RuntimeConfig` (`packages/runtime-core/src/types.ts`) today has no `language`/`kernel`
field. Whatever this ADR decides must extend that seam in the same shape, not fork it.

A third force is **failure legibility**. PRD-002 makes a clean "missing kernel" error a
Primary-segment (CI) success criterion. How the server signals an unknown or unlaunchable kernel
determines whether the runtime can produce that error or only relay an opaque one.

To resolve the gating question empirically rather than by inference, a spike was run before this
ADR was written (findings recorded below). This ADR decides **only** the server/launch model —
where the kernel name physically enters the session-start path and how launch failures are made
legible. It explicitly does **not** decide where the kernel name _comes from_ (CLI flag vs.
notebook `language` field vs. env, and their precedence) or what happens to Python-only value-add
blocks / reactivity in a non-Python notebook; those are separate ADRs named by PRD-002.

> ### Spike findings (factual; informs but is separate from the Decision)
>
> _Recorded from an empirical spike on 2026-06-11: isolated venv with
> `deepnote-toolkit[server]` + `bash_kernel` (a pure-pip foreign kernel) + `jinja2`; the running
> server's Jupyter REST API was probed directly — the same surface `@jupyterlab/services` uses —
> alongside an independent `jupyter_client` control run. Probe scripts and recorded outputs are
> committed durably at `docs/spikes/nom-002/` (`probe.py`, `probe_flag.py`, `probe_fail.py`,
> `SPIKE-FINDINGS.md`, `RESULTS.md`); the decisive results are inlined below so this note is
> self-contained._
>
> _**Default-mode result** (`probe.py`): `bash` appears in `GET /api/kernelspecs`, and
> `POST /api/kernels {name:"bash"}` → `HTTP 201` with `exec_state "starting"` (not dead),
> `start_error: null`. **Unknown-kernel result** (`probe_fail.py`):
> `POST /api/kernels {name:"no_such_kernel"}` → `HTTP 500` `{"message":"Unhandled error","reason":null,"traceback":""}`._
>
> 1. **The toolkit server is a standard, token-less Jupyter Server** (`/api`,
>    `/api/kernelspecs`, `/api/kernels`), consistent with `KernelClient` connecting with no token.
> 2. **In default mode — exactly how `server-starter.ts:52` launches it (only
>    `--jupyter-port`/`--ls-port`)** — the server **lists** the foreign `bash` kernelspec and
>    **launches** it via `POST /api/kernels {name:"bash"}` → `HTTP 201`, kernel not dead.
> 3. The `--python-kernel-only` / `--no-python-kernel-only` flag has **no effect on the REST
>    kernel path**: `bash` is listed and launchable (`201`) in **both** modes. That flag governs
>    other (Python-centric) toolkit features, not the Jupyter session surface the runtime uses.
> 4. An independent control (`jupyter_client`) ran `bash_kernel` directly (`echo` →
>    `deepnote_spike_42`), so the server path is not masking a broken kernel.
> 5. An **unknown** kernelspec via `POST /api/kernels {name:"no_such_kernel"}` returns an opaque
>    **`HTTP 500`** ("Unhandled error", empty reason/traceback) — not a clean 404/400.
> 6. `GET /api/kernelspecs` returns `name → {display_name, language}` (e.g.
>    `python3 → Python 3 (ipykernel)/python`, `bash → Bash/bash`).
>
> **Conclusion of the spike:** the existing server already hosts and launches any registered
> kernelspec; the sole code blocker is the hardcoded `'python3'` at `kernel-client.ts:78`.

## Decision

We will **reuse the existing `deepnote-toolkit` Jupyter server unchanged** to host non-Python
kernels, and make the kernel selectable by **threading a kernel-name value through the runtime to
the `@jupyterlab/services` session-start call**. Concretely:

1. **Add a `kernelName` field to `RuntimeConfig`**, defaulting to `'python3'`. This is the
   parallel to ADR-001's `pythonEnv`: `pythonEnv` selects _which Python runs the toolkit server_;
   `kernelName` selects _which kernel that server launches for execution_. The two are orthogonal
   and both ride on `RuntimeConfig`.
2. **`KernelClient.connect()` takes the kernel name** and passes it to
   `SessionManager.startNew({ … kernel: { name } })` in place of the hardcoded `'python3'`
   (`kernel-client.ts:78`). `ExecutionEngine` forwards `config.kernelName`. No other transport
   change: the same `ServerConnection`, the same JSON-WebSocket negotiation, the same idle-wait.
3. **The server launch is not modified.** `startServer` keeps spawning `python -m deepnote_toolkit
server` with the same arguments. We do **not** pass `--no-python-kernel-only` (the spike showed
   it is irrelevant to the REST kernel path), and we do **not** introduce a second server or
   launch path.
4. **Before starting the session, the runtime validates `kernelName` against
   `GET /api/kernelspecs`.** If the name is absent, the runtime raises a typed "kernel not
   registered" error that names the requested kernel and lists the available ones — rather than
   issuing the `POST` and surfacing the server's opaque `HTTP 500`. `GET /api/kernelspecs`
   (`name → {display_name, language}`) is the **canonical source for this ADR's pre-flight
   validation**, and the **natural / recommended source** for the PRD-002 Phase 3 discovery
   surface — which Phase 3's design doc may adopt or override. This is a recommendation for Phase 3,
   not a binding mandate (an independent kernelspec scan remains on the table as a revisit trigger
   below). **The pre-flight may be skipped for the literal `python3` default** so the Python path
   stays round-trip-free; it runs for any explicitly-set `kernelName`. (The design doc may instead
   run it uniformly — but it must pick one; the recommendation here is skip-for-`python3`.)

This decision establishes that **non-Python execution is a kernelspec-selection problem, not a
new-runtime problem.** A non-Python notebook still runs _through_ a `deepnote-toolkit`-bearing
Python server; the toolkit hosts the foreign kernel as a child process exactly as Jupyter hosts
any kernelspec.

What this ADR does **not** decide (separate ADRs, per PRD-002): the **source and precedence** of
`kernelName` (CLI flag / notebook `language` field / env); the **degradation behavior** of
Python-only value-add blocks (SQL/viz/input/agent) and the Python-AST reactivity analyzer when the
selected kernel is non-Python. This ADR owns only the launch model and the failure-legibility
seam.

## Rationale

### Key Factors

1. **The spike converts the gating risk from "unknown" to "retired."** The PRD's top Medium risk
   was that the bespoke server might not host a foreign kernel. Direct measurement shows it does,
   in the exact default configuration the runtime already uses. Choosing a new launch path "to be
   safe" would now be building against a disproven fear — paying real complexity to hedge a risk
   that no longer exists.
2. **It is the minimum change that is also the structurally correct one.** The transport is
   _already_ standard Jupyter; the language coupling is one hardcoded string. Threading a name and
   defaulting it to `'python3'` is the smallest possible diff, and it happens to be the right
   abstraction: kernel choice belongs at the session-start boundary, which is precisely where the
   name is hardcoded today. Small and correct rarely coincide; here they do.
3. **It mirrors ADR-001's seam instead of inventing a new one.** ADR-001 put the run-spec on
   `RuntimeConfig` and kept spawn mechanics inside the engine. `kernelName` on `RuntimeConfig`,
   resolved into a session by the engine's existing client, is the same shape — so the two
   selection axes (interpreter, kernel) compose cleanly and future callers learn one pattern, not
   two. The parallel is exact on the **principle** (ADR-001's "select the spec, don't build the
   spawn") rather than perfectly isomorphic on mechanics: the engine owns selection + pre-flight
   validation + session-start for `kernelName`, but delegates the actual kernel _spawn_ to the
   standard Jupyter server's `/api/kernels` path — whereas `pythonEnv` is engine-resolved **and**
   engine-spawned. Same `RuntimeConfig` seam, slightly different downstream mechanics.
4. **Pre-validation is the only way to meet the CI failure-legibility criterion.** The server
   answers an unknown kernel with an opaque `500` (spike finding 5). Relaying that cannot satisfy
   PRD-002's "actionable missing-kernel message" criterion. Reading `/api/kernelspecs` first — a
   cheap GET against an already-running server — lets the runtime own a clean, typed, listable
   error. The same endpoint doubles as the discovery source, so one seam serves both needs.
5. **It keeps the Python value-add path completely untouched.** With `kernelName` defaulting to
   `'python3'`, every existing notebook takes a **behaviorally identical** path — same kernel, same
   transport, same outputs. Non-Python is purely additive; there is no migration and no regression
   surface for the Python case. (The one mechanical addition is the pre-flight `GET
/api/kernelspecs`; see Decision point 4 — the design doc decides whether that round-trip is
   skipped for the literal `python3` default.)
6. **Production prior art: launch-by-kernel-name already ships in Deepnote Cloud.** Deepnote Cloud
   runs non-Python kernels — Julia, Scala, Racket, Ruby, R — by selecting them via kernel _name_
   (`docs/running-your-own-kernel.md`). This is independent, production evidence that the
   launch-by-name model generalizes well beyond the `bash` spike, across exactly the heavy kernels
   PRD-002 cares about. The distinction the PRD already draws holds: Cloud does this via a Docker
   `DEFAULT_KERNEL_NAME` env var that is **not present in OSS `runtime-core`/CLI** (zero occurrences
   in `packages/`), so it is not an existing seam to reuse — and in that Cloud mode the Python
   value-add features (variable explorer, SQL, input cells, autocomplete) do not work, consistent
   with this ADR's scoping of degradation to a separate ADR.

## Consequences

### Positive

- **Phase 1 of PRD-002 becomes a genuinely minimal slice**: thread one value, validate it, default
  it. The "minimal slice doesn't actually run" risk is retired by measurement, not optimism.
- **The proven Jupyter transport is reused** — the JSON-WebSocket negotiation, idle detection, and
  IOPub framing that already work for Python are reused for any kernel. Per-kernel output /
  display-MIME fidelity surfaces through that same transport but is a _kernel_ property, not a
  launch-model concern; this ADR does not claim the output-decode layer "works unchanged for any
  kernel," only that the path it travels is the same one.
- **One canonical kernel source** (`/api/kernelspecs`) serves validation _and_ discovery, and it
  carries `language`, which a later selection ADR can use to reconcile a notebook's declared
  language with an installed kernel.
- **The Python path is regression-free** by construction (`kernelName` defaults to `'python3'`).

### Negative

- **Hosting a non-Python kernel still requires a Python interpreter with `deepnote-toolkit`
  installed**, because the _server_ is `python -m deepnote_toolkit server`. A user who wants to run
  only Julia still needs the toolkit venv present to host the Julia kernel. _Acceptable_: this is
  the existing, ADR-001-resolved `pythonEnv` requirement; the runtime is a Python application that
  _hosts_ other kernels, and decoupling the server from Python is a far larger change with no
  demand behind it. It is recorded here so the selection/UX ADRs and docs set the right
  expectation (and so issue #154's answer is honest about the prerequisite).
- **Kernelspec discovery is bound to the toolkit venv's Jupyter search path.** The server lists
  the kernels registered where _it_ can see them (in the spike, `bash` registered into the venv via
  `--sys-prefix` was visible). A kernel registered only in some other environment will not appear.
  _Acceptable_: this is standard Jupyter kernelspec resolution, and pre-validation surfaces a clear
  "not registered (here)" error rather than a silent miss.
- **A pre-flight `GET /api/kernelspecs` adds one round-trip** before each run and couples the
  runtime to that endpoint's shape. _Acceptable_: it is negligible against kernel startup, and the
  endpoint is a stable, standard Jupyter Server contract.
- **The opaque server `500` still exists** for any code path that bypasses validation. _Acceptable_:
  validation makes the common case clean; the residual is a defense-in-depth gap, not a primary
  surface.

### Neutral

- Broadens `RuntimeConfig`'s public surface by one optional field (`kernelName`); both in-repo
  callers (CLI, MCP) gain the ability to set it but are unaffected until a selection ADR wires a
  source to it.
- Establishes `/api/kernelspecs` as a runtime dependency surface — previously the runtime only used
  `/api` (health) and the session/kernel endpoints via `@jupyterlab/services`.

## Alternatives Considered

### Alternative 1: Bypass the toolkit server for non-Python — launch foreign kernels via a separate vanilla Jupyter server or `jupyter_client`

**Description**: Keep `deepnote_toolkit server` for Python, but for a non-Python kernel start a
plain Jupyter server (or drive the kernel directly with `jupyter_client`) on a separate path, so
non-Python execution does not depend on the toolkit at all.

**Pros**:

- Decouples non-Python execution from the `deepnote-toolkit` Python dependency — a Julia-only user
  could, in principle, avoid installing the toolkit.
- Isolates any toolkit-specific server behavior from the foreign-kernel path.

**Cons**:

- The spike shows it is **unnecessary**: the toolkit server already hosts foreign kernels in
  default mode, so this builds a second launch path to do what the first already does.
- Two launch/transport paths to maintain, test, and keep at parity — exactly the kind of
  divergence ADR-001 just eliminated for interpreter resolution.
- Loses the shared, already-debugged transport (the Bun-specific JSON-WebSocket workaround at
  `kernel-client.ts:18-41`, idle detection, IOPub handling) or forces its duplication.

**Why not chosen**: This alternative carries two independent rationales; the spike refutes only one.

- _The hosting RISK is dismissed by the spike._ The fear that the toolkit server cannot host a
  foreign kernel — the motivation for building a second path "to be safe" — is disproven by
  measurement (findings 1–3). Building the separate path to hedge that risk would be building
  against a disproven fear.
- _The decoupling BENEFIT is real but only DEFERRED, not refuted._ A Julia-only user skipping the
  Python/toolkit dependency is a genuine value, not a hedge — it is this ADR's own Pro and is named
  on its merits as **PRD-002's selection candidate (b): "launch the kernel directly via
  jupyter-client / `@jupyterlab/services` without the toolkit."** We do not adopt it now because it
  buys a _permanent_ second launch/transport path to maintain at parity (the divergence ADR-001
  just eliminated for interpreter resolution) for which there is currently no demand: issue #154
  asks about kernel _support / feasibility_, not about avoiding a Python install, and the Primary
  PRD segment already tolerates the toolkit-venv prerequisite via ADR-001's `pythonEnv`. We _defer_
  this benefit; we do not refute it. It is cleanly reopenable via the existing revisit trigger
  below if a concrete "non-Python without a toolkit venv" use case appears — and this alternative
  is the path to reopen.

### Alternative 2: Treat the toolkit server's `--python-kernel-only` flag as the control surface

**Description**: Assume the server gates non-Python kernels behind `--python-kernel-only`, and make
the runtime pass `--no-python-kernel-only` to "unlock" foreign kernels.

**Pros**:

- If true, it would be a one-flag server-side switch with no client change.

**Cons**:

- The spike directly falsifies the premise: `bash` is listed and launchable in **both** flag modes
  (finding 3). The flag does not gate the REST kernel path, so passing it would be cargo-cult
  configuration that changes nothing about kernel selection.

**Why not chosen**: It is based on an assumption measurement refuted. Recorded because it is the
obvious first guess and the spike specifically ruled it out, so future readers needn't re-test it.

### Alternative 3: Extend `deepnote-toolkit` upstream to add explicit multi-kernel support

**Description**: Add first-class non-Python kernel handling inside the `deepnote-toolkit` Python
package itself, then consume it from `runtime-core`.

**Pros**:

- Could centralize any future per-language server behavior in one place.

**Cons**:

- `deepnote-toolkit` is a separate, maintainer-owned PyPI package; changing it is out of this
  contribution's reach and would couple a fork PR to an upstream Python release cycle.
- Adds machinery for a capability the server, as shipped, already provides (findings 1–3).

**Why not chosen**: Out of scope for an OSS fork contribution, and redundant with the server's
existing behavior. The runtime-side change stands on its own and needs no toolkit modification.

### Alternative 4: Do nothing (remain Python-only)

**Description**: Keep `kernel: { name: 'python3' }` hardcoded; non-Python notebooks remain
unrunnable.

**Pros**:

- Zero work.

**Cons**:

- This is PRD-002's problem statement and leaves epic #162 / issue #154 unaddressed.

**Why not chosen**: It is the status quo the PRD exists to change.

## Implementation Notes

- **`RuntimeConfig`** (`packages/runtime-core/src/types.ts`): add `kernelName?: string` (default
  `'python3'`). Document it as the kernel-selection sibling of `pythonEnv`.
- **`KernelClient.connect(serverUrl, kernelName = 'python3')`** (`kernel-client.ts:55,74-79`; the
  hardcoded-name site is `:78`): pass `kernel: { name: kernelName }` to `SessionManager.startNew`.
  `ExecutionEngine` forwards `config.kernelName`.
- **Pre-flight validation**: before `startNew`, `GET {serverUrl}/api/kernelspecs`; if `kernelName`
  is not a key, throw a typed error (e.g. `KernelNotRegisteredError`) carrying the requested name
  and the available `name → display_name/language` list. This is the seam the missing-kernel
  failure category (a separate concern's success criterion) hangs off; this ADR only fixes _where_
  the legible error originates.
- **Scope of pre-flight**: it covers the **missing-kernelspec class only**. A registered kernel
  that nonetheless fails to launch (PRD-002 Scenario 6) is surfaced at session start and
  categorized by the separate failure-legibility work this ADR seeds, not by the pre-flight GET. If
  the pre-flight `GET /api/kernelspecs` itself fails, fall back to the existing server-readiness
  handling (the `waitForServer` `/api` poll) rather than treating it as a missing kernel.
- **Kernelspec discovery prerequisite**: a non-Python kernel must be registered where the toolkit
  venv's Jupyter can see it (standard kernelspec search path; in the spike, `--sys-prefix` into the
  venv sufficed). This is a documentation/onboarding note for the #154 answer, not runtime code.
- **Reported "default" ≠ connectable name**: the toolkit reports its _default_ kernel as
  `python3-venv` (a dynamically-registered venv-pointing spec), while the literal `python3`
  kernelspec the runtime sends is always present and resolves. Defaulting `kernelName` to literal
  `python3` and validating by **exact name** is safe; the discovery surface must not assume the
  reported "default" name equals a connectable name.
- **Startup-timeout sizing (design-doc parameter)**: the runtime hardcodes
  `waitForKernelIdle(timeoutMs = 30000)` (`kernel-client.ts:97`) unconditionally after `startNew`.
  The bash spike could not exercise this; heavy kernels (IJulia precompile, Almond/Scala JVM
  warmup) can exceed 30s to first idle. The design doc must size this as a configurable or
  kernel-aware value rather than a fixed 30s, so a correctly-registered heavy kernel is not failed
  by a spurious timeout.
- **Out of scope here / next ADRs**: the _source_ of `kernelName` and its precedence; the
  value-add-block and reactivity degradation behavior. The exact error type name, message wording,
  and test matrix belong to the design doc.

## Validation

- **Reproducible spike (already holds):** committed at `docs/spikes/nom-002/` —
  `probe.py` shows the default-mode toolkit server lists and launches a foreign (`bash`) kernel via
  REST (`201`, not dead); `probe_flag.py` shows the `--python-kernel-only` flag does not gate it;
  `probe_fail.py` shows the unknown-kernel `500` and the `/api/kernelspecs` shape. Recorded outputs
  are in `RESULTS.md`; the findings summary is in `SPIKE-FINDINGS.md`.
- **In-repo, must hold once built:** an integration test runs a non-Python kernel (a pure-pip
  kernel such as `bash_kernel`, to avoid heavy toolchains in CI) end to end through the **existing**
  server with `kernelName` set, and captures output; a unit/integration test asserts that an
  unregistered `kernelName` yields the typed, listing error **before** any `POST /api/kernels` (no
  opaque `500` reaches the caller); a test asserts `kernelName` defaults to `'python3'` and the
  Python path is unchanged.
- **Binary-MIME output (confirms the JSON-only fallback):** the in-repo integration test should
  exercise a kernel that emits a non-`text/plain` MIME bundle (e.g. `image/png`) so the JSON-only
  WebSocket fallback and IOPub decode are confirmed against a binary-output kernel — the echo
  spike only proved a `text/plain` path. (Alternatively, scope the transport-reuse claim explicitly
  to JSON-serializable outputs.)
- **Revisit if:** a concrete need arises to run a non-Python kernel **without** a
  `deepnote-toolkit` Python venv present (then reopen Alternative 1, the separate launch path); or
  the toolkit server's kernelspec discovery proves too narrow for real deployments (then consider
  an independent kernelspec scan as the discovery source).
- **Honest limit:** the spike validates the _server hosting_ claim with `bash`; it does not by
  itself prove Julia/R/JS specifically run (those need their own toolchains). The claim this ADR
  rests on is narrower and fully demonstrated: _the toolkit server launches any registered
  kernelspec_, which is kernel-agnostic by construction.
- **Open launch-model parameter — startup-timeout sizing:** the spike used a fast-start kernel
  (`bash` reaches idle in well under a second), so it could not exercise the runtime's hardcoded
  `waitForKernelIdle(timeoutMs = 30000)` (`kernel-client.ts:97`, called unconditionally after
  `startNew`). Heavy kernels (IJulia first-launch precompile, Almond/Scala JVM warmup) routinely
  exceed 30s to first idle, so a correctly-registered kernel could fail its first run on a spurious
  timeout. Idle-wait / startup-timeout sizing for heavy kernels is an **open launch-model
  parameter the design doc must address** (likely configurable or kernel-aware, not a fixed 30s).
  The _decision_ is unchanged — this is a parameter to tune, not a launch-model to rework.

## Related Decisions

- **ADR-001** (`docs/adr/ADR-001-shared-python-interpreter-resolution.md`) — resolves _which Python
  runs the toolkit server_ (`RuntimeConfig.pythonEnv`); this ADR adds the orthogonal _which kernel
  that server launches_ (`RuntimeConfig.kernelName`) on the same seam, and does not alter ADR-001's
  Python behavior.
- **ADR-003** (`docs/adr/ADR-003-kernel-name-selection.md`) — decides where `kernelName` comes from
  (explicit CLI flag > notebook-declared language > `python3` default, on a channel separate from
  `DEEPNOTE_PYTHON`); consumes this ADR's `kernelName` field.
- **ADR-004** (`docs/adr/ADR-004-non-python-degradation-behavior.md`) — decides value-add-block and
  reactivity behavior (hard-fail / graceful bypass) when `kernelName` resolves to a non-Python kernel.

## References

- `docs/prds/PRD-002-alternative-language-kernels.md` — names this server/launch ADR the Phase 1
  gating decision; the spike retires its top Medium risk.
- GitHub epic #162 (multi-language execution) and issue #154 (Feature Scope: Alternative Language
  Kernels).
- Jupyter kernelspecs and the kernel discovery search path; the Jupyter Server REST API
  (`/api/kernelspecs`, `/api/kernels`) — the contract the spike probed and this decision depends on.
- `jupyter_client` `KernelManager(kernel_name=…)` and `papermill --kernel` — established prior art
  for "select a kernel by its registered name," the same model adopted here.
- Spike artifacts (committed, durable): `docs/spikes/nom-002/` — `probe.py` (server hosts foreign
  kernel), `probe_flag.py` (`--python-kernel-only` is not the gate), `probe_fail.py`
  (unknown-kernel `500`; kernelspec shape), with `SPIKE-FINDINGS.md` and `RESULTS.md` recording the
  findings and outputs.
- `docs/running-your-own-kernel.md` — Deepnote **Cloud** prior art for running non-Python kernels
  (Julia, Scala, Racket, Ruby, R) by kernel-name selection via a Docker `DEFAULT_KERNEL_NAME` env
  var; production evidence that the launch-by-kernel-name model generalizes beyond the bash spike.

---

## Revision History

| Date       | Status   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-06-11 | Proposed | Initial proposal, grounded in the 2026-06-11 server-hosting spike                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-06-11 | Proposed | Revised per adversarial review (adr-reviewer): softened transport-reuse overclaim + added binary-MIME validation (S1); flagged 30s idle-timeout for heavy kernels as design-doc parameter (S2); split Alt 1 rejection into spike-killed hosting-risk vs deferred decoupling-benefit, cross-ref PRD candidate (b) (S3); scoped /api/kernelspecs designation (S4); committed spike artifacts to docs/spikes/nom-002 + inlined decisive outputs (M1); behaviorally-identical wording + pre-flight-for-python3 note (M2); python3-venv default-name note (M3); exact pythonEnv parallel (M4); pre-flight covers missing-kernelspec only (M5); added Deepnote Cloud kernel-name prior art |
| 2026-06-11 | Accepted | Promoted NOM-002 → ADR-002 after the adversarial adr-reviewer gate returned **Approve (promote to ADR-002)**: the load-bearing server-hosting spike independently reproduced, all cited code seams verified, and the dedicated refutation lens failed to break the decision (generalization, ADR-001 consistency, upgrade fragility all came back negative). All S1–S4 + M1–M6 refinements applied prior to promotion.                                                                                                                                                                                                                                                               |
