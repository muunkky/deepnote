# Feature Sprint Setup Template

## Sprint Definition & Scope

- **Sprint Name/Tag**: S6INREPO (used as filename prefix for all cards)
- **Sprint Goal**: Bring the in-repo half of m1/s6 to done — MCP/CLI honor a shared `DEEPNOTE_PYTHON` interpreter contract (ADR-001), and runtime agent-block execution gets real tool-loop coverage + release-readiness.
- **Timeline**: 2026-06-10 - (open)
- **Roadmap Link**: m1/s6 — AI agents author, edit, and execute Deepnote notebooks (in-repo residuals). PRD: `docs/prds/PRD-001-ai-agent-notebook-authoring.md`. ADR: `docs/adr/ADR-001-shared-python-interpreter-resolution.md`.
- **Definition of Done**: Sprint complete when all 7 cards are done — the shared `selectPythonSpec` resolver exists and is consumed by both MCP and CLI, the runtime agent-block tool-loop has real (CI-runnable, no-OPENAI_API_KEY) coverage with confirmed defaults, runtime-core is version-bumped with a CHANGELOG, and the closeout card has processed all retrospective items.

**Required Checks:**

- [ ] Sprint name/tag is chosen and will be used as prefix for all cards
- [ ] Sprint goal clearly articulates the value/outcome
- [ ] Roadmap milestone is identified and linked

---

## Card Planning & Brainstorming

> Two independent, parallelizable workstreams. Stream A (interpreter contract, ADR-001): step2A foundational resolver, then step3A (MCP) and step3B (CLI) converge on it. Stream B (runtime agent-block readiness, PRD-001 Phase 2): step2B tool-loop coverage, then step4 version+CHANGELOG. Streams A and B share no files and can run concurrently.

### Work Areas & Card Ideas

**Area 1: Shared interpreter contract (Stream A — ADR-001)**

- step 2A: shared `selectPythonSpec` resolver + `isBareSystemPython` export (runtime-core) — foundational for Stream A
- step 3A: MCP `deepnote_run` env resolution + bare-python hint (depends on 2A)
- step 3B: CLI `run` interpreter resolution converges on shared selector (depends on 2A; parallel with 3A, different file)

**Area 2: Runtime agent-block readiness (Stream B — PRD-001 Phase 2)**

- step 2B: cover `executeAgentBlock` tool-loop + reconcile agent defaults
- step 4: runtime-core version bump + CHANGELOG for agent helpers (depends on 2B)

**Area 3: Sprint lifecycle**

- step 1: this sprint plan
- step 5: S6INREPO sprint closeout

> **No standalone follow-up tracker (deliberate).** This sprint intentionally routes deferred/retrospective work to the closeout card's `## Sprint Retrospective` section (per the planner model) IN LIEU OF a standalone `S6INREPO Follow-up Tracker` card — so the sprint-closeout reviewer should not flag the tracker's absence as a setup defect.

### Card Types Needed

- [ ] **Features**: 3 feature cards (step 2A, step 3A, step 3B)
- [ ] **Bugs**: 0 bug cards
- [ ] **Chores**: 2 chore cards (step 4, step 5 closeout)
- [ ] **Spikes**: 0 spike cards
- [ ] **Docs**: 0 standalone docs cards (docs updates folded into feature/chore cards)

**Out of scope (external residuals — explicitly NOT in this sprint):**

- Deepnote Cloud import layout drift (#289) — external; requires Deepnote Cloud account, not in-repo
- `vscode-deepnote` producer changes + Cursor end-to-end (#288) — external client/editor work
- Live OpenAI-keyed end-to-end of agent blocks + npm publish of runtime-core — maintainer-only secrets / external infra

---

## Sequential Card Creation Workflow

Use this workflow to create all sprint cards using sequential `create_card()` calls.
Sequential creation provides better error handling and is easier for AI agents to work with.

|            Step             | Status/Details                                                                   |                 Universal Check                 |
| :-------------------------: | :------------------------------------------------------------------------------- | :---------------------------------------------: |
| **1. Create Feature Cards** | step 2A (runtime-core resolver), step 3A (MCP wiring), step 3B (CLI convergence) |   - [ ] Feature cards created with sprint tag   |
|   **2. Create Bug Cards**   | None this sprint                                                                 |     - [ ] Bug cards created with sprint tag     |
|  **3. Create Chore Cards**  | step 4 (version+CHANGELOG), step 5 (closeout)                                    |    - [ ] Chore cards created with sprint tag    |
|  **4. Create Spike Cards**  | None this sprint                                                                 |    - [ ] Spike cards created with sprint tag    |
|  **5. Verify Sprint Tags**  | `list_cards(sprint="S6INREPO")` after creation                                   |     - [ ] All cards show correct sprint tag     |
| **6. Fill Detailed Cards**  | All P1 cards carry full DoD / acceptance criteria at creation                    | - [ ] P0/P1 cards have full acceptance criteria |

### Workflow Instructions

**Step 1-4: Create Cards by Type Sequentially**

Cards are created in this dependency order: step1 (plan) -> step2A + step2B (parallel) -> step3A + step3B (parallel, both depend on 2A) -> step4 (depends on 2B) -> step5 (closeout, final).

**Sequencing summary:**

- `step 1` — sprint plan (this card)
- `step 2A` — runtime-core `selectPythonSpec` resolver (foundational for Stream A)
- `step 2B` — agent tool-loop coverage (Stream B, parallel with 2A)
- `step 3A` — MCP wiring (depends on 2A)
- `step 3B` — CLI convergence (depends on 2A; parallel with 3A, different file)
- `step 4` — runtime-core version + CHANGELOG (depends on 2B)
- `step 5` — sprint closeout (final, step N)

Streams A (2A -> 3A/3B) and B (2B -> 4) are independent and parallelizable.

**Step 5: Verify Sprint Setup**

```python
list_cards(sprint="S6INREPO")
```

**Step 6: Add Details to Ready Cards**

All P1 cards carry full DoD / acceptance criteria at creation; no stubs.

**Created Card IDs**: [recorded in the sprint report after creation]

**Fork discipline (applies to every code card in this sprint):** code lands on a `feat/*` branch cut from `upstream/main`; NO `.gitban/`, `.claude/`, `docs/prds/`, or `docs/adr/` files in code commits. Plan/dispatch on `workspace`, then move only the code commits onto the clean branch.

---

## Sprint Execution Phases

Track the major phases of sprint execution. This is lightweight - just checkpoint the key gitban operations.

| Phase / Task            | Status / Link to Artifact |               Universal Check                |
| :---------------------- | :------------------------ | :------------------------------------------: |
| **Roadmap Integration** | m1/s6 (PRD-001, ADR-001)  |   - [ ] Milestone updated with sprint tag    |
| **Take Sprint**         | [Date sprint was claimed] |    - [ ] Used take_sprint() to claim work    |
| **Mid-Sprint Check**    | [Sprint progress notes]   | - [ ] Reviewed list_cards(sprint="S6INREPO") |
| **Complete Cards**      | [Completed card IDs]      |       - [ ] Cards moved to done status       |
| **Sprint Archive**      | [Archive folder name]     |  - [ ] Used archive_cards() to bundle work   |
| **Generate Summary**    | [Summary.md location]     |    - [ ] Used generate_archive_summary()     |
| **Update Changelog**    | [Changelog entry]         | - [ ] Recorded release notes in CHANGELOG.md |
| **Update Roadmap**      | [Milestone status]        |       - [ ] Marked milestone complete        |

### Phase Details

#### Roadmap Integration

This sprint advances roadmap story `m1/s6` — the in-repo residuals (interpreter contract + runtime agent-block readiness). The external residuals (#289 Cloud import, #288 vscode/Cursor, live-keyed E2E + npm publish) remain on the roadmap as out-of-sprint follow-ups.

#### Take Sprint

```python
take_sprint(sprint_name="S6INREPO", owner="CAMERON")
```

#### Monitor Progress

```python
list_cards(sprint="S6INREPO")
get_gitban_stats()
```

---

## Sprint Closeout & Retrospective

| Task                | Detail/Link                                                     |
| :------------------ | :-------------------------------------------------------------- |
| **Cards Archived**  | [Link to sprint archive folder]                                 |
| **Sprint Summary**  | [Link to SUMMARY.md]                                            |
| **Changelog Entry** | [Version number and changes]                                    |
| **Roadmap Updated** | [Milestone marked complete]                                     |
| **Retrospective**   | Handled by the dedicated S6INREPO Sprint Closeout card (step 5) |

### Closeout Tools

The dedicated `S6INREPO Sprint Closeout` card (step 5) is the load-bearing closeout. It archives done cards, generates the summary, updates `CHANGELOG.md`, marks the roadmap story, and walks all retrospective items.

```python
archive_cards(archive_name="S6INREPO", all_done=True)
generate_archive_summary(archive_folder_name="<sprint-folder>", mode="auto")
```

### Follow-up & Lessons Learned

| Topic                     | Status / Action Required                                 |
| :------------------------ | :------------------------------------------------------- |
| **Incomplete Cards**      | [Carry over to next sprint or move to backlog]           |
| **Stub Cards**            | None — all cards fully specced at creation               |
| **Technical Debt**        | [Created follow-up cards for debt introduced]            |
| **Process Improvements**  | [What to improve in next sprint setup?]                  |
| **Dependencies/Blockers** | Stream A cards (3A/3B) depend on 2A; step4 depends on 2B |

### What Went Well

- [To be filled at closeout]

### What Could Be Improved

- [To be filled at closeout]

### Completion Checklist

- [ ] All done cards archived to sprint folder
- [ ] Sprint summary generated with automatic metrics
- [ ] Changelog updated with version number and changes
- [ ] Roadmap milestone marked complete with actual date
- [ ] Incomplete cards moved to backlog or next sprint
- [ ] Retrospective notes captured above
- [ ] Follow-up cards created for technical debt
- [ ] Sprint closed and celebrated!

## [1.1.0] - 2025-11-18

> Release-notes scaffold inherited from the feature-sprint template. The actual CHANGELOG entry for the runtime-core changes is owned by step 4 (`packages/runtime-core/CHANGELOG.md`); this section is a placeholder the template requires and is not the source of truth.

### Added

- (placeholder — see step 4 for the real runtime-core CHANGELOG)

### Fixed

- (placeholder)

### Changed

- (placeholder)
