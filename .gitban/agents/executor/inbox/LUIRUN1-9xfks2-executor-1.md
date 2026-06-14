Use `.venv/Scripts/python.exe` to run Python commands.

The code for the gitban card with id 9xfks2 has been approved as of commit 74267c5. Please use the gitban tools to update the gitban card and begin the tasks required to properly complete it.

## Card Close-out tasks:
- Use gitban's checkbox tools to ensure all checkboxes on the card are checked off for completed work if not already. In particular, set the **Code Review Approved** checkbox (Feature Work Phases → Code Review) — it is approved as of commit 74267c5.
- Do not mark any work as deferred. This card will be closed and archived and likely never seen again.
- Use gitban's complete card tool to submit and validate if not already completed.
- Close-out items (review/dispatch-owned — set those that are yours; the dispatch/PR phase owns the rest):
  - Code Review Approved checkbox → set on this approval (commit 74267c5).
  - The card correctly leaves PR-merge, deploy/monitoring/stakeholder/ticket-close, and the "all tests incl. e2e/performance" checklist boxes for the dispatch/PR phase — leave those to the dispatcher.
- If this card is not in a sprint, push the feature branch and create a draft PR to main using `gh pr create --draft`. Do not merge it — the user reviews and merges. (This card IS in sprint LUIRUN1, so do NOT push or open a PR.)

Note: You are closing out this card only. The dispatcher owns sprint lifecycle — do not close, archive, or finalize the sprint itself. The exception is a sprint close-out card, which will be obvious from its content.
