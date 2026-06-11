# step 1: ALTKERN1 Sprint Planning

> **Sprint**: ALTKERN1 | **Type**: chore | **Step**: 1 (first)
>
> Planning card for sprint ALTKERN1. Defines the goal, card inventory, execution sequencing, and parallelization. End state: the sprint is planned and all cards are in todo. Completable before any feature work begins.

## Cleanup Scope & Context

- **Sprint/Release:** ALTKERN1 — PRD-002 Phase 1 (alternative-language kernels)
- **Primary Feature Work:** Run a single-language non-Python notebook end-to-end via `deepnote run --kernel <name>` against the existing `deepnote-toolkit` Jupyter server, with deterministic degradation and CI-verifiable failure categories.
- **Cleanup Category:** Sprint planning (not cleanup) — inventory, sequencing, dependency map

**Required Checks:**

- [x] Sprint/Release is identified above.
- [x] Primary feature work that generated this cleanup is documented.

---

## Deferred Work Review

This is the sprint _planning_ card, not an end-of-sprint cleanup. The table below is repurposed to record the authoritative sources read and the decomposition decisions taken.

- [x] Design doc read in full (`docs/designs/phase1-alternative-language-kernels.md`) — sub-phases 1A/1B/1C and their binary DoDs are the basis for the cards.
- [x] ADR-002/003/004 read — accepted; cards must respect launch model, selection precedence, and degradation behavior.
- [x] PRD-002 Phase 1 read — scope + falsifiable success criteria.
- [x] Code seams verified against the tree (file:line anchors below) before writing Required Reading tables.

| Cleanup Category       | Specific Item / Location                                                                | Priority | Justification for Cleanup                                                                                                      |
| :--------------------- | :-------------------------------------------------------------------------------------- | :------: | :----------------------------------------------------------------------------------------------------------------------------- |
| **Source: design doc** | `docs/designs/phase1-alternative-language-kernels.md` Implementation Phases 1A/1B/1C    |    P0    | Each sub-phase is vertically complete with a binary DoD; cards map 1:1 to sub-phases (with 1B split per the packed-card rule). |
| **Source: ADR-002**    | launch model (thread `kernelName`, pre-flight `/api/kernelspecs`, configurable timeout) |    P0    | Constrains step 2.                                                                                                             |
| **Source: ADR-003**    | selection precedence (`explicit ?? 'python3'`, separate from `DEEPNOTE_PYTHON`)         |    P0    | Constrains step 2's selector.                                                                                                  |
| **Source: ADR-004**    | degradation (value-add hard-fail, reactivity bypass)                                    |    P0    | Constrains steps 3A/3B.                                                                                                        |
| **Decomposition**      | 1B split into 3 user-visible behaviors per packed-card rule                             |    P0    | value-add hard-fail (3A), reactivity bypass (3B), failureCategory (4) each carry their own capstone.                           |

---

## Cleanup Checklist

### Build & CI/CD (optional)

| Task                       | Status / Details                                                                                  | Done? |
| :------------------------- | :------------------------------------------------------------------------------------------------ | :---: |
| **Card inventory created** | 6 cards: planning, 1A, 1B-value-add, 1B-reactivity, 1B-failure-category, 1C-integration, closeout | - [x] |
| **All cards in todo**      | every ALTKERN1 card promoted to todo via `move_to_todo`                                           | - [x] |
| **Sequencing assigned**    | step numbers + parallel batches assigned in titles                                                | - [x] |
| **Roadmap connected**      | `m2/s5/alternative-kernels/phase1-implementation` carries `sprints_ref: ALTKERN1`                 | - [x] |

### Refactoring & Code Organization (optional)

| Task                        | Status / Details                                                           | Done? |
| :-------------------------- | :------------------------------------------------------------------------- | :---: |
| **Dependency map recorded** | 2 (foundational) -> {3A, 3B} parallel -> 4 -> 5 (headline) -> 6 (closeout) | - [x] |

---

## Sprint Goal

Implement PRD-002 Phase 1 so a user can run a single-language non-Python notebook (code + markdown) end-to-end through `deepnote run --kernel <name>` against the existing `python -m deepnote_toolkit server`, receiving MIME-typed outputs; Python stays byte-stable (default `python3`); value-add blocks hard-fail and reactivity is bypassed on non-Python; the four kernel-failure classes are distinguishable in `--output json`; and a provisioned CI job proves the headline end-to-end with a real `bash` kernel returning a non-`text/plain` MIME bundle.

## Card Inventory

| Step | ID     | Title                                                                                                               | Type    | Priority |
| :--- | :----- | :------------------------------------------------------------------------------------------------------------------ | :------ | :------- |
| 1    | a1xa1u | ALTKERN1 Sprint Planning                                                                                            | chore   | P1       |
| 2    | 5wqw1l | Sub-phase 1A — thread kernelName + selectKernelName + `--kernel` + pre-flight + typed errors + configurable timeout | feature | P0       |
| 3A   | 41mrnp | Sub-phase 1B — value-add block hard-fail on non-Python                                                              | feature | P0       |
| 3B   | ngjse2 | Sub-phase 1B — reactivity bypass on non-Python (both analyzer sites)                                                | feature | P0       |
| 4    | qajbsg | Sub-phase 1B — failureCategory discriminant for the 4 failure classes                                               | feature | P0       |
| 5    | obcn7z | Sub-phase 1C — real-kernel integration test + CI IaC job + docs (headline)                                          | feature | P0       |
| 6    | dn929q | ALTKERN1 Sprint Closeout                                                                                            | chore   | P1       |

## Execution Sequence

- **Step 1** — this planning card.
- **Step 2** — 1A foundational thread (`RuntimeConfig.kernelName`, `selectKernelName`, `isNonPythonKernel`, `KernelClient.connect(serverUrl, kernelName?)`, pre-flight, `kernel-errors.ts`, `--kernel` flag, engine forwarding). Precedes all degradation work.
- **Step 3A / 3B** — parallel batch. The collision-freedom is specifically **between 3A and 3B**: 3A touches `packages/blocks` + `execution-engine.ts` and does NOT touch `run.ts`, while 3B touches only `run.ts` analyzer functions (`resolveUpstreamExecutionBlockIds`, `validateRequirements`) — so they can run concurrently. (Step 2 also edits `run.ts`, which is why both 3A and 3B depend on step 2 having landed first; that is a step-2 barrier, not a 3A/3B collision.)
- **Step 4** — failureCategory surfacing in `run.ts` (BlockResult/RunResult types, `onBlockDone`, `buildMachineRunResult`, outer catch). Sequenced **after 3B** because both edit `run.ts` (non-overlapping regions, but sequenced to avoid a merge collision). Depends on step 2.
- **Step 5** — 1C headline integration capstone + CI IaC + docs. Depends on 2 + 3A + 3B + 4.
- **Step 6** — closeout (final).

## Roadmap Connection

Serves `m2/s5/alternative-kernels/phase1-implementation` (`docs_ref: docs/designs/phase1-alternative-language-kernels.md`; `depends_on: non-python-launch-model, kernel-name-selection, degradation-behavior` — all accepted). `sprints_ref: ALTKERN1` and a `cards_ref` of the seven card IDs are already set on that node (verify present; do not re-set).

## Validation & Closeout

### Pre-Completion Verification

| Verification Task                     | Status / Evidence                         |
| :------------------------------------ | :---------------------------------------- |
| **All P0 Items Complete**             | All substantive cards created and in todo |
| **All P1 Items Complete or Ticketed** | Planning + closeout created               |
| **Tests Passing**                     | N/A — planning card                       |
| **No New Warnings**                   | N/A — planning card                       |
| **Documentation Updated**             | Inventory + sequence recorded above       |
| **Code Review**                       | N/A — planning card                       |

### Follow-up & Lessons Learned

| Topic                      | Status / Action Required                              |
| :------------------------- | :---------------------------------------------------- |
| **Remaining P2 Items**     | None                                                  |
| **Recurring Issues**       | None at planning time                                 |
| **Process Improvements**   | 1B split into 3 cards to satisfy the packed-card rule |
| **Technical Debt Tickets** | None created at planning                              |

### Completion Checklist

<!-- gate0: upper-checklist -->

- [x] All P0 items are complete and verified. <!-- cite: -->
- [x] All P1 items are complete or have follow-up tickets created. <!-- cite: -->
- [x] P2 items are complete or explicitly deferred with tickets. <!-- cite: -->
- [x] All tests are passing (unit, integration, and regression). <!-- cite: -->
- [x] No new linter warnings or errors introduced. <!-- cite: -->
- [x] All documentation updates are complete and reviewed. <!-- cite: -->
- [x] Code changes (if any) are reviewed and merged. <!-- cite: -->
- [x] Follow-up tickets are created and prioritized for next sprint. <!-- cite: -->
- [x] Team retrospective includes discussion of cleanup backlog (if significant). <!-- cite: -->

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them.
