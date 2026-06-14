// Hash routing for notebook selection. The viewer is a read-only SPA, so a single
// linkable route — `#/notebook/<id>` — is all the navigation it needs (design KD-4:
// take-the-long-route means NOT over-building navigation for a viewer). Keeping the
// parse/format here, decoupled from React, makes both the hook and its tests trivial.

const NOTEBOOK_HASH_PREFIX = '#/notebook/'

/** Parse `#/notebook/<id>` → `<id>`; any other hash (including empty) → `undefined`. */
export function parseNotebookHash(hash: string): string | undefined {
  if (!hash.startsWith(NOTEBOOK_HASH_PREFIX)) return undefined
  const encoded = hash.slice(NOTEBOOK_HASH_PREFIX.length)
  let id: string
  try {
    id = decodeURIComponent(encoded)
  } catch {
    // A hand-edited or pasted URL can carry malformed percent-encoding (e.g. `#/notebook/%`),
    // on which `decodeURIComponent` throws `URIError`. This parse runs synchronously inside the
    // shell's render path (useState initializer + hashchange handler), so an uncaught throw would
    // blank the whole viewer instead of just failing to resolve a route. Fall back to the raw
    // slice — a route that matches no notebook id resolves to the default notebook, not a crash.
    id = encoded
  }
  return id.length > 0 ? id : undefined
}

/** Format a notebook id into its canonical linkable hash. */
export function formatNotebookHash(notebookId: string): string {
  return `${NOTEBOOK_HASH_PREFIX}${encodeURIComponent(notebookId)}`
}
