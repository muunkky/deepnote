Use `.venv/Scripts/python.exe` to run Python commands.

The code for the gitban card with id gwblh2 has been approved as of commit dfbc637. Please use the gitban tools to update the gitban card and begin the tasks required to properly complete it.

## Card Close-out tasks:
- Use gitban's checkbox tools to ensure all checkboxes on the card are checked off for completed work if not already.
- Do not mark any work as deferred. This card will be closed and archived and likely never seen again.
- Use gitban's complete card tool to submit and validate if not already completed.
- Close-out items:
  - Tick the card's outstanding verification / test-plan / completion checkboxes to reflect the work that is in fact complete: the suite passes from both the repo root and a non-root cwd (verified by the dispatcher and confirmed by the reviewer running `pnpm exec vitest run src/commands/serve.test.ts` from inside `packages/cli` → 19/19 pass), full `pnpm test` is green, the negative-path test still asserts not-found behavior, and no new opaque failure modes were introduced.
  - Mark the associated sqm7ox review-1 finding L1 (test-env-coupling) closed — tick the card's final "Associated review finding (sqm7ox L1) is closed" checkbox.

Note: You are closing out this card only. The dispatcher owns sprint lifecycle — do not close, archive, or finalize the sprint itself. The exception is a sprint close-out card, which will be obvious from its content.
