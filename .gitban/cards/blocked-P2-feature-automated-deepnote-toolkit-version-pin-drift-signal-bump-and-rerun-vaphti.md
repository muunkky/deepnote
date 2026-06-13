# Feature Development Template

**When to use this template:** Future ops/CI deliverable deferred from ALTKERN1. Currently in loose backlog, blocked on a concrete external prerequisite (see Blocker below).

## Feature Overview & Context

* **Associated Ticket/Epic:** Design-doc open question (`docs/designs/phase1-alternative-language-kernels.md`). Deferred from ALTKERN1 card `obcn7z` (Sub-phase 1C — real-kernel integration + CI IaC pins).
* **Feature Area/Component:** CI / ops automation — drift detection for the `deepnote-toolkit` / `bash_kernel` version pins that the real-execution integration gate depends on.
* **Target Release/Milestone:** Post-ALTKERN1 (separate ops/CI initiative; depends on a scheduled-automation cadence not present in the repo today).

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
| **Design Doc (open question)** | `docs/designs/phase1-alternative-language-kernels.md` | Records the open question: there is no automated signal when upstream `deepnote-toolkit` changes the real-server contract the integration assertions depend on. |
| **CI env-block pins** | `.github/workflows/ci.yml` (ALTKERN1 IaC job `env:` block) | Pins `deepnote-toolkit[server]==2.3.1` and `bash_kernel==0.10.0` with a deliberate-bump comment — these are the pins this card would watch for drift. |
| **Real-execution gate** | `packages/cli/test-integration/` (ALTKERN1 real-kernel e2e authored by `obcn7z`) | The only real-execution gate; silently rots if upstream toolkit changes the contract and the pin is never bumped. |

## Design & Planning

### Initial Design Thoughts & Requirements

> Use this space for initial design ideas, key requirements, constraints, and architectural considerations.

* Requirement: a periodic "bump-and-rerun" cadence — a scheduled mechanism that bumps the `deepnote-toolkit` (and `bash_kernel`) pins to the latest upstream release and reruns the real-execution integration gate, surfacing a signal when the new version breaks the contract the assertions depend on.
* Constraint / prerequisite: depends on establishing a recurring scheduled-automation mechanism (e.g. a `schedule:`-triggered GitHub Actions workflow + a way to open a PR / raise an alert on failure) that does NOT exist in the repo today.
* Design thought: a scheduled workflow that opens a draft PR bumping the pin and runs the integration gate; a red run is the drift signal. Could reuse a dependency-bump bot pattern (Renovate/Dependabot) constrained to these pins, gated by the real-execution job.
* Known unknown: cadence (weekly? on upstream release?) and whether to alert via PR, issue, or CI notification — decide at planning.

### Acceptance Criteria

Define clear, testable acceptance criteria for this feature:

* [ ] A scheduled CI mechanism exists that periodically bumps the `deepnote-toolkit[server]` / `bash_kernel` pins to the latest upstream release.
* [ ] The bump triggers a rerun of the real-execution integration gate against the bumped version.
* [ ] A contract break (failing rerun) produces an actionable signal (PR comment, issue, or CI alert) rather than silently rotting.
* [ ] The default (non-bumped) CI run continues to use the deliberate pinned versions — drift detection does not auto-merge the bump.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Choose scheduled-automation mechanism + alert channel | - [ ] Design Complete |
| **Test Plan Creation** | Verify the drift signal fires on a simulated contract break | - [ ] Test Plan Approved |
| **TDD Implementation** | Scheduled bump-and-rerun workflow | - [ ] Implementation Complete |
| **Integration Testing** | Dry-run the scheduled workflow | - [ ] Integration Tests Pass |
| **Documentation** | Document the cadence + how to respond to a drift signal | - [ ] Documentation Complete |
| **Code Review** | PR review | - [ ] Code Review Approved |
| **Deployment Plan** | Enable the schedule trigger | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | Simulate a contract break; assert the signal fires | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | Scheduled workflow + bump + rerun + alert | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | Clean upstream version passes silently | - [ ] Originally failing tests now pass |
| **4. Refactor** | Reuse existing integration-gate job | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | Default pinned CI unaffected | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A | - [ ] Performance requirements are met |

### Implementation Notes

> Document key implementation decisions, test approach, and code examples here.

**Test Strategy:**
The signal must be verifiable: a simulated contract break (e.g. pin to a deliberately incompatible version in a dry run) should produce a red real-execution gate and the chosen alert.

**Key Implementation Decisions:**
Deferred to planning. Must NOT auto-merge the bump — the deliberate pin stays authoritative; the bump-and-rerun only surfaces a drift signal for a human to act on.

```text
Placeholder — concrete workflow YAML to be added at implementation.
```

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | [PR link at implementation time] |
| **QA Verification** | [Verified by simulating a contract break] |
| **Staging Deployment** | N/A (CI deliverable) |
| **Production Deployment** | N/A |
| **Monitoring Setup** | The drift signal IS the monitoring |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | Choose cadence + alert channel at planning |
| **Technical Debt Created?** | No |
| **Future Enhancements** | Extend the same cadence to the heavy-kernel pins once that integration target lands |

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
External prerequisite (missing scheduled-automation mechanism). This depends on establishing a recurring ops cadence / scheduled-automation mechanism (e.g. a schedule:-triggered workflow plus a drift-alert channel) that does not exist in the repo today, and it is recorded as an open question in the design doc (docs/designs/phase1-alternative-language-kernels.md) rather than in-scope ALTKERN1 Phase-1 work. Phase 1 correctly records the pins (deepnote-toolkit[server]==2.3.1, bash_kernel==0.10.0) in the CI env: block with a deliberate-bump comment; building automated drift detection is a separate ops/CI initiative beyond this sprint's headline scope. Unblock once a scheduled-automation mechanism + alert channel is chosen for the repo.
