import { databaseIntegrationConfigSchema } from '@deepnote/database-integrations'
import { z } from 'zod'

/**
 * Schema for the integrations YAML file structure.
 *
 * Lifted verbatim from `@deepnote/cli` (KD-3) into the shared `runtime-core` home so
 * both `cli` and `runtime-server` parse the integrations file with the identical
 * schema, no `runtime-server → cli` edge (ADR-007 §1/§4). Uses loose validation to
 * accept any array of objects, allowing per-entry validation to report specific issues.
 *
 * Example file format:
 * ```yaml
 * integrations:
 *   - id: my-postgres
 *     name: My PostgreSQL
 *     type: pgsql
 *     metadata:
 *       host: localhost
 *       ...
 * ```
 */
export const baseIntegrationsFileSchema = z.object({
  integrations: z.array(z.record(z.unknown())).optional().default([]),
})

export type BaseIntegrationsFile = z.infer<typeof baseIntegrationsFileSchema>

export const integrationsFileSchema = z.object({
  integrations: z.array(databaseIntegrationConfigSchema),
})

export type IntegrationsFile = z.infer<typeof integrationsFileSchema>
