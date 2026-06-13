Use `.venv/Scripts/python.exe` to run Python commands.

The code for the gitban card with id j97w5m has been approved as of commit eef8296. Please use the gitban tools to update the gitban card and begin the tasks required to properly complete it.

## Card Close-out tasks:
- Use gitban's checkbox tools to ensure all checkboxes on the card are checked off for completed work if not already. In particular, tick the **Code Review** box ("Code review is approved" / the Feature Work Phases "Code Review Approved" row) — this approval satisfies it.
- Do not mark any work as deferred. This card will be closed and archived and likely never seen again.
- Use gitban's complete card tool to submit and validate if not already completed.
- Close-out items:
  - The remaining unticked Completion-Checklist boxes (PR merge, prod deploy, monitoring, stakeholder notify, ticket close) are reviewer/dispatcher/PR-agent-owned or N/A fork-only per the card's own Validation table — leave those as-is; do not invent work to satisfy them.
  - The three non-blocking follow-up items the reviewer raised (L1 onboarding/CI install note, L2 timed-HMR assertion in step 3, L3 graph-level boundary CI gate) are being routed to the planner — do NOT implement them on this card.
- This card is in sprint LUIVIEW1. Do not push a feature branch or open a PR — the dispatcher owns sprint lifecycle.

Note: You are closing out this card only. The dispatcher owns sprint lifecycle — do not close, archive, or finalize the sprint itself.
