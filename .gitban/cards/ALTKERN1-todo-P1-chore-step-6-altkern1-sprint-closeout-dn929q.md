# ALTKERN1 Sprint Closeout

> **Sprint**: ALTKERN1 | **Type**: chore | **Step**: 6 (final)
>
> Mandatory closeout card for sprint ALTKERN1. Dispatched last. Walks accumulated retrospective items using the four-type deferral grid (see planner/SKILL.md per-item block format for the grid definitions).

## Purpose

Close out sprint ALTKERN1: archive done cards, generate the sprint summary, update `CHANGELOG.md`, mark roadmap stories complete, and process every item in the Sprint Retrospective section below using the four-type deferral grid each item carries.

## Cleanup Scope & Context

- **Sprint/Release:** ALTKERN1 — PRD-002 Phase 1 (alternative-language kernels)
- **Primary Feature Work:** Run a single-language non-Python notebook end-to-end via `deepnote run --kernel <name>`; degradation + failure categories; provisioned CI integration job.
- **Cleanup Category:** Sprint closeout

**Required Checks:**

- [x] Sprint/Release is identified above.
- [x] Primary feature work that generated this cleanup is documented.

---

## Deferred Work Review

- [ ] Reviewed commit messages for "TODO" and "FIXME" comments added during sprint.
- [ ] Reviewed PR comments for "out of scope" or "follow-up needed" discussions.
- [ ] Reviewed code for new TODO/FIXME markers (grep for them).
- [ ] Checked team chat/standup notes for deferred items.

| Cleanup Category | Specific Item / Location                    | Priority | Justification for Cleanup                                       |
| :--------------- | :------------------------------------------ | :------: | :-------------------------------------------------------------- |
| **Closeout**     | walk the Sprint Retrospective section below |    P1    | Each item classified + actioned via the four-type deferral grid |

---

## Sprint Retrospective

<!-- planner appends items below this line during the sprint. Each item is a self-contained block with its own classification grid per planner/SKILL.md. Leave this section empty if no items accumulate. -->

## Cleanup Checklist

### Build & CI/CD (optional)

| Task                          | Status / Details                                                      | Done? |
| :---------------------------- | :-------------------------------------------------------------------- | :---: |
| **Mocked CI green**           | always-on `pnpm test` still green after the `exclude` glob            | - [ ] |
| **integration-kernels green** | the headline bash e2e + real missing-kernel + python3 regression pass | - [ ] |

### Documentation Updates (optional)

| Task            | Status / Details                            | Done? |
| :-------------- | :------------------------------------------ | :---: |
| **CHANGELOG**   | user-visible `--kernel` support entry added | - [ ] |
| **#154 answer** | `docs/running-your-own-kernel.md` published | - [ ] |

---

## Validation & Closeout

### Pre-Completion Verification

| Verification Task                     | Status / Evidence                 |
| :------------------------------------ | :-------------------------------- |
| **All P0 Items Complete**             | steps 2, 3A, 3B, 4, 5 done        |
| **All P1 Items Complete or Ticketed** | planning + closeout               |
| **Tests Passing**                     | mocked + integration suites green |
| **No New Warnings**                   | typecheck/lint/spell-check clean  |
| **Documentation Updated**             | CHANGELOG + #154 doc              |
| **Code Review**                       | all cards reviewed                |

### Follow-up & Lessons Learned

| Topic                      | Status / Action Required |
| :------------------------- | :----------------------- |
| **Remaining P2 Items**     | per retrospective        |
| **Recurring Issues**       | per retrospective        |
| **Process Improvements**   | per retrospective        |
| **Technical Debt Tickets** | per retrospective        |

### Completion Checklist

- [ ] Every item under `## Sprint Retrospective` has exactly one deferral-type row marked `true` in its inline grid (exactly-one-true constraint)
- [ ] Every item has its `Action taken:` field filled in matching the chosen deferral type (card id for backlog/sprint, prose for note-only, commit hash for fixed-with-note)
- [ ] Every item's two per-item checkboxes (`Item {N} classified`, `Item {N} actioned`) are ticked
- [ ] Sprint summary generated via `generate_archive_summary`
- [ ] Roadmap updated for any stories this sprint completed
- [ ] `CHANGELOG.md` updated for any user-visible changes landed this sprint
- [ ] All sprint cards archived via `archive_cards`
