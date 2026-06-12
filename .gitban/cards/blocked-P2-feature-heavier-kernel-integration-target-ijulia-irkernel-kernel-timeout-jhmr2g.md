# Feature Development Template

**When to use this template:** Future-milestone (PRD-002 Phase 2/3) integration target deferred from ALTKERN1. Currently in loose backlog, blocked on a concrete external prerequisite (see Blocker below).

## Feature Overview & Context

* **Associated Ticket/Epic:** PRD-002 Phase 2/3 (`docs/prds/PRD-002-alternative-language-kernels.md`); design-doc deferral `docs/designs/phase1-alternative-language-kernels.md` (Phase 2/3 note, line ~435 — "the user-facing `--kernel-timeout` flag (deferred per KD-7 until a heavy-kernel integration target exists)"). Deferred from ALTKERN1 card `obcn7z` ("Future Enhancements" row).
* **Feature Area/Component:** CLI alternative-language-kernel execution — heavier-kernel (Julia/R) integration coverage + startup-timeout path.
* **Target Release/Milestone:** PRD-002 Phase 2/3 (post-ALTKERN1).

**Required Checks:**
* [ ] **Associated Ticket/Epic** link is included above.
* [ ] **Feature Area/Component** is identified.
* [ ] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

First, confirm the minimum required documentation has been reviewed for context.

* [ ] `README.md` or project documentation reviewed.
* [ ] Existing architecture documentation or ADRs reviewed.
* [ ] Related feature implementations or similar code reviewed.
* [ ] API documentation or interface specs reviewed [if applicable].

Use the table below to log findings. Add rows for other document types as needed.

| Document Type | Link / Location | Key Findings / Action Required |
| :--- | :--- | :--- |
| **Design Doc** | `docs/designs/phase1-alternative-language-kernels.md` | Phase 1 ships pure-pip `bash_kernel` only; heavier-kernel coverage + `--kernel-timeout` explicitly deferred to Phase 2/3 (KD-7). |
| **PRD** | `docs/prds/PRD-002-alternative-language-kernels.md` | Phase 2/3 scope owns this target. |
| **ALTKERN1 Phase-1 integration** | `packages/cli/test-integration/` (pure-pip bash_kernel e2e authored by `obcn7z`) | Existing integration harness to extend; only proves the bash_kernel path today. |
| **CI provisioning** | `.github/workflows/ci.yml` (ALTKERN1 IaC job) | Phase-1 job provisions a pure-pip toolchain; a Julia/R toolchain is new provisioning this card must add. |
| **Timeout wiring** | `packages/runtime-core/src/kernel-client.ts` (`kernelStartupTimeoutMs`, `waitForKernelIdle`); 5wqw1l KD-7 note | Config-only timeout exists and is unit-proven threading into `waitForKernelIdle`; the user-facing `--kernel-timeout` flag is unbuilt. |

## Design & Planning

### Initial Design Thoughts & Requirements

> Use this space for initial design ideas, key requirements, constraints, and architectural considerations.

* Requirement: add a heavier-kernel integration target (IJulia or IRkernel) that exercises a second non-Python transport beyond `bash_kernel`, proving the kernelspec-selection path generalises past the pure-pip case.
* Requirement: exercise the startup-timeout path against a heavy kernel — wire and prove the user-facing `--kernel-timeout` CLI flag (KD-7), which Phase 1 deliberately left config-only.
* Constraint / prerequisite: requires NEW CI provisioning for a non-pip toolchain (a Julia and/or R runtime + the IJulia/IRkernel kernelspec), which the Phase-1 pure-pip IaC job does not install.
* Known unknown: whether to provision Julia, R, or both, and whether a container image or apt/conda provisioning is the cheaper CI path — decide at Phase 2/3 planning.
* Dependency: PRD-002 Phase 2 notebook-`language` schema work may inform which heavy kernel is the highest-value first target.

### Acceptance Criteria

Define clear, testable acceptance criteria for this feature:

* [ ] CI provisions a non-pip heavy-kernel toolchain (Julia/IJulia or R/IRkernel) in the integration job.
* [ ] An integration test runs `deepnote run --kernel <julia|ir> <fixture>.deepnote` end-to-end against the real `deepnote-toolkit` server and asserts MIME-typed output from the heavy kernel.
* [ ] The `--kernel-timeout` CLI flag is built and threads into `kernelStartupTimeoutMs` / `waitForKernelIdle`, and an integration test exercises the startup-timeout path against the heavy kernel (e.g. a sub-startup timeout surfaces the typed startup-timeout failure rather than hanging).
* [ ] The new integration target is gated in CI alongside (not replacing) the Phase-1 `bash_kernel` e2e.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Phase 2/3 planning — choose Julia vs R; CI provisioning approach | - [ ] Design Complete |
| **Test Plan Creation** | Heavy-kernel e2e + timeout-path test cases | - [ ] Test Plan Approved |
| **TDD Implementation** | `--kernel-timeout` flag + integration test | - [ ] Implementation Complete |
| **Integration Testing** | New CI heavy-kernel job | - [ ] Integration Tests Pass |
| **Documentation** | Update running-your-own-kernel docs for heavy kernels + `--kernel-timeout` | - [ ] Documentation Complete |
| **Code Review** | PR review | - [ ] Code Review Approved |
| **Deployment Plan** | N/A (CI/test-only deliverable) | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | Heavy-kernel e2e + `--kernel-timeout` startup-timeout assertion | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | `--kernel-timeout` flag plumbing + integration fixture | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | Against provisioned heavy kernel | - [ ] Originally failing tests now pass |
| **4. Refactor** | Share harness with Phase-1 e2e where possible | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | bash_kernel e2e still green | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A | - [ ] Performance requirements are met |

### Implementation Notes

> Document key implementation decisions, test approach, and code examples here.

**Test Strategy:**
Extend the ALTKERN1 Phase-1 real-kernel integration harness (`packages/cli/test-integration/`) with a heavy-kernel fixture; provision the kernel in CI rather than mocking. The startup-timeout test should use a deliberately tight `--kernel-timeout` to deterministically trip the timeout path.

**Key Implementation Decisions:**
Deferred to Phase 2/3 planning. The `--kernel-timeout` flag follows the same selector/plumbing pattern as `--kernel` (ALTKERN1 card 5wqw1l).

```text
Placeholder — concrete code snippets to be added at Phase 2/3 implementation.
```

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | [PR link at implementation time] |
| **QA Verification** | [Verified once CI heavy-kernel job is green] |
| **Staging Deployment** | N/A (CI/test deliverable) |
| **Production Deployment** | N/A |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | Choose first heavy-kernel target (Julia vs R) at Phase 2/3 planning |
| **Technical Debt Created?** | No |
| **Future Enhancements** | `--list-kernels` discovery surface (PRD-002 Phase 3) reuses the same `/api/kernelspecs` pre-flight |

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


## BLOCKED
External prerequisite (future-milestone scope + missing CI infrastructure). This is explicitly PRD-002 Phase 2/3 scope, deferred from ALTKERN1 (Phase 1, which ships only the pure-pip bash_kernel path). The design doc (docs/designs/phase1-alternative-language-kernels.md, line ~435) states the user-facing --kernel-timeout flag is "deferred per KD-7 until a heavy-kernel integration target exists," and the originating card obcn7z lists this under "Future Enhancements: Heavier-kernel integration target (Julia/R); Phase 2/3." Concrete blockers: (1) new CI provisioning for a non-pip Julia/R toolchain (IJulia/IRkernel kernelspec) that the Phase-1 pure-pip IaC job does not install; (2) the --kernel-timeout startup-timeout path against a heavy kernel, which Phase 1 deliberately left config-only. Unblock once PRD-002 Phase 2/3 planning begins and the heavy-kernel CI toolchain provisioning is approved.
