/**
 * `save.ts` — atomic persistence for `POST /api/project/save` (R6, the save-safety gate).
 *
 * Proves a user's `.deepnote` file can never be silently corrupted or clobbered by a save:
 *
 * - **Semantic round-trip, not byte-level.** `serializeDeepnoteFile` re-canonicalizes the file
 *   (sorting keys via `normalizeSortingKeys`, field order via `deepnoteFileSchema.parse`), so the
 *   first save of a not-yet-canonical file reformats untouched lines (the documented
 *   `bash-image.deepnote` 1261→1374-byte growth) — and is **idempotent thereafter** (a second
 *   no-op save is an empty `git diff`). Fidelity is `deserialize(serialize(p))` deep-equals `p`,
 *   never byte-equality with the original on-disk bytes (design doc R6).
 * - **Atomic temp-then-rename.** The canonical YAML is written to `path + '.tmp-<uuid>'` **in the
 *   same directory** (rename is only atomic within a filesystem), then `fs.rename`d over the
 *   target — a crash mid-write can never leave a half-written `.deepnote`. On any failure between
 *   write and rename the temp file is removed and the original is left untouched.
 * - **External-change detection (KD-7).** Before writing, the on-disk bytes are re-hashed; if that
 *   SHA-256 no longer equals the request's `openHash`, the save **refuses** with an
 *   `external-change` conflict carrying the current on-disk content — **no write is performed** —
 *   so a concurrent editor's work is never clobbered.
 *
 * This module is the package's only filesystem-write path. It depends on Node built-ins + the
 * `@deepnote/blocks` serializer; it must never import a frontend toolchain (ADR-007).
 */

import { createHash, randomUUID } from 'node:crypto'
import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { DeepnoteFile } from '@deepnote/blocks'
import { deserializeDeepnoteFile, serializeDeepnoteFile } from '@deepnote/blocks'

/**
 * Hex SHA-256 of raw bytes — byte-for-byte identical to `session.ts`'s `hashBytes`, which hashes the
 * on-disk Buffer directly. Hashing the raw Buffer (not a `toString('utf8')` decode) removes the
 * encoding asymmetry that previously sat between open-time and save-time hashing: a file with
 * invalid UTF-8 on disk would decode lossily and yield a *false* 409, whereas a raw-Buffer hash on
 * both sides is always consistent. The optimistic-concurrency token compares like-for-like.
 */
function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/**
 * The seam the atomic write goes through, so a test can inject a failure **between** `writeFile`
 * and `rename` and assert (a) no `.tmp-*` survives and (b) the original is untouched. In
 * production every member is the real `node:fs/promises` function; the default is wired in
 * {@link saveProject}'s signature so callers never pass it.
 */
export interface SaveFs {
  readFile: (path: string) => Promise<Buffer>
  writeFile: (path: string, data: string) => Promise<void>
  rename: (oldPath: string, newPath: string) => Promise<void>
  unlink: (path: string) => Promise<void>
}

/** The production filesystem binding — the real `node:fs/promises` calls (utf-8 text). */
const realFs: SaveFs = {
  readFile: path => readFile(path),
  writeFile: (path, data) => writeFile(path, data, 'utf8'),
  rename: (oldPath, newPath) => rename(oldPath, newPath),
  unlink: path => unlink(path),
}

/** Discriminated result of a save: a committed write, or a refused external-change conflict. */
export type SaveResult =
  | { conflict: false; savedHash: string; bytesWritten: number }
  | { conflict: true; currentProject: DeepnoteFile; currentHash: string }

/**
 * Atomically persist `project` to `path`, guarding against external changes since `openHash`.
 *
 * @param path     Absolute path of the opened `.deepnote` file.
 * @param project  The file to write (re-canonicalized by the serializer).
 * @param openHash The SHA-256 the file had when it was opened (the optimistic-concurrency token).
 * @param fs       Injected filesystem seam — defaults to the real `node:fs/promises`; overridden in
 *                 the atomicity test to fail between write and rename.
 *
 * Returns `{ conflict: true, … }` with **no write** when the on-disk hash ≠ `openHash`; otherwise
 * writes atomically and returns `{ conflict: false, savedHash, bytesWritten }`. Rethrows a genuine
 * write/rename error **after** removing the temp file, so the original is never left half-written.
 */
export async function saveProject(
  path: string,
  project: DeepnoteFile,
  openHash: string,
  fs: SaveFs = realFs
): Promise<SaveResult> {
  // External-change detection (KD-7): re-hash the *current* on-disk bytes before touching anything.
  // A missing file (first save of a brand-new path) is not a conflict — there is nothing to clobber.
  let current: Buffer | null
  try {
    current = await fs.readFile(path)
  } catch {
    current = null
  }
  if (current !== null) {
    const currentHash = sha256(current)
    if (currentHash !== openHash) {
      // Someone edited the file since we opened it. Refuse and hand back the on-disk content;
      // perform NO write so the concurrent edit is never clobbered.
      return {
        conflict: true,
        currentProject: deserializeDeepnoteFile(current.toString('utf8')),
        currentHash,
      }
    }
  }

  // Canonical YAML (zod-ordered, normalized sorting keys). Semantic round-trip, not byte-faithful.
  const yaml = serializeDeepnoteFile(project)

  // Temp-then-rename in the SAME directory (rename is only atomic within a filesystem). A unique
  // temp name avoids colliding with a concurrent save or a stale temp from a prior crash.
  const tmp = join(dirname(path), `${basename(path)}.tmp-${randomUUID()}`)
  try {
    await fs.writeFile(tmp, yaml)
    await fs.rename(tmp, path)
  } catch (err) {
    // Failure between write and rename (or during either): remove the temp so no `.tmp-*` survives,
    // and leave the original untouched. Swallow a cleanup error (the temp may not exist yet) but
    // rethrow the real failure so the caller can surface it.
    await fs.unlink(tmp).catch(() => {})
    throw err
  }

  // `savedHash` hashes the exact bytes written (the utf-8 encoding of `yaml`), so it equals the
  // `openHash` a subsequent re-open would compute via `session.ts`'s raw-Buffer `hashBytes` — the
  // session adopts it as the next `openHash`, making the same client's immediate re-save a no-op.
  const written = Buffer.from(yaml, 'utf8')
  return { conflict: false, savedHash: sha256(written), bytesWritten: written.byteLength }
}

/** The final path segment — the temp file sits beside the target, sharing its basename prefix. */
function basename(path: string): string {
  const idx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return idx === -1 ? path : path.slice(idx + 1)
}
