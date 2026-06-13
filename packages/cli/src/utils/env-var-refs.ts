/**
 * KD-3 long-route lift: the `env:VAR` reference helpers now live in `@deepnote/runtime-core`
 * (the shared home both `cli` and `runtime-server` depend on), since `parseIntegrationsFile`
 * — which was lifted alongside them — depends on them. Re-export shim — existing cli import
 * paths (`merge-integrations`, `edit-integration`, the env-var-refs test) keep working, with
 * a single implementation and no `runtime-server → cli` edge (ADR-007 §1/§4).
 */
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
} from '@deepnote/runtime-core'
