# step 1: LUI1WEDGE sprint planning

> **Sprint**: LUI1WEDGE | **Type**: feature (planning) | **Step**: 1 (first)
>
> The planning card for the m3/s1 upstream wedge: a headless `@deepnote/runtime-server` (HTTP + WebSocket over `runtime-core`) plus a one-command `deepnote serve` / `deepnote ui`. End state: the sprint is planned and every card is in `todo`. Completable before any feature work begins.

## Sprint Definition & Scope

* **Sprint Name/Tag**: LUI1WEDGE
* **Sprint Goal**: Ship the m3/s1 upstream wedge — `@deepnote/runtime-server` exposing `runtime-core`'s already-headless execution over a stable HTTP + WebSocket API, plus `deepnote serve`/`deepnote ui`, sliced clean off `upstream/main` and showcased on the fork dry-run thread. No UI in this story.
* **Timeline**: 2026-06-12 - TBD
* **Roadmap Link**: m3 (Local Deepnote UI) > s1 (Headless runtime server + one-command launch) > serve-api / cli-serve / wedge-slice-showcase
* **Definition of Done**: Sprint complete when all 12 cards are done and archived, `@deepnote/runtime-server` builds/tests/typechecks, the contrib slice builds clean off `upstream/main` with no `apps/` token, the fork showcase post is up (Cameron-approved), and roadmap m3/s1 is marked complete.

**Required Checks:**
* [ ] Sprint name/tag is chosen and will be used as prefix for all cards
* [ ] Sprint goal clearly articulates the value/outcome
* [ ] Roadmap milestone is identified and linked

## Required Reading

| Source | Why |
| :--- | :--- |
| `docs/designs/m3-s1-server-api-and-serve.md` | Primary input; its 10 phases map 1:1 to the 10 roadmap features. Card creation is mechanical from it. |
| `docs/adr/ADR-005-browser-kernel-transport-proxy.md` | Transport (HTTP + WS proxy) + the deferred run-serialization constraint. |
| `docs/adr/ADR-007-server-spa-package-layout.md` | `packages/runtime-server` layout, Node-free `api-types`, one-way dep arrow, path-based slice. |
| `docs/prds/PRD-003-local-deepnote-ui.md` | Wedge scope, success bars (API parity, streaming fidelity, failure-category fidelity, semantic save round-trip). |
| `read_roadmap m3/s1/serve-api`, `m3/s1/cli-serve`, `m3/s1/wedge-slice-showcase` | Feature descriptions + success criteria. |

## Card Planning & Brainstorming

> The 10 design-doc phases map 1:1 to the 10 s1 roadmap features. Two lifecycle cards bookend the sprint (planning step 1, closeout step N).

### Work Areas & Card Ideas

**Area 1: serve-api (the published server package)**
* server-package-scaffold (step 2)
* project-open-list-api (step 3)
* execute-stream-ws — the run-serialization queue; biggest/riskiest card (step 4A)
* save-api — the save-safety gate (step 4B)
* server-integration-tests (step 5)

**Area 2: cli-serve (the command)**
* serve-command (step 6)
* browser-launch-alias — `deepnote ui` (step 7A)
* sql-integration-parity (step 7B)

**Area 3: wedge-slice-showcase (delivery)**
* contrib-diff-cut (step 8)
* fork-showcase-post — Cameron approves the first post (step 9)

### Card Types Needed

* [ ] **Features**: 7 (scaffold, open-list, execute-stream, save, serve-command, ui-alias, sql-parity)
* [ ] **Bugs**: 0
* [ ] **Chores**: 3 (contrib-diff-cut, fork-showcase-post, closeout)
* [ ] **Spikes**: 0
* [ ] **Docs**: 0 (1 test card for integration-tests)

## Sequential Card Creation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Create Feature Cards** | scaffold, open-list, execute-stream, save, serve-command, ui-alias, sql-parity | - [ ] Feature cards created with sprint tag |
| **2. Create Bug Cards** | none | - [ ] Bug cards created with sprint tag |
| **3. Create Chore Cards** | contrib-diff-cut, fork-showcase-post, closeout | - [ ] Chore cards created with sprint tag |
| **4. Create Spike Cards** | none (1 test card: server-integration-tests) | - [ ] Spike cards created with sprint tag |
| **5. Verify Sprint Tags** | `list_cards(sprint="LUI1WEDGE")` | - [ ] All cards show correct sprint tag |
| **6. Fill Detailed Cards** | all work cards carry DoD + TDD plan + Required Reading | - [ ] P0/P1 cards have full acceptance criteria |

### Created Card IDs

| Card ID | Step | Title | Type | Priority | Roadmap feature |
| :--- | :--- | :--- | :--- | :--- | :--- |
| wzrodp | 1 | LUI1WEDGE sprint planning | feature | P1 | (lifecycle) |
| 87ifqe | 2 | server-package-scaffold | feature | P1 | serve-api/server-package-scaffold |
| x71bcm | 3 | project-open-list-api (`GET /api/project`) | feature | P1 | serve-api/project-open-list-api |
| hlai4c | 4A | execute-stream-ws (run-serialization queue) | feature | P0 | serve-api/execute-stream-ws |
| e6e3lt | 4B | save-api (semantic round-trip + idempotence) | feature | P0 | serve-api/save-api |
| wd2nil | 5 | server-integration-tests (parity with `run`) | test | P1 | serve-api/server-integration-tests |
| zq7q0g | 6 | serve-command (`deepnote serve`) | feature | P1 | cli-serve/serve-command |
| sqm7ox | 7A | browser-launch-alias (`deepnote ui`) | feature | P1 | cli-serve/browser-launch-alias |
| yzd78n | 7B | sql-integration-parity | feature | P1 | cli-serve/sql-integration-parity |
| dx99dj | 8 | contrib-diff-cut (clean slice) | chore | P1 | wedge-slice-showcase/contrib-diff-cut |
| k65hcx | 9 | fork-showcase-post (Cameron-approved) | chore | P1 | wedge-slice-showcase/fork-showcase-post |
| od8esg | 10 (N) | LUI1WEDGE Sprint Closeout | chore | P1 | (lifecycle) |

## Sprint Execution Phases

| Phase / Task | Status / Link to Artifact | Universal Check |
| :--- | :--- | :---: |
| **Roadmap Integration** | m3/s1 (serve-api, cli-serve, wedge-slice-showcase) | - [ ] Milestone updated with sprint tag |
| **Take Sprint** | dispatcher claims | - [ ] Used take_sprint() to claim work |
| **Mid-Sprint Check** | dispatcher | - [ ] Reviewed list_cards(sprint="LUI1WEDGE") |
| **Complete Cards** | dispatcher | - [ ] Cards moved to done status |
| **Sprint Archive** | closeout card | - [ ] Used archive_cards() to bundle work |
| **Generate Summary** | closeout card | - [ ] Used generate_archive_summary() |
| **Update Changelog** | closeout card | - [ ] Recorded release notes in CHANGELOG.md |
| **Update Roadmap** | closeout card | - [ ] Marked milestone complete |

### Phase Details

#### Card inventory + execution sequence

**Backfilled below once all card IDs are known.** The execution order is:

- step 1: planning (this card)
- step 2: server-package-scaffold
- step 3: project-open-list-api
- step 4A: execute-stream-ws  ‖  step 4B: save-api (parallel batch)
- step 5: server-integration-tests
- step 6: serve-command
- step 7A: browser-launch-alias  ‖  step 7B: sql-integration-parity (parallel batch)
- step 8: contrib-diff-cut
- step 9: fork-showcase-post
- step 10 (N): LUI1WEDGE Sprint Closeout

#### Closeout card ID

**`od8esg`** — `step 10 LUI1WEDGE Sprint Closeout` (mandatory, final step N). Planners append retrospective items to its `## Sprint Retrospective` section during the sprint; it is dispatched last.

#### Execution sequence / parallel batches

- **step 1**: wzrodp (planning)
- **step 2**: 87ifqe (server-package-scaffold) — foundation, unblocks everything
- **step 3**: x71bcm (project-open-list-api) — needs scaffold; produces `openHash`
- **step 4A** ‖ **step 4B** (parallel batch — both depend only on x71bcm; disjoint files): hlai4c (execute-stream-ws, P0, critical path) ‖ e6e3lt (save-api, P0)
- **step 5**: wd2nil (server-integration-tests) — barrier; needs 4A AND 4B
- **step 6**: zq7q0g (serve-command) — needs scaffold; behaviorally 3/4A/4B
- **step 7A** ‖ **step 7B** (parallel batch — both depend on zq7q0g; disjoint surfaces): sqm7ox (browser-launch-alias) ‖ yzd78n (sql-integration-parity)
- **step 8**: dx99dj (contrib-diff-cut) — needs 5 green + 6/7A/7B
- **step 9**: k65hcx (fork-showcase-post) — needs 8; Cameron approves first post, no auto-post
- **step 10 (N)**: od8esg (closeout) — must follow every other card

**Deferred to m3/s5 (NOT in this sprint, by design):** P6 running-cancel (needs net-new `KernelClient.interrupt()` + `ExecutionEngine` AbortSignal), `runScope:'with-upstream'` (needs public `@deepnote/reactivity` DAG primitives, not the cli-private `resolveUpstreamExecutionBlockIds`), and P4 run-all coalescing.

## Sprint Closeout & Retrospective

| Task | Detail/Link |
| :--- | :--- |
| **Cards Archived** | (closeout card) |
| **Sprint Summary** | (closeout card) |
| **Changelog Entry** | (closeout card) |
| **Roadmap Updated** | m3/s1 marked complete (closeout card) |
| **Retrospective** | (closeout card) |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Incomplete Cards** | n/a at planning time |
| **Stub Cards** | none |
| **Technical Debt** | P4/P6/with-upstream deferred to m3/s5 by design — NOT debt, settled deferrals |
| **Process Improvements** | n/a at planning time |
| **Dependencies/Blockers** | execute-stream-ws is the critical path; integration-tests gate the slice |

### What Went Well

* Design doc was adversarially reviewed, so decomposition is mechanical.

### What Could Be Improved

* (captured at closeout)

### Completion Checklist

* [ ] All done cards archived to sprint folder
* [ ] Sprint summary generated with automatic metrics
* [ ] Changelog updated with version number and changes
* [ ] Roadmap milestone marked complete with actual date
* [ ] Incomplete cards moved to backlog or next sprint
* [ ] Retrospective notes captured above
* [ ] Follow-up cards created for technical debt
* [ ] Sprint closed and celebrated!


## [1.1.0] - 2025-11-18

> Release-notes stub required by the `feature-sprint` template. Actual CHANGELOG entry is written by the LUI1WEDGE Sprint Closeout card once shipped scope is final.

### Added
- `@deepnote/runtime-server` — headless HTTP + WebSocket API over `runtime-core` (open/list/run/stream/save).
- `deepnote serve` / `deepnote ui` CLI commands.

### Changed
- `packages/cli`: registered `serve`/`ui`; added `@deepnote/runtime-server` dependency.
