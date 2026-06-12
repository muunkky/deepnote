# LUI2VIEW Sprint Closeout

> **Sprint**: LUI2VIEW | **Type**: chore | **Step**: 8 (final)
>
> Mandatory closeout card for sprint LUI2VIEW. Dispatched last. Walks accumulated retrospective items using the four-type deferral grid (see planner/SKILL.md per-item block format for the grid definitions).

## Purpose

Close out sprint LUI2VIEW (the read-only viewer SPA, `m3/s2`): archive done cards, generate the sprint summary, update `CHANGELOG.md`, mark roadmap story `m3/s2` (and its two projects `spa-foundation` + `block-renderers`) complete, and process every item in the Sprint Retrospective section below using the four-type deferral grid each item carries.

## Cleanup Scope & Context

* **Sprint/Release:** LUI2VIEW (`apps/studio` read-only viewer SPA — m3/s2)
* **Primary Feature Work:** First-ever monorepo frontend — React 19 + Vite 7 viewer loading a project over s1 `GET /api/project` and rendering every block type + persisted Jupyter IOutputs read-only (fork-only showcase).
* **Cleanup Category:** Sprint closeout (archive + summary + changelog + roadmap + retrospective)

**Required Checks:**
* [ ] Sprint/Release is identified above.
* [ ] Primary feature work that generated this cleanup is documented.

## Sprint Retrospective

<!-- planner appends items below this line during the sprint. Each item is a self-contained block with its own classification grid per planner/SKILL.md. Leave this section empty if no items accumulate. -->

## Deferred Work Review

Walk every item under `## Sprint Retrospective` above. For each, the planner-appended inline grid carries the four-type deferral classification (backlog card / sprint card / note-only / fixed-with-note); action each per its chosen type.

* [ ] Reviewed commit messages for "TODO" and "FIXME" comments added during sprint.
* [ ] Reviewed PR comments for "out of scope" or "follow-up needed" discussions.
* [ ] Reviewed code for new TODO/FIXME markers (grep for them).
* [ ] Checked team chat/standup notes for deferred items.

| Cleanup Category | Specific Item / Location | Priority | Justification for Cleanup |
| :--- | :--- | :---: | :--- |
| **Retrospective** | (planner appends items to `## Sprint Retrospective`; none at creation) | P2 | Walked at closeout via the four-type deferral grid. |

## Cleanup Checklist

### Documentation Updates (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **CHANGELOG** | Add the `apps/studio` viewer entry for user-visible changes landed this sprint | - [ ] |
| **README** | `apps/studio/README.md` coverage matrix complete (closed at step 7) | - [ ] |
| **Roadmap** | `m3/s2` + `spa-foundation` + `block-renderers` marked done | - [ ] |

### Testing & Quality (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Full-coverage fixture** | every in-scope block type renders (R3) — verified at step 7 | - [ ] |
| **R7 metric** | shell-to-render vs already-running server recorded (split a graded) | - [ ] |

## Validation & Closeout

### Pre-Completion Verification

| Verification Task | Status / Evidence |
| :--- | :--- |
| **All P0 Items Complete** | [evidence] |
| **All P1 Items Complete or Ticketed** | [evidence] |
| **Tests Passing** | [evidence — DOM-env vitest project green] |
| **No New Warnings** | [evidence — Biome/cspell clean on `.tsx`] |
| **Documentation Updated** | [evidence — README + CHANGELOG] |
| **Code Review** | [evidence — sprint cards reviewed] |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Remaining P2 Items** | [carried to backlog via retro grid] |
| **Recurring Issues** | [captured] |
| **Process Improvements** | [captured] |
| **Technical Debt Tickets** | [created per retro grid] |

## Acceptance Criteria

- [ ] Every item under `## Sprint Retrospective` has exactly one deferral-type row marked `true` in its inline grid (exactly-one-true constraint)
- [ ] Every item has its `Action taken:` field filled in matching the chosen deferral type (card id for backlog/sprint, prose for note-only, commit hash for fixed-with-note)
- [ ] Every item's two per-item checkboxes (`Item {N} classified`, `Item {N} actioned`) are ticked
- [ ] Sprint summary generated via `generate_archive_summary`
- [ ] Roadmap updated for any stories this sprint completed (`m3/s2` + its two projects)
- [ ] `CHANGELOG.md` updated for any user-visible changes landed this sprint
- [ ] All sprint cards archived via `archive_cards`

### Completion Checklist

<!-- gate0: upper-checklist -->

* [ ] All P0 items are complete and verified. <!-- cite: -->
* [ ] All P1 items are complete or have follow-up tickets created. <!-- cite: -->
* [ ] P2 items are complete or explicitly deferred with tickets. <!-- cite: -->
* [ ] All tests are passing (unit, integration, and regression). <!-- cite: -->
* [ ] No new linter warnings or errors introduced. <!-- cite: -->
* [ ] All documentation updates are complete and reviewed. <!-- cite: -->
* [ ] Code changes (if any) are reviewed and merged. <!-- cite: -->
* [ ] Follow-up tickets are created and prioritized for next sprint. <!-- cite: -->
* [ ] Team retrospective includes discussion of cleanup backlog (if significant). <!-- cite: -->

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.