/**
 * `@deepnote/runtime-server`
 *
 * The `deepnote serve` backend wedge (#162): a Node host that fronts a single
 * `ExecutionEngine` and exposes the notebook project over HTTP, streaming run
 * events over a `ws` WebSocket. This is a published `@deepnote/*` library mirroring
 * `@deepnote/mcp`; `packages/cli` consumes the root entry, while the m3/s2 SPA
 * imports the Node-free contract from the `./types` subpath.
 *
 * **s1 scope:** this step (server-package scaffold) establishes the package
 * boundary, the canonical `api-types` contract module, and a `createServer` stub.
 * Real HTTP/WS routing lands in later phases.
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
export type { CreateServerOptions, RuntimeServer } from './server'
// The Node host factory (real routing arrives in steps 3 / 4A / 4B).
export { createServer } from './server'
