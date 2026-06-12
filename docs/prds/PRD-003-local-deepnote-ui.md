# PRD-003: A locally-runnable Deepnote web UI for opening, editing, and reactively running `.deepnote` projects

> **Status**: Draft | **Date**: 2026-06-11 | **Author**: muunkky
> **Roadmap**: m3 — Local Deepnote UI (milestone master PRD)

## Problem Statement

A data scientist has a `.deepnote` project on their laptop and wants to _work in it the way
they do in Deepnote Cloud_ — see the notebook rendered block-by-block, edit a cell, hit run,
watch a plot or a dataframe appear, change an input and have the dependent cells re-run — but
**without sending the project or its data to anyone's cloud**. Today the open-source repo gives
them a powerful _headless_ runtime (`deepnote run notebook.deepnote` executes the whole project
against a local kernel and prints outputs to the terminal) and a one-way escape hatch
(`deepnote open` _uploads_ the file to Deepnote Cloud and opens it in a browser). What it does
not give them is the thing the project's own README roadmap promises — "Take the UI you're used
to from Deepnote Cloud and run it locally." There is no local, interactive, browser-based way to
read and run a `.deepnote` project against the open runtime. For anyone who cannot or will not
push their work to a hosted service — regulated industries, air-gapped environments, sensitive
client data, or simply a developer who wants a fast local loop — the interactive Deepnote
experience is currently only available by giving up local-first control.

## Background & Context

**Why now.** Three things have converged. (1) The open runtime is now mature enough to host an
interactive surface: `@deepnote/runtime-core` already runs a project end to end against a local
kernel, streaming per-block lifecycle and output events through callbacks; `@deepnote/reactivity`
already ships the dependency DAG that powers reactive re-execution; `@deepnote/blocks` already
models every block type and round-trips the `.deepnote` file. (2) The README roadmap explicitly
lists "run the Deepnote Cloud UI locally" as a near-term goal, and roadmap node `m2/s1/local-ui`
is flagged `[NEXT — PRD-first]` with "Design not yet started." (3) The headless CLI
(`packages/cli/src/commands/run.ts`) is now a complete, battle-tested reference for _exactly_ the
backend orchestration an interactive UI needs — it resolves the interpreter, starts the toolkit
server, connects the kernel, runs blocks (with Python-only upstream-dependency analysis), and
streams results. The interactive layer — and the _live, reactive re-execution loop_ — is the
missing half.

**The hard constraint that shapes everything (Issue #162).** This roadmap node hangs off
upstream epic [#162 "Make Deepnote a first-class notebook runtime"](https://github.com/deepnote/deepnote/issues/162).
That epic _explicitly partitions the work across repositories_, and its closing "Related Work"
paragraph reads: "The `deepnote/deepnote` repo handles file format, conversion tools, and CLI.
The `deepnote/deepnote-toolkit` repo contains the kernel, execution engine, and runtime. The
**`deepnote/vscode-deepnote` repo handles editor integration and reactive execution UI.**" In
other words, the maintainers have already assigned the interactive notebook UI and the reactive-
execution UI to a _different repo_ (the VS Code extension), and the Deepnote Cloud UI itself is
closed-source. A from-scratch, standalone web-app shell built inside `deepnote/deepnote` would
directly overlap a surface the maintainers are actively building elsewhere — the textbook worst
case for an unsolicited contribution, almost certain to be redone differently (different
framework, packaging, architecture) if offered upstream at all.

**One more #162 signal the backend wedge must engage (browser-via-WASM).** Beyond the repo
partition, #162's body also states the runtime should work "in the browser via WebAssembly" and
assigns `deepnote/deepnote` "file format, conversion tools, and CLI." This cuts two ways for our
wedge. It _reinforces_ that a browser-facing surface over the open runtime is within the
maintainers' stated direction (good). But it also means the maintainers may already envision a
_different_ browser execution model — an in-browser WASM kernel — than this PRD's model (a Node
server proxying a local Python toolkit kernel). The upstream pitch (Phase 7) must therefore
position the HTTP/WS-over-local-toolkit-kernel path as the **server-side CLI/runtime execution
path** (squarely #162's `deepnote/deepnote` CLI ownership), _complementary to_ — not a substitute
for — an eventual in-browser WASM kernel. The P0 transport ADR must weigh this explicitly so the
wedge reads as additive, not orthogonal-or-competing.

**The resolution this PRD commits to (read this before scoping anything).** We do not let that
constraint kill the initiative; we let it _re-shape_ it into two cleanly separable layers with
different homes:

| Layer             | What it is                                                                                             | Home                            | Upstream posture                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend wedge** | `runtime-core` exposed over an HTTP + WebSocket API, plus a `deepnote serve` CLI command that boots it | `deepnote/deepnote` `packages/` | **Upstream-contributable.** A natural extension of `run.ts`, squarely inside #162's stated CLI/runtime ownership. Built **first** so it can be offered early on #162.                             |
| **UI shell**      | The browser SPA (per-block renderers + editors + reactive wiring) that consumes that API               | fork-only                       | **Fork showcase, not an upstream target.** It is the part that overlaps `vscode-deepnote`'s assigned surface, so it stays on the fork as a demonstration of what the open backend makes possible. |

This boundary is the PRD's first-class scope decision. It drives the phasing (backend before
SPA), the success criteria (the backend's success is measured as a _shareable API_, the SPA's as
a _local-first showcase_), and the upstream strategy (offer the wedge; never push the shell).

**Prior art and current state in this repo (verified against the code).**

- **There is zero frontend in the monorepo today.** `find packages -name '*.tsx' -o -name '*.jsx'`
  returns **0** files; no package depends on react, vite, express, fastify, or hono (the handful
  of `react@` entries in `pnpm-lock.yaml` are transitive). Introducing a UI framework _and_ a
  browser bundler to a pnpm monorepo that has **never had one** is itself a load-bearing decision,
  not an incidental detail.
- **There is no `serve`/`ui`/`web` CLI command.** The command set under
  `packages/cli/src/commands/` is `analyze, cat, convert, dag, diff, inspect, install-skills,
integrations, lint, open, run, stats, validate`. The only command that opens a browser is
  `open`, and it does so by **uploading to Deepnote Cloud** (`openDeepnoteFileInCloud`,
  `run.ts:1536`). No local-server path exists.
- **The entire backend the UI needs already exists and runs headless.** `ExecutionEngine`
  (`packages/runtime-core/src/execution-engine.ts`) exposes `runProject`/`runFile` with
  `onBlockStart`, `onBlockDone`, `onOutput`, and `onServerStarting`/`onServerReady` callbacks
  (execution-engine.ts:72–77) — i.e. a complete streaming-execution event stream. `server-starter.ts`
  spawns the toolkit server and finds free ports (`startServer`, `findConsecutiveAvailablePorts`).
  `KernelClient.connect(serverUrl, kernelName)` takes an _arbitrary_ server URL
  (`kernel-client.ts:110`). `@deepnote/reactivity` exports `getDownstreamBlocksForBlocksIds` and
  `buildDagFromBlocks` (`reactivity/src/index.ts:4,6`) — the reactive DAG primitives a UI needs to
  re-run dependents. `@deepnote/blocks` exports `serializeDeepnoteFile` /
  `deserializeDeepnoteFile` (`blocks/src/index.ts:41,45`) and types every block type. `run.ts` is a
  complete, working composition of the _headless execution_ path — interpreter/kernel resolution,
  server start, block execution, output streaming, and **Python-only upstream-dependency analysis
  for validation** (it imports `getBlockDependencies` and `getUpstreamBlocks`, run.ts:8). One thing
  it does **not** do: drive a _live, reactive re-execution loop_. The downstream primitive
  (`getDownstreamBlocksForBlocksIds`) is exported and proven for _analysis_ (it backs the `deepnote
dag` command, `dag.ts:429`), but wiring it into an ordered, live re-run against a persistent
  kernel session is net-new work — correctly scoped as Phase 5 below, not something `run.ts`
  already does.
- **The output renderer is terminal-only.** `packages/cli/src/output-renderer.ts` renders Jupyter
  `IOutput`s to ANSI for the terminal (`process.stdout.write`, chalk, `stripVTControlCharacters`).
  Nothing renders an `IOutput` to the DOM. Per-block-type renderers and editors are net-new.
- **The block model is rich.** `packages/blocks/src/blocks/` defines code, sql, text, markdown,
  input (text/textarea/checkbox/select/slider/date/date-range/file), visualization, button,
  big-number, image, separator, and agent blocks. Every one of these needs a browser renderer
  (and the editable ones, an editor) — none exist today.

## User Segments

### Local-first / privacy-constrained data scientist

- **Who**: A data scientist or analyst whose `.deepnote` projects contain sensitive data
  (regulated industry, client confidential, internal-only) and who is contractually or
  organizationally barred from uploading notebooks to a hosted service.
- **Current pain**: The interactive Deepnote experience requires `deepnote open`, which _uploads
  to Deepnote Cloud_. Their only local option is the headless `deepnote run`, which prints to a
  terminal — no editing, no plots, no reactive loop.
- **Desired outcome**: Open a project in a local browser tab, see it exactly the way they'd see
  it in Cloud, edit and run cells, and have nothing leave `localhost`.
- **Priority**: **Primary.** This is the segment the local-first vision exists for.

### Local-loop developer / notebook author

- **Who**: A developer iterating on a `.deepnote` project (or one converted from `.ipynb`) who
  wants a fast, visual edit-run loop without a cloud round-trip or a heavyweight IDE setup.
- **Current pain**: The terminal loop (`deepnote run`, read ANSI, edit YAML by hand, re-run) is
  slow and lossy for anything visual (plots, dataframes, big-number tiles).
- **Desired outcome**: A local web app where editing a cell, running it, and seeing rich output
  is a sub-second loop, with reactive re-runs of dependents.
- **Priority**: **Primary.**

### CI-adjacent / demo & evaluation user

- **Who**: Someone evaluating the open Deepnote runtime — a maintainer reviewing the #162 wedge,
  a developer deciding whether to adopt the format, or someone producing a runnable demo/artifact
  alongside a CI job.
- **Current pain**: To _show_ what the open runtime can do interactively, there is nothing to
  point at but the terminal or the closed Cloud.
- **Desired outcome (backend)**: A documented HTTP/WS API over `runtime-core` they can script,
  embed, or build their own client against. **Desired outcome (SPA)**: a `deepnote serve` they
  can run to get a live, browseable view of a project.
- **Priority**: **Secondary** for the SPA; **Primary** as the audience for the upstream backend
  wedge.

## Goals & Non-Goals

### Goals

- **G1.** Expose `runtime-core`'s existing headless execution capability over a stable, documented
  **HTTP + WebSocket API** — open a project, list notebooks/blocks, execute block(s), stream
  `onBlockStart`/`onBlockDone`/`onOutput` events, and save — with **no UI required to use it**.
  _(This is the upstream wedge; it is the thing built first and offered on #162.)_
- **G2.** Ship a `deepnote serve` CLI command (canonical) that boots that backend over a local
  `.deepnote` project — a natural sibling of `deepnote run`, in the repo's existing CLI — with
  `deepnote ui` available as a browser-opening alias (final naming is a P6 call; see Open Questions).
- **G3.** Deliver a **local browser SPA** that renders a `.deepnote` project block-by-block in a
  Deepnote-Cloud-_like_ experience, for every block type the format supports.
- **G4.** Let the user **edit blocks and reactively execute them** against local compute, with
  kernel outputs streamed live into the rendered notebook.
- **G5.** **Persist edits back** to the `.deepnote` file safely, with no data loss on save.
- **G6.** Keep everything **local-first**: by default nothing leaves the user's machine; no cloud
  account, no upload, no network dependency for the core loop.

### Non-Goals

- **NG1. Not a pixel-faithful clone of the Deepnote Cloud UI.** The Cloud UI is closed-source and
  actively evolving; we target a _Cloud-like_ experience (recognizable, productive), not a
  re-implementation. Chasing pixel parity is unbounded scope and an explicit non-goal.
- **NG2. Not a competitor to, or replacement for, the `vscode-deepnote` extension's UI.** Per #162,
  the editor-integration and reactive-execution UI is _assigned to that repo_. The standalone SPA
  is a fork-only showcase of the open backend, not a bid to own that surface upstream. Where they
  overlap, the extension is the maintainers' vehicle.
- **NG3. No remote or "bring your own" compute.** Execution runs only against the local
  `runtime-core`/`deepnote-toolkit` kernel on the same machine. Running against remote containers
  or user-provided compute is a _separate_ roadmap initiative (`m2/s4`) and is out of scope here.
- **NG4. No authentication, multi-user, or collaboration.** The server binds to `localhost` for a
  single local user. No login, no sessions, no real-time multi-cursor collaboration, no sharing
  links. (This is a deliberate scope cut, not an oversight — see Technical Considerations for the
  localhost-trust boundary it implies.)
- **NG5. No new notebook format or block-type semantics.** The UI renders and edits the _existing_
  `.deepnote` block model via the _existing_ `serialize/deserializeDeepnoteFile`. It does not
  invent new block types, new metadata, or a new file format.
- **NG6. Not an AI-authoring surface.** Agent blocks render and execute like any other block, but
  building an in-UI AI assistant/chat is out of scope (that lineage is PRD-001 / `m1/s6`).
- **NG7. No publishing, scheduling, dashboards, or app-deployment.** "Run a notebook as a scheduled
  job / publish as an app" are Cloud features explicitly out of scope for the local UI.

## User Experience

### Scenario 1: Open and read a project locally (read-only viewer)

```
$ cd ~/work/quarterly-analysis
$ deepnote serve quarterly.deepnote
Resolving Python interpreter... /Users/sam/.venvs/analysis/bin/python
Starting deepnote-toolkit server... ready
Deepnote UI running at http://localhost:9876  (Ctrl-C to stop)
Opening browser...
```

The browser opens to `http://localhost:9876`. The user sees the project's notebook(s) in a
left-hand notebook list and the active notebook rendered top-to-bottom: markdown blocks as
formatted prose, code blocks with syntax highlighting and their _last-saved outputs_ (a plot, a
dataframe table, stdout), a big-number tile showing its value, an input block showing its current
value, a SQL block showing its query and result table. Nothing has executed yet — this is the
existing persisted state, rendered. The experience is recognizably Deepnote, in a local tab, with
no account and nothing uploaded.

### Scenario 2: Edit a cell and run it, watch output stream in (live execution + editing)

The user clicks into a code block, changes `df.head()` to `df.describe()`, and clicks **Run**
(or `Shift+Enter`). The block shows a running indicator; within a moment the dataframe table
below it is replaced live as the kernel streams output back. The execution count increments. No
page reload, no terminal — the rich output renders in place. Behind the scenes the SPA sent the
edited block over the WebSocket to the local server, which called `ExecutionEngine` and streamed
`onOutput`/`onBlockDone` events back.

### Scenario 3: Change an input, dependents re-run reactively (reactivity)

The notebook has an `input-slider` named `sample_size` feeding a downstream code block that
samples the dataframe, feeding a visualization block. The user drags the slider from `1000` to
`5000`. The re-run fires on **commit/debounce** (slider release or a short settle), **not**
continuously per intermediate pixel value — a long dependent chain re-running on every drag
increment against a Python kernel is a footgun the design must avoid (the exact debounce/commit
policy is a P5 design-doc detail). On commit, because the reactive DAG knows the slider's
downstream blocks (`getDownstreamBlocksForBlocksIds`), the sample block and the chart **re-run
automatically in dependency order**, and the chart updates — mirroring Cloud's reactive mode,
against local compute.

### Scenario 4: Save edits back to the file (persistence)

The user has edited two code blocks and a markdown block. They hit **Save** (or it autosaves on
a debounce). The SPA posts the updated project to the server, which calls `serializeDeepnoteFile`
and writes `quarterly.deepnote` atomically (write-temp-then-rename). The round-trip is _faithful_
(NG5: same format in, same format out) — re-deserializing the saved file yields a project
equal to what was saved, with no content loss. Note the realistic caveat (verified against the
serializer): `serializeDeepnoteFile` re-emits a **canonical** YAML form (stable field order via
the zod schema), so the _first_ save of a not-yet-canonical file may reformat lines the user
didn't touch — but it is idempotent thereafter (a second no-op save produces no further diff).
Faithfulness here means _semantic_ round-trip + serialization idempotence, **not** byte-equality
with the original on-disk bytes (see Success Criteria and Technical Considerations).

### Scenario 5: Use the backend without the UI (the upstream wedge)

A developer scripts against the API directly — no browser involved:

```
# Boot the server headlessly
$ deepnote serve quarterly.deepnote --no-open --port 9876

# Drive it over HTTP / WS from any client
GET  /api/project                      -> project metadata + notebook/block tree
POST /api/notebooks/{nb}/blocks/{id}/run
WS   /api/stream                       -> {type:"block-start",...} {type:"output",...} {type:"block-done",...}
POST /api/project/save                 -> writes .deepnote
```

This is the layer offered upstream on #162: it is `run.ts`'s orchestration, exposed as a service,
with no UI dependency.

### Error & Edge Cases

- **Kernel fails to start / dies mid-run.** The toolkit server or kernel is missing or crashes.
  The server surfaces the _same_ typed failure categories `run.ts` already distinguishes
  (`missing-kernel`, `kernel-launch`, `kernel-died`, `in-block`) over the API; the SPA shows an
  actionable banner ("deepnote-toolkit not installed — `pip install deepnote-toolkit[server]`")
  rather than a blank cell.
- **Block raises an exception.** The error output renders in place (traceback), the block is
  marked failed, downstream reactive runs are halted for that branch — matching headless semantics.
- **Save conflict / external edit.** If the `.deepnote` file changed on disk since it was opened
  (e.g. edited in an editor), the save path must detect the mismatch and warn rather than silently
  clobber. Save is the single most data-loss-prone operation in the product (see Risks).
- **Non-Python kernel.** Reactivity is Python-only today (the AST analyzer); on a non-Python
  kernel the UI must degrade exactly as `run.ts` does — run blocks in order, no dependency
  analysis, with a visible "reactivity disabled" notice (mirroring `REACTIVITY_PYTHON_ONLY_NOTICE`).
- **Unsupported / unknown block type.** Renders a safe fallback (raw content + type label) rather
  than crashing the notebook view.
- **Port in use.** `deepnote serve` falls back to the next free port (the engine already has
  `findConsecutiveAvailablePorts`) and reports the chosen URL.

## Success Criteria

Criteria are split by layer because the two layers have different definitions of "done" and
different audiences.

### Backend wedge (upstream target)

| Criterion                         | Measurement                                                                                                                     | Target                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Headless API parity with `run`    | A documented HTTP/WS client can open a project, run all blocks, and receive the same outputs `deepnote run` produces            | 100% of `run`'s executable block types stream identical `IOutput`s                                                                                                                                                                                                                                                                                                          |
| `deepnote serve` exists and boots | `deepnote serve project.deepnote --no-open` starts a server and serves `/api/project`                                           | Command present; returns project tree over HTTP                                                                                                                                                                                                                                                                                                                             |
| Streaming fidelity                | Every `onBlockStart`/`onBlockDone`/`onOutput` event from `ExecutionEngine` is delivered over the WS in order                    | No dropped/reordered events across a full-project run                                                                                                                                                                                                                                                                                                                       |
| Failure-category fidelity         | API error payloads carry the same `failureCategory` discriminants as `run.ts`                                                   | `missing-kernel`/`kernel-launch`/`kernel-died`/`in-block` all distinguishable                                                                                                                                                                                                                                                                                               |
| Save round-trip fidelity          | Open → save → re-deserialize yields a project deep-equal to the saved one, with no output/content churn beyond the user's edits | Re-deserialized project deep-equals saved project; **and** serialization is idempotent (a second no-op save produces an empty `git diff`). _(Byte-equality with the original file is explicitly NOT the bar — verified: `serializeDeepnoteFile` re-canonicalizes, so a first-pass round-trip on `bash-image.deepnote` grows 1261→1372 bytes yet is idempotent thereafter.)_ |
| Offered upstream                  | The backend + `serve` command are sliced as a clean contrib diff and linked on #162                                             | A `contrib/*` PR exists on the fork, comment posted on #162                                                                                                                                                                                                                                                                                                                 |

### UI shell (fork showcase)

| Criterion                | Measurement                                                         | Target                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Per-block-type rendering | Each block type renders correctly in the browser                    | code, sql, markdown, text, visualization, input-\*, button, big-number, image, separator all render                          |
| Live execution loop      | Edit → run → see rich output, no reload                             | On the **reference workload** (below), output appears in-place < 2 s on a warm kernel                                        |
| Reactive re-run          | Changing an input re-runs its downstream blocks in dependency order | Downstream chart updates without manual per-block runs                                                                       |
| Local-first guarantee    | With the network disabled, the full open→edit→run→save loop works   | Loop completes offline; zero outbound requests beyond localhost                                                              |
| Faithful persistence     | Edit N blocks, save, re-deserialize                                 | Saved project deep-equals the in-UI project; only the user's edits (plus any first-pass canonicalization) appear in the diff |
| Time-to-first-render     | `deepnote serve` to a rendered notebook in the browser              | On the reference workload, < 10 s from command to rendered notebook, with a ready interpreter                                |

**Reference workload (so the latency targets are independently evaluable):** a single notebook of
~20 blocks where the measured code block emits a stdout line plus a pandas `df.head()` HTML table
(_not_ a multi-MB plot — large-figure latency is bounded by transfer size, a separate concern),
warm kernel, measured on a developer laptop at or above the CI runner baseline. Two reviewers
running this fixture should agree on whether the < 2 s / < 10 s bars are met. The < 2 s number is
load-bearing for the P0 transport ADR (proxy vs. direct), so it must be measured against this
fixture early (P3), not asserted.

## Scope & Boundaries

### In Scope

- **An HTTP + WebSocket server package** wrapping `ExecutionEngine` (open/list/run/stream/save),
  reusing `server-starter.ts`, interpreter/kernel resolution, integrations wiring, and reactivity
  exactly as `run.ts` composes them. _(The shareable wedge.)_
- **A `deepnote serve`/`deepnote ui` CLI command** that boots the server over a local project,
  handles port selection, and (optionally) opens the browser.
- **A browser SPA** with **per-block-type renderers** for: code, sql, markdown, text,
  visualization, input-\* (all eight input kinds), button, big-number, image, separator — plus a
  safe fallback for unknown types.
- **Per-block editors** for the editable types (code, sql, markdown/text source, input values),
  and add/delete/reorder of blocks.
- **DOM rendering of Jupyter `IOutput`s** (stream, display_data, execute_result, error) — the
  browser counterpart to the terminal `output-renderer.ts`.
- **Live execution wiring**: run-this-block / run-all, streaming outputs into renderers, execution
  state and counts.
- **Reactive re-execution** driven by `@deepnote/reactivity`'s DAG (`getDownstreamBlocksForBlocksIds`)
  on edit/input change, with the Python-only degradation path.
- **Safe save** back to `.deepnote` via `serializeDeepnoteFile` (atomic write, external-change
  detection).
- **Local SQL/integration support** to the extent `run.ts` already supports it (reusing the
  integrations env wiring).

### Out of Scope

- **Remote / BYO compute** — separate initiative `m2/s4`; revisit only after the local loop ships.
- **Auth / multi-user / collaboration** — localhost single-user only; revisit if/when a hosted or
  shared mode is ever pursued (not on this roadmap).
- **Pixel-faithful Cloud UI** — closed-source and moving target (NG1); a Cloud-_like_ bar is the
  ceiling.
- **Owning the interactive UI upstream** — assigned to `vscode-deepnote` by #162 (NG2); the SPA
  stays a fork showcase.
- **AI-authoring / in-UI assistant** — PRD-001 / `m1/s6`.
- **Publishing, scheduling, dashboards, app deployment** — Cloud product features; revisit never,
  for the local-first surface.
- **New block types / format changes** — render/edit the existing model only (NG5).

### Future Considerations

- The HTTP/WS API should be designed so it _could_ later front a remote kernel (the `m2/s4`
  story) — `KernelClient.connect` already accepts an arbitrary server URL — without re-architecting
  the transport. Design for it; don't build it.
- The per-block renderer/editor components should be factored so they _could_ be reused by a
  different host (e.g. an extension webview) — even though we will not build that integration here.
- The server API is the natural integration point for the AI-authoring work (PRD-001); keep the
  block-mutation surface clean enough that an agent could drive it.

## Delivery Phases

The phasing is **deliberately backend-first**, so the upstream-contributable wedge exists and can
be offered on #162 _before_ any fork-only SPA work begins. Each phase delivers standalone value.

### Phase 0 (P0): Decide the load-bearing architecture (docs only)

**What ships:**

- ADR(s) resolving the three decisions that gate everything downstream:
  1. **Server architecture & transport** — HTTP for request/response + WebSocket for the
     execution event stream; whether the browser talks to the kernel _only_ through the Node
     server (proxying the toolkit's Jupyter WS) or directly. _(Recommended: proxy through the
     Node server — it keeps the kernel on localhost-trust and reuses `ExecutionEngine` rather than
     re-implementing the Jupyter protocol in the browser.)_
  2. **UI framework + bundler** introduced to the monorepo — the first frontend toolchain this
     pnpm workspace has ever had. This is a one-way-ish door; it gets its own ADR.
  3. **The #162 boundary as architecture** — package layout that keeps the shareable server in a
     cleanly sliceable `packages/*` location and the SPA separable for the contrib/process diff split.

**Launch criteria:** ADRs accepted (adversarially reviewed); package boundaries drawn so the
backend can be sliced clean of the SPA.

**Decisions needed:** all three ADRs above.

**Dependencies:** this PRD.

### Phase 1 (P1): Headless server core over `runtime-core` — _the upstream wedge_

**What ships:**

- A new server package exposing: open project, list notebooks/blocks, run block(s), stream
  `onBlockStart`/`onBlockDone`/`onOutput` over WS, and save. **No UI.** Driven entirely by reusing
  `ExecutionEngine` + `server-starter.ts` + interpreter/kernel resolution, the same way `run.ts`
  does. Testable end-to-end via API calls.

**Launch criteria:** API can open a sample project, run it, stream identical outputs to `deepnote
run`, and save with semantic round-trip fidelity (re-deserialized project deep-equals the saved
one; serialization idempotent on a second no-op save). Failure categories preserved. Documented.
_(This round-trip test ships in P1, before any editing UI exists — it is the save-safety gate.)_

**Decisions needed:** P0 ADRs accepted.

**Dependencies:** `runtime-core`, `reactivity`, `blocks` (all present today).

**Value delivered:** a scriptable, embeddable execution service over the open runtime — useful on
its own (CI/demo segment), and the exact thing offered upstream.

### Phase 2 (P2): Read-only viewer SPA

**What ships:**

- A browser SPA that fetches a project from the P1 server and renders every block type with its
  _persisted_ outputs — the per-block renderer layer and the DOM `IOutput` renderer. No execution,
  no editing yet.

**Launch criteria:** every in-scope block type renders correctly from a fixture project; unknown
types fall back safely.

**Decisions needed:** none beyond P0.

**Dependencies:** P1.

**Value delivered:** a user can _see_ their project locally in a Cloud-like view — the first thing
the local-first segment cannot do today.

### Phase 3 (P3): Live execution UI

**What ships:**

- Run-this-block / run-all wired to the P1 WS server; outputs stream live into the P2 renderers;
  execution state and counts; the kernel-failure banners.

**Launch criteria:** Scenario 2 works end-to-end against a real kernel; failure cases surface
correctly.

**Dependencies:** P1, P2.

**Value delivered:** the interactive edit-adjacent run loop — read _and_ run, locally.

### Phase 4 (P4): Editing + persistence

**What ships:**

- Per-block editors (code, sql, markdown/text, input values), add/delete/reorder, and **safe save**
  back to `.deepnote` via `serializeDeepnoteFile` with atomic write + external-change detection.

**Launch criteria:** Scenario 4 — edit N blocks, save, only those blocks differ; no-op save is a
no-op; external-change conflict is detected, not clobbered.

**Dependencies:** P3.

**Value delivered:** a genuine local edit-run-save loop; the project on disk is the source of truth.

### Phase 5 (P5): Reactivity

**What ships:**

- Auto re-run of downstream blocks on edit/input change via `getDownstreamBlocksForBlocksIds`, in
  dependency order, with the Python-only degradation notice.

**Launch criteria:** Scenario 3 — change an input, dependents re-run in order; non-Python kernel
degrades to in-order with a visible notice.

**Dependencies:** P4, `@deepnote/reactivity` (present).

**Value delivered:** Cloud's signature reactive mode, locally.

### Phase 6 (P6): CLI integration + polish

**What ships:**

- The `deepnote serve`/`deepnote ui` command (boot server, port handling, `--open`/`--no-open`),
  SQL/integration parity with `run`, localhost-bind hardening, and user docs.

**Launch criteria:** Scenario 1 from a single command; offline loop works; docs published.

**Dependencies:** P1–P5.

**Value delivered:** one command from a `.deepnote` file to a live local UI.

### Phase 7 (P7): Decompose for upstream

**What ships:**

- The shareable, low-conflict pieces (the P1 server API over `runtime-core`, the `deepnote serve`
  command) sliced as a **clean `contrib/*` diff** off `upstream/main` (code only, no `.gitban`/
  `.claude`), linked on #162 with the approach described; the full SPA monolith kept as the
  fork-only **process diff**.

**Launch criteria:** contrib diff builds clean off `upstream/main`; #162 comment posted offering
the wedge; SPA explicitly _not_ in the upstream diff.

**Dependencies:** P1, P6.

**Value delivered:** the upstream contribution actually lands in front of maintainers — the whole
point of building backend-first.

## Technical Considerations

_(Product constraints with architectural implications — not the architecture itself; that's the
P0 ADRs.)_

- **Framework + bundler introduction is a real cost.** This monorepo has **zero** frontend tooling
  today (Biome/Prettier/vitest/tsc only). Adding a UI framework and a browser bundler touches CI,
  lockfile, lint/format config, and the spell-check dictionary. The product needs the team to
  treat this as a first-class decision (its own ADR), not a `pnpm add` afterthought. Keep the SPA's
  toolchain isolated enough that it does _not_ leak into — or risk — the cleanly sliceable backend
  package.
- **Browser↔kernel transport is a product-visible choice.** Streaming latency is what makes the
  loop feel "Cloud-like." Proxying the kernel's Jupyter WS through the Node server (reusing
  `ExecutionEngine`) keeps the kernel on the localhost-trust boundary and avoids re-implementing
  the Jupyter wire protocol in the browser, at the cost of one hop. A direct browser→toolkit
  connection is lower-latency but exposes the kernel port and duplicates protocol logic. A third
  model is on the table because #162 names it: an in-browser **WASM** kernel (no local toolkit
  server at all) — the ADR must weigh it and frame this PRD's server path as the complementary
  CLI/runtime execution path, not a competitor. The P0 ADR must decide all of this against the
  **reference workload's** "< 2 s to in-place output on a warm kernel" bar (defined in Success
  Criteria) — measured, not asserted.
- **Save is the highest-stakes operation, and "faithful" has a precise definition.** The user's
  `.deepnote` file is their work. Save must be atomic (write-temp-then-rename) and must detect
  external changes rather than clobber. "Faithful" round-trip is **semantic, not byte-level**:
  verified against `serializeDeepnoteFile`, the serializer re-emits a _canonical_ YAML form (stable
  field order via the zod schema, `serialize-deepnote-file.ts`), so it is **not** byte-identical to
  an arbitrary input file — a round-trip on the `bash-image.deepnote` fixture grows 1261→1372 bytes
  — but it **is idempotent** (a second round-trip is byte-stable). The adjudicating test is
  therefore: (a) `deserialize(serialize(project))` deep-equals `project` (no content loss), and
  (b) `serialize(deserialize(s)) === s` for an already-canonical `s` (idempotence). A silent bad
  save is a product failure, not a bug; designing the save UX around (a) re-canonicalizing
  cleanly on first save and (b) being a true no-op thereafter is a product requirement.
- **Local-first is a hard guarantee, not a default.** The core loop must function with the network
  disabled and must make **zero** outbound requests beyond `localhost` (contrast `deepnote open`,
  which uploads). Any opt-in network feature (e.g. fetching API-backed integrations, which `run`
  supports) must be clearly off by default and visibly optional.
- **Localhost trust boundary.** With no auth (NG4), the server binds to `localhost` and trusts the
  local user. It must **not** bind to `0.0.0.0` by default, and it executes arbitrary code from the
  notebook against the local machine by design — the same trust model as `deepnote run`. This is a
  documented product constraint, and the security posture should be stated plainly to the user.
- **Reactivity is Python-only today.** The DAG analyzer is a Python AST analyzer; the UI must
  inherit `run.ts`'s degradation contract on non-Python kernels (run in order, visible notice) —
  not silently mis-order or appear broken.
- **Observability for a long-lived local process.** Unlike `deepnote run` (one-shot), `deepnote
serve` is a persistent process. It needs basic operability: clear startup/ready/stop logging,
  the chosen port surfaced, kernel-death surfaced to the UI (not just the console), and a clean
  Ctrl-C shutdown that stops the toolkit server (`engine.stop()`), so a crashed kernel or orphaned
  server is visible and recoverable rather than a silent hang.
- **Block-type coverage is the SPA's real surface area.** The eleven-plus block types (code, sql,
  markdown, text, visualization, input × 8 kinds, button, big-number, image, separator) each need a
  renderer, and the editable ones an editor. Rich outputs (HTML tables, images, vega/plotly
  visualizations) are where Cloud-likeness lives — and where the DOM renderer's scope is largest.

## Risks & Open Questions

### Risks

| Risk                                                                      | Impact                                                                                    | Likelihood                  | Mitigation                                                                                                                                                                       |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#162 conflict — the SPA overlaps `vscode-deepnote`'s assigned surface** | A large unsolicited web-app monolith is rejected / redone differently upstream            | High (for the SPA upstream) | The boundary _is_ the mitigation: build the shareable backend first, offer only that on #162, keep the SPA fork-only. Never push the shell.                                      |
| **Framework/bundler introduction destabilizes the monorepo**              | CI, lint, lockfile, spell-check churn; toolchain leaks into the cleanly-sliceable backend | Medium                      | P0 ADR for the toolchain; isolate the SPA package so the backend slices clean of it; backend has **no** frontend dependency.                                                     |
| **Browser↔kernel transport choice is wrong**                             | Sluggish loop (fails the < 2 s bar) or an exposed kernel port                             | Medium                      | P0 transport ADR; default to proxying through the Node server; measure against the latency success criterion early (P3).                                                         |
| **Unsafe save corrupts the user's `.deepnote`**                           | Data loss — the worst possible product failure                                            | Low/Medium                  | Atomic write; semantic round-trip + idempotence test in P1 _before_ any editing UI exists; external-change detection in P4.                                                      |
| **Cloud-likeness is an unbounded chase**                                  | Endless polish, no ship                                                                   | Medium                      | NG1 caps it at "recognizable & productive"; phase success criteria are functional, not cosmetic.                                                                                 |
| **Scope is XXXL (6–8 phases, ~15k–30k+ LOC)**                             | Initiative stalls mid-way                                                                 | High                        | Every phase ships standalone value; the _upstream_ value (P1+P7) lands by Phase 7 independent of SPA completeness; the SPA can stop at any phase and still be a useful showcase. |
| **Reactivity mis-orders on non-Python kernels**                           | Wrong results, silently                                                                   | Low                         | Inherit `run.ts`'s explicit Python-only degradation + visible notice (P5).                                                                                                       |

### Open Questions

- **Transport: proxy vs. direct kernel connection?** Decided in the P0 transport ADR. Affects
  latency, security posture, and how much Jupyter-protocol logic lives in the browser. The ADR must
  also weigh #162's "browser via WebAssembly" direction and position this server path as
  complementary to (not competing with) an eventual WASM kernel. _(Owner: ADR author;
  recommendation: proxy.)_
- **Command name(s): `deepnote serve` vs `deepnote ui`?** The wedge's upstream-facing surface. A
  P6/ADR call, not a typo — "serve a headless API" and "ui open a browser" carry different
  connotations. _(Owner: P6 design/ADR; mild preference: `serve` is the canonical headless wedge,
  `ui` a thin alias that defaults `--open`.)_
- **Which UI framework + bundler?** Decided in the P0 toolchain ADR. Affects every SPA file and the
  monorepo's CI. _(Owner: ADR author.)_
- **Where does the server package live, and how is the SPA kept sliceable?** Affects whether the
  contrib diff (P7) can be cut clean. _(Owner: P0 package-layout ADR.)_
- **Autosave vs. explicit save (and conflict UX)?** A product-UX call that affects the save-safety
  design. _(Owner: stakeholder; default: explicit save with debounced draft, external-change warn.)_
- **Does the backend wedge get offered on #162 as a standalone issue/PR, or folded into existing
  CLI discussion?** An upstream-strategy call. _(Owner: maintainer-facing; follows the #288 pattern
  — showcase and ask before pushing.)_
- **Visualization rendering depth — do we render vega/plotly natively, or fall back to the
  persisted image?** Affects SPA scope and Cloud-likeness. _(Owner: P2/P3 design doc.)_

## Related Documents

- **Roadmap**: milestone `m3` — Local Deepnote UI; this PRD is its master PRD (re-leveled from the
  former `m2/s1/local-ui` stub).
- **Upstream epic**: [deepnote/deepnote #162 — "Make Deepnote a first-class notebook runtime"](https://github.com/deepnote/deepnote/issues/162)
  — the constraint that defines the #162 boundary (UI assigned to `deepnote/vscode-deepnote`; CLI/
  runtime owned by `deepnote/deepnote`).
- **PRD-001** (`docs/prds/PRD-001-ai-agent-notebook-authoring.md`, `m1/s6`) — AI-authoring scope;
  shares the block-mutation surface and explains why in-UI AI assistant is a non-goal here.
- **PRD-002** (`docs/prds/PRD-002-alternative-language-kernels.md`, `m2/s5/alternative-kernels`) —
  alternative-language kernels; source of the Python-only reactivity degradation contract the UI
  must inherit.
- **ADR-001** (`docs/adr/ADR-001-shared-python-interpreter-resolution.md`) — interpreter
  resolution the `serve` command reuses.
- **ADR-002 / ADR-003 / ADR-004** (`docs/adr/`) — non-Python kernel launch, kernel-name selection,
  and non-Python degradation behavior; the UI's kernel/reactivity behavior must align with all three.
- **Source references** (current-state grounding): `packages/cli/src/commands/run.ts` (the backend
  composition reference), `packages/runtime-core/src/execution-engine.ts` (streaming callbacks),
  `packages/runtime-core/src/kernel-client.ts` (arbitrary-URL `connect`),
  `packages/runtime-core/src/server-starter.ts`, `packages/reactivity/src/index.ts` (DAG exports),
  `packages/blocks/src/index.ts` (serialize/deserialize), `packages/cli/src/output-renderer.ts`
  (terminal-only renderer the DOM renderer mirrors).
- **Future**: `m2/s4` (remote/own compute) — the out-of-scope sibling this UI's transport should be
  designed not to preclude.
- **Forthcoming ADRs** (to be written from this PRD): server architecture & browser↔kernel
  transport (must weigh #162's WASM-in-browser direction); UI framework + bundler introduction;
  server/SPA package layout for the #162 slice.

---

## Revision History

| Date       | Author  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-11 | muunkky | Initial draft                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-06-11 | muunkky | Adversarial-review pass: engaged #162's WASM-in-browser direction (S1); corrected the reactivity over-implication — `run.ts` does validation-only dependency analysis, live reactive re-exec is net-new P5 (S2); redefined save fidelity as semantic round-trip + idempotence after empirically confirming serialization is non-byte-faithful but idempotent (S3); anchored latency criteria to a named reference workload (S4); fixed reactivity index citations (M1); resolved `serve`/`ui` naming (M2); specified slider re-run debounce (M3). |
