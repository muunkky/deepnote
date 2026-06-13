// Hash routing for notebook selection. The viewer is a read-only SPA, so a single
// linkable route — `#/notebook/<id>` — is all the navigation it needs (design KD-4:
// take-the-long-route means NOT over-building navigation for a viewer). Keeping the
// parse/format here, decoupled from React, makes both the hook and its tests trivial.

const NOTEBOOK_HASH_PREFIX = '#/notebook/'

/** Parse `#/notebook/<id>` → `<id>`; any other hash (including empty) → `undefined`. */
export function parseNotebookHash(hash: string): string | undefined {
  if (!hash.startsWith(NOTEBOOK_HASH_PREFIX)) return undefined
  const id = decodeURIComponent(hash.slice(NOTEBOOK_HASH_PREFIX.length))
  return id.length > 0 ? id : undefined
}

/** Format a notebook id into its canonical linkable hash. */
export function formatNotebookHash(notebookId: string): string {
  return `${NOTEBOOK_HASH_PREFIX}${encodeURIComponent(notebookId)}`
}
