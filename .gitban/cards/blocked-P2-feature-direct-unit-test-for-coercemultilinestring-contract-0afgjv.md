# Direct unit test for `coerceMultilineString` array/mixed-array contract

> **Origin:** LUIVIEW1 card k61ziu review 1, Sprint Retrospective Item 2 (non-blocking coverage gap).
> **Status:** BLOCKED on nothing external — deferred purely to keep the closeout clean. Behaviour is
> already correct and test-asserted transitively at the renderer level; this card locks the contract
> with direct unit tests against future registry refactors.

## Feature Overview & Context

* **Associated Ticket/Epic:** LUIVIEW1 retrospective Item 2 (m3/s2 read-only viewer SPA).
* **Feature Area/Component:** Studio IOutput MIME renderer registry — `coerceMultilineString` helper.
* **Target Release/Milestone:** m3 local UI (fork-only); future hardening sprint.

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
| **README.md** | `apps/studio/README.md` | Note the `multiline_string` coercion contract. |
| **Architecture Docs** | `docs/designs/m3-s2-viewer.md` | IOutput MIME registry design. |
| **Similar Features** | `apps/studio/src/outputs/mime/` renderers | Scalar-string paths already asserted transitively. |
| **API Specs** | Jupyter `multiline_string` (`string \| string[]`) | The shape `coerceMultilineString` accepts. |
| **ADR (New)** | **N/A** | No new ADR — test-only card. |
| **Other Documentation** | inline comment on `coerceMultilineString` | Describes the mixed-array `undefined` contract. |

## Design & Planning

### Initial Design Thoughts & Requirements

> Lock the `coerceMultilineString` contract with direct unit tests.

* Requirement: a direct unit test for the `string[]` join path (joined into one string).
* Requirement: a direct unit test for the mixed `(string | object)[]` path returning `undefined` (silent
  drop is correct-by-design per the inline comment, but currently only asserted transitively).
* Constraint: no behaviour change — tests only.
* Design thought: export or test-import `coerceMultilineString` directly from the registry module.

### Acceptance Criteria

* [ ] A direct unit test asserts the `string[]` form joins to the expected single string.
* [ ] A direct unit test asserts a mixed `(string | object)[]` value coerces to `undefined`.
* [ ] Tests live alongside the other studio outputs tests and run under `pnpm test`.
* [ ] No production behaviour change; the inline-comment contract is now directly locked.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Test-only; no design change | - [ ] Design Complete |
| **Test Plan Creation** | Two direct unit tests (join + mixed-undefined) | - [ ] Test Plan Approved |
| **TDD Implementation** | Add the direct unit tests | - [ ] Implementation Complete |
| **Integration Testing** | `pnpm test` (studio suite) | - [ ] Integration Tests Pass |
| **Documentation** | None beyond the existing inline comment | - [ ] Documentation Complete |
| **Code Review** | gitban reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | N/A (fork-only) | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | Join + mixed-undefined direct tests | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | None — behaviour already correct | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | studio suite green | - [ ] Originally failing tests now pass |
| **4. Refactor** | N/A | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A | - [ ] Performance requirements are met |

### Implementation Notes

**Test Strategy:**
Import `coerceMultilineString` directly (or via a small test export) and assert both the `string[]` join
result and the mixed-array `undefined` result.

**Key Implementation Decisions:**
Tests only — no registry behaviour change.

```ts
// expect(coerceMultilineString(['a', 'b'])).toBe('ab');
// expect(coerceMultilineString(['a', {} as unknown as string])).toBeUndefined();
```

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban reviewer |
| **QA Verification** | studio suite green |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No — this closes a coverage gap |
| **Future Enhancements** | Parametrize across registry MIME types if useful |

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

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them.


## BLOCKED
Blocked at sprint-closeout disposition: routed to backlog to keep the LUIVIEW1 closeout clean rather than doing test work inline. The `coerceMultilineString` behaviour is already correct and test-asserted transitively at the renderer level; this card adds direct unit tests to lock the `string[]`-join + mixed-array-`undefined` contract against future registry refactors. Unblock to schedule into a studio hardening sprint. Source: LUIVIEW1 k61ziu review 1, retrospective Item 2 (non-blocking coverage gap).
