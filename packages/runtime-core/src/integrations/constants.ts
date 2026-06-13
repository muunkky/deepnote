/**
 * Integration constants shared by the env-wiring helpers.
 *
 * Lifted verbatim from `@deepnote/cli`'s `constants.ts` (KD-3) so both `cli` and
 * `runtime-server` consume the same values from the shared `runtime-core` home —
 * the server resolves the integrations file by the same name and excludes the same
 * built-ins `deepnote run` does, guaranteeing parity. Pure relocation, no value
 * change.
 */

/** Built-in integrations that don't require external configuration. */
export const BUILTIN_INTEGRATIONS = new Set(['deepnote-dataframe-sql', 'pandas-dataframe'])

/** Default integrations file name, resolved relative to the project directory. */
export const DEFAULT_INTEGRATIONS_FILE = '.deepnote.env.yaml' as const
