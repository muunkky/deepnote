# step 5: failure-category banners + in-place tracebacks

> **Design Phase 4 (failure surfacing)** (`docs/designs/m3-s3-live-execution.md`). Sprint **LUIRUN1** step 5. The typed failure categories surface by category (KD-5): kernel/launch/death → an actionable **banner**; an in-block exception → an **in-place traceback** via the existing `ErrorRenderer` + the block marked failed. No failure renders as a blank cell or a run stuck pending.
>
> **Packed-card note:** two user-visible surfaces (the kernel banner, the in-place traceback) share ONE failure-surfacing seam (the `block-done`/`run-failed` event handling, KD-5) and are not independently shippable — the traceback is the in-block branch of the same failure switch the banner's kernel branch reads. They are packed deliberately and **each carries its own capstone** (per the packed-card rule).

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s3 → project `live-execution`; sprint LUIRUN1 step 5
* **Feature Area/Component:** `apps/studio/src/execution/KernelBanner.tsx`; the failure mapping in `CodeRenderer`/`SqlRenderer` (in-block traceback via `OutputRenderer`/`ErrorRenderer`)
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
| **Design Doc** | `docs/designs/m3-s3-live-execution.md` Phase 4 + KD-5 + R4 | category → surface mapping; no-blank-cell, no-stuck-pending |
| **ADR** | ADR-005 §Failure forwarding / failure-category fidelity | the categories: missing-kernel / kernel-launch / kernel-died / in-block |
| **API Specs** | `KernelFailureCategory` (type-only, `/types`) | the discriminant the mapping switches on |
| **Prior art** | `apps/studio/src/outputs/ErrorRenderer.tsx` | the EXISTING traceback renderer (reuse for in-block) |

### Required Reading

| Source | Location | Why |
| :--- | :--- | :--- |
| Design Phase 4 + KD-5 | `docs/designs/m3-s3-live-execution.md` | banner vs traceback by category; the actionable messages |
| KernelFailureCategory | `packages/runtime-server/src/api-types.ts` / `@deepnote/runtime-core` | the typed category set (type-only import — adding a category is a compile error here) |
| runStore | `apps/studio/src/state/runStore.ts` (step 3) | `kernelBanner` + per-block `failureCategory` the surfaces read |
| ErrorRenderer | `apps/studio/src/outputs/ErrorRenderer.tsx` | reuse for the in-block traceback (R2) |

## Design & Planning

### Initial Design Thoughts & Requirements

* Deliverable: `src/execution/KernelBanner.tsx` — an actionable banner keyed on `KernelFailureCategory`: `missing-kernel` → "deepnote-toolkit not installed — `pip install 'deepnote-toolkit[server]'`"; `kernel-launch` / `kernel-died` → their own remediation text. Reads `RunState.kernelBanner`.
* Deliverable: the in-block failure surface — a `block-done.success=false` with an `error` `IOutput` renders its ename/evalue + traceback in place via the existing `ErrorRenderer` and marks the block `failed` (the failure switch's `in-block` branch).
* Constraint (R4): a missing kernel / launch failure / mid-run death / in-block exception each surface distinguishably; no blank cell; a `run-failed`/`block-done` always clears pending (no infinite spinner).
* Constraint: `KernelFailureCategory` imported type-only; a new category is a compile error here until handled (a feature, not a bug).

### Acceptance Criteria

* [ ] Each `KernelFailureCategory` renders its distinct, actionable banner.
* [ ] An in-block exception renders its traceback in place (via `ErrorRenderer`) and marks the block failed.
* [ ] No failure leaves a run stuck pending (a `run-failed` after `block-start` clears the spinner).
* [ ] Isolation invariant + type-only boundary green.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :--- |
| **Design & Architecture** | Design Phase 4 (failure surfacing) | - [ ] Design Complete |
| **Test Plan Creation** | banner-per-category tests + in-block traceback test + stuck-pending guard test | - [ ] Test Plan Approved |
| **TDD Implementation** | KernelBanner + failure mapping | - [ ] Implementation Complete |
| **Integration Testing** | jsdom + scripted failure events | - [ ] Integration Tests Pass |
| **Documentation** | README "Failure handling" | - [ ] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | each KernelFailureCategory → its banner + remediation; an in-block `error` output → ErrorRenderer traceback + block failed; a `run-failed` after `block-start` clears pending (no infinite spinner) | - [ ] Failing tests committed |
| **2. Implement Feature Code** | KernelBanner + the category→surface switch | - [ ] Feature implementation complete |
| **3. Run Passing Tests** | studio vitest green | - [ ] Originally failing tests pass |
| **4. Refactor** | Tidy the failure switch | - [ ] Code refactored |
| **5. Full Regression Suite** | `pnpm test` + `pnpm typecheck` + isolation green | - [ ] All tests pass |
| **6. Performance Testing** | N/A | - [ ] N/A |

### Implementation Notes

**Test Strategy:** component tests with scripted failure events. Banner: drive each `KernelFailureCategory` through `RunState.kernelBanner` and assert the distinct, actionable message renders (the `missing-kernel` banner asserts the `pip install` remediation). Traceback: feed a `block-done(success=false)` + an `error` `IOutput` and assert the ename/evalue + traceback render in place via `ErrorRenderer` and the block is marked failed. Stuck-pending guard: a `run-failed` after `block-start` clears the running spinner.

**Key Implementation Decisions:** reuse `ErrorRenderer` for the in-block traceback (R2); the category switch is type-only on `KernelFailureCategory` (compile-time exhaustiveness).

## Definition of Done

**Intent (plain English):** When a run fails, the reader is told *why* in a way they can act on — "your toolkit isn't installed, run this pip command" for a kernel problem, or the actual Python traceback shown right in the cell for a code error — never a blank cell and never a cell that spins forever. If this breaks, a failed run would look identical to a slow run, or a kernel problem would be indistinguishable from a code bug, and the user couldn't tell what to fix.

**Observable outcomes (unfakeable, per-sub-feature capstones):**

* [ ] **Capstone A (kernel banner):** driving each `KernelFailureCategory` through the run state renders its own distinct banner — and the `missing-kernel` case renders the actionable "`pip install 'deepnote-toolkit[server]'`" remediation, not a generic "run failed" — asserted on real DOM.
* [ ] **Capstone B (in-place traceback):** a `block-done(success=false)` carrying an `error` `IOutput` (ename/evalue/traceback) renders that traceback **in place in the block** via the existing `ErrorRenderer` and marks the block `failed` (assert the traceback DOM appears in the block wrapper and the block shows the failed state) — not a blank cell.
* [ ] A `run-failed` arriving after `block-start` clears the running spinner (no run stuck pending forever).
* [ ] `KernelFailureCategory` imported type-only; isolation invariant green (0 `apps/` files in root tsc).

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban-reviewer approval |
| **QA Verification** | Each failure category surfaces distinctly; no blank cell / stuck pending |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No |
| **Future Enhancements** | step 6 measures the loop end-to-end against a real kernel |

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
