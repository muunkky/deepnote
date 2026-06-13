/**
 * KD-3 long-route lift: the integrations-file schemas now live in `@deepnote/runtime-core`
 * (the shared home both `cli` and `runtime-server` depend on). Re-export shim — existing cli
 * import paths keep working, single implementation, no `runtime-server → cli` edge (ADR-007).
 */
export {
  type BaseIntegrationsFile,
  baseIntegrationsFileSchema,
  type IntegrationsFile,
  integrationsFileSchema,
} from '@deepnote/runtime-core'
