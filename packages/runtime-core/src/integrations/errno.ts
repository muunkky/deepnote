/**
 * Narrow an unknown thrown value to a Node `ErrnoException` with a given `code`.
 *
 * Lifted from `@deepnote/cli`'s file-resolver (KD-3) so the integration helpers that
 * treat a missing integrations file as "no integrations" (rather than an error) can
 * live in the shared `runtime-core` home both `cli` and `runtime-server` depend on,
 * without cross-importing cli (ADR-007 §1/§4 one-way arrow). Pure predicate, no
 * behavior change from the cli original.
 */
export function isErrnoException(error: unknown, code: string): boolean {
  return typeof error === 'object' && error != null && 'code' in error && error.code === code
}

/** True when `error` is a Node `ENOENT` (file/dir does not exist). */
export function isErrnoENOENT(error: unknown): boolean {
  return isErrnoException(error, 'ENOENT')
}
