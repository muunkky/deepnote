Use `.venv/Scripts/python.exe` to run Python commands.

The code for the gitban card with id 83gnbp has been approved as of commit e761ad1. Please use the gitban tools to update the gitban card and begin the tasks required to properly complete it.

## Card Close-out tasks:
- Use gitban's checkbox tools to ensure all checkboxes on the card are checked off for completed work if not already.
  - Specifically: check the **Code Review Approved** box (Feature Work Phases table) — the reviewer approved this card.
  - Leave Deployment Plan / Staging / Production / Monitoring / Stakeholder-notified / Ticket-closed boxes as-is: they are correctly N/A (fork-only) or post-merge per the review.
- Do not mark any work as deferred. This card will be closed and archived and likely never seen again.
- Use gitban's complete card tool to submit and validate if not already completed.
- Close-out items: the `renderer-scaffold-dedup` follow-up has been routed to the planner (BLOCKED on a future third highlighted-source renderer); it is not your responsibility on this card.
- If this card is not in a sprint, push the feature branch and create a draft PR to main using `gh pr create --draft`. Do not merge it — the user reviews and merges.

Note: You are closing out this card only. The dispatcher owns sprint lifecycle — do not close, archive, or finalize the sprint itself. The exception is a sprint close-out card, which will be obvious from its content.
