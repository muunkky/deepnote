# Design Doc: m3/s1 — Headless runtime server (`@deepnote/runtime-server`) + one-command `deepnote serve`

> **ADRs**: ADR-005 (browser↔kernel transport proxy), ADR-007 (server/SPA package layout) | **PRD**: PRD-003 | **Date**: 2026-06-12 | **Author**: muunkky

## Overview

This design implements **PRD-003 milestone m3, story s1** — the **upstream wedge**: `runtime-core`'s
already-headless execution capability, exposed over a stable HTTP + WebSocket API, plus a `deepnote
serve` CLI command that boots it over a local `.deepnote` project. There is **no UI** here. s1 is the
part offered upstream on #162; the browser SPA (m3/s2+) is a separate, fork-only consumer of this API.

Three accepted ADRs fix the shape, so this doc does not relitigate them:

- **ADR-005** decided the **transport**: the browser talks **only** to the Node server — HTTP for
  request/response, a WebSocket for the ordered execution event stream — and the server is the sole
  speaker of the Jupyter protocol (via `KernelClient`), forwarding `ExecutionEngine`'s
  `onBlockStart`/`onOutput`/`onBlockDone` callbacks one-for-one as app-level events. ADR-005 also
  named, but **explicitly deferred to this design doc**, the single most important new concern: the
  server fronts **one shared kernel with no native concurrency model**, so concurrent runs **must be
  serialized at the server**, and the "no dropped/reordered events" guarantee depends on exactly that
  serialization.
- **ADR-007** decided the **layout**: a new published package `packages/runtime-server`
  (`@deepnote/runtime-server`) with a **Node-import-free `api-types` module** the SPA imports, a thin
  `deepnote serve` command in `packages/cli`, a strict one-way dependency arrow, and a path-based
  clean-slice invariant.
- **PRD-003** defines the **success bars**: API parity with `deepnote run`, streaming fidelity,
  failure-category fidelity, and a **semantic** (not byte-level) save round-trip + idempotence — the
  save-safety gate that ships in P1 _before any editing UI exists_.

The engineering reduces to: stand up the package per ADR-007; wrap the exact composition `run.ts`
uses (interpreter resolution → `startServer` → `new ExecutionEngine` → `engine.start()` →
`engine.runProject(...)` with streaming callbacks → `engine.stop()`) behind HTTP + WS handlers;
interpose a **server-side run queue** between API requests and the single `ExecutionEngine` so runs
never interleave on the shared kernel; forward typed `KernelFailureCategory` discriminants as terminal
WS events; and gate everything with API-level integration tests that prove parity with `run`. The
largest _net-new_ engineering surface — the part `run.ts` does not have, because `run.ts` is one-shot
— is the **run-serialization / back-pressure layer**. That is the section this doc spends the most on.

**The contract package owns the wire types.** `@deepnote/runtime-server`'s Node-import-free
`api-types.ts` entry (ADR-007 §6) is the **single source of truth** for the s1↔SPA contract. It
exports three canonical identifiers that every consumer (the viewer in m3/s2, any future host) imports
rather than re-declares: **`ApiProject`** (the `GET /api/project` payload), **`WsClientMessage`**, and
**`WsServerEvent`** (the WS event vocabulary). The drift-catch ADR-007 §6 promises only works if
consumers `import type` these from `@deepnote/runtime-server/types` — a hand-redeclared local copy
defeats it. s2's viewer consumes the full `ApiProject` envelope and derives its view-models from it.

**Scope honesty (set by the design-review pass).** Two run-queue sub-features and one run-scope are
**deliberately deferred out of s1** to keep the wedge's "no runtime-core change" invariant true and its
slice small: (1) **P6 — cancelling a _running_ block** needs two net-new published-`runtime-core`
methods (`KernelClient.interrupt()` and an `ExecutionEngine` interrupt/`AbortSignal` — neither exists
today; verified); (2) **P4 — run-all coalescing** can drop a run that has no terminal event (a fresh
door to the very hang we close in R3/R5), and its chain semantics belong with reactivity; (3)
**`runScope:'with-upstream'`** depends on a CLI-private, unexported analyzer coupled to `setupProject`,
un-importable without inverting the ADR-007 arrow. All three land with the reactivity story **m3/s5**
on the public `@deepnote/reactivity` DAG primitives. s1 ships the safe subset: serialized run-all +
single-block runs, bounded FIFO back-pressure, and **queued**-cancel only.

## Requirements

The implementation is complete when:

1. **R1 — Package & slice (ADR-007).** `packages/runtime-server` (`@deepnote/runtime-server`) exists,
   builds with `tsdown`, tests with `vitest`, depends only on `@deepnote/runtime-core`,
   `@deepnote/blocks`, `@deepnote/reactivity` (`workspace:*`) plus a server-side HTTP/WS lib, and has
   **zero frontend dependency**. It exports its API request/response/event types from a
   **Node-import-free `api-types` module** that the SPA can import without dragging Node/HTTP/WS into
   its type graph. The `deepnote serve` command lives in `packages/cli`, adds exactly one dep
   (`@deepnote/runtime-server`), names **no `apps/` token** (not even a default static-dir string), and
   the `contrib/*` slice of `packages/runtime-server/**` + the cli serve delta builds clean off
   `upstream/main`.

2. **R2 — Project open/list parity.** `GET /api/project` opens a `.deepnote` (or convertible) file via
   the same resolution `run.ts` uses (`resolveAndConvertToDeepnote` + interpreter/kernel resolution)
   and returns project metadata + the full notebook/block tree with persisted outputs — deep-equal to
   what `deserializeDeepnoteFile` produces for the same file.

3. **R3 — Execute + stream fidelity (ADR-005).** `POST /api/notebooks/{nb}/blocks/{id}/run` (and a
   `run`-all variant) drive `ExecutionEngine.runProject` and deliver **every** `onBlockStart` /
   `onOutput` / `onBlockDone` event over `WS /api/stream` **in order, with no dropped or reordered
   events**, across a full-project run. The outputs streamed are byte-identical `IOutput`s to those
   `deepnote run` produces for the same project (100% of run's executable block types). Every run
   reaches a **guaranteed terminal event**: a `run-done` (carrying `failedBlocks`) when
   `engine.runProject` resolves — _including the common case where a block fails and the engine `break`s
   the run_ — or a `run-failed` when the queue task catches a `KernelDiedError`. After the terminal
   event, **no further events** arrive for that `runId`. This closes the "un-started blocks hang
   forever" gap for the common in-block failure, not just kernel death.

4. **R4 — Run serialization (ADR-005, deferred here).** Concurrent run requests against the single
   shared kernel are **serialized**: at most one run executes at a time; a second request issued while
   one is in flight is handled by a **defined queue-vs-reject policy** (specified below: bounded FIFO,
   _no_ coalescing in s1); events from distinct runs are **never interleaved** on a consumer; and every
   event carries a `runId` so a consumer can attribute it. The load-bearing invariant test is
   **structural**: a lint/`madge` rule that `engine.runProject` is referenced **only** by
   `run-queue.ts`, so no code path can issue an un-serialized run. (Cancellation of a _running_ run, and
   run-all coalescing, are **m3/s5 follow-ups**, not s1 deliverables — see scope note above.)

5. **R5 — Failure-category fidelity.** API/WS error payloads carry the same `failureCategory`
   discriminants as `run.ts` — `missing-kernel` / `kernel-launch` / `kernel-died` / `in-block`, all
   distinguishable — sourced from the **typed** `KernelNotRegisteredError` / `KernelLaunchError` /
   `KernelDiedError` instances (not re-derived from strings). A kernel that dies mid-run is surfaced as
   an explicit **terminal** WS event so the consumer stops waiting rather than hanging.

6. **R6 — Save round-trip + idempotence (the save-safety gate).** `POST /api/project/save` writes the
   `.deepnote` file **atomically** (temp-then-rename) and **detects external changes** since open
   (refusing to clobber). The round-trip is **semantic, not byte-level**:
   `deserialize(serialize(project))` deep-equals `project` (no content loss) **and** serialization is
   idempotent (`serialize(deserialize(s)) === s` for an already-canonical `s`; a second no-op save
   produces an empty `git diff`). This test ships in P1, before any editing UI.

7. **R7 — `deepnote serve` boots headless.** `deepnote serve project.deepnote --no-open` starts a
   server, serves `/api/project`, picks a free port (via `findConsecutiveAvailablePorts` taking the
   first of its pair, or a single-port helper — see M1; falling back and reporting the chosen URL on
   conflict), binds `localhost` (never `0.0.0.0`), emits clear startup/ready/stop logging, and shuts the
   toolkit server down (`engine.stop()`) cleanly on Ctrl-C. A `deepnote ui` alias defaults `--open`.
   SQL/integration support reaches parity with `run`.

8. **R8 — Wedge delivered.** The serve-api + cli-serve are sliced as a clean `contrib/*` diff off
   `upstream/main` (no `.gitban`/`.claude`/SPA), build clean there, and the milestone update is posted
   to the fork dry-run showcase thread (labels: upstream-ready vs fork-only). Nothing is pushed to
   `deepnote/deepnote`.

## Current State

The execution backend already exists and runs headless; s1 wraps it, it does not rebuild it.

- **`run.ts` is the composition reference** (`packages/cli/src/commands/run.ts`). `runDeepnoteProject`
  resolves the interpreter (`selectPythonSpecWithHint` → `resolvePythonExecutable`), the kernel
  (`selectKernelName`), parses integrations and injects their env vars
  (`injectIntegrationEnvVars`), constructs `new ExecutionEngine({ pythonEnv, workingDirectory,
kernelName })`, `await engine.start()` (via `startExecutionEngine`, which preserves typed kernel
  errors), then `await engine.runProject(file, { ...callbacks })`, and finally `engine.stop()` in a
  `finally`. **s1 reuses this sequence verbatim**, swapping the terminal renderer for WS forwarding.

- **`ExecutionEngine` streams via callbacks** (`execution-engine.ts:72–78`): `onBlockStart(block,
index, total)`, `onOutput(blockId, output)`, `onBlockDone(result)`. `runProject` executes blocks
  **sequentially in one async call** (`execution-engine.ts:249`); there is **no queue, mutex, or
  in-flight guard** anywhere in the engine. It holds exactly one `KernelClient`.

- **`KernelClient` owns a single session/kernel** (`kernel-client.ts:87–88`) and raises the typed
  failure family: `KernelNotRegisteredError` (`missing-kernel`, pre-flight), `KernelLaunchError`
  (`kernel-launch`), `KernelDiedError` (`kernel-died`, launch-time **or** mid-run via
  `statusChanged → 'dead'`, `kernel-client.ts:243–249`). The discriminants are defined in
  `kernel-errors.ts` as `KernelFailureCategory`.

- **`startServer` / `findConsecutiveAvailablePorts`** (`server-starter.ts`) already spawn the toolkit
  Jupyter server and find free ports; the engine's `start()` calls `startServer` internally. `ws@^8`
  is **already a dependency of `runtime-core`** — the server-side WS lib is available in-tree.

- **`serializeDeepnoteFile` re-canonicalizes** (`serialize-deepnote-file.ts:37`): it `normalizeSortingKeys`
  then runs the value through `deepnoteFileSchema.parse` for stable field order, then `yaml.stringify`.
  This is _why_ the round-trip is semantic, not byte-level — confirmed: a first round-trip on
  `bash-image.deepnote` grows 1261→1372 bytes yet is idempotent thereafter.

- **The repo has zero frontend** and a single `packages/*` workspace glob. `@deepnote/mcp` is the
  precedent for a runtime-composing published package (`tsdown` build, `vitest`, `workspace:*` deps,
  `"type": "module"`, `exports` map, `publishConfig.access: public`). There is **one** include-less
  root `tsconfig.json` with `paths: { "@deepnote/*": ["packages/*/src/index.ts"] }` — so an importer of
  `@deepnote/runtime-server` resolves the package **source** `index.ts`, which is exactly why the
  Node-free `api-types` module (ADR-007 §6) must be a real, separate entry.

- **Test infrastructure**: `vitest.config.ts` (mocked, always-on `pnpm test`) and a dedicated
  `vitest.integration.config.ts` that collects only `*.integration.test.ts` against a **real** toolkit
  venv, run by `test:integration` in the `integration-kernels` CI job. s1's parity tests reuse this
  exact split.

## Target State

```
                         packages/cli (deepnote serve / ui)
                                    │  createServeAction()  — thin: resolve, port, boot, open?
                                    ▼  depends on @deepnote/runtime-server (workspace:*)
        ┌──────────────────────────────────────────────────────────────────────┐
        │  packages/runtime-server  (@deepnote/runtime-server)                   │
        │                                                                        │
        │   src/api-types.ts   ← Node-import-free: ApiProject, WsClientMessage,  │
        │      (SPA imports        WsServerEvent, FailureEvent, RunId …          │
        │       ONLY this)        type/interface only, zero runtime import       │
        │                                                                        │
        │   src/server.ts      ← createServer(opts): { listen, close }           │
        │      HTTP router:  GET /api/project                                    │
        │                    POST /api/notebooks/{nb}/blocks/{id}/run            │
        │                    POST /api/project/save                              │
        │      WS  router:   WS  /api/stream  (ordered event fan-out)            │
        │                                                                        │
        │   src/run-queue.ts   ← THE serialization seam (one run at a time)      │
        │   src/session.ts     ← owns the single ExecutionEngine + project state │
        │   src/save.ts        ← atomic write + external-change detection        │
        │   src/index.ts       ← re-exports api-types + createServer (Node)      │
        └───────────────────────────────┬────────────────────────────────────────┘
                                         │  composes, exactly as run.ts does
                                         ▼
       ExecutionEngine ── KernelClient ──(Jupyter WS, in-process only)── deepnote-toolkit kernel
       (runtime-core)                          ▲ kernel port NEVER reaches the browser
```

Data flow for a run:

```
client ──HTTP POST /…/run──► server: enqueue {runId, blockId} on run-queue
                                        │ queue drains one run at a time
                                        ▼
                             session.runProject(file, { blockId, callbacks })
                                        │ engine emits onBlockStart/onOutput/onBlockDone
                                        ▼  each callback → one app-level event, tagged {runId}
client ◄──WS /api/stream──── {type:"block-start", runId, …}
                             {type:"output",      runId, blockId, output:IOutput}
                             {type:"block-done",  runId, …}
                             {type:"run-done",    runId, failedBlocks} (terminal — ALWAYS, when runProject resolves)
                             {type:"run-failed",  runId, failureCategory} (terminal — ONLY on kernel death)
```

Every run ends in exactly one of `run-done` / `run-failed`; the consumer contract is "a terminal event
always arrives for a `runId`, after which there are no further events for it."

The server is a **stateful, long-lived execution broker** over one kernel (ADR-005 Negative). The
queue is the thing that makes a concurrent UI safe against a sequential engine.

## Design

### Architecture

`@deepnote/runtime-server` is organized around four collaborators behind the HTTP/WS facade:

1. **`session.ts` — the engine owner.** Holds the resolved `pythonEnv`/`kernelName`/`workingDirectory`,
   the opened `DeepnoteFile`, a content hash of the file as opened (for external-change detection), and
   exactly one `ExecutionEngine`. It exposes `open()` (resolve + `engine.start()`), `runProject(opts)`
   (a thin pass-through to `engine.runProject` with callbacks), `save(project)`, and `close()`
   (`engine.stop()`). This mirrors `run.ts`'s `runDeepnoteProject` body but as a reusable object rather
   than a one-shot function.

2. **`run-queue.ts` — the serialization seam (R4).** A single-concurrency async queue. Every
   `POST .../run` (or `run` WS message) does not call the engine directly; it `enqueue`s a run task.
   The queue runs **one task at a time** against the session's single engine. Each task is assigned a
   monotonically increasing `runId`. The queue is where ADR-005's deferred concurrency decision lives.

3. **WS fan-out (`server.ts`).** A connected client receives the queue's event stream. The session's
   engine callbacks are adapted to app-level events, tagged with the active `runId`, and written to the
   socket **in the exact order the engine emits them** (the engine already emits sequentially, and the
   queue guarantees only one run is emitting at a time — so ordering is preserved by construction, not
   by a re-sequencer).

4. **`save.ts` — atomic persistence (R6).** `serializeDeepnoteFile(project)` → write to
   `path + '.tmp-<rand>'` in the same directory → `fs.rename` over the target (atomic on POSIX/NTFS
   same-volume). Before writing, re-hash the on-disk file and compare to the open-time hash; mismatch →
   `409`-class external-change response, no write.

`packages/cli/src/commands/serve.ts` exports `createServeAction(...)` registered in `cli.ts` next to
`createRunAction`. It is **thin**: resolve the file path, pick a port, call
`createServer({...}).listen(port)`, log the URL, optionally open the browser, and wire a `SIGINT`
handler to `server.close()` → `session.close()`.

### Key Design Decisions

**KD-1 — A `session` object that owns one `ExecutionEngine`, constructed once per `serve` process,
not per request.** `run.ts` builds a fresh engine, starts it, runs, and stops it — one-shot.
`serve` is long-lived: starting the toolkit server + kernel takes seconds and must happen **once**, at
boot, then be reused across many `/…/run` requests. _Alternative considered_: start a kernel per run
(simple, no shared-state concurrency problem). _Rejected_: it would re-pay the multi-second
start cost on every Run click, blowing the PRD's "< 2 s warm-kernel" loop, and would lose in-kernel
state (variables defined in block A unavailable to block B) — the entire point of an interactive
session. One persistent engine is mandatory; the cost it imposes (a shared mutable kernel) is what
KD-2 pays for.

**KD-2 — Serialize runs with a single-concurrency queue, _queue-by-default_, not reject-by-default
(see the run-serialization section for the full policy).** Given one shared kernel and a sequential
engine, two overlapping runs would interleave IOPub traffic onto one output handler (ADR-005
Negative). _Alternatives_: (a) reject-while-busy (`409`), (b) cancel-in-flight-and-run-newest, (c)
unbounded queue. We choose a **bounded FIFO queue with run-id tagging** as the default, because a UI
legitimately issues a burst of runs that must all run — rejecting them would make a responsive loop
impossible — while a single user mashing Run should not build an unbounded backlog. The full s1 policy
(depth, queued-cancel) is specified below; it is the load-bearing section of this doc. (Coalescing and
running-cancel are deferred to m3/s5 — see the scope note in the Overview.)

**KD-3 — Reuse `run.ts`'s resolution + integration wiring by extracting it, not by importing
`run.ts`.** The interpreter/kernel/integration setup in `run.ts`'s `setupProject` is what the server
needs, but `run.ts`'s `setupProject` is coupled to CLI concerns (`getChalk`, machine-output mode,
`program.error`). _Alternative_: have the server import `setupProject` from `@deepnote/cli`. _Rejected_:
that inverts the dependency arrow (server → cli) ADR-007 forbids, and pulls CLI/terminal code into the
publishable server. Instead the server reuses the **runtime-core** primitives `run.ts` is built from
(`resolvePythonExecutable`, `selectKernelName`, `selectPythonSpecWithHint`, the integrations helpers,
`ExecutionEngine`) directly. The shared knowledge is the _runtime-core API_, not `run.ts`. (If a
helper currently lives only in `packages/cli` — e.g. `injectIntegrationEnvVars`,
`resolveAndConvertToDeepnote` — and is needed by both, the long-route fix is to lift it into a place
both can depend on, e.g. `runtime-core` or `blocks`, rather than cross-importing cli. The s1
sql-integration-parity feature owns that lift.)

**KD-4 — Two protocols, one server, app-level vocabulary only (ADR-005 verbatim).** HTTP carries
discrete request/response; `WS /api/stream` carries the ordered event stream. The browser **never**
sees a Jupyter message. The server is the sole `KernelClient` speaker. This is non-negotiable per
ADR-005 and is restated as a _contract_ in Interface Design.

**KD-5 — Failure categories are forwarded from typed instances at the engine seam, not re-derived.**
`run.ts` already shows the two surfacing sites: the outer catch reads `error.category` for
`missing-kernel`/`kernel-launch`/launch-time `kernel-died`; `onBlockDone` reads
`result.error instanceof KernelDiedError ? 'kernel-died' : 'in-block'` _before_ the error is flattened
to a string (`run.ts:1196–1200`). The server replicates **both** sites: `session.open()` failures →
HTTP error payload with `failureCategory`; mid-run `onBlockDone` with `success:false` → a WS
`block-done` carrying `failureCategory`; a `KernelDiedError` caught by the queue task → a **terminal**
`run-failed` WS event. The discriminant must be captured from the still-typed instance, exactly as
`run.ts` does.

**KD-6 — `GET /api/project` does _not_ require the kernel; `/…/run` does.** Opening a project is pure
deserialization + resolution metadata — a viewer (m3/s2) renders persisted outputs with no kernel
running. So `session.open()` splits into `loadProject()` (sync-ish, no kernel) and `startEngine()`
(lazy, on first run). _Alternative_: start the kernel eagerly at `serve` boot. _Rejected for the API
contract, kept as a serve-command default_: the **server** lazily starts the engine on first run so
`GET /api/project` works even if the kernel is mis-installed (and returns a render-able tree plus a
`missing-kernel` capability flag), while the **`serve` command** may still eagerly warm the kernel at
boot for the "< 10 s to rendered notebook, warm kernel" criterion. Splitting load from start is what
makes failure-category fidelity legible: a missing kernel surfaces on _run_, as the typed
`missing-kernel`, not as an opaque boot crash.

**KD-7 — Save detects external change via a content hash captured at open, compared at save.** PRD:
"Save is the single most data-loss-prone operation." _Alternative_: mtime comparison. _Rejected_: mtime
is coarse and lies across some filesystems/editors; a SHA-256 of the on-disk bytes at open vs. at save
is exact. On mismatch the server refuses and returns the current on-disk content so the client can
reconcile — never a silent clobber.

### Interface Design

#### Package entries (ADR-007 §6)

```jsonc
// packages/runtime-server/package.json  (mirrors @deepnote/mcp)
{
  "name": "@deepnote/runtime-server",
  "type": "module",
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./types": {
      "import": "./dist/api-types.js",
      "types": "./dist/api-types.d.ts",
    },
  },
  "dependencies": {
    "@deepnote/blocks": "workspace:*",
    "@deepnote/reactivity": "workspace:*",
    "@deepnote/runtime-core": "workspace:*",
    "ws": "^8.20.1",
  },
  "publishConfig": { "access": "public" },
}
```

`src/api-types.ts` contains **only** `type`/`interface` — no Node, HTTP, or WS runtime import — so the
SPA importing `@deepnote/runtime-server/types` never pulls Node deps into its type graph. `src/index.ts`
re-exports both `api-types` and `createServer`; `packages/cli` consumes the root.

**`api-types.ts` is the canonical contract — it exports the identifiers every consumer imports (S3/C1).**
This module is the **single source of truth** for the s1↔SPA wire shape. It exports exactly these
contract identifiers, by name:

- **`ApiProject`** — the `GET /api/project` response payload (defined below).
- **`WsClientMessage`** — the client→server WS message union.
- **`WsServerEvent`** — the server→client WS event union.

Per ADR-007 §6, the drift-catch only holds if consumers `import type { ApiProject, WsServerEvent }
from '@deepnote/runtime-server/types'` and build their view-models on top, rather than re-declaring a
local shape. The m3/s2 viewer does exactly that: it imports `ApiProject` and derives its notebook/block
view-models from `ApiProject['project']`, and consumes the **full** envelope (including `capabilities`,
which drives the KD-6 "kernel missing" UI state). A consumer that hand-redeclares the shape defeats the
compile-time drift check and is a design violation.

#### HTTP surface

```ts
// GET /api/project  → ApiProject  (no kernel required; viewer-friendly)
interface ApiProject {
  path: string; // absolute path of the opened file
  metadata: DeepnoteFile["metadata"];
  project: DeepnoteFile["project"]; // full notebook/block tree, persisted outputs intact
  openHash: string; // SHA-256 of the on-disk bytes at open time (echoed back on save)
  capabilities: {
    kernelLanguage: string | null;
    reactivity: "python" | "disabled";
  };
}

// POST /api/notebooks/{nb}/blocks/{id}/run   body: { runScope?: 'block' }   (s1: 'block' only)
//   → 202 { runId }   (run is enqueued; events arrive over WS)
//   on a resolution failure (bad nb/block id): 400 { error }
//   on a kernel-start failure: 200/500 with { error, failureCategory }
// POST /api/project/run                       → 202 { runId }   (run-all)
//
//   runScope:'with-upstream' is DEFERRED to m3/s5 (reactivity) — see scope note. It is NOT a field
//   on the s1 API; s1 has no API field without a faithful impl.

// POST /api/project/save   body: { project: DeepnoteFile, openHash: string }
//   → 200 { savedHash, bytesWritten }
//   → 409 { error: 'external-change', currentProject: DeepnoteFile, currentHash }   (no write performed)
```

`{nb}` is the notebook **name** (URL-encoded), matching `ExecutionEngine.runProject`'s `notebookName`;
`{id}` is the block id. In s1 `runScope` is `'block'` only (run the single block) — alongside the
`POST /api/project/run` run-all.

**Why `with-upstream` is out of s1 (B3).** Reactive upstream resolution in `run.ts` is
`resolveUpstreamExecutionBlockIds` (run.ts:505) — an **unexported** `async function`, coupled to
`setupProject`'s `pythonEnv`/`kernelName`/`isMachineOutput` outputs and to the CLI's machine-output
notice path. Importing it into `@deepnote/runtime-server` would invert the ADR-007 one-way arrow
(server → cli) and pull CLI concerns into the publishable package. The long-route fix is **not** to
cross-import that fn but to build reactive upstream resolution on the **public** `@deepnote/reactivity`
DAG primitives — which is exactly what the reactivity story **m3/s5** owns. So `with-upstream` lands in
m3/s5, on the public primitives; s1 ships `'block'` + run-all only.

#### WS app-level event contract (ADR-005, backend-agnostic)

```ts
// client → server
type WsClientMessage =
  | { type: "run"; blockId?: string; notebookName?: string; runScope?: "block" } // s1: 'block' only
  | { type: "cancel"; runId: number }; // s1: cancels a QUEUED task only (running-cancel is m3/s5)

// server → client  (every event carries runId so a consumer attributes it unambiguously)
type WsServerEvent =
  | { type: "run-queued"; runId: number; queueDepth: number }
  | { type: "run-start"; runId: number; totalBlocks: number }
  | {
      type: "block-start";
      runId: number;
      blockId: string;
      index: number;
      total: number;
    }
  | { type: "output"; runId: number; blockId: string; output: IOutput }
  | {
      type: "block-done";
      runId: number;
      blockId: string;
      success: boolean;
      durationMs: number;
      failureCategory?: KernelFailureCategory;
    }
  | {
      type: "run-done";
      runId: number;
      executedBlocks: number;
      failedBlocks: number;
    } // TERMINAL — always, on resolve
  | {
      type: "run-failed";
      runId: number;
      failureCategory: KernelFailureCategory;
      message: string;
    } // TERMINAL — kernel death only
  | { type: "run-cancelled"; runId: number }; // queued-cancel only in s1
```

`block-start`/`output`/`block-done` map one-to-one to `ExecutionEngine`'s
`onBlockStart`/`onOutput`/`onBlockDone`. **`run-done` is the guaranteed terminal event** for every run
whose `engine.runProject` promise resolves — including a run the engine `break`s early on an in-block
failure (it carries `failedBlocks > 0`). **`run-failed`** is terminal **only** for the kernel-death
catch (KD-5). Exactly one of the two ends every run; after it, no further events arrive for that
`runId`. These types are the exported `WsServerEvent` union in `api-types.ts` (the canonical contract,
S3/C1).

---

## THE RUN-SERIALIZATION POLICY (R4 — the load-bearing section)

ADR-005 created this requirement and deferred its _policy_ here. The server fronts **one** kernel via
**one** sequential `ExecutionEngine`. An interactive UI is inherently concurrent: a user can hit Run on
B while A is mid-run, and a reactive change fans a chain of dependents (PRD Scenario 3). Issued naively,
a second `engine.runProject` would race the first — two IOPub streams multiplexed onto one output
handler, producing **interleaved and reordered** events and corrupt per-block output attribution. The
roadmap node `m3/s1/serve-api/execute-stream-ws`'s "no dropped or reordered events" guarantee is
**defined by** the serialization design below.

### The mechanism: a single-concurrency FIFO run queue

```ts
// src/run-queue.ts  (concept)
interface RunTask {
  runId: number
  request: { blockId?: string; notebookName?: string }   // s1: single-block or run-all (no blockIds chain)
  emit: (event: WsServerEvent) => void   // writes to the WS, in emit order
  cancelled: boolean                     // set when a QUEUED task is cancelled before it starts (P5)
}

class RunQueue {
  private running = false
  private readonly pending: RunTask[] = []
  private nextRunId = 1
  private readonly maxDepth: number       // bounded backlog (default 8)

  enqueue(req, emit): { runId; accepted: boolean; queueDepth } { … }   // policy below
  cancel(runId): boolean { … }            // QUEUED task only in s1 (P5)
  private async drain() { … }             // runs tasks one at a time; never re-entrant
}
```

`drain()` is the **only** caller of `session.runProject` / `engine.runProject` — and this is the
**load-bearing invariant** (M2). It is enforced not by an ordering test (which is structurally
guaranteed and proves little) but by a **lint/`madge` rule** asserting `engine.runProject` is referenced
_only_ by `run-queue.ts`. No other module may issue a run, so an un-serialized run cannot exist by
construction.

Because (a) the engine emits its callbacks sequentially within a run and (b) `drain` never starts run
N+1 until run N's `engine.runProject` promise resolves, the WS sees a **totally ordered** stream: all of
run 1's events, then all of run 2's events. No re-sequencer is needed — ordering is structural.

**`drain` emits the guaranteed terminal event (B1).** When `engine.runProject` _resolves_, `drain`
unconditionally emits a `run-done` carrying the result's `failedBlocks` — **this is the common
failure's terminal event too**: the engine `break`s the run on the first in-block failure
(`execution-engine.ts:426–429` for the non-agent path, `:431–446` for the catch), so it resolves with
`failedBlocks > 0` and the un-started blocks are simply never started. The consumer needs no special
handling for "blocks 4-10 didn't run" — it gets `run-done` and stops waiting. `run-failed` is reserved
**only** for the queue task's `try/catch` around `engine.runProject` catching a `KernelDiedError` (the
promise rejects rather than resolves). This is the precise sense in which the queue _is_ the no-drop /
no-hang guarantee: every run reaches exactly one terminal event.

### Enqueue policy (queue-vs-reject), spelled out and testable

The default is **bounded FIFO queue, no coalescing** (S2 — coalescing deferred). Each rule is a
discrete, testable clause:

| #   | Condition                                               | Action                                                                     | Rationale                                                                        |
| --- | ------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| P1  | Idle (no run running, queue empty)                      | Run immediately; assign `runId`; emit `run-start`                          | the common case                                                                  |
| P2  | A run is in flight, `pending.length < maxDepth`         | Enqueue; emit `run-queued {queueDepth}`; HTTP `202 {runId}`                | a fanned set of runs must not be dropped                                         |
| P3  | A run is in flight, `pending.length === maxDepth`       | **Reject** the _new_ request; HTTP `429 {error:'queue-full'}`; no WS event | bound memory/back-pressure; a user mashing Run cannot build an unbounded backlog |
| P5  | Explicit `{type:'cancel', runId}` for a **queued** task | Remove from `pending`; emit `run-cancelled`; never started                 | cheap, safe: nothing ran                                                         |

`maxDepth` default is **8**, configurable via `createServer({ runQueueDepth })`.

**Why queue-by-default rather than reject-by-default.** An interactive UI legitimately issues several
runs in quick succession; rejecting all but the first would make a responsive loop impossible.
Conversely, an unbounded queue is a memory and "felt-latency" hazard (a 30-deep backlog means the UI
shows results 30 runs stale). The bounded FIFO serves the burst (queues up to `maxDepth`) without the
unbounded-backlog footgun (rejects past `maxDepth`).

**Two run-queue features are deferred to m3/s5 (set by the design-review pass):**

- **P4 — run-all coalescing (dropped from s1, S2).** Coalescing is _strictly more dangerous_ than a
  plain bounded FIFO: dropping a pending run that has already been promised a `runId` risks leaving a
  consumer waiting on a terminal event that never comes — the exact B1 hang through a second door.
  Bounded FIFO without coalescing is both simpler and safer. Coalescing's only payoff (avoiding
  redundant kernel work in a _reactive chain_) belongs with the reactivity story **m3/s5**, where chain
  semantics — and the rule that a coalesced run still emits a terminal event — are designed together.

- **P6 — cancelling the _running_ task (deferred from s1, B2).** A true running-cancel needs **two
  net-new methods on published `runtime-core`**, both verified absent today: `KernelClient` holds a
  `private kernel` and exposes **no** `interrupt()` (the Jupyter-protocol interrupt is unreachable from
  the server), and `ExecutionEngine` has **no** `interrupt()` / `AbortSignal` parameter (the per-block
  loop at `execution-engine.ts:249` has no signal check). Adding either is a `runtime-core` change,
  which breaks the wedge's "no runtime-core change" invariant. So **s1 ships P5 (queued-cancel) only** —
  pure queue bookkeeping, zero engine change, and the case that actually matters for back-pressure (a
  now-stale queued run). The full running-cancel surface — `KernelClient.interrupt()` **and**
  `ExecutionEngine.interrupt()`/an `AbortSignal` param threaded into `runProject` — is an explicit named
  **m3/s5 follow-up**, not an s1 deliverable. We do not fake a cancel.

### Back-pressure / buffered-output flow control (split into two regimes — S1)

ADR-005 Negative: "Buffered output lives in the Node heap, so back-pressure is a memory consideration."
The engine + kernel client already accumulate a run's outputs in memory (`kernel-client.ts:230`,
`execution-engine.ts:246`); under WS back-pressure (a slow browser, or large/rapid output) those bytes
pile up further in the server. The review pass split this into two regimes that need different
mechanisms — one of which is **free** and the other deliberately simple:

**Regime 1 — CROSS-BLOCK back-pressure is free (no buffer needed).** The engine's `onBlockStart`/
`onBlockDone` callbacks are **awaited** — they return `Promise<void>` and the per-block loop `await`s
them (`execution-engine.ts:253, 404, 423, 444`). So the server applies real back-pressure for free: it
does **not resolve the awaited `onBlockDone`** until `ws.bufferedAmount` has drained below a low-water
mark. The engine then literally does not start the next block until the socket has caught up — a
genuine pause of _production_, not a buffer that hides the problem. No ring, no dropping; the kernel
idles while the slow consumer drains. This is the primary flow-control mechanism and it costs nothing.

**Regime 2 — WITHIN-BLOCK flooding (one block emitting unbounded stdout).** `onOutput` is **synchronous
and un-pausable** — a single block in a `for` loop printing megabytes cannot be back-pressured between
emits (there is no await between `onOutput` calls). For this one case the server keeps a **bounded
buffer** with a generous bound (default **8 MiB**, `createServer({ wsHighWaterMark })`): below the
bound, write through; at the bound, the buffer stops growing and the run's _remaining_ `stream` text for
that block is replaced by a single `{type:'output', truncated:true}` marker. **Lifecycle and result
outputs are never dropped** — `block-start`/`block-done`/`execute_result`/`display_data`/`error` are
discrete results and always forwarded; only a single block's runaway `stream` text is bounded, and only
with an explicit `truncated` marker, never silently.

For V1 the generous bound + truncation marker is sufficient; the earlier `stream`-coalescing layer
(concatenating adjacent stdout outputs) is **dropped** as unjustified complexity — it bought a marginal
delay before the same truncation, at the cost of a mutating-the-stream code path. If a real workload
ever shows the 8 MiB bound truncating legitimate output, coalescing can be reconsidered then; it is not
in s1.

This keeps "no dropped events" precise and testable: lifecycle/result events are never dropped; only a
single block's runaway `stream` text is bounded, and only with an explicit `truncated` marker.

### What "no interleaving" means, concretely (the R4 test)

Two runs A (slow: a block that `time.sleep`s while emitting stdout) and B (fast) are issued
back-to-back over the same WS. The assertion: **every** event tagged `runId:A` precedes **every** event
tagged `runId:B` (A is FIFO-first), and within each run the `block-start → output* → block-done` order
holds. No `runId:B` event appears between `runId:A`'s `run-start` and `run-done`. This is a pure
ordering assertion over the recorded WS event log and needs no real kernel timing luck (the queue
guarantees it structurally).

---

## Save round-trip (R6 — the save-safety gate)

### Atomic write + external-change detection

```
save(project, openHash):
  current = await readFileBytes(path)              # may be absent if first save of a new file
  if current && sha256(current) !== openHash:      # someone edited it since we opened
      return { conflict: true, currentProject: deserialize(current), currentHash: sha256(current) }
  yaml   = serializeDeepnoteFile(project)          # canonical YAML (zod-ordered)
  tmp    = path + '.tmp-' + randomUUID()
  await writeFile(tmp, yaml, 'utf-8')
  await rename(tmp, path)                           # atomic same-volume swap
  return { savedHash: sha256(Buffer.from(yaml)), bytesWritten: yaml.length }
```

The temp file is created in the **same directory** as the target (rename is only atomic within a
filesystem). On any failure between write and rename, the temp file is cleaned up and the original is
untouched.

### The fidelity criteria (semantic, NOT byte-equality)

Per PRD/ADR, "faithful" is **semantic round-trip + serialization idempotence**, explicitly _not_
byte-equality with the original on-disk bytes (the serializer re-canonicalizes via
`normalizeSortingKeys` + `deepnoteFileSchema.parse`). The two adjudicating assertions:

- **(a) No content loss**: `deserializeDeepnoteFile(serializeDeepnoteFile(project))` deep-equals
  `project`.
- **(b) Idempotence**: for an already-canonical string `s = serializeDeepnoteFile(project)`,
  `serializeDeepnoteFile(deserializeDeepnoteFile(s)) === s`. Equivalently, a second no-op save produces
  an empty `git diff`.

The first save of a not-yet-canonical file may reformat untouched lines (1261→1372 on
`bash-image.deepnote`) — that is **expected and accepted**; the bar is that it is idempotent thereafter.

**This test ships in P1, before any editing UI exists.** It is the gate that proves save can never
silently corrupt the user's file, independent of the renderer/editor work that comes later.

---

## Failure-category mapping (R5)

| Failure                     | Source (typed)                                       | Where surfaced                      | API/WS shape                                                                                                                                                                            |
| --------------------------- | ---------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `missing-kernel`            | `KernelNotRegisteredError` (pre-flight)              | `session.startEngine()` (first run) | HTTP `{error, failureCategory:'missing-kernel'}` on the `/…/run` that triggered start; or `run-failed` over WS                                                                          |
| `kernel-launch`             | `KernelLaunchError`                                  | `session.startEngine()`             | same as above, `'kernel-launch'`                                                                                                                                                        |
| `kernel-died` (launch-time) | `KernelDiedError`                                    | `session.startEngine()`             | `'kernel-died'`                                                                                                                                                                         |
| `kernel-died` (mid-run)     | `KernelDiedError` via `onBlockDone`/queue task catch | during a run                        | **terminal** `run-failed {failureCategory:'kernel-died'}` WS event                                                                                                                      |
| `in-block`                  | user exception → `onBlockDone(success:false)`        | during a run                        | `block-done {success:false, failureCategory:'in-block'}`, then the run **terminates early** (the engine `break`s) and `drain` emits the guaranteed terminal `run-done {failedBlocks>0}` |

**The `in-block` row, corrected (B1).** The engine does **not** continue past a failed block — it
`break`s the run on _any_ block failure (`execution-engine.ts:426–429` for the non-agent
`!result.success` path; `:431–446` for the catch that handles thrown exceptions and kernel death). So
on an in-block failure the run terminates early: the failed block's `block-done` carries
`failureCategory:'in-block'`, the un-started blocks are simply never started, and `engine.runProject`
**resolves** with `failedBlocks > 0`. `drain` then emits the **guaranteed terminal `run-done`** (B1) —
this is what closes the "blocks 4-10 hang forever" gap for the _common_ failure, not just kernel death.
A consumer always gets a terminal event and never waits on blocks that will never run.

Mid-run kernel death is the one case where the promise **rejects** rather than resolves: the consumer
sees only the app-level stream, so if the server did not translate `KernelDiedError` into an explicit
terminal `run-failed`, the run would hang "pending forever." The queue task's `try/catch` around
`engine.runProject` catches the typed `KernelDiedError`, emits the terminal **`run-failed`** (the
_only_ path that produces it), and then **continues draining** (the kernel is dead; the session marks
itself needing re-`start()` on the next run, or the server surfaces a fatal state — a discrete
deliverable in P3). The discriminant is read from the typed instance exactly as `run.ts` does
(`run.ts:1196–1200`) — never from a stringified message.

---

## Test strategy (TDD — written before implementation, per phase)

All tests are written first. They split across the two existing vitest projects:

- **Mocked, always-on (`pnpm test`)**: queue ordering, save round-trip/idempotence, HTTP routing,
  failure-category mapping, back-pressure/flow-control — anything provable without a real kernel.
- **Real-kernel integration (`*.integration.test.ts`, `test:integration`)**: API parity with `deepnote
run` against the real toolkit venv, reusing the `vitest.integration.config.ts` split and the
  `integration-kernels` CI job.

Core suites (each maps to a roadmap success criterion):

1. **API ↔ `run` parity (integration).** Boot the server over a sample `.deepnote`, drive
   `GET /api/project` + run-all over WS, collect the streamed `IOutput`s, and assert they **deep-equal**
   the `IOutput`s `deepnote run --output json` produces for the same file (100% of executable block
   types). This is R3's "identical outputs" bar, measured not asserted.

2. **Save round-trip + idempotence (mocked).** (a) `deserialize(serialize(p))` deep-equals `p`; (b)
   second no-op save is an empty diff; (c) atomic-write leaves no `.tmp-*` behind; (d) external-change
   detection returns `409` and performs **no write** when the on-disk hash differs from `openHash`. Uses
   the `bash-image.deepnote` fixture to pin the documented 1261→1372 non-byte-faithful-but-idempotent
   behavior.

3. **Run serialization / no-interleave (mixed).** _Primary invariant (M2):_ a lint/`madge` rule asserts
   `engine.runProject` is referenced **only** by `run-queue.ts` — the structural guarantee that no
   un-serialized run can exist. Plus, with a mocked engine whose `runProject` yields control between
   blocks: two overlapping runs produce a WS log fully ordered by `runId` (the R4 assertion above); P3
   rejects at `maxDepth` (`429`); P5 cancels a queued task without starting it. Also assert the
   **guaranteed terminal event (B1)**: a run whose engine `break`s on an in-block failure still emits a
   terminal `run-done {failedBlocks>0}` and then _no_ further events for that `runId`. (No P4-coalescing
   or P6-running-cancel tests — both are m3/s5.)

4. **Back-pressure (mocked).** Two regimes (S1): (1) cross-block — a stubbed socket with high
   `bufferedAmount` causes the awaited `onBlockDone` to not resolve until the socket drains, so the
   engine does not start the next block (assert production pauses); (2) within-block — a single block
   emitting `stream` past the 8 MiB bound yields a `{truncated:true}` marker, while lifecycle/result
   events (`block-start`/`block-done`/`execute_result`/`display_data`/`error`) are **never** dropped.

5. **Failure-category fidelity (mix).** Mocked: each typed error → correct discriminant in the right
   shape (HTTP vs. terminal WS), and mid-run `KernelDiedError` → terminal `run-failed` (consumer does
   not hang). Integration: a deliberately-missing kernel name yields `missing-kernel` end-to-end.

6. **`serve` command (mocked + one integration smoke).** Mocked: port fallback on conflict, `--no-open`
   headless, `localhost` bind (not `0.0.0.0`), Ctrl-C → `engine.stop()`. Integration smoke:
   `deepnote serve fixture.deepnote --no-open` serves a `GET /api/project` that returns the tree.

7. **Slice integrity (CI script, P7).** `git grep -iE 'react|vite|apps/'` over
   `packages/runtime-server packages/cli/src/commands/serve.ts packages/cli/src/cli.ts
packages/cli/package.json` returns nothing; the `contrib/*` branch builds/typechecks/tests with no
   `apps/` present (true by construction). A `madge`/`dependency-cruiser` rule asserts nothing under
   `packages/` imports `apps/` or a frontend framework, and `api-types.ts` has no runtime import.

---

## Implementation Phases

Phases are ordered to the roadmap features and are each independently deployable. The feature ordering
within s1 is: **server-package-scaffold → project-open-list-api → execute-stream-ws → save-api →
server-integration-tests** (serve-api), then **serve-command → browser-launch-alias →
sql-integration-parity** (cli-serve), then **contrib-diff-cut → fork-showcase-post**
(wedge-slice-showcase).

### Phase 1: Server package scaffold (`m3/s1/serve-api/server-package-scaffold`)

**Goal:** `@deepnote/runtime-server` exists, builds, tests, has the Node-free `api-types` entry, and
zero frontend dependency.

**Deliverables:** `packages/runtime-server/` skeleton mirroring `@deepnote/mcp` (`package.json`,
`tsdown.config.ts`, `vitest`); `src/api-types.ts` (type/interface only); `src/index.ts` (re-exports
`api-types` + a `createServer` stub); `./types` subpath export; a placeholder `createServer({...})`
returning `{ listen, close }`; a `madge`/lint check that `api-types.ts` has no runtime import.

**Test strategy:** mocked — `createServer().listen(0)` binds and `close()`s cleanly; importing
`@deepnote/runtime-server/types` resolves with no Node module in the import graph (a type-only import
test + the madge rule).

**Infrastructure:** add `packages/runtime-server` to the `packages/*` glob (already matched);
`tsdown.config.ts`; CI picks it up via existing `pnpm -r` jobs.

**Documentation:** package `README.md` stub naming the wedge and the API contract surface.

**Dependencies:** none beyond current runtime-core/blocks/reactivity.

**Definition of done:**

- [ ] `pnpm --filter @deepnote/runtime-server build && test && exec tsc --noEmit` pass
- [ ] `git grep -iE 'react|vite|apps/' -- packages/runtime-server` returns nothing
- [ ] `api-types.ts` exports the full `WsClientMessage`/`WsServerEvent`/`ApiProject` contract, runtime-import-free (madge-asserted)
- [ ] `@deepnote/runtime-server/types` is importable without pulling Node into the type graph

### Phase 2: Open project + list API (`m3/s1/serve-api/project-open-list-api`)

**Goal:** `GET /api/project` returns the notebook/block tree with persisted outputs, no kernel required.

**Deliverables:** `src/session.ts` (`loadProject()` split from `startEngine()`, KD-6); the HTTP router
with `GET /api/project`; resolution reusing runtime-core primitives (`resolvePythonExecutable`,
`selectKernelName`) and `deserializeDeepnoteFile`; the `openHash` capture; the `capabilities` flags.

**Test strategy:** integration — `GET /api/project` over a fixture returns a tree deep-equal to
`deserializeDeepnoteFile(fixture)`; mocked — resolution failure on a bad path returns `400`.

**Documentation:** README API section for `GET /api/project`.

**Dependencies:** Phase 1.

**Definition of done:**

- [ ] `GET /api/project` returns `ApiProject` deep-equal to direct deserialization (persisted outputs intact)
- [ ] Works with no kernel started (viewer-friendly)
- [ ] `openHash` is a stable SHA-256 of the on-disk bytes

### Phase 3: Execute + stream over WS, with serialization (`m3/s1/serve-api/execute-stream-ws`)

**Goal:** runs drive `ExecutionEngine` and stream ordered, run-id-tagged events over WS with no
interleaving; typed failure categories forwarded; mid-run kernel death is terminal.

**Deliverables:** `src/run-queue.ts` (the s1 enqueue policy P1/P2/P3/P5 — bounded FIFO, **no
coalescing**, queued-cancel only); `src/session.ts` `startEngine()` + `runProject()` pass-through; WS
`/api/stream` fan-out; the app-level event adapter (engine callbacks → `WsServerEvent` tagged `runId`)
emitting the **guaranteed terminal `run-done`** on `runProject` resolve (B1); two-regime back-pressure
(cross-block await-gating + within-block 8 MiB bound, S1); failure-category mapping (KD-5) including the
kernel-death-only terminal `run-failed`; `POST /…/run` (runScope `'block'`) + `POST /api/project/run`.
(P4 coalescing, P6 running-cancel, and `runScope:'with-upstream'` are **m3/s5**, not in this phase.)

**Test strategy:** mocked — suites 3 (madge `engine.runProject`-only-in-`run-queue.ts` invariant,
no-interleave, P3/P5, guaranteed-terminal-`run-done` on in-block break), 4 (two-regime back-pressure),
5 (failure mapping + no-hang on kernel death); integration — a real run streams events in order matching
`deepnote run`.

**Documentation:** README WS contract; ADR-005's app-level contract reflected verbatim.

**Dependencies:** Phase 2.

**Definition of done:**

- [ ] Every `onBlockStart`/`onOutput`/`onBlockDone` arrives over WS in order, no drops, no reorders, across a full run
- [ ] Every run reaches a guaranteed terminal event: `run-done` (incl. an in-block-failure run the engine `break`s, `failedBlocks>0`) or `run-failed` (kernel death only); no events after it (B1)
- [ ] `engine.runProject` is referenced **only** by `run-queue.ts` (lint/madge invariant — the load-bearing no-interleave guarantee, M2)
- [ ] Two overlapping runs are fully ordered by `runId` (no interleave); `maxDepth` rejects with `429`; queued cancel works
- [ ] `missing-kernel`/`kernel-launch`/`kernel-died`/`in-block` are each distinguishable in the right shape; mid-run kernel death emits a terminal `run-failed` (consumer does not hang)
- [ ] Back-pressure: cross-block production pauses while the socket drains; a single block's runaway `stream` is bounded with a `truncated` marker; lifecycle/result events never dropped

### Phase 4: Save API (`m3/s1/serve-api/save-api`)

**Goal:** `POST /api/project/save` writes atomically with semantic round-trip + idempotence and
external-change detection — the save-safety gate, shipped before any editing UI.

**Deliverables:** `src/save.ts` (temp-then-rename, same-dir temp, cleanup on failure); external-change
detection via `openHash` vs. current on-disk hash → `409` with `currentProject`; `POST
/api/project/save` route.

**Test strategy:** mocked — suite 2 in full (round-trip deep-equal, idempotence/no-op-diff, no leftover
temp files, `409`-no-write on hash mismatch), pinned to `bash-image.deepnote`.

**Documentation:** README save section stating the semantic-not-byte fidelity definition explicitly.

**Dependencies:** Phase 2 (needs `openHash`).

**Definition of done:**

- [ ] `deserialize(serialize(project))` deep-equals `project`
- [ ] Second no-op save produces an empty `git diff` (idempotent)
- [ ] Write is atomic (temp-then-rename, same dir, no leftover temp on success or failure)
- [ ] External change since open → `409`, **no write**, returns current on-disk content

### Phase 5: Server integration tests (`m3/s1/serve-api/server-integration-tests`)

**Goal:** the documented launch criteria are proven end-to-end against a real kernel.

**Deliverables:** `*.integration.test.ts` proving API↔`run` output parity (suite 1), the integration
failure-category test (suite 5), and the `serve` smoke; CI wiring into `integration-kernels`.

**Test strategy:** integration only, reusing `vitest.integration.config.ts` and the toolkit venv.

**Documentation:** README "verified parity with `deepnote run`" note.

**Dependencies:** Phases 3, 4.

**Definition of done:**

- [ ] Streamed `IOutput`s deep-equal `deepnote run`'s for 100% of executable block types on a fixture
- [ ] A deliberately-missing kernel yields `missing-kernel` end-to-end
- [ ] Suite runs green in the `integration-kernels` job

### Phase 6: `deepnote serve` command (`m3/s1/cli-serve/serve-command`)

**Goal:** one command boots the server headless over a local project, with port fallback, logging, and
clean shutdown.

**Deliverables:** `packages/cli/src/commands/serve.ts` (`createServeAction`); `cli.ts` registration;
`@deepnote/runtime-server: workspace:*` in cli package.json; `--port`/`--no-open` flags; `localhost`
bind; startup/ready/stop logging; `SIGINT` → `server.close()` → `session.close()`. The `--static-dir`
option exists but **defaults to unset** and is **never** hard-coded to `apps/studio/dist` (ADR-007 §2).

**Port selection (M1).** `findConsecutiveAvailablePorts(start)` (server-starter.ts:129) returns the
**first of a consecutive PAIR** (it steps `attempt * 2` and requires both `candidatePort` and
`candidatePort + 1` free) — it was designed for the toolkit server's two-port need. The serve HTTP
listener needs a **single** port. s1 either (a) uses the returned port and **intentionally discards** the
second of the pair (documenting that the adjacent port is left free), or (b) adds a single-port helper
alongside it. Whichever is chosen is stated explicitly so the port semantics are not silently inherited
from a pair-finder.

**Test strategy:** mocked — suite 6 (port fallback, headless, `localhost` bind, Ctrl-C → `engine.stop()`).

**Documentation:** CLI `--help` text; user-facing docs page for `deepnote serve` (localhost-trust note).

**Dependencies:** Phase 1 (server package), and behaviorally Phases 2–4 for a useful server.

**Definition of done:**

- [ ] `deepnote serve project.deepnote --no-open` starts and serves `GET /api/project`
- [ ] Port-in-use falls back to next free port and reports the chosen URL
- [ ] Binds `localhost`, never `0.0.0.0`
- [ ] Ctrl-C stops the toolkit server (`engine.stop()`); no orphaned process
- [ ] The sliced `serve.ts` carries **no `apps/` token** (no default static-dir string)

### Phase 7: `deepnote ui` alias (`m3/s1/cli-serve/browser-launch-alias`)

**Goal:** a thin `deepnote ui` that defaults `--open`.

**Deliverables:** `ui` alias registration that reuses `createServeAction` with `open: true` default; the
browser-open call (same mechanism `open` uses, but to the **local** URL — no cloud upload).

**Test strategy:** mocked — `ui` defaults `--open`; `serve` defaults `--no-open`.

**Documentation:** `--help` for `ui`; note that final `serve`/`ui` naming is a P6 PRD call.

**Dependencies:** Phase 6.

**Definition of done:**

- [ ] `deepnote ui project.deepnote` opens the browser to the served localhost URL
- [ ] No cloud upload path is reachable from `ui`

### Phase 8: SQL / integration parity (`m3/s1/cli-serve/sql-integration-parity`)

**Goal:** SQL/integration support reaches `run`'s level, local-first by default.

**Deliverables:** the integration env wiring reused from `run.ts` (`parseIntegrationsFile`,
`collectRequiredIntegrationIds`, `injectIntegrationEnvVars`) — lifted out of `packages/cli` into a
place both `cli` and `runtime-server` can depend on (KD-3 long-route lift) if currently cli-private;
opt-in API-backed integration fetch **off by default and visibly optional** (local-first guarantee).

**Test strategy:** mocked — a SQL block resolves its integration env exactly as `run` does; the
API-integration fetch is off unless a token is explicitly provided.

**Documentation:** README integrations parity note; local-first guarantee restated.

**Dependencies:** Phase 6.

**Definition of done:**

- [ ] A SQL block runs through the server with the same integration env wiring as `deepnote run`
- [ ] No outbound request is made for integrations unless a token is explicitly provided (local-first)

### Phase 9: Cut the clean contrib diff (`m3/s1/wedge-slice-showcase/contrib-diff-cut`)

**Goal:** a `contrib/*` branch off `upstream/main` with serve-api + cli-serve, code only, that builds
clean.

**Deliverables:** `contrib/m3-serve` cut from `upstream/main` via `git checkout sprint/<tag> --
packages/runtime-server <cli serve paths>`; no `.gitban`/`.claude`/`docs`/`apps/`.

**Test strategy:** suite 7 (slice integrity) on the contrib branch: `pnpm install --frozen-lockfile &&
pnpm build && pnpm typecheck && pnpm test` pass with no `apps/` present; the no-frontend grep is clean.

**Infrastructure:** the `git checkout -- <paths>` recipe per `.claude/CLAUDE.md`.

**Documentation:** none (the diff _is_ the artifact).

**Dependencies:** Phase 5 (server-integration-tests green), Phases 6–8.

**Definition of done:**

- [ ] `contrib/m3-serve` builds/typechecks/tests clean off `upstream/main`
- [ ] No `apps/` path and no frontend token anywhere in the diff
- [ ] The diff is exactly the upstream-ready PR we would open against `deepnote/deepnote`

### Phase 10: Fork showcase post (`m3/s1/wedge-slice-showcase/fork-showcase-post`)

**Goal:** the milestone update lands on the fork dry-run showcase thread (not upstream).

**Deliverables:** a comment on the `muunkky/deepnote` showcase thread: what shipped, link the contrib
diff and the process diff, label upstream-ready vs fork-only.

**Test strategy:** n/a (process artifact).

**Dependencies:** Phase 9.

**Definition of done:**

- [ ] Showcase comment posted on `muunkky/deepnote` with both diffs linked and labeled
- [ ] Nothing pushed to `deepnote/deepnote`

## Migration & Rollback

**Migration:** pure addition, and — crucially — **zero `runtime-core` change** in s1. No existing file
or command changes behavior. `deepnote serve`/`deepnote ui` are new commands; `@deepnote/runtime-server`
is a new package; `run.ts` and `runtime-core` are untouched (the server reuses _runtime-core_
primitives, not `run.ts`). The only edit to an existing file is the cli `cli.ts` registration + a
dependency line. The `runtime-core` interrupt surface that a true running-cancel would need
(`KernelClient.interrupt()` + an `ExecutionEngine` `AbortSignal`) is **not** taken in s1 — it is an
m3/s5 follow-up — so the wedge's "no runtime-core change" invariant holds exactly.

**Rollback:** clean git revert per phase. The package is self-contained; removing it and the cli serve
delta restores the prior state with no side effects.

## Risks

| Risk                                                                                          | Impact                                                                                   | Likelihood | Mitigation                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run interleaving slips past the queue (a code path calls `engine.runProject` outside `drain`) | Corrupt, reordered output — the exact failure ADR-005 names                              | Medium     | **Primary mitigation (M2): a lint/`madge` rule asserts `engine.runProject` is referenced ONLY by `run-queue.ts`** — no other module can issue a run, so an un-serialized run cannot exist; the no-interleave ordering test (suite 3) is secondary                      |
| A run never reaches a terminal event (un-started blocks hang forever)                         | Run "pending forever" in the UI — for the COMMON in-block failure, not just kernel death | Medium     | B1: `drain` emits a **guaranteed** terminal `run-done` whenever `engine.runProject` resolves (incl. the engine's early `break` on in-block failure); `run-failed` only on the kernel-death reject; suite 3/5 assert exactly one terminal event ends every run          |
| `api-types.ts` accidentally imports Node runtime, leaking Node into the SPA type graph        | Breaks the ADR-007 §6 invariant; slice/SPA pain                                          | Medium     | madge/lint rule on `api-types.ts` (no runtime import) as a CI gate from Phase 1                                                                                                                                                                                        |
| KD-3 helper lift (integration wiring) drifts or re-imports cli                                | Inverts the ADR-007 one-way arrow                                                        | Low/Medium | Lift shared helpers into runtime-core/blocks; dependency-cruiser rule forbids `packages/runtime-server → packages/cli`                                                                                                                                                 |
| A single block floods stdout faster than the socket drains                                    | Memory growth / silent data loss in the UI                                               | Low        | Two-regime back-pressure (S1): cross-block production is await-gated (free, no buffer); within-block a single block's runaway `stream` is bounded at 8 MiB with an explicit `truncated` marker; lifecycle/result events never dropped; suite 4 asserts the distinction |
| Save external-change detection misses a concurrent editor write                               | Clobber — worst-case data loss                                                           | Low        | SHA-256 of on-disk bytes at open vs. save (KD-7); `409`-no-write on mismatch; atomic temp-then-rename; suite 2 covers it                                                                                                                                               |

## Roadmap Connection

This design serves milestone **m3, story s1** ("Headless runtime server + one-command launch") and its
three feature groups: `serve-api` (5 features), `cli-serve` (3 features), `wedge-slice-showcase` (2
features). The 10 phases above map onto those 10 features in order. The `docs_ref` on `m3/s1` is set to
this design doc. It advances PRD-003 phases P1 (server core), P6 (CLI), and P7 (decompose), and
implements ADR-005's deferred run-serialization decision and ADR-007's package layout.

## Open Questions

- **`serve`/`ui` final naming** — PRD P6 open question; this design supports both (`serve` canonical
  headless, `ui` alias defaulting `--open`) and is unaffected by the final call.
- **`maxDepth` / within-block bound defaults (8 / 8 MiB)** — chosen as conservative starting values;
  both are `createServer` options, tunable once the live loop (m3/s3) provides real workload data.

### Explicit m3/s5 follow-ups (decided OUT of s1 by the design-review pass — not open questions)

These are settled deferrals, listed so the reactivity story picks them up. None is an s1 deliverable:

- **Running-cancel (P6).** The full surface — `KernelClient.interrupt()` **and**
  `ExecutionEngine.interrupt()`/an `AbortSignal` param threaded into `runProject` (a signal check at the
  per-block loop, `execution-engine.ts:249`) — both **net-new published-`runtime-core` methods**. s1
  ships queued-cancel (P5) only; running-cancel lands in m3/s5 with the runtime-core change.
- **Run-all coalescing (P4).** Deferred because coalescing can drop a run with no terminal event (the B1
  hang via another door). Lands with m3/s5 where chain semantics — including "a coalesced run still
  emits a terminal event" — are designed.
- **`runScope:'with-upstream'`.** Reactive upstream resolution built on the **public**
  `@deepnote/reactivity` DAG primitives (not the CLI-private `resolveUpstreamExecutionBlockIds`). Lands
  with m3/s5; not an s1 API field.

---

## Revision History

| Date       | Author  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-12 | muunkky | Initial design — implements ADR-005 (transport + deferred run-serialization policy) and ADR-007 (package layout) for m3/s1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-06-12 | muunkky | Design-review pass (verdict: Request Changes — architecture approved; corrections, several lightening scope). **B1:** corrected the self-contradictory `in-block` row — the engine `break`s on any block failure; `run-done` is now the GUARANTEED terminal event on every `runProject` resolve (incl. in-block failure), `run-failed` reserved for the kernel-death reject; closes the common-failure hang. **B2:** deferred P6 (running-cancel) entirely from s1 — it needs two net-new published-`runtime-core` methods (`KernelClient.interrupt()` + `ExecutionEngine` `AbortSignal`, both verified absent); s1 ships P5 (queued-cancel) only; full surface named as an m3/s5 follow-up. **B3:** scoped `runScope:'with-upstream'` OUT of s1 (depends on CLI-private unexported `resolveUpstreamExecutionBlockIds`); reactive resolution lands in m3/s5 on public `@deepnote/reactivity` primitives; removed the API field. **S1:** split back-pressure into cross-block (free, await-gated `onBlockDone`) vs within-block (bounded 8 MiB + `truncated` marker); dropped the `stream`-coalescing layer. **S2:** dropped P4 run-all coalescing from s1 (bounded FIFO is simpler AND safer; coalescing → m3/s5). **S3/C1:** stated `api-types.ts` exports the canonical `ApiProject`/`WsClientMessage`/`WsServerEvent` contract identifiers (single source of truth). **M1:** noted `findConsecutiveAvailablePorts` returns the first of a PAIR; serve uses the first + discards (or a single-port helper). **M2:** made the load-bearing no-interleave test a lint/madge rule that `engine.runProject` is referenced only by `run-queue.ts`. Adjusted the phase list / Open Questions for the P4/P6/with-upstream deferrals. |
