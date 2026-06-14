# LUIRUN1 Sprint Closeout

> **Sprint**: LUIRUN1 | **Type**: chore | **Step**: 7 (final)
>
> Mandatory closeout card for sprint LUIRUN1 (roadmap m3/s3 — live-execution UI). Dispatched last. Walks accumulated retrospective items using the four-type deferral grid (see planner/SKILL.md per-item block format for the grid definitions).

## Purpose

Close out sprint LUIRUN1: archive done cards, generate the sprint summary, update `CHANGELOG.md`, mark roadmap stories complete (m3/s3 and its project live-execution), and process every item in the Sprint Retrospective section below using the four-type deferral grid each item carries.

## Sprint Retrospective

<!-- planner appends items below this line during the sprint. Each item is a self-contained block with its own classification grid per planner/SKILL.md. Leave this section empty if no items accumulate. -->

### Item 1: De-duplicate the runnable-renderer run/output plumbing (live-vs-persisted selection + run-toolbar JSX)

The live-vs-persisted output selection block and the `run`-toolbar JSX are duplicated verbatim across `CodeRenderer.tsx` and `SqlRenderer.tsx`: `const persisted = ...; const outputs = run !== undefined && hasSessionRun(run) ? run.outputs : persisted;` plus the `{run !== undefined ? <toolbar><RunControl/></toolbar> : null}` wrapper. Two copies today, and the executable-renderer set may grow. Failure mode: a fix to the selection logic (e.g. a future KD-3 refinement) applied to one renderer and missed in the other. Suggested fix: extract a small shared `useBlockOutputs(block, run)` helper or a shared `<RunToolbar run={run}/>` so the live/persisted selection + run-toolbar lives in one place. Captured for closeout because it is non-blocking adjacent DRY debt — no downstream LUIRUN1 card (e6usnq failure banners, 2udi5b latency) depends on the helper existing, and there is no external prerequisite.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | |

**Source:** 3p2kbm review 1
**Files touched:** apps/studio/src/blocks/CodeRenderer.tsx, apps/studio/src/blocks/SqlRenderer.tsx (and any new shared helper module under apps/studio/src/blocks/ or apps/studio/src/execution/)
**Action taken:** {closeout fills prose — card {id} created in sprint {tag} / card {id} created in loose backlog / noted, no action / fixed in commit {hash}}

- [ ] Item 1 classified (exactly one deferral type marked `true` above)
- [ ] Item 1 actioned (action taken matches chosen type)

### Item 2: SqlRenderer `run`-prop branch (Run control + live-vs-persisted selection) lacks direct unit coverage

`SqlRenderer`'s `run`-prop branch has no direct unit test. `CodeRenderer.run.test.tsx` covers the code path thoroughly; `SqlRenderer.test.tsx` only exercises the s2 (no-`run`) posture. The assembled `readOnlyInvariant`/`Shell.run` tests render the sql block with a `run` descriptor so the control *appearing* on sql is indirectly covered — but the live-replaces-persisted selection for sql specifically is not asserted. Suggested fix: add a sql analogue of the CodeRenderer live/persisted/replace tests. This naturally rides the Item 1 de-duplication, since the extracted helper is exactly the seam to test on the sql side. Captured for closeout because it is a non-blocking test-coverage gap — no downstream LUIRUN1 card depends on this coverage existing, and there is no external prerequisite.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | |

**Source:** 3p2kbm review 1
**Files touched:** apps/studio/src/blocks/SqlRenderer.test.tsx, apps/studio/src/blocks/SqlRenderer.tsx
**Action taken:** {closeout fills prose — card {id} created in sprint {tag} / card {id} created in loose backlog / noted, no action / fixed in commit {hash}}

- [ ] Item 2 classified (exactly one deferral type marked `true` above)
- [ ] Item 2 actioned (action taken matches chosen type)

### Item 3: Inline or drop the misleading `withKernel` identity no-op in Shell.run.test.tsx

`Shell.run.test.tsx` defines `withKernel(project) => project`, an identity no-op whose name implies it mutates capabilities. It is harmless but misleading — the kernel state is actually driven by the separate `kernelLanguage` prop. Suggested fix: inline it or drop it. Captured for closeout because it is a non-blocking test-clarity nit — no downstream LUIRUN1 card depends on it, and there is no external prerequisite. Trivial enough that the closeout agent may fix it inline.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | |

**Source:** 3p2kbm review 1
**Files touched:** apps/studio/src/shell/Shell.run.test.tsx
**Action taken:** {closeout fills prose — card {id} created in sprint {tag} / card {id} created in loose backlog / noted, no action / fixed in commit {hash}}

- [ ] Item 3 classified (exactly one deferral type marked `true` above)
- [ ] Item 3 actioned (action taken matches chosen type)

## Acceptance Criteria

- [ ] Every item under `## Sprint Retrospective` has exactly one deferral-type row marked `true` in its inline grid (exactly-one-true constraint)
- [ ] Every item has its `Action taken:` field filled in matching the chosen deferral type (card id for backlog/sprint, prose for note-only, commit hash for fixed-with-note)
- [ ] Every item's two per-item checkboxes (`Item {N} classified`, `Item {N} actioned`) are ticked
- [ ] Sprint summary generated via `generate_archive_summary`
- [ ] Roadmap updated for any stories this sprint completed
- [ ] `CHANGELOG.md` updated for any user-visible changes landed this sprint
- [ ] All sprint cards archived via `archive_cards`

## Cleanup Scope & Context

* **Sprint/Release:** LUIRUN1 (roadmap m3/s3 — live-execution UI)
* **Primary Feature Work:** `apps/studio` live-execution loop (steps 2–6)
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
| **Roadmap** | Mark m3/s3 + project live-execution complete | - [ ] |

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
| **Process Improvements** | HTTP-trigger correlation chosen via adversarial design review |
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
