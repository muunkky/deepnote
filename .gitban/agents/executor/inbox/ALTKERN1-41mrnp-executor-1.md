Use `.venv/Scripts/python.exe` to run Python commands.

The code for the gitban card with id 41mrnp has been approved as of commit 079c133. Please use the gitban tools to update the gitban card and begin the tasks required to properly complete it.

## Card Close-out tasks:
- Use gitban's checkbox tools to ensure all checkboxes on the card are checked off for completed work if not already.
- Do not mark any work as deferred. This card will be closed and archived and likely never seen again.
- Use gitban's complete card tool to submit and validate if not already completed.
- Close-out items: None. The reviewer flagged two non-blocking follow-up items (L1 test-coverage gap on the agent-block hard-fail path; L2 cross-card invariant about the guarded `_dntk` DataFrame preamble on plain code). Both have been routed to the planner — do NOT attempt them here. They require new tests / belong to the real-kernel card.
- This card is in sprint ALTKERN1, so do NOT push a feature branch or open a PR — the dispatcher owns sprint lifecycle.

The "Code Review Approved" checkbox in the Feature Work Phases table and the "Code review is approved" item in the Completion Checklist can now be checked (the reviewer flipped the card out of in_progress on approval). The PR-merge / deployment / monitoring / stakeholder-notification / associated-ticket boxes remain owned by later stages — leave those unchecked.

Note: You are closing out this card only. The dispatcher owns sprint lifecycle — do not close, archive, or finalize the sprint itself. The exception is a sprint close-out card, which will be obvious from its content.
