# S6INREPO Sprint Closeout

> **Sprint**: S6INREPO | **Type**: chore | **Step**: 5 (final)
>
> Mandatory closeout card for sprint S6INREPO. Dispatched last. Walks accumulated retrospective items using the four-type deferral grid (see planner/SKILL.md per-item block format for the grid definitions).

## Purpose

Close out sprint S6INREPO: archive done cards, generate the sprint summary, update `CHANGELOG.md`, mark roadmap stories complete, and process every item in the Sprint Retrospective section below using the four-type deferral grid each item carries.

## Sprint Retrospective

<!-- planner appends items below this line during the sprint. Each item is a self-contained block with its own classification grid per planner/SKILL.md. Leave this section empty if no items accumulate. -->

## Acceptance Criteria

- [ ] Every item under `## Sprint Retrospective` has exactly one deferral-type row marked `true` in its inline grid (exactly-one-true constraint)
- [ ] Every item has its `Action taken:` field filled in matching the chosen deferral type (card id for backlog/sprint, prose for note-only, commit hash for fixed-with-note)
- [ ] Every item's two per-item checkboxes (`Item {N} classified`, `Item {N} actioned`) are ticked
- [ ] Sprint summary generated via `generate_archive_summary`
- [ ] Roadmap updated for any stories this sprint completed
- [ ] `CHANGELOG.md` updated for any user-visible changes landed this sprint
- [ ] All sprint cards archived via `archive_cards`

---

> **Template-conformance scaffolding.** The verbatim closeout body above (Purpose / Sprint Retrospective / Acceptance Criteria) is the load-bearing content the dispatcher and planner depend on. The chore-template sections below are present only to satisfy structural validation; the closeout's real acceptance criteria are the list above.

## Cleanup Scope & Context

- **Sprint/Release:** S6INREPO (m1/s6 in-repo residuals)
- **Primary Feature Work:** shared interpreter contract (ADR-001) + runtime agent-block readiness (PRD-001 Phase 2)
- **Cleanup Category:** Sprint closeout

**Required Checks:**

- [ ] Sprint/Release is identified above.
- [ ] Primary feature work that generated this cleanup is documented.

## Deferred Work Review

The substantive closeout work is driven by the Acceptance Criteria list above and the Sprint Retrospective items. This section is template scaffolding.

- [ ] Reviewed commit messages for "TODO" and "FIXME" comments added during sprint.
- [ ] Reviewed PR comments for "out of scope" or "follow-up needed" discussions.
- [ ] Reviewed code for new TODO/FIXME markers (grep for them).
- [ ] Checked team chat/standup notes for deferred items.

| Cleanup Category    | Specific Item / Location                                                 | Priority | Justification for Cleanup                            |
| :------------------ | :----------------------------------------------------------------------- | :------: | :--------------------------------------------------- |
| **Sprint Closeout** | Process all Sprint Retrospective items per the Acceptance Criteria above |    P1    | The closeout must walk every accumulated retro item. |

## Cleanup Checklist

Closeout actions are enumerated in the Acceptance Criteria list above (archive cards, generate summary, update CHANGELOG, update roadmap, process retro items).

- [ ] Closeout actions tracked via the Acceptance Criteria list above.

## Validation & Closeout

### Pre-Completion Verification

| Verification Task                 | Status / Evidence                           |
| :-------------------------------- | :------------------------------------------ |
| **Retrospective items processed** | Per Acceptance Criteria above               |
| **Sprint summary generated**      | `generate_archive_summary`                  |
| **CHANGELOG updated**             | For user-visible changes this sprint        |
| **Roadmap updated**               | For completed stories (m1/s6 in-repo scope) |
| **Cards archived**                | `archive_cards`                             |

### Follow-up & Lessons Learned

| Topic                    | Status / Action Required                                                                                |
| :----------------------- | :------------------------------------------------------------------------------------------------------ |
| **External residuals**   | #289 Cloud import, #288 vscode/Cursor E2E, live-keyed agent E2E + npm publish remain out of this sprint |
| **Process Improvements** | Captured via Sprint Retrospective items above                                                           |

### Completion Checklist

> **Cite-affordance contract (sprint-closeout Gate 0):** when this card is the
> sprint-closeout chore, every ticked `[x]` box below MUST be annotated with a
> `<!-- cite: <kind>:<value> -->` HTML comment supplying primary-source
> evidence — `commit:<sha>`, `pr:<n>`, `ci:<run-url>`, `card:<id>`,
> `roadmap:<path>`, `retro:<anchor>`, or the explicit `none` marker for
> genuinely-N/A rows. Free-form ticks are rejected by Gate 0. See
> `gitban/contracts/sprint-closeout-gate0.md` for the contract spec, and
> `.claude/skills/sprint-closeout-reviewer/SKILL.md` §0a for the worked
> failure case (UIPOL7A `9padx1`). The `<!-- gate0: upper-checklist -->`
> anchor below marks the inspected region for the runtime parser.

<!-- gate0: upper-checklist -->

- [ ] All P0 items are complete and verified. <!-- cite: -->
- [ ] All P1 items are complete or have follow-up tickets created. <!-- cite: -->
- [ ] P2 items are complete or explicitly deferred with tickets. <!-- cite: -->
- [ ] All tests are passing (unit, integration, and regression). <!-- cite: -->
- [ ] No new linter warnings or errors introduced. <!-- cite: -->
- [ ] All documentation updates are complete and reviewed. <!-- cite: -->
- [ ] Code changes (if any) are reviewed and merged. <!-- cite: -->
- [ ] Follow-up tickets are created and prioritized for next sprint. <!-- cite: -->
- [ ] Team retrospective includes discussion of cleanup backlog (if significant). <!-- cite: -->
- [ ] All sprint cards archived via `archive_cards`. <!-- cite: card: -->
- [ ] Sprint summary generated via `generate_archive_summary`. <!-- cite: commit: -->
- [ ] `CHANGELOG.md` updated for any user-visible changes landed this sprint. <!-- cite: commit: -->
- [ ] Roadmap (`m1/s6`) updated for stories this sprint completed. <!-- cite: roadmap: -->

---
