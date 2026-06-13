---
verdict: APPROVAL
card_id: e6e3lt
review_number: 1
commit: d890e4d
date: 2026-06-12
has_backlog_items: true
---

# Review — step 4B save-api (the save-safety gate)

## Verdict: APPROVAL

## Gate 1 — completion claim (PASS)

The card carries a strong Definition of Done. The **Intent** paragraph is plain-English and
user-observable ("open a project, save it, `git diff` it — a second no-op save shows no diff; edit
the file in another editor, then save, and the API returns a conflict rather than destroying the
other edit"), and a reasonable engineer can sanity-check the diff against it without reading the
implementation.

Four Observable capstones, each unfakeable by a mock because they run the **real**
serializer/deserializer over the **real** `bash-image.deepnote` fixture:

1. No content loss (semantic deep-equal round-trip) — `save.test.ts` Capstone 1.
2. Idempotence (no-op re-save is byte-identical / empty diff; first save reformats and that is
   pinned as expected) — Capstone 2, plus the HTTP-level empty-diff assertion in
   `router-save.test.ts`.
3. Atomicity (same-dir temp-then-rename, no `.tmp-*` survivor on success OR on an **injected**
   failure between write and rename, original byte-for-byte intact) — Capstone 3.
4. External-change detection (on-disk SHA-256 ≠ `openHash` → conflict, **no write**) — Capstone 4
   and the `409` wire-shape test.

This is a genuinely composed feature and the capstones exercise the assembled behavior end-to-end
(over `createServer` + real `fetch` for the wire shapes, over the real fixture for round-trip), not
per-part-only. Checkbox integrity verified against the diff — every checked capstone has a walked
test path. Gate 1 passes.

## Gate 2 — implementation quality (PASS)

Reviewed `save.ts`, `session.ts`, `router.ts`, `api-types.ts`, and both test files against the
design doc's "Save round-trip (R6)" section, KD-7, and ADR-007.

- **Atomic write is correct.** Temp name is `dirname(path) + basename(path) + '.tmp-' + randomUUID()`
  — same directory (rename-atomicity precondition), unique (no collision with a concurrent save or a
  stale temp). On any failure the temp is unlinked (cleanup error swallowed) and the real error is
  rethrown, leaving the original untouched. Matches the design-doc pseudocode.
- **External-change guard is correct and fail-safe.** A missing target is explicitly *not* a conflict
  (first save of a brand-new path), and a hash mismatch returns the conflict result with no write.
  The `409` path is reached before `serializeDeepnoteFile` is ever called, so a concurrent edit is
  never clobbered.
- **`bytesWritten` is an improvement over the doc.** The pseudocode used `yaml.length` (UTF-16 code
  units); the implementation uses `Buffer.byteLength(yaml, 'utf8')` — the true on-disk byte count.
  Correct call.
- **Session `openHash` adoption is right.** On a committed write the session adopts `savedHash` as
  its next `openHash`, so the same client's immediate re-save is a no-op rather than a false
  self-conflict; on a conflict the `openHash` is left unchanged. I verified the three hashing styles
  in play (session `hashBytes` over the raw Buffer, `save.ts` `sha256` over the canonical YAML
  string, and `save.ts`'s re-hash of `current.toString('utf8')`) all agree for valid UTF-8, so the
  adopt-and-re-save loop hashes consistently end-to-end. (See L2 for the one contrived edge.)
- **ADR-007 invariant preserved.** The three new `api-types.ts` declarations are `interface`s with
  `import type`-only references; the runtime-import-free invariant (and its dedicated
  `api-types-no-runtime-import.test.ts`) still holds. `save.ts` correctly lives outside the
  type-only module and imports the `@deepnote/blocks` serializer at runtime.
- **TDD discipline is sound.** The tests read as a specification, not as reverse-engineered
  assertions: deep-equal behavior, byte-level idempotence, an injected mid-write crash, no-clobber on
  mismatch, plus edge/failure cases (brand-new path, malformed body, missing `openHash`). Failure
  cases are first-class, not bolted on. Not test-after.
- **Verification run.** `src/save.test.ts` (8) + `src/router-save.test.ts` (5) = 13 passing; biome
  clean on all six changed files.

Code meets the gold standard for an atomic filesystem-write path with optimistic concurrency. Approved.

## FOLLOW-UP

**L1 — `input-validation-gap` (route returns 500 for a malformed `project` body).**
`handleSave` validates the body shallowly: `openHash` is a string and `project` is a non-null
object. A request with a *valid* `openHash` but a structurally-invalid `project` (e.g.
`{ project: {}, openHash: "<correct-on-disk-hash>" }`) passes that check, reaches
`saveProject → serializeDeepnoteFile(project)`, throws a zod parse error, and is mapped by the outer
try/catch to **500**. The design doc classifies a malformed body as **400**, and returning 500 for
client-supplied garbage both mis-signals the error class and leaks the internal serializer error
message to the client. Failure mode: an editor that posts a partially-constructed `DeepnoteFile`
(precisely the `ad6kmb` open→save reconstruction gap) gets an opaque 500 instead of an actionable
400. Worth a `parse-then-validate` step (run the project through the schema before the write and
return 400 on failure) on a follow-up card.

**L2 — `hash-encoding-edge` (raw-buffer vs utf8-decoded hash divergence on invalid UTF-8).**
`session.ts` computes `openHash = hashBytes(bytes)` over the raw on-disk Buffer, while `save.ts`
re-hashes the current bytes as `sha256(current.toString('utf8'))`. These agree for all valid UTF-8
(verified), and `.deepnote` files are always written as canonical UTF-8 by the serializer, so in
practice the loop is consistent. The only divergence is a file containing invalid UTF-8 byte
sequences on disk, where `toString('utf8')` lossy-decodes and the two hashes differ — producing a
*false* 409. That outcome is fail-safe (refuse-to-write, never clobber/corrupt), and the input is
contrived, so this is a low-priority robustness note rather than a correctness bug. If addressed,
hash both sides over the raw Buffer to remove the asymmetry.

**L3 — `type-reuse` (inline 409 body not typed as `SaveConflictResponse`).** `handleSave`
constructs the conflict response inline (`{ error: 'external-change', currentProject, currentHash }`)
rather than typing it as the `SaveConflictResponse` interface that was added to `api-types.ts` for
exactly this shape. The shapes match today, but an inline literal won't get a compile error if the
contract type later drifts. Annotating the inline object with `SaveConflictResponse` (and likewise
the 200 body with `SaveProjectResponse`) ties the wire shape to the canonical contract. Cosmetic;
non-blocking.
