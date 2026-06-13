---
verdict: APPROVAL
card_id: e6e3lt
review_number: 2
commit: 31f9a87
date: 2026-06-12
has_backlog_items: false
---

# Review — step 4B save-api hardening reopen (L1/L2/L3)

## Verdict: APPROVAL (Gate 1 PASS, Gate 2 PASS)

This is review cycle 2 of a reopened card. Cycle 1 approved the save-safety gate at
`d890e4d` and surfaced three follow-ups (L1 input-validation-gap, L2 hash-encoding-edge,
L3 type-reuse). The planner reopened them onto this card because they are tightly coupled
to 4B's theme, small, and touch only files this card already owns. Commit `31f9a87`
addresses all three. Scope was honored: only `router.ts`, `save.ts`, and
`router-save.test.ts` were touched — `ApiProject` / the open side (backlog `ad6kmb`) and
the already-approved atomic-write/round-trip/idempotence/409 work were left untouched.

## Gate 1 — completion claim (PASS)

The card's Definition of Done (Intent + four observable capstones) was already validated
strong in cycle 1 and is unchanged. The three reopen items carry their own acceptance
checkboxes in the card body; each maps to a concrete, testable condition. The L1 checkbox
in particular names the unfakeable verification (a partially-constructed `DeepnoteFile`
body → 400 with no write), which is exactly what the new test walks. Checkbox integrity
verified against the diff — every `[x]` reopen item has real evidence in the commit.

## Gate 2 — implementation quality (PASS)

**L1 (input-validation gap → 400, not 500).** `handleSave` now runs
`deepnoteFileSchema.safeParse(parsed.project)` inside the body-parse `try` block, *before*
`session.save`, and throws (→ 400) on schema failure. Verified the fix is structurally
correct: the validation sits ahead of the atomic-write path, so a schema-invalid project
can never reach `serializeDeepnoteFile`, can never throw the zod error that the write-path
`try/catch` mapped to 500, and can never perform a write. `deepnoteFileSchema` is a runtime
`z.object` value export from `@deepnote/blocks` (barrel-exported at
`packages/blocks/src/index.ts:33`), so the value import is valid. ADR-007's
runtime-import-free invariant applies only to `api-types.ts` (guarded by
`api-types-no-runtime-import.test.ts`, still green); `router.ts` already value-imports from
`@deepnote/blocks` is consistent with `session.ts`/`save.ts` precedent — no ADR drift.

The new `router-save.test.ts` case is genuine TDD-shaped and proves the right thing: it
posts `{ project: {}, openHash: open.openHash }` with the **correct** on-disk hash echoed
from `GET /api/project`. Because the hash is correct, the 400 cannot come from a 409
external-change short-circuit — it is unambiguously the schema-validation failure. The test
also asserts the on-disk bytes are unchanged (`readFileSync(target) === before`), pinning
the no-write guarantee. Reads as a specification, not reverse-engineered from the impl.

**L2 (hash-encoding asymmetry).** The executor took the no-tech-debt symmetric fix rather
than the comment escape hatch. `save.ts`'s `sha256` now hashes the raw `Buffer`
(`createHash('sha256').update(bytes).digest('hex')`) on both the on-disk conflict-detection
side (`sha256(current)`) and the written-bytes side (`sha256(Buffer.from(yaml,'utf8'))`).
Verified byte-for-byte identical to `session.ts`'s `hashBytes` (line 119–120). The
open-time / save-time `toString('utf8')` divergence that could yield a false 409 on
invalid-UTF-8 on-disk bytes is genuinely removed; the optimistic-concurrency token now
compares like-for-like end to end. The `savedHash` still equals the `openHash` a re-open
would compute, so the same-client immediate-re-save no-op invariant is preserved — confirmed
by the still-green idempotence and 409 HTTP tests (for canonical UTF-8 fixtures the
raw-Buffer and `update(text,'utf8')` digests are identical, so no existing assertion
shifted). Note the conflict path still uses `current.toString('utf8')` to *deserialize*
`currentProject` — that is content parsing, not hashing, and is correct to leave.

**L3 (contract-type the wire bodies).** The 409 and 200 bodies in `handleSave` are now
annotated `SaveConflictResponse` / `SaveProjectResponse` (defined in `api-types.ts` for
exactly these shapes). `tsc --noEmit` clean confirms the inline literals are
assignment-compatible with the canonical contract types, so future contract drift becomes a
compile error. Cosmetic but correctly done.

## Verification run

- **Full runtime-server suite: 59/59 PASS** (`VITEST_MAX_WORKERS=2 VITEST_TEST_TIMEOUT=30000`),
  including `router-save.test.ts` now 6 tests (the new L1 case), `save.test.ts` 8, and the
  `api-types-no-runtime-import.test.ts` invariant (2) still green.
- **`biome check src/router.ts src/save.ts src/router-save.test.ts`: clean** (no fixes).
- **`tsc --noEmit`: clean.**

The spell-check `Files checked: 0` worktree quirk the executor flagged is an environment
glob-resolution issue (reproduces on unchanged tracked files), not a content problem; the
additions use only established project vocabulary. Re-verify from the parent at PR/closeout
time per the executor's note.

Code meets the gold standard for the change types involved (route input validation,
optimistic-concurrency hashing, wire-contract typing). Approved.

## FOLLOW-UP

None. The three follow-ups from cycle 1 are resolved by this commit. The pre-existing
backlog item `ad6kmb` (open→save `ApiProject` reconstruction gap) remains correctly
out of scope and tracked; nothing in this diff makes it worse.
