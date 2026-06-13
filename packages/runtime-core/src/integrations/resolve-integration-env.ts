import type { DeepnoteFile } from '@deepnote/blocks'
import type { DatabaseIntegrationConfig } from '@deepnote/database-integrations'
import { collectRequiredIntegrationIds } from './collect-integrations'
import { type DebugLogger, injectIntegrationEnvVars } from './inject-integration-env-vars'
import { getDefaultIntegrationsFilePath, parseIntegrationsFile } from './parse-integrations'
import type { ValidationIssue } from './validation-issue'

/**
 * An optional hook that augments the locally-parsed integrations with remotely-fetched
 * ones. This is the **only** place an outbound network request can enter the integration
 * pipeline. {@link resolveIntegrationEnv} never calls the network itself — it is the
 * caller's responsibility to pass a fetcher, and to pass one that no-ops unless a token is
 * present. When omitted (the default, and the `runtime-server` local-first contract) the
 * resolved set is exactly the local file's integrations: **no request leaves the machine.**
 *
 * The cli supplies a fetcher backed by `fetchAndMergeApiIntegrations`, which itself returns
 * the local set untouched when no token is provided — so even the cli is local-first by
 * default; the token is what opts in.
 */
export type IntegrationFetcher = (params: {
  localIntegrations: DatabaseIntegrationConfig[]
  requiredIds: string[]
}) => Promise<DatabaseIntegrationConfig[]>

/** Inputs to {@link resolveIntegrationEnv}. */
export interface ResolveIntegrationEnvParams {
  /** The deserialized project — its SQL blocks determine the required integration IDs. */
  file: DeepnoteFile
  /** Project root: where the `.deepnote.env.yaml` lives and relative paths resolve against. */
  workingDirectory: string
  /** Restrict required-id collection to a single notebook (mirrors `run --notebook`). */
  notebookName?: string
  /**
   * Optional API augmentation hook (see {@link IntegrationFetcher}). Omit for the
   * local-first default — **no outbound request** is made and the result is the local set.
   */
  fetcher?: IntegrationFetcher
  /** Optional diagnostic logger forwarded to {@link injectIntegrationEnvVars}. */
  debug?: DebugLogger
}

/** The outcome of resolving + injecting the integration environment. */
export interface ResolveIntegrationEnvResult {
  /** The full resolved integration set (local, plus any fetched when a fetcher opted in). */
  integrations: DatabaseIntegrationConfig[]
  /** The names of the env vars injected into `process.env`. */
  injectedEnvVarNames: string[]
  /** Non-fatal issues from parsing the local integrations file. */
  issues: ValidationIssue[]
  /** The resolved path of the integrations file that was parsed. */
  integrationsFilePath: string
  /** The external integration IDs required by the project's SQL blocks. */
  requiredIds: string[]
}

/**
 * The shared integration-env wiring `deepnote run` and `deepnote serve` both use (KD-3 /
 * design-doc Phase 8). It performs the exact `parse → collect → (optional fetch) → inject`
 * sequence `run.ts`'s `setupProject` does, so a SQL block executed through the server
 * resolves its integration env to the **same values** `run` injects for the same project +
 * integrations file — the wiring is shared here, not re-implemented on each side.
 *
 * **Local-first (load-bearing).** This function performs **no network I/O**. The only way an
 * outbound request can happen is if the caller passes a {@link IntegrationFetcher}; with no
 * fetcher (the `runtime-server` default) the resolved set is exactly the local file's
 * integrations and nothing leaves the machine. The cli's fetcher is itself token-gated, so
 * the opt-in API fetch is off by default everywhere.
 */
export async function resolveIntegrationEnv(params: ResolveIntegrationEnvParams): Promise<ResolveIntegrationEnvResult> {
  const { file, workingDirectory, notebookName, fetcher, debug } = params

  const integrationsFilePath = getDefaultIntegrationsFilePath(workingDirectory)
  const parsed = await parseIntegrationsFile(integrationsFilePath)

  const requiredIds = collectRequiredIntegrationIds(file, notebookName)

  // Local-first: with no fetcher the local set is used as-is — NO outbound request.
  const integrations = fetcher
    ? await fetcher({ localIntegrations: parsed.integrations, requiredIds })
    : parsed.integrations

  const injectedEnvVarNames = injectIntegrationEnvVars(integrations, workingDirectory, debug)

  return {
    integrations,
    injectedEnvVarNames,
    issues: parsed.issues,
    integrationsFilePath,
    requiredIds,
  }
}
