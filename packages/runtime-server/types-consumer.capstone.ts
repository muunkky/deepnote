/**
 * Capstone fixture (Definition of Done): a **type-only** consumer of the
 * `@deepnote/runtime-server/types` subpath — exactly what the m3/s2 SPA does.
 *
 * It must typecheck against the **built** `./dist/api-types.d.ts` (resolved via the
 * package `exports` map under `moduleResolution: "bundler"`), proving the contract
 * is reachable from a Node-free graph and that the `./types` subpath is wired. It
 * is intentionally **not** a `*.test.ts` (vitest runs on source, pre-build); it is
 * typechecked by `pnpm --filter @deepnote/runtime-server check:types-subpath`,
 * which points `tsc --noEmit` at this file after the build.
 *
 * If `api-types.ts` ever leaks a runtime import, this still typechecks — that case
 * is caught by `api-types-no-runtime-import.test.ts`. Together they prove both
 * halves of the ADR-007 §6 invariant: the contract is *reachable* (here) and the
 * types entry stays *honest* (there).
 */

import type { ApiProject, KernelFailureCategory, WsClientMessage, WsServerEvent } from '@deepnote/runtime-server/types'

// Use each identifier at the type level so an unused-import or a broken export
// surfaces as a typecheck error rather than passing vacuously.
type _Project = ApiProject['project']
type _Client = WsClientMessage['type']
type _Server = WsServerEvent['type']
type _Category = KernelFailureCategory

// Exercise discrimination so the union shapes are load-bearing, not just present.
declare const evt: WsServerEvent
export const describeEvent = (): string => {
  switch (evt.type) {
    case 'run-failed':
      return `${evt.failureCategory satisfies _Category}: ${evt.message}`
    case 'run-done':
      return `done ${evt.executedBlocks}/${evt.failedBlocks}`
    default:
      return evt.type satisfies _Server
  }
}

export interface Contract {
  project: _Project
  client: _Client
}
