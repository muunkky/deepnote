Use `.venv/Scripts/python.exe` to run Python commands.

The code for the gitban card with id 4svfd0 has been approved as of commit 4edb127. Please use the gitban tools to update the gitban card and begin the tasks required to properly complete it.

## Card Close-out tasks:
- Use gitban's checkbox tools to ensure all checkboxes on the card are checked off for completed work if not already.
- Do not mark any work as deferred. This card will be closed and archived and likely never seen again.
- Use gitban's complete card tool to submit and validate if not already completed.
- Close-out items:
  - **Fix the doc-count-drift in your cycle-1 Executor Close-out prose.** The close-out claims "22/22" new renderer tests (6/6/5), but the actual committed suite collects/passes **15** tests in the studio vitest project (viz 5, big-number 5, image 5). The implementation and capstones are correct and green — only the prose count is imprecise. Re-run the three new test files, then edit the Executor Close-out section of the card so the test-count claim reflects the real run (15), not the inflated figure. This is a card-prose correction only — do not change any implementation or test code.
- If this card is not in a sprint, push the feature branch and create a draft PR to main using `gh pr create --draft`. Do not merge it — the user reviews and merges.

Note: You are closing out this card only. The dispatcher owns sprint lifecycle — do not close, archive, or finalize the sprint itself. The exception is a sprint close-out card, which will be obvious from its content.
