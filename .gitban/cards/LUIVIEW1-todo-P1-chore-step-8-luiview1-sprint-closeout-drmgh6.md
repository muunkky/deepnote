# LUIVIEW1 Sprint Closeout

> **Sprint**: LUIVIEW1 | **Type**: chore | **Step**: 8 (final)
>
> Mandatory closeout card for sprint LUIVIEW1. Dispatched last. Walks accumulated retrospective items using the four-type deferral grid (see planner/SKILL.md per-item block format for the grid definitions).

## Purpose

Close out sprint LUIVIEW1: archive done cards, generate the sprint summary, update `CHANGELOG.md`, mark roadmap stories complete (m3/s2 and its projects spa-foundation / block-renderers), and process every item in the Sprint Retrospective section below using the four-type deferral grid each item carries.

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


## Cleanup Scope & Context

* **Sprint/Release:** LUIVIEW1 (roadmap m3/s2 — read-only viewer SPA)
* **Primary Feature Work:** `apps/studio` React 19 + Vite 7 read-only notebook viewer (steps 2–7D)
* **Cleanup Category:** Sprint closeout (retrospective processing + archive)

**Required Checks:**
* [ ] Sprint/Release is identified above.
* [ ] Primary feature work that generated this cleanup is documented.

---

## Deferred Work Review

Process each item appended under `## Sprint Retrospective` above via the four-type deferral grid. If no items accumulated, this section is a no-op.

* [ ] Reviewed commit messages for "TODO" and "FIXME" comments added during sprint.
* [ ] Reviewed PR comments for "out of scope" or "follow-up needed" discussions.
* [ ] Reviewed code for new TODO/FIXME markers (grep for them).
* [ ] Checked team chat/standup notes for deferred items.

| Cleanup Category | Specific Item / Location | Priority | Justification for Cleanup |
| :--- | :--- | :---: | :--- |
| **Retrospective** | Items appended under `## Sprint Retrospective` (if any) | P1 | Each must be classified + actioned via the four-type deferral grid |

---

## Cleanup Checklist

### Documentation Updates (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **CHANGELOG** | Update for user-visible changes landed this sprint | - [ ] |
| **Roadmap** | Mark m3/s2 + projects spa-foundation / block-renderers complete | - [ ] |

### Testing & Quality (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** Full suite green | `pnpm test` + isolation invariant + boundary checks green | - [ ] |

### Code Quality & Technical  (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** Retrospective processed | Every retro item classified + actioned | - [ ] |

### Dependencies &  (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** N/A | No dependency changes by the closeout card itself | - [ ] |

### Configuration & Environment (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** N/A | No config changes by the closeout card itself | - [ ] |

### Build & CI/CD (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** N/A | No CI changes by the closeout card itself | - [ ] |

### Refactoring & Code Organization (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** N/A | No refactoring by the closeout card itself | - [ ] |

---

## Validation & Closeout

### Pre-Completion Verification

| Verification Task | Status / Evidence |
| :--- | :--- |
| **All P0 Items Complete** | All sprint cards done |
| **All P1 Items Complete or Ticketed** | Retrospective items classified + actioned |
| **Tests Passing** | Full suite + isolation invariant green |
| **No New Warnings** | lint/spell green |
| **Documentation Updated** | CHANGELOG + roadmap updated |
| **Code Review** | All cards reviewed |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Remaining P2 Items** | Per retrospective classification |
| **Recurring Issues** | Captured in retrospective items |
| **Process Improvements** | Parallel batch 7A–7D additive-registration merge model |
| **Technical Debt Tickets** | Per retrospective classification |

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

### Item 1: Harden HMR e2e Chromium binary discovery (reconcile "no Playwright" framing)

The `cdp.ts` `findChromeBinary()` helper defaults to a Playwright-cached Chromium path with the revision **hard-coded** (`~/.cache/ms-playwright/chromium-1223/...`), while the module header states "no Playwright/Puppeteer dependency." The runtime DevTools driver genuinely has no Playwright dependency, but the browser binary still originates from `playwright install chromium`, and pinning `chromium-1223` means a future `playwright install` browser-cache revision bump will silently break the default lookup — surfacing as an opaque "DevTools endpoint did not come up" failure on a fresh checkout until someone sets `HMR_CHROME_BIN`. Captured for closeout triage because it is non-blocking: an `HMR_CHROME_BIN` override exists today and the HMR e2e test is gated out of the always-on `pnpm test` (it needs a browser binary + live dev server), so nothing downstream in this sprint depends on it. Two candidate fixes for the closeout agent to weigh: (a) reconcile the module header wording so it accurately describes the binary's Playwright-cache origin, or (b) discover the cached Chromium revision dynamically (glob the cache dir / resolve latest) instead of pinning `chromium-1223`. Option (b) is the more durable fix.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | |

**Source:** 5mz1md review 1
**Files touched:** apps/studio/e2e/cdp.ts (module header comment + `findChromeBinary()`)
**Action taken:** {closeout fills prose — card {id} created in sprint {tag} / card {id} created in loose backlog / noted, no action / fixed in commit {hash}}

- [ ] Item 1 classified (exactly one deferral type marked `true` above)
- [ ] Item 1 actioned (action taken matches chosen type)