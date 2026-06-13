/**
 * A single validation issue raised while parsing an integrations file.
 *
 * Lifted from `@deepnote/cli`'s `commands/validate` (KD-3) so the shared
 * `parseIntegrationsFile` can report issues without `runtime-server` reaching back
 * into cli (ADR-007 §1/§4). Structurally identical to the cli type; the cli's
 * `ValidationIssue` now re-exports this one so its `validate` command keeps the same
 * shape.
 */
export interface ValidationIssue {
  path: string
  message: string
  code: string
}
