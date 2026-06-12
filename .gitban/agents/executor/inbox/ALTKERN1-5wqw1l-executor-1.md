Use `.venv/Scripts/python.exe` to run Python commands.

The code for the gitban card with id 5wqw1l has been approved as of commit 80a2bf8. Please use the gitban tools to update the gitban card and begin the tasks required to properly complete it.

## Card Close-out tasks:
- Use gitban's checkbox tools to ensure all checkboxes on the card are checked off for completed work if not already.
- Do not mark any work as deferred. This card will be closed and archived and likely never seen again.
- Use gitban's complete card tool to submit and validate if not already completed.
- Close-out items: None beyond standard close-out. The reviewer confirmed the integration/e2e and deployment checkboxes correctly remain Sub-phase 1C (card obcn7z) / PR-step scope — those are NOT this card's work and must not be falsely ticked. Tick only the boxes that are genuinely true for Sub-phase 1A (the mocked, in-CI deliverables). The three FOLLOW-UP items (L1 live-artifact-gap, L2 transport-decode-gap, L3 config-only-flag) are non-blocking and are being routed to the planner — do not attempt them here.
- If this card is not in a sprint, push the feature branch and create a draft PR to main using `gh pr create --draft`. Do not merge it — the user reviews and merges.

Note: You are closing out this card only. The dispatcher owns sprint lifecycle — do not close, archive, or finalize the sprint itself. The exception is a sprint close-out card, which will be obvious from its content. This card (5wqw1l) is a feature card in sprint ALTKERN1, not the closeout card (dn929q), so do not touch the sprint.
