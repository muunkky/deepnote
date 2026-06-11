Use `.venv/Scripts/python.exe` to run Python commands.

The code for the gitban card with id onwhhg has been approved as of commit c723e41. Please use the gitban tools to update the gitban card and begin the tasks required to properly complete it.

## Card Close-out tasks:

- Use gitban's checkbox tools to ensure all checkboxes on the card are checked off for completed work if not already.
  - Specifically: check the **Code Review Approved** box (Feature Work Phases table) and the **Code review is approved and PR is merged** box (Completion Checklist) — the reviewer explicitly cleared these in commit c723e41.
- Do not mark any work as deferred. This card will be closed and archived and likely never seen again.
- Use gitban's complete card tool to submit and validate if not already completed.
- Close-out items:
  - The reviewer confirmed the Code Review box can be checked.
  - The remaining unchecked card boxes (Deployment Plan Ready, Feature is deployed to production, Monitoring and alerting are configured, Stakeholders are notified of completion, Associated ticket/epic is closed) are correctly OUT OF SCOPE for this foundational Stream-A card — they belong to step 4 / sprint closeout, not this card. Leave them unchecked. Do not invent deployment/monitoring work to satisfy them.
  - No follow-up cards are required. The reviewer's single FOLLOW-UP note (`selector-wiring-pending` — no in-repo caller invokes `selectPythonSpec` yet) is NOT a gap in this card; it is the explicit scope of steps 3A (MCP) and 3B (CLI), which depend on this card's re-exports and are already tracked in the sprint.

Note: You are closing out this card only. The dispatcher owns sprint lifecycle — do not close, archive, or finalize the sprint itself. The exception is a sprint close-out card, which will be obvious from its content.
