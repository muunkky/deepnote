# `@deepnote/runtime-server`

The backend for `deepnote serve` — the **#162 local-UI wedge**. A Node host that
fronts a single `ExecutionEngine`, exposes the opened notebook project over HTTP,
and streams ordered, run-id-tagged execution events over a WebSocket. It composes
`runtime-core` exactly the way `packages/cli`'s `run` command does; the kernel port
never reaches the browser.

> **Status (m3/s1):** the package boundary, the canonical API-contract module, the
> `createServer` factory, and the first HTTP route — `GET /api/project` — are in place.
> The `POST /…/run` execute routes and the `ws` `/api/stream` fan-out land in later steps
> (4A / 4B).

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

## Dependencies

`@deepnote/runtime-core`, `@deepnote/blocks`, `@deepnote/reactivity` (`workspace:*`),
and `ws`. **No frontend dependency** — the package must never drag a browser
toolchain into the backend (a slice-integrity grep enforces this).

## Develop

```bash
pnpm --filter @deepnote/runtime-server build   # tsdown → dist (index + api-types entries)
pnpm --filter @deepnote/runtime-server test    # vitest (lifecycle + contract + no-runtime-import)
pnpm --filter @deepnote/runtime-server exec tsc --noEmit
```
