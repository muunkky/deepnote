/**
 * `@deepnote/runtime-server`
 *
 * The `deepnote serve` backend wedge (#162): a Node host that fronts a single
 * `ExecutionEngine` and exposes the notebook project over HTTP, streaming run
 * events over a `ws` WebSocket. This is a published `@deepnote/*` library mirroring
 * `@deepnote/mcp`; `packages/cli` consumes the root entry, while the m3/s2 SPA
 * imports the Node-free contract from the `./types` subpath.
 *
 * **s1 scope:** the package boundary, the canonical `api-types` contract module, the
 * `createServer` factory, and (this step) the opened-project `Session` plus the
 * `GET /api/project` route. Execute/stream routing lands in later phases.
 *
 * @packageDocumentation
 */

// The canonical s1 ↔ SPA contract. Re-exported from the root for Node consumers;
// also reachable Node-free via the `./types` subpath export (ADR-007 §6).
export type {
  ApiProject,
  FailureEvent,
  KernelFailureCategory,
  OutputEvent,
  RunId,
  WsClientMessage,
  WsServerEvent,
} from './api-types'
// The HTTP router; consumed by `createServer` and the execute routes (steps 4A / 4B).
export { createRouter } from './router'
export type { CreateServerOptions, RuntimeServer } from './server'
// The Node host factory (execute/stream routing arrives in steps 4A / 4B).
export { createServer } from './server'
export type { LoadProjectOptions } from './session'
// The opened-project lifecycle (KD-6 `loadProject`/`startEngine` split).
export { Session } from './session'
