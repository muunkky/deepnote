# step 4: Run / Run-all affordances + live output rendering

> **Design Phase 3** (`docs/designs/m3-s3-live-execution.md`). Sprint **LUIRUN1** step 4. The visible run loop: a Run control on code/sql blocks + a Run-all; live outputs render in place through the **existing** s2 `OutputRenderer`, replacing persisted while a session run exists. The deliberate, allowlist-tested crossing of s2's read-only R8.

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s3 → project `live-execution`; sprint LUIRUN1 step 4
* **Feature Area/Component:** `apps/studio/src/execution/RunControl.tsx`, `apps/studio/src/blocks/CodeRenderer.tsx`, `SqlRenderer.tsx`, `src/shell/{NotebookView,Shell}.tsx`
* **Target Release/Milestone:** m3 (fork-only showcase)

**Required Checks:**
* [ ] **Associated Ticket/Epic** link is included above.
* [ ] **Feature Area/Component** is identified.
* [ ] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

* [ ] `README.md` or project documentation reviewed.
* [ ] Existing architecture documentation or ADRs reviewed.
* [ ] Related feature implementations or similar code reviewed.
* [ ] API documentation or interface specs reviewed [if applicable].

| Document Type | Link / Location | Key Findings / Action Required |
| :--- | :--- | :--- |
| **Design Doc** | `docs/designs/m3-s3-live-execution.md` Phase 3 + KD-3/KD-4/KD-6 | live-vs-persisted replacement, read-only crossing allowlist, capability gating |
| **Prior art** | `apps/studio/src/outputs/OutputRenderer.tsx`; `CodeRenderer.tsx`/`SqlRenderer.tsx` | the existing output renderer (REUSE — no second renderer) + where persisted outputs render today |
| **Isolation** | `test-helpers/apps-studio-isolation.test.ts` (read-only invariant) | the allowlist the Run control is the tested exception to |

### Required Reading

| Source | Location | Why |
| :--- | :--- | :--- |
| Design Phase 3 + KD-3/4/6 | `docs/designs/m3-s3-live-execution.md` | live outputs replace persisted on block-start; Run is the only new mutating affordance; capability-gated |
| useExecution | `apps/studio/src/execution/useExecution.ts` (step 3) | the hook providing run state + `runBlock`/`runAll` |
| OutputRenderer | `apps/studio/src/outputs/OutputRenderer.tsx` | render live `IOutput[]` through the SAME renderer (R2) |
| CodeRenderer/SqlRenderer | `apps/studio/src/blocks/` | gain the optional `run` prop; live-vs-persisted output selection |
| capabilities | `ApiProject.capabilities.kernelLanguage` | gate Run when no kernel (KD-6) |

## Design & Planning

### Initial Design Thoughts & Requirements

* Deliverable: `src/execution/RunControl.tsx` — a Run button + state pill (idle/queued/running/done/failed), inert until clicked; calls `runBlock`.
* Deliverable: `CodeRenderer`/`SqlRenderer` accept an optional `run?: { state; onRun; canRun }` — render LIVE outputs through the existing `OutputRenderer` when a session run exists for the block, else persisted `block.outputs` (today's behaviour); show a running spinner + exec count. (Absent `run` prop → today's persisted-only behaviour, keeping the s2 tests green.)
* Deliverable: `NotebookView`/`Shell` host a **Run all** control + wire `useExecution`.
* Constraint (KD-4): the Run/Run-all controls are the ONLY new mutating affordance; the read-only-invariant test allowlists exactly them — inputs/button stay inert.
* Constraint (KD-6): Run disabled when `capabilities.kernelLanguage === null` (show the no-kernel affordance up front).
* Constraint (R2): no second output renderer — live and persisted both go through `OutputRenderer`.

### Acceptance Criteria

* [ ] Run + Run-all controls render and dispatch the correct `runBlock`/`runAll`.
* [ ] Live outputs render through the existing `OutputRenderer`, replacing persisted on `block-start`; a never-run block still shows persisted output (s2 regression).
* [ ] Run disabled when there is no kernel.
* [ ] The read-only-invariant test passes with the Run/Run-all allowlist; no OTHER mutating control appeared.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :--- |
| **Design & Architecture** | Design Phase 3 | - [ ] Design Complete |
| **Test Plan Creation** | component tests (Run dispatch, live render, replace, capability gate, read-only allowlist) | - [ ] Test Plan Approved |
| **TDD Implementation** | RunControl + renderer `run` prop + Run-all wiring | - [ ] Implementation Complete |
| **Integration Testing** | jsdom + fake useExecution | - [ ] Integration Tests Pass |
| **Documentation** | README "Running blocks" | - [ ] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | clicking Run sends `runBlock` for the block (fake hook asserts); a streamed `output` renders through OutputRenderer in place; a re-run replaces prior live output; never-run block shows persisted; Run disabled with no kernel; read-only test allowlists only Run/Run-all | - [ ] Failing tests committed |
| **2. Implement Feature Code** | RunControl + renderer prop + Run-all | - [ ] Feature implementation complete |
| **3. Run Passing Tests** | studio vitest green | - [ ] Originally failing tests pass |
| **4. Refactor** | Tidy run-prop plumbing | - [ ] Code refactored |
| **5. Full Regression Suite** | `pnpm test` + `pnpm typecheck` + isolation green | - [ ] All tests pass |
| **6. Performance Testing** | N/A (measured in step 6) | - [ ] N/A |

### Implementation Notes

**Test Strategy:** component tests (jsdom + RTL) with a fake `useExecution`. The capstone drives the assembled run path: click Run → the right `runBlock` fires → an injected `output` event renders through the REAL `OutputRenderer` in place. Assert replace-on-re-run and persisted-for-never-run (s2 regression). The read-only-invariant test must still pass with ONLY the Run/Run-all controls allowlisted.

**Key Implementation Decisions:** reuse `OutputRenderer` (R2); Run is the single allowlisted read-only crossing (KD-4); the optional `run` prop keeps the renderers testable without the hook and preserves s2 tests.

## Definition of Done

**Intent (plain English):** A reader looking at a code block sees a Run button; clicking it runs that block against the local kernel and the output appears right there, in place, replacing whatever was saved in the file — exactly like a Cloud notebook cell. A Run-all runs the notebook. If this breaks, clicking Run would do nothing visible, or the output would appear in the wrong place / not replace the stale saved output, or (worse) some other control would have become mutable.

**Observable outcomes (unfakeable):**

* [ ] **Capstone:** in jsdom, rendering a code block through `BlockRenderer` with a wired `useExecution`, clicking its Run control fires `runBlock` for that block, and feeding the resulting `output` event renders the live `IOutput` **in place through the existing `OutputRenderer`** (assert the real output DOM appears in that block's wrapper); a second Run **replaces** the prior live output rather than appending — proving the assembled run→render→replace loop.
* [ ] A block never run this session still renders its persisted `block.outputs` (s2 behaviour preserved).
* [ ] The Run control is disabled when `capabilities.kernelLanguage === null`.
* [ ] The read-only-invariant test passes with only Run/Run-all allowlisted — no input/button/other control became mutable; isolation invariant green (0 `apps/` files in root tsc).

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban-reviewer approval |
| **QA Verification** | Run loop renders live in place; read-only crossing contained |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No |
| **Future Enhancements** | step 5 surfaces failures; step 6 measures the loop |

### Completion Checklist

* [ ] All acceptance criteria are met and verified.
* [ ] All tests are passing (unit, integration, e2e, performance).
* [ ] Code review is approved and PR is merged.
* [ ] Documentation is updated (README, API docs, user guides).
* [ ] Feature is deployed to production.
* [ ] Monitoring and alerting are configured.
* [ ] Stakeholders are notified of completion.
* [ ] Follow-up actions are documented and tickets created.
* [ ] Associated ticket/epic is closed.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.
