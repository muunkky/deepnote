Use `.venv/Scripts/python.exe` to run Python commands.

# Executor directive — LUI1WEDGE / x71bcm (executor-2, APPROVAL close-out)

This is the **close-out** directive for review cycle 2. (The sibling
`LUI1WEDGE-x71bcm-executor-2.md` was the cycle-2 *reopen* directive — that work is done; this
file supersedes it now that the reopen re-review returned APPROVAL.)

## ⚠️ BRANCH OVERRIDE

This sprint runs on **`milestone/m3-local-ui`**, NOT `sprint/LUI1WEDGE`. There is no
`sprint/LUI1WEDGE` branch. Do not push a feature branch or open a PR — this card is in a sprint,
the dispatcher owns sprint lifecycle. Commit `.gitban/` board changes only; never mix with code.

## Verdict

The code for gitban card **x71bcm** has been **APPROVED** (cycle 2, L1 reopen re-review) as of
commit **b10b73c**. Reviewer verdict: APPROVAL — Gate 1 (reopen structure) PASS, Gate 2 (the fix)
PASS. Report: `.gitban/agents/reviewer/inbox/LUI1WEDGE-x71bcm-reviewer-2.md`.

Please use the gitban tools to update the card and complete it.

## Card Close-out tasks

- Use gitban's checkbox tools to ensure all checkboxes on the card are checked off for completed
  work if not already. On last router read every box was already checked (all observable outcomes,
  the three L1 reopen fix checkboxes, and the full completion checklist) — verify and check any
  straggler.
- The two "API contract reviewed and approved by team/stakeholders" reviewer-gate boxes are
  satisfied by this APPROVAL — ensure they are checked.
- Do not mark any work as deferred. This card will be closed and archived and likely never seen
  again.
- Use gitban's complete card tool to submit and validate if not already completed.

## Close-out items

- **None new.** The reviewer flagged no new follow-up ("None new").
- **L2 (engine-construction-spy regression)** remains correctly deferred to the sprint closeout
  card **`od8esg`** pending step 4A (`hlai4c`). It is already captured there — do NOT re-add it,
  re-open it, or action it on this card.

Note: You are closing out this card only. The dispatcher owns sprint lifecycle — do not close,
archive, or finalize the sprint itself.
