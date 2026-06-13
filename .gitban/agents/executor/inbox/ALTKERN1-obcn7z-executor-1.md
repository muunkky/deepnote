Use `.venv/Scripts/python.exe` to run Python commands.

The code for the gitban card with id obcn7z has been approved as of commit e27424a. Please use the gitban tools to update the gitban card and begin the tasks required to properly complete it.

## Card Close-out tasks:
- Use gitban's checkbox tools to ensure all checkboxes on the card are checked off for completed work if not already. In particular, the "Code Review" rows (Feature Work Phases → Code Review Approved; Validation & Closeout → Code Review) can now be marked approved given this APPROVAL verdict. Leave genuinely-PR/deploy-stage boxes (PR merged, deployed to production, monitoring/alerting configured, stakeholders notified, associated ticket closed) unchecked — those belong to the dispatcher/PR lifecycle, not this card close-out.
- Do not mark any work as deferred. This card will be closed and archived and likely never seen again.
- Use gitban's complete card tool to submit and validate if not already completed.
- Close-out items:
  - **L1 (repo hygiene — one-line .gitignore add):** Add `.venv/` to the repo-root `.gitignore`. The CI `integration-kernels` job creates its own per-run venv, so this is not load-bearing, but a stray local `.venv` (~1.1G) provisioned by an agent could be accidentally staged. This is a trivial one-line edit — make it now as part of close-out. Verify the entry doesn't already exist before adding (avoid a duplicate line). This does NOT require rerunning the test suite or new documentation.

Note: You are closing out this card only. The dispatcher owns sprint lifecycle — do not close, archive, or finalize the sprint itself. The exception is a sprint close-out card, which will be obvious from its content.
