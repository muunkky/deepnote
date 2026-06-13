Use `.venv/Scripts/python.exe` to run Python commands.

The code for the gitban card with id 4p6tbf has been approved as of commit 17c2cf2. Please use the gitban tools to update the gitban card and begin the tasks required to properly complete it.

## Card Close-out tasks:
- Use gitban's checkbox tools to ensure all checkboxes on the card are checked off for completed work if not already.
- Do not mark any work as deferred. This card will be closed and archived and likely never seen again.
- Use gitban's complete card tool to submit and validate if not already completed.
- Close-out items:
  - Tick "Code Review Approved" (Feature Work Phases table) — the gitban-reviewer approved at commit 17c2cf2.
  - Tick "Code review is approved and PR is merged" (Completion Checklist) per the approval; PR/merge is dispatcher/PR-owned for this sprint.
  - The Deploy/Monitoring/Stakeholder boxes ("Deployment Plan Ready", "Feature is deployed to production", "Monitoring and alerting are configured", "Stakeholders are notified of completion", "Follow-up actions are documented", "Associated ticket/epic is closed") are N/A for the fork-only showcase milestone — tick-as-N/A so the card is complete; there is no deploy/monitoring surface.
- If this card is not in a sprint, push the feature branch and create a draft PR to main using `gh pr create --draft`. Do not merge it — the user reviews and merges.

Note: You are closing out this card only. The dispatcher owns sprint lifecycle — do not close, archive, or finalize the sprint itself. The exception is a sprint close-out card, which will be obvious from its content.
