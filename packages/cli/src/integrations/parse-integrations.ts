/**
 * KD-3 long-route lift: `parseIntegrationsFile` / `getDefaultIntegrationsFilePath` and the
 * `IntegrationsParseResult` type now live in `@deepnote/runtime-core` (the shared home both
 * `cli` and `runtime-server` depend on) so the server reaches `run`'s integration parity
 * without a `runtime-server → cli` edge (ADR-007 §1/§4). This module is a re-export shim:
 * existing cli import paths keep working unchanged, and there is exactly one implementation.
 */
export {
  getDefaultIntegrationsFilePath,
  type IntegrationsParseResult,
  parseIntegrationsFile,
} from '@deepnote/runtime-core'
