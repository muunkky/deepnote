Use `.venv/Scripts/python.exe` to run Python commands.

The code for the gitban card with id mjporx has been approved as of commit 853205f. Please use the gitban tools to update the gitban card and begin the tasks required to properly complete it.

## Card Close-out tasks:

- Use gitban's checkbox tools to ensure all checkboxes on the card are checked off for completed work if not already.
  - The "Code Review Approved" box (Feature Work Phases) is now satisfied — the reviewer approved at commit 853205f. Check it.
  - The "Code review is approved and PR is merged" box stays unchecked: the PR is not merged in this sprint (PR agent / sprint closeout owns it). Do not fabricate a tick.
  - Deployment Plan Ready / Feature deployed to production / Monitoring configured / Stakeholders notified / Associated ticket closed / Performance requirements — all marked N/A or out-of-scope on the card. Leave unchecked. Do not fabricate.
- Do not mark any work as deferred. This card will be closed and archived and likely never seen again.
- Use gitban's complete card tool to submit and validate if not already completed.
- Close-out items: none. The reviewer flagged one follow-up (L1, selector-contract empty-string `pythonPath` note) but explicitly classified it as non-actionable for this card — unreachable in practice (zod schema `z.string().optional()`, no sane client sends `pythonPath: ""`) and an ADR-sanctioned contract owned by step-2A's card (onwhhg), not introduced here. No change warranted, no card needed. Do not act on it.
- This card is in sprint S6INREPO. Do NOT push a feature branch or open a PR — the dispatcher owns sprint lifecycle and the PR agent cuts the clean `feat/*` branch later.

Note: You are closing out this card only. The dispatcher owns sprint lifecycle — do not close, archive, or finalize the sprint itself.
