# `@deepnote/runtime-server`

The backend for `deepnote serve` — the **#162 local-UI wedge**. A Node host that
fronts a single `ExecutionEngine`, exposes the opened notebook project over HTTP,
and streams ordered, run-id-tagged execution events over a WebSocket. It composes
`runtime-core` exactly the way `packages/cli`'s `run` command does; the kernel port
never reaches the browser.

> **Status (m3/s1):** scaffold. This step establishes the package boundary, the
> canonical API-contract module, and a `createServer` stub. The HTTP router and the
> `ws` `/api/stream` fan-out land in later steps (3 / 4A / 4B).

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
