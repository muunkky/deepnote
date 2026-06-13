import { type DatabaseIntegrationConfig, injectIntegrationEnvVars as injectIntegrationEnvVarsCore } from '@deepnote/runtime-core'
import { debug } from '../output'

/**
 * KD-3 long-route lift: the env-var injection logic now lives in `@deepnote/runtime-core`
 * (the shared home both `cli` and `runtime-server` depend on), so the server reaches `run`'s
 * integration parity without a `runtime-server → cli` edge (ADR-007 §1/§4). The lifted helper
 * takes an injectable logger because `runtime-core` has no terminal logger; this cli wrapper
 * threads the cli's `debug` so `deepnote run`'s diagnostic output is **unchanged**.
 *
 * Generate environment variables for the given integrations and inject them into process.env.
 * Returns the list of injected env var names (useful for testing/debugging).
 */
export function injectIntegrationEnvVars(
  integrations: DatabaseIntegrationConfig[],
  workingDirectory: string
): string[] {
  return injectIntegrationEnvVarsCore(integrations, workingDirectory, debug)
}
