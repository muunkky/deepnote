/**
 * Shared integration-env wiring (KD-3 long-route lift / design-doc Phase 8).
 *
 * These helpers were cli-private under `packages/cli/src/integrations` and
 * `packages/cli/src/utils`; they are lifted here into `@deepnote/runtime-core` — the
 * shared home both `cli` and `runtime-server` already depend on — so the server can reach
 * `deepnote run`'s integration parity **without** importing `@deepnote/cli` (which would
 * invert the ADR-007 §1/§4 one-way arrow). Pure relocation: no behavior change.
 */
export type { DatabaseIntegrationConfig } from '@deepnote/database-integrations'
export { collectRequiredIntegrationIds } from './collect-integrations'
export { BUILTIN_INTEGRATIONS, DEFAULT_INTEGRATIONS_FILE } from './constants'
export {
  createEnvVarRef,
  ENV_VAR_REF_PREFIX,
  EnvVarResolutionError,
  extractEnvVarName,
  generateEnvVarName,
  isEnvVarRef,
  type ParsedEnvVarRef,
  parseEnvVarRef,
  resolveEnvVarRefs,
  resolveEnvVarRefsFromMap,
} from './env-var-refs'
export { isErrnoENOENT, isErrnoException } from './errno'
export {
  type DebugLogger,
  injectIntegrationEnvVars,
} from './inject-integration-env-vars'
export {
  type BaseIntegrationsFile,
  baseIntegrationsFileSchema,
  type IntegrationsFile,
  integrationsFileSchema,
} from './integrations-file-schemas'
export {
  getDefaultIntegrationsFilePath,
  type IntegrationsParseResult,
  parseIntegrationsFile,
} from './parse-integrations'
export {
  type IntegrationFetcher,
  type ResolveIntegrationEnvParams,
  type ResolveIntegrationEnvResult,
  resolveIntegrationEnv,
} from './resolve-integration-env'
export type { ValidationIssue } from './validation-issue'
