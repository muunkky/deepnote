# Feature Development Template

**When to use this template:** Additive feature work to close the open CLI half of an ADR-001 obligation surfaced in S6INREPO card `pv4px0` review 1 and deferred via closeout card `o5pg2k` retro Item 3.

**When NOT to use this template:** Not a bug fix or refactor — this adds a user-facing hint that does not yet exist on the CLI consumer.

## Feature Overview & Context

- **Associated Ticket/Epic:** ADR-001 (shared interpreter contract); closeout card `o5pg2k` retro Item 3; source review `pv4px0` review 1.
- **Feature Area/Component:** `packages/cli/src/commands/run.ts` (`deepnote run`) — Python interpreter resolution.
- **Target Release/Milestone:** m1/s6 in-repo residual; next available sprint (not S6INREPO — that sprint is closing).

**Required Checks:**

- [ ] **Associated Ticket/Epic** link is included above.
- [ ] **Feature Area/Component** is identified.
- [ ] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

First, confirm the minimum required documentation has been reviewed for context.

- [ ] `README.md` or project documentation reviewed.
- [ ] Existing architecture documentation or ADRs reviewed (ADR-001).
- [ ] Related feature implementations or similar code reviewed (MCP consumer `packages/mcp/src/tools/execution.ts`).
- [ ] API documentation or interface specs reviewed [if applicable].

| Document Type         | Link / Location                               | Key Findings / Action Required                                                                             |
| :-------------------- | :-------------------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| **README.md**         | `packages/mcp/README.md`                      | MCP hint already documented (card `mjporx`); mirror the wording for CLI parity.                            |
| **Architecture Docs** | ADR-001                                       | Every deepnote-run consumer must surface a bare-system-python hint when resolution lands on bare `python`. |
| **Similar Features**  | `packages/mcp/src/tools/execution.ts:114`     | MCP half shipped: hint gated on `isBareSystemPython(spec) && !hasOverride`. Mirror the text.               |
| **API Specs**         | `packages/runtime-core/src/python-env.ts:162` | `isBareSystemPython` already exported — no new runtime-core surface needed.                                |
| **ADR (New)**         | **N/A**                                       | No new ADR; this satisfies an existing ADR-001 obligation.                                                 |

## Design & Planning

### Initial Design Thoughts & Requirements

> The MCP consumer warns on bare autodetect with no override; the CLI does not. Close the parity gap.

- Requirement: When `deepnote run` resolves to a bare system `python` (no `--python`, no `DEEPNOTE_PYTHON`), emit the actionable hint ("set `DEEPNOTE_PYTHON` or pass a venv with deepnote-toolkit[server]").
- Constraint: Precedence (arg > `DEEPNOTE_PYTHON` > autodetect) is already correct from card `pv4px0` — do not alter it; only add the hint.
- Design thought: `run.ts` imports `selectPythonSpec` (line 18) but NOT `isBareSystemPython`; resolves the spec at run.ts:296. Import `isBareSystemPython`, compute spec once, log hint when bare with no override.
- Dependency: none external — `isBareSystemPython` is already exported.

### Acceptance Criteria

- [ ] `run.ts` imports `isBareSystemPython` from `@deepnote/runtime-core`.
- [ ] When the resolved spec is bare system python AND there is no `--python`/`DEEPNOTE_PYTHON` override, `deepnote run` logs the same actionable hint the MCP consumer returns (mirroring `mjporx` text).
- [ ] The hint does NOT fire when an explicit `--python` or `DEEPNOTE_PYTHON` override is present, nor when a non-bare interpreter is resolved.
- [ ] A vitest precedence-style test asserts the hint fires only on bare autodetect with no override.
- [ ] Precedence behavior from `pv4px0` is unchanged (no regressions in `run.test.ts`).

## Feature Work Phases

| Phase / Task              | Status / Link to Artifact or Card           |        Universal Check        |
| :------------------------ | :------------------------------------------ | :---------------------------: |
| **Design & Architecture** | Mirror MCP consumer hint (card `mjporx`)    |     - [ ] Design Complete     |
| **Test Plan Creation**    | Precedence-style hint test in `run.test.ts` |   - [ ] Test Plan Approved    |
| **TDD Implementation**    | Pending                                     | - [ ] Implementation Complete |
| **Integration Testing**   | Pending                                     | - [ ] Integration Tests Pass  |
| **Documentation**         | Optional CLI docs note for parity           | - [ ] Documentation Complete  |
| **Code Review**           | Pending                                     |  - [ ] Code Review Approved   |
| **Deployment Plan**       | Ships with next CLI release                 |  - [ ] Deployment Plan Ready  |

## TDD Implementation Workflow

|             Step              | Status/Details                                            |                     Universal Check                      |
| :---------------------------: | :-------------------------------------------------------- | :------------------------------------------------------: |
|  **1. Write Failing Tests**   | Assert hint fires only on bare autodetect, no override    |     - [ ] Failing tests are committed and documented     |
| **2. Implement Feature Code** | Import `isBareSystemPython`; emit hint at run.ts:296 path |         - [ ] Feature implementation is complete         |
|   **3. Run Passing Tests**    | `run.test.ts` green                                       |         - [ ] Originally failing tests now pass          |
|        **4. Refactor**        | Pending                                                   | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite**  | runtime-core + cli suites green                           |      - [ ] All tests pass (unit, integration, e2e)       |
|  **6. Performance Testing**   | N/A (log line only)                                       |          - [ ] Performance requirements are met          |

### Implementation Notes

> Mirror the MCP consumer's hint wording for cross-consumer parity.

**Test Strategy:**
Add a precedence-style vitest case asserting the hint logs only on bare autodetect with no override, and asserting it is silent when `--python` or `DEEPNOTE_PYTHON` is set.

**Key Implementation Decisions:**
Reuse `isBareSystemPython` and `selectPythonSpec` (both already imported/exported); no change to precedence logic from `pv4px0`.

```python
# (Tests are TypeScript/vitest; placeholder retained for template conformance.)
def test_placeholder():
    pass
```

## Validation & Closeout

| Task                      | Detail/Link      |
| :------------------------ | :--------------- |
| **Code Review**           | Pending          |
| **QA Verification**       | Pending          |
| **Staging Deployment**    | N/A              |
| **Production Deployment** | Next CLI release |
| **Monitoring Setup**      | N/A              |

### Follow-up & Lessons Learned

| Topic                       | Status / Action Required                                                                                |
| :-------------------------- | :------------------------------------------------------------------------------------------------------ |
| **Postmortem Required?**    | No                                                                                                      |
| **Further Investigation?**  | Confirm any other deepnote-run consumers (e.g. vscode-deepnote producer) also honor the hint obligation |
| **Technical Debt Created?** | No                                                                                                      |
| **Future Enhancements**     | N/A                                                                                                     |

### Completion Checklist

- [ ] All acceptance criteria are met and verified.
- [ ] All tests are passing (unit, integration, e2e, performance).
- [ ] Code review is approved and PR is merged.
- [ ] Documentation is updated (README, API docs, user guides).
- [ ] Feature is deployed to production.
- [ ] Monitoring and alerting are configured.
- [ ] Stakeholders are notified of completion.
- [ ] Follow-up actions are documented and tickets created.
- [ ] Associated ticket/epic is closed.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them.
