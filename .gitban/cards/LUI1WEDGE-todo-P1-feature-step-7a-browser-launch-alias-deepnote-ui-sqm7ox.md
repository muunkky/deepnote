# step 7A: browser-launch-alias — `deepnote ui`

> **Sprint**: LUI1WEDGE | **Step**: 7A (parallel with 7B sql-integration-parity) | **Roadmap**: m3/s1/cli-serve/browser-launch-alias
> **Depends on**: step 6 (serve-command, `zq7q0g`). **Parallel-safe with** step 7B (`sql-integration-parity`) — disjoint surfaces (the `ui` alias registration reusing `createServeAction` vs the integrations env lift).

## Feature Overview & Context

* **Associated Ticket/Epic:** m3/s1 wedge; design doc Phase 7.
* **Feature Area/Component:** `deepnote ui` alias in `packages/cli` reusing `createServeAction`.
* **Target Release/Milestone:** m3/s1.

**Required Checks:**
* [ ] **Associated Ticket/Epic** link is included above.
* [ ] **Feature Area/Component** is identified.
* [ ] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

* [ ] `README.md` or project documentation reviewed.
* [ ] Existing architecture documentation or ADRs reviewed.
* [ ] Related feature implementations or similar code reviewed.
* [ ] API documentation or interface specs reviewed [if applicable].

### Required Reading

| Source | Section / lines | Why |
| :--- | :--- | :--- |
| `docs/designs/m3-s1-server-api-and-serve.md` | "Phase 7: `deepnote ui` alias" | The alias reuses `createServeAction` with `open:true` default; opens the LOCAL URL. |
| `docs/adr/ADR-005-browser-kernel-transport-proxy.md` | Decision §3; localhost-trust | The browser opens the local server URL — kernel port never reaches it, no cloud upload. |
| `packages/cli/src/commands/serve.ts` (from step 6) | `createServeAction` | The factory the `ui` alias wraps with `open:true`. |
| `packages/cli/src/commands/run.ts` | `openDeepnoteFileInCloud` (1536) | The CLOUD-upload path `ui` must NOT reach — `ui` opens the local URL only. |

| Document Type | Link / Location | Key Findings / Action Required |
| :--- | :--- | :--- |
| **Architecture Docs** | design doc Phase 7 | `ui` = `serve` + `--open` default. |
| **Similar Features** | `serve.ts` (step 6) | reuse `createServeAction`. |
| **API Specs** | N/A | no new API. |
| **ADR (New)** | N/A | ADR-005/007 govern. |

## Design & Planning

### Initial Design Thoughts & Requirements

* Requirement: `deepnote ui` registers as a thin alias reusing `createServeAction` with `open:true` default; `deepnote serve` keeps `--no-open` (headless) default.
* Requirement: the browser-open targets the LOCAL served URL (same mechanism as `open`'s browser launch, but no cloud upload path is reachable).
* Constraint: final `serve`/`ui` naming is a P6 PRD open question — note it; the implementation supports both.

### Acceptance Criteria

* [ ] `deepnote ui project.deepnote` opens the browser to the served localhost URL.
* [ ] `deepnote ui` defaults `--open`; `deepnote serve` defaults `--no-open`.
* [ ] No cloud-upload path is reachable from `ui`.

## Definition of Done

### Intent

A user who wants the full browser experience types `deepnote ui myproject.deepnote` and their browser opens straight to the locally-served notebook — never uploading anything to a cloud. It is the same server `deepnote serve` boots, just with the browser-open default flipped on and pointed at localhost. From the outside, "working" looks like: `deepnote ui` pops a browser tab at `http://localhost:PORT`, while `deepnote serve` stays headless; and nothing in the `ui` path ever calls the cloud-upload code. If this breaks, `ui` would either fail to open the browser, or — the serious failure — reach the `openDeepnoteFileInCloud` upload path, violating the local-first guarantee.

### Observable outcomes

- [ ] **Capstone:** invoking `deepnote ui project.deepnote` triggers a browser-open to the served localhost URL (assert the open call receives the local `http://localhost:PORT`, not a cloud URL), while `deepnote serve project.deepnote` does NOT open a browser by default.
- [ ] No code path from `ui` reaches `openDeepnoteFileInCloud` (asserted by inspection/grep — `ui` opens the local URL only).

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | design doc Phase 7 | - [ ] Design Complete |
| **Test Plan Creation** | mocked: `ui` defaults `--open`, `serve` defaults `--no-open` | - [ ] Test Plan Approved |
| **TDD Implementation** | `ui` alias registration reusing `createServeAction` | - [ ] Implementation Complete |
| **Integration Testing** | N/A (covered behaviorally) | - [ ] Integration Tests Pass |
| **Documentation** | `--help` for `ui`; note P6 naming open question | - [ ] Documentation Complete |
| **Code Review** | reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | N/A | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | `ui` triggers local browser-open; `serve` does not; no cloud path reachable | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | alias registration | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | green | - [ ] Originally failing tests now pass |
| **4. Refactor** | keep alias thin | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | cli tests green | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A | - [ ] Performance requirements are met |

### Implementation Notes

**Test Strategy (behavior + the load-bearing negative):** the capstone asserts the browser-open call receives the local URL and fires only for `ui` (not `serve`). The load-bearing failure-mode test is the negative: `ui` must NOT reach `openDeepnoteFileInCloud` — assert no cloud-upload is invoked, preserving the local-first guarantee.

**Key Implementation Decisions:** reuse `createServeAction({open:true})`; do not duplicate serve logic.

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | reviewer |
| **QA Verification** | mocked alias tests |
| **Staging Deployment** | N/A |
| **Production Deployment** | N/A |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No |
| **Future Enhancements** | final `serve`/`ui` naming is a P6 PRD call. |

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
