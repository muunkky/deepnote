---
verdict: APPROVAL
card_id: gwblh2
review_number: 1
commit: dfbc637
date: 2026-06-12
has_backlog_items: false
---

# Review: gwblh2 — decouple serve.test suite-6 runAction fixture from process.cwd

## Summary

APPROVAL. The fix replaces cwd-relative fixture resolution with file-relative
resolution in `packages/cli/src/commands/serve.test.ts`, exactly as the card
prescribed and exactly mirroring the pattern already present in the same file
(line 412). The change is behavior-preserving from the repo root and removes
the cwd coupling that produced an opaque `SIGINT handler was never registered`
failure when vitest was invoked from a non-root directory.

## Gate 1 — completion claim

Pass. This is a test-only fix that changes *how a fixture path constant is
computed*, not test assertions or runtime behavior — it preserves the existing
assertions verbatim. The card carries a full bug-fix template with a sound
root-cause analysis, a legitimate reproduction (the existing suite run from a
non-root cwd), a fix strategy, and a TDD/verification plan whose checkboxes, if
honestly ticked, prove correctness: suite green from both root and non-root cwd,
full `pnpm test` green, no new opaque failure modes, negative-path test still
asserts not-found behavior. Checkbox *design* is adequate; per the dispatcher
note the boxes are unticked only because the executor's turn ended before
close-out, and the dispatcher independently verified the fix. No card-structure
blocker. No capstone is required for a one-file, behavior-preserving test-env
fix — the suite passing from the previously-failing cwd is itself the
end-to-end proof, and it is exercised.

## Gate 2 — implementation quality

Pass. Findings:

1. **Correct anchoring.** `TEST_DIR = dirname(fileURLToPath(import.meta.url))`
   resolves to `packages/cli/src/commands`; `REPO_ROOT = resolve(TEST_DIR,
   '..','..','..','..')` correctly walks four levels up to the repo root
   (commands → src → cli → packages → root). Verified by path math and by
   confirming `<repo-root>/examples/1_hello_world.deepnote` exists. The fixture
   constant and the line-279 negative-path (`does-not-exist.deepnote`) are both
   re-anchored to `REPO_ROOT`, eliminating every `process.cwd()` usage in the
   file (grep confirms none remain).

2. **Consistency with in-file convention.** The new `TEST_DIR` derivation is
   identical in form to the pre-existing `const here = dirname(fileURLToPath(
   import.meta.url))` at line 412. No new imports were needed — `fileURLToPath`,
   `dirname`, and `resolve` were already imported (lines 2–3). The introduced
   `REPO_ROOT` constant is a reasonable, DRY shared anchor for both call sites.

3. **Comment quality.** The replacement comment explains *why* the anchor moved
   off `process.cwd()` and points the next reader at the mirrored pattern below.
   This is the right kind of inline documentation for a non-obvious test detail.

4. **No lazy solve.** The fix addresses the root cause (cwd coupling) rather
   than masking the symptom (e.g. forcing a cwd, or loosening the harness
   assertion). It is the better long-term solution and makes the suite portable
   for the step-8 contrib-slice CI work the card cites.

5. **TDD posture.** The reproduction is the existing suite under a non-root cwd,
   which is the legitimate way to demonstrate a test-env-coupling bug — there is
   nothing to "test-first" beyond running the suite from the failing cwd. No
   superficial or reverse-engineered test was added or needed.

## Verification performed

- Read the full diff (`dfbc637`); scope is a single file,
  `packages/cli/src/commands/serve.test.ts`, two hunks.
- Confirmed the path arithmetic and that the anchored fixture exists at the
  repo root.
- Ran the bug repro: `pnpm exec vitest run src/commands/serve.test.ts` from
  inside `packages/cli` (the previously-failing non-root cwd) → **19/19 pass**.
- Confirmed no remaining `process.cwd()` usage in the file.

## FOLLOW-UP

None. The card's own "process improvement" note (prefer import.meta-anchored
fixtures repo-wide / optional lint for `process.cwd()` in test files) is
explicitly optional and out of scope; it is not a concrete, anchored defect in
this diff and does not warrant a follow-up card.

## Close-out actions

- Tick the card's outstanding verification/test-plan/completion checkboxes to
  reflect the work that is in fact complete (the dispatcher and this review have
  both verified the suite passes from root and non-root cwd).
- Mark the associated sqm7ox review-1 finding L1 (test-env-coupling) closed.
