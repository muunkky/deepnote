/**
 * KD-3 long-route lift: `collectRequiredIntegrationIds` now lives in `@deepnote/runtime-core`
 * (the shared home both `cli` and `runtime-server` depend on). Re-export shim — existing cli
 * import paths keep working, single implementation, no `runtime-server → cli` edge (ADR-007).
 */
export { collectRequiredIntegrationIds } from '@deepnote/runtime-core'
