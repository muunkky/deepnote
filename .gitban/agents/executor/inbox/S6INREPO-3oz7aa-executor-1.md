Use `.venv/Scripts/python.exe` to run Python commands.

The code for the gitban card with id 3oz7aa has been approved as of commit 1cec326. Please use the gitban tools to update the gitban card and begin the tasks required to properly complete it.

## Card Close-out tasks:

- Use gitban's checkbox tools to ensure all checkboxes on the card are checked off for completed work if not already.
- Do not mark any work as deferred. This card will be closed and archived and likely never seen again.
- Use gitban's complete card tool to submit and validate if not already completed.
- Close-out items:
  - The executor's mid-run socket death (commit 1cec326 salvaged by the dispatcher) left the card's DoD / Observable / TDD-workflow / Test-Plan / Verification / Regression-Prevention / Completion checkboxes unticked. All of that work is satisfied and verified by commit 1cec326 (typecheck clean; runtime-core 228/228, mcp python-env 13/13, cli run 156/156 green; biome clean on all six changed files). Reconcile the card's checkbox state to reflect the salvaged, verified work — tick every box whose work is genuinely done. Do not tick the N/A staging/production-deploy rows as completed work; they are already marked `[x] N/A` and stay that way. The follow-up cards ohoh63 (CLI bare-python hint) and fkxnne (executeAgentBlock tool-wiring/finally coverage) are already tracked and correctly out of scope for this card — do not create new cards for them.

Note: You are closing out this card only. The dispatcher owns sprint lifecycle — do not close, archive, or finalize the sprint itself. The exception is a sprint close-out card, which will be obvious from its content. This card (3oz7aa) sequences as the last work card before the S6INREPO closeout card o5pg2k; o5pg2k is owned by the dispatcher, not you.
