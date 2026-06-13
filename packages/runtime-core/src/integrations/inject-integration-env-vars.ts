import { type DatabaseIntegrationConfig, getEnvironmentVariablesForIntegrations } from '@deepnote/database-integrations'

/**
 * Optional debug sink. Lifting `injectIntegrationEnvVars` out of `@deepnote/cli` (KD-3)
 * decouples it from the cli's `debug` logger — `runtime-core` has no terminal logger and
 * must not depend on one (ADR-007). The diagnostic lines the cli original emitted are
 * preserved by letting the caller inject its logger: the cli shim passes its own `debug`,
 * so `deepnote run`'s debug output is unchanged, while `runtime-server` (and tests) default
 * to a no-op. This keeps the lift a pure relocation with identical observable env mutation.
 */
export type DebugLogger = (message: string) => void

const noopDebug: DebugLogger = () => {}

/**
 * Generate environment variables for the given integrations and inject them into process.env.
 * Returns the list of injected env var names (useful for testing/debugging).
 *
 * @param integrations - The resolved integration configs to materialize env vars for.
 * @param workingDirectory - Project root used to resolve relative integration paths.
 * @param debug - Optional diagnostic logger (defaults to a no-op). The cli passes its `debug`
 *   so the lifted helper logs exactly as the cli original did; callers with no logger get silence.
 */
export function injectIntegrationEnvVars(
  integrations: DatabaseIntegrationConfig[],
  workingDirectory: string,
  debug: DebugLogger = noopDebug
): string[] {
  if (integrations.length === 0) {
    return []
  }

  const { envVars, errors } = getEnvironmentVariablesForIntegrations(integrations, {
    projectRootDirectory: workingDirectory,
  })

  // Log any errors from env var generation
  for (const error of errors) {
    debug(`Integration env var error: ${error.message}`)
  }

  // Inject env vars into process.env
  for (const { name, value } of envVars) {
    process.env[name] = value
  }

  debug(`Injected ${envVars.length} environment variables for integrations`)

  return envVars.map(v => v.name)
}
