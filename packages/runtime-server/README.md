# `@deepnote/runtime-server`

The backend for `deepnote serve` — the **#162 local-UI wedge**. A Node host that
fronts a single `ExecutionEngine`, exposes the opened notebook project over HTTP,
and streams ordered, run-id-tagged execution events over a WebSocket. It composes
`runtime-core` exactly the way `packages/cli`'s `run` command does; the kernel port
never reaches the browser.

> **Status (m3/s1):** the package boundary, the canonical API-contract module, the
> `createServer` factory, `GET /api/project`, the **execution surface** — the
> single-concurrency run-serialization queue, the `POST /…/run` routes, and the
> `ws` `/api/stream` event fan-out — and the **save-safety gate**
> (`POST /api/project/save`) are in place.

## Layout (ADR-007 §6)

| Entry     | Import                           | Contents                                                                                                                                                               |
| :-------- | :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.`       | `@deepnote/runtime-server`       | Node host: `createServer(opts) → { listen, close }`, plus a re-export of the contract types. Consumed by `@deepnote/cli`.                                              |
| `./types` | `@deepnote/runtime-server/types` | **Node-import-free** API contract — `type`/`interface` only, zero runtime import. Imported by the m3/s2 SPA so the browser's type graph never picks up Node/HTTP/`ws`. |

The split is load-bearing: the SPA imports the wire shapes from `./types` and
derives its view-models from them, so the compiler catches contract drift. A check
(`src/api-types-no-runtime-import.test.ts`) asserts `api-types.ts` stays
runtime-import-free; `pnpm --filter @deepnote/runtime-server check:types-subpath`
typechecks a type-only `/types` consumer against the built package.

## API contract (canonical identifiers)

Exported from `./types` (single source of truth for the s1 ↔ SPA wire shape):

- **`ApiProject`** — the `GET /api/project` response envelope (notebook/block tree
  with persisted outputs, `openHash`, capability flags). No kernel required.
- **`WsClientMessage`** — the client → server WS union (`run` / `cancel`).
- **`WsServerEvent`** — the server → client WS event union. `run-done` is the
  **guaranteed** terminal event on every run that resolves; `run-failed` is terminal
  for kernel death only.

## `GET /api/project` — open + read the project (no kernel)

Opening a project is pure deserialization + resolution metadata (KD-6): a viewer renders
the persisted notebook/block tree **with no kernel running**. The flow:

```ts
import { createServer, Session } from "@deepnote/runtime-server";

const session = new Session();
await session.loadProject("/abs/path/notebook.deepnote"); // reads bytes, hashes, deserializes — no kernel
const server = createServer({ session });
await server.listen(3000);
```

`loadProject` is the `loadProject()` / `startEngine()` split (KD-6): it never starts a
kernel, so the endpoint works even when the kernel is mis-installed.

**Request:** `GET /api/project`

**`200` response (`ApiProject`):**

```jsonc
{
  "path": "/abs/path/notebook.deepnote", // resolved absolute path of the opened file
  "metadata": { "createdAt": "…" }, // === DeepnoteFile['metadata']
  "project": {
    "notebooks": [
      /* … */
    ],
  }, // full tree, persisted outputs intact
  "openHash": "<hex sha256 of the on-disk bytes>", // stable; echoed back on save
  "capabilities": {
    "kernelLanguage": "python", // 'python' | <kernel name> | null (mis-installed)
    "reactivity": "disabled", // always 'disabled' in s1; 'python' activates in m3/s5
  },
}
```

The returned `metadata` + `project` deep-equal `deserializeDeepnoteFile(<same bytes>)` —
the viewer sees exactly what the file contains. `openHash` is a hex SHA-256 of the on-disk
bytes at open time, used for save-time external-change detection (KD-7).

**Errors:**

| Status          | When                                                                                  |
| :-------------- | :------------------------------------------------------------------------------------ |
| `400 { error }` | the project path is unreadable / unresolvable, or the file is not a valid `.deepnote` |
| `404 { error }` | unknown route, or a non-`GET` method on `/api/project` (s1 is read-only)              |

A **missing or mis-installed kernel is not an error** — it surfaces as
`capabilities.kernelLanguage: null`, and the full tree is still returned (KD-6).

## Run + stream over WebSocket (execution surface)

The server fronts **one** kernel via **one** sequential `ExecutionEngine`. An interactive UI is
concurrent, so every run goes through a **single-concurrency FIFO run queue** (`run-queue.ts`):
runs execute one at a time, and their events stream over `WS /api/stream` in a single
totally-ordered, `runId`-tagged log — no interleaving, no reordering (ADR-005). The queue is the
**sole** caller of the engine's `runProject` (a structural, AST-checked invariant), so no
un-serialized run can exist by construction.

```ts
import { createServer, Session } from "@deepnote/runtime-server";

const session = new Session();
await session.loadProject("/abs/path/notebook.deepnote"); // KD-6 — no kernel yet
const server = createServer({ session }); // engine starts lazily on first run
await server.listen(3000);
```

### Trigger a run

A run is triggered by an HTTP POST **or** a WS `run` message. The HTTP response only
acknowledges the enqueue; the run's **output streams over the WS**.

| Request                                    | runScope     | Success         |
| :----------------------------------------- | :----------- | :-------------- |
| `POST /api/project/run`                    | run-all      | `202 { runId }` |
| `POST /api/notebooks/{nb}/blocks/{id}/run` | single-block | `202 { runId }` |

`{nb}` is the URL-encoded notebook name; `{id}` is the block id.

**Run-route errors:**

| Status                           | When                                                                        |
| :------------------------------- | :-------------------------------------------------------------------------- |
| `429 { error: 'queue-full' }`    | the bounded backlog is at `runQueueDepth` (default 8); **no** WS event (P3) |
| `500 { error, failureCategory }` | kernel start failed — `missing-kernel`/`kernel-launch`/`kernel-died` (R5)   |
| `400 { error }`                  | un-decodable notebook/block id                                              |

### WS event contract (`/api/stream`)

A connected client subscribes to the queue's broadcast event stream. Every event carries a
`runId`; **exactly one terminal event** ends every run.

```jsonc
// client → server (WsClientMessage)
{ "type": "run", "blockId": "b1", "runScope": "block" }   // or run-all (no blockId)
{ "type": "cancel", "runId": 7 }                          // s1: cancels a QUEUED task only

// server → client (WsServerEvent) — totally ordered per run
{ "type": "run-queued",  "runId": 2, "queueDepth": 1 }                 // P2 ack (HTTP 202)
{ "type": "run-start",   "runId": 1, "totalBlocks": 3 }
{ "type": "block-start", "runId": 1, "blockId": "b1", "index": 0, "total": 3 }
{ "type": "output",      "runId": 1, "blockId": "b1", "output": { /* IOutput */ } }
{ "type": "output",      "runId": 1, "blockId": "b1", "truncated": true } // within-block bound hit
{ "type": "block-done",  "runId": 1, "blockId": "b1", "success": false, "durationMs": 12,
  "failureCategory": "in-block" }
{ "type": "run-done",    "runId": 1, "executedBlocks": 2, "failedBlocks": 1 } // TERMINAL — always
{ "type": "run-failed",  "runId": 1, "failureCategory": "kernel-died", "message": "…" } // kernel death only
{ "type": "run-cancelled", "runId": 2 }                                // queued-cancel ack
```

**Terminal-event guarantee (B1).** `run-done` is emitted on **every** run whose `runProject`
resolves — **including a run the engine stops early on an in-block failure** (it `break`s on the
first failed block and resolves with `failedBlocks > 0`). `run-failed` is reserved **only** for a
mid-run kernel death (the one reject path). So a block that errors still flips the run to a
terminal "done with failures" state instead of hanging, and a dead kernel shows an explicit
failure instead of a permanently-pending run.

**Failure categories (R5).** `missing-kernel` / `kernel-launch` / `kernel-died` / `in-block` are
each surfaced in the right shape — an HTTP `{ failureCategory }` body on kernel-start failure, a
`block-done.failureCategory` for a failed block, or a terminal `run-failed` for mid-run kernel
death — read from the typed error instance, never re-derived from a string.

**Back-pressure (S1).** Cross-block: the engine awaits the per-block callbacks, so the server
pauses production until the socket's `bufferedAmount` drains — a genuine pause, no buffer.
Within-block: a single block's runaway `stream` text is bounded at `wsHighWaterMark`
(default 8 MiB) and, past the bound, replaced by one `{ truncated: true }` marker; lifecycle and
result outputs (`execute_result`/`display_data`/`error`) are **never** dropped.

**Deferred to m3/s5:** run-all coalescing (P4), running-cancel (P6), and `runScope:'with-upstream'`
— s1 ships queued-cancel (P5) only.

## `POST /api/project/save` — atomic save (the save-safety gate)

`POST /api/project/save` writes the `.deepnote` file back to disk. It is the gate that proves
a save can **never silently corrupt or clobber** the user's file — it ships before any editing UI
exists. Three guarantees:

- **Semantic round-trip, _not_ byte-equality.** The serializer re-canonicalizes (sorting keys,
  field order via the zod schema), so the **first** save of a not-yet-canonical file reformats
  untouched lines — the documented `bash-image.deepnote` 1263→1374-byte growth — and is
  **idempotent thereafter**: a second no-op save produces an empty `git diff`. "No content loss"
  means `deserialize(serialize(project))` deep-equals `project`, never byte-identity with the
  original on-disk bytes.
- **Atomic temp-then-rename.** The canonical YAML is written to `path + '.tmp-<uuid>'` **in the
  same directory** (rename is only atomic within a filesystem), then `fs.rename`d over the target.
  A crash mid-write can never leave a half-written `.deepnote`; on any failure the temp is removed
  and the original is untouched.
- **External-change detection (KD-7) — no clobber.** Before writing, the on-disk bytes are
  re-hashed; if that SHA-256 no longer equals the request's `openHash`, the save **refuses** with
  `409` and hands back the current on-disk content — **no write is performed** — so a concurrent
  editor's edit is never overwritten.

**Request:** `POST /api/project/save`

```jsonc
// body (SaveProjectRequest)
{
  "project": {
    /* a full DeepnoteFile */
  },
  "openHash": "<the openHash from GET /api/project>", // optimistic-concurrency token
}
```

**Responses:**

| Status                                                         | When                                                                                                      |
| :------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| `200 { savedHash, bytesWritten }`                              | written atomically; `savedHash` is the SHA-256 of the persisted bytes — adopt it as your next `openHash`  |
| `409 { error:'external-change', currentProject, currentHash }` | the on-disk hash ≠ `openHash` (an external edit since open); **no write performed** — reconcile and retry |
| `400 { error }`                                                | malformed body (not JSON, or missing `project`/`openHash`); the save never runs                           |
| `500 { error }`                                                | a genuine write/rename failure (temp already cleaned up; original untouched)                              |

> **Open→save loop (s1 caveat).** The save body is a **full `DeepnoteFile`**, but the
> `GET /api/project` `ApiProject` envelope currently exposes only `metadata` + `project` (not the
> file-level `version`/`environment`/`execution`). An editor that reconstructs a `DeepnoteFile`
> purely from `ApiProject` therefore can't yet round-trip losslessly; carrying the full file in the
> open envelope is tracked as a follow-up (`ad6kmb`). The save endpoint itself round-trips a full
> `DeepnoteFile` with zero loss.

## Dependencies

`@deepnote/runtime-core`, `@deepnote/blocks`, `@deepnote/reactivity` (`workspace:*`),
and `ws`. **No frontend dependency** — the package must never drag a browser
toolchain into the backend (a slice-integrity grep enforces this).

## Verified parity with `deepnote run`

The server's headline promise — _it runs your project exactly the way `deepnote run` does_ — is
**proven against a real kernel, not asserted**. The real-kernel integration suite
(`test-integration/server-run-parity.integration.test.ts`) boots this server over a fixture, drives
`GET /api/project` + run-all over `/api/stream`, collects the streamed `IOutput`s, and asserts they
**deep-equal** the `IOutput`s `deepnote run --output json` produces for the same file. The parity
fixture covers every output-bearing `IOutput` shape a bare Python kernel produces — `stream` stdout,
`stream` stderr, `execute_result`, `display_data`, and multi-write ordering — plus a non-executable
markdown block both paths skip identically. (Block types that need external services — SQL, integration,
input blocks — are out of scope for this kernel-only parity step; the design doc's `sql-integration-parity`
phase owns them.) The same suite proves three more end-to-end guarantees:

- a deliberately-missing kernel surfaces the typed `missing-kernel` discriminant (never an opaque 500),
- a mid-run kernel death is terminal — `run-failed { failureCategory: 'kernel-died' }` with no further
  events for that run,
- `serve`'s real socket is bound to loopback (`127.0.0.1`, never `0.0.0.0`) — the live-socket guard for
  the localhost-trust security boundary.

These are `*.integration.test.ts` files: the always-on mocked `pnpm test` **excludes** them (KD-9); they
run only under `pnpm test:integration` in the `integration-kernels` CI job, which provisions a
`deepnote-toolkit[server]` venv. Without that venv (or with `RUN_INTEGRATION_TESTS` unset) every test
self-skips cleanly.

## Develop

```bash
pnpm --filter @deepnote/runtime-server build   # tsdown → dist (index + api-types entries)
pnpm --filter @deepnote/runtime-server test    # vitest (lifecycle + contract + no-runtime-import)
pnpm --filter @deepnote/runtime-server exec tsc --noEmit
pnpm test:integration                          # real-kernel parity (integration-kernels CI job; self-skips with no venv)
```
