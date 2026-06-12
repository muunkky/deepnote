# LUI1WEDGE Sprint Closeout

> **Sprint**: LUI1WEDGE | **Type**: chore | **Step**: 10 (final)
>
> Mandatory closeout card for sprint LUI1WEDGE. Dispatched last. Walks accumulated retrospective items using the four-type deferral grid (see planner/SKILL.md per-item block format for the grid definitions).

## Purpose

Close out sprint LUI1WEDGE: archive done cards, generate the sprint summary, update `CHANGELOG.md`, mark roadmap stories complete (m3/s1 and its features under serve-api / cli-serve / wedge-slice-showcase), and process every item in the Sprint Retrospective section below using the four-type deferral grid each item carries.

## Cleanup Scope & Context

* **Sprint/Release:** LUI1WEDGE (m3/s1 — Headless runtime server + one-command launch)
* **Primary Feature Work:** `@deepnote/runtime-server` (HTTP+WS over runtime-core) + `deepnote serve`/`ui`, sliced as the upstream wedge.
* **Cleanup Category:** Sprint closeout (archive + summary + CHANGELOG + roadmap + retrospective)

**Required Checks:**
* [ ] Sprint/Release is identified above.
* [ ] Primary feature work that generated this cleanup is documented.

## Deferred Work Review

* [ ] Reviewed commit messages for "TODO" and "FIXME" comments added during sprint.
* [ ] Reviewed PR comments for "out of scope" or "follow-up needed" discussions.
* [ ] Reviewed code for new TODO/FIXME markers (grep for them).
* [ ] Checked team chat/standup notes for deferred items.

| Cleanup Category | Specific Item / Location | Priority | Justification for Cleanup |
| :--- | :--- | :---: | :--- |
| **Documentation** | CHANGELOG.md entry for `@deepnote/runtime-server` + `deepnote serve`/`ui` | P1 | user-visible new package + commands. |
| **Build/CI** | confirm slice-integrity + boundary CI gates are wired (from scaffold + contrib-diff-cut) | P1 | the ADR-007 invariant must stay enforced. |
| **Technical Debt** | m3/s5 follow-ups (P4 coalescing, P6 running-cancel, `runScope:'with-upstream'`) are SETTLED DEFERRALS by design — record, do not action here | P2 | they need net-new runtime-core methods / public reactivity primitives; out of s1 by design. |

## Sprint Retrospective

<!-- planner appends items below this line during the sprint. Each item is a self-contained block with its own classification grid per planner/SKILL.md. Leave this section empty if no items accumulate. -->

## Cleanup Checklist

### Documentation Updates (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **CHANGELOG** | added entry for runtime-server + serve/ui | - [ ] |
| **Architecture Docs** | roadmap m3/s1 marked complete | - [ ] |

### Build & CI/CD (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **CI Pipeline** | slice-integrity + boundary checks confirmed wired | - [ ] |

## Validation & Closeout

### Pre-Completion Verification

| Verification Task | Status / Evidence |
| :--- | :--- |
| **All P0 Items Complete** | execute-stream-ws + save-api done and reviewed |
| **All P1 Items Complete or Ticketed** | all 9 work cards done |
| **Tests Passing** | mocked + integration suites green |
| **No New Warnings** | biome/cspell clean |
| **Documentation Updated** | CHANGELOG + roadmap |
| **Code Review** | all cards reviewed + closeout review |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Remaining P2 Items** | m3/s5 follow-ups recorded (not actioned — settled deferrals) |
| **Recurring Issues** | (captured from retro) |
| **Process Improvements** | (captured from retro) |
| **Technical Debt Tickets** | (per retro classification) |

### Completion Checklist

* [ ] All P0 items are complete and verified.
* [ ] All P1 items are complete or have follow-up tickets created.
* [ ] P2 items are complete or explicitly deferred with tickets.
* [ ] All tests are passing (unit, integration, and regression).
* [ ] No new linter warnings or errors introduced.
* [ ] All documentation updates are complete and reviewed.
* [ ] Code changes (if any) are reviewed and merged.
* [ ] Follow-up tickets are created and prioritized for next sprint.
* [ ] Team retrospective includes discussion of cleanup backlog (if significant).

## Acceptance Criteria

- [ ] Every item under `## Sprint Retrospective` has exactly one deferral-type row marked `true` in its inline grid (exactly-one-true constraint)
- [ ] Every item has its `Action taken:` field filled in matching the chosen deferral type (card id for backlog/sprint, prose for note-only, commit hash for fixed-with-note)
- [ ] Every item's two per-item checkboxes (`Item {N} classified`, `Item {N} actioned`) are ticked
- [ ] Sprint summary generated via `generate_archive_summary`
- [ ] Roadmap updated for any stories this sprint completed
- [ ] `CHANGELOG.md` updated for any user-visible changes landed this sprint
- [ ] All sprint cards archived via `archive_cards`


## Sprint Retrospective

### Item 1: Engine-construction-spy regression for the kernel-free guarantee (post-4A)

Reviewer cycle 1 on x71bcm (GET /api/project, kernel-free) flagged a test-depth gap (L2). The
"opens with NO kernel started" test currently asserts only the **positive** signal — a
fully-populated `ApiProject` payload comes back. It cannot yet assert the **negative**: that no
`ExecutionEngine` is ever constructed during `loadProject` / `GET /api/project`. The reason is
structural — in step 3's phase there is no `ExecutionEngine` to spy on; the engine only becomes
constructible once step 4A (`hlai4c`, execute-stream-ws) lands `startEngine`. The KD-6 kernel-free
guarantee is currently enforced only by the positive assertion; a future refactor could silently
start constructing an engine on open and the suite would stay green.

**The follow-up:** once `hlai4c` has landed a constructible `ExecutionEngine`, add a regression test
that spies on engine construction and asserts `loadProject` / `GET /api/project` never triggers it,
so the kernel-free guarantee stays enforced after the engine becomes constructible. This is
captured here (not filed as a sprint card now) because its prerequisite is the in-sprint card
`hlai4c`, which is still `todo` — the closeout agent revisits this with full sprint context after
4A is done and decides final disposition. If 4A has landed by closeout, this is almost certainly a
`sprint` deferral (a small new card sequenced into this sprint, or folded into 4A's own suite). The
exactly-one-true grid below is for the closeout agent to fill.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | |

**Source:** x71bcm review 1
**Files touched:** packages/runtime-server/src/session.test.ts (the kernel-free regression lives here; engine spy target arrives via hlai4c / step 4A)
**Action taken:** {closeout fills prose — card {id} created in sprint {tag} / card {id} created in loose backlog / noted, no action / fixed in commit {hash}}

- [ ] Item 1 classified (exactly one deferral type marked `true` above)
- [ ] Item 1 actioned (action taken matches chosen type)