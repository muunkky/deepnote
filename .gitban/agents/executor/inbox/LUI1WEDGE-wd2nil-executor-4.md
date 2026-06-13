Use `.venv/Scripts/python.exe` to run Python commands.

The code for the gitban card with id wd2nil has been approved as of commit 1c97429. Please use the gitban tools to update the gitban card and begin the tasks required to properly complete it.

## Card Close-out tasks:
- Use gitban's checkbox tools to ensure all checkboxes on the card are checked off for completed work if not already.
  - NOTE on `[ ] All tests pass in CI`: per reviews 1–3 this box is intentionally UNCHECKED — no `integration-kernels` job has run for `1c97429`. The reviewer explicitly affirmed (review 3) this is the honest state, NOT an integrity violation: it is the dispatcher/CI confirmation step, not something the executor can or should fabricate. Do NOT tick it. Leave it unchecked.
- Do not mark any work as deferred. This card will be closed and archived and likely never seen again.
- Use gitban's complete card tool to submit and validate if not already completed.
- Close-out items: none. (The two FOLLOW-UP items, L1 teardown-listener-reentrancy and L2 drain-tuning-fragility, are routed to the planner this cycle — they require code/test changes that exceed close-out scope and must NOT be folded in here.)

Note: You are closing out this card only. The dispatcher owns sprint lifecycle — do not close, archive, or finalize the sprint itself. The exception is a sprint close-out card, which will be obvious from its content.
