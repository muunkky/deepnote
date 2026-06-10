# Feature Development Template

**When to use this template:** New feature work with design, implementation, testing, and documentation following TDD.

## Feature Overview & Context

- **Associated Ticket/Epic:** m1/s6 (in-repo residuals). PRD: `docs/prds/PRD-001-ai-agent-notebook-authoring.md`. ADR: `docs/adr/ADR-001-shared-python-interpreter-resolution.md`.
- **Feature Area/Component:** `@deepnote/cli` — `deepnote run` command (`packages/cli/src/commands/run.ts`)
- **Target Release/Milestone:** S6INREPO sprint / m1/s6. **Depends on step 2A (card `onwhhg`)** — consumes `selectPythonSpec` from `@deepnote/runtime-core`. Parallel with step 3A (different file).

**Required Checks:**

- [ ] **Associated Ticket/Epic** link is included above.
- [ ] **Feature Area/Component** is identified.
- [ ] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

- [ ] `README.md` or project documentation reviewed.
- [ ] Existing architecture documentation or ADRs reviewed.
- [ ] Related feature implementations or similar code reviewed.
- [ ] API documentation or interface specs reviewed [if applicable].

### Required Reading

| Document Type            | Link / Location                                                                                                                   | Key Findings / Action Required                                                                                                                                          |
| :----------------------- | :-------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ADR**                  | `docs/adr/ADR-001-shared-python-interpreter-resolution.md`                                                                        | Precedence arg (`--python`) > `DEEPNOTE_PYTHON` > autodetect. CLI must converge on the same shared selector as MCP.                                                     |
| **Code (the call site)** | `packages/cli/src/commands/run.ts:294,296` — today `resolvePythonExecutable(options.python ?? detectDefaultPython())` at **:296** | Change to resolve through the shared selector so the CLI ALSO honors `DEEPNOTE_PYTHON`, e.g. `resolvePythonExecutable(selectPythonSpec({ explicit: options.python }))`. |
| **Tests**                | `packages/cli/src/commands/run.test.ts:44`                                                                                        | Existing test pattern; add precedence tests here.                                                                                                                       |
| **Dependency (step 2A)** | `@deepnote/runtime-core` `selectPythonSpec` (card `onwhhg`)                                                                       | The shared selector to call.                                                                                                                                            |

## Design & Planning

### Initial Design Thoughts & Requirements

> Scope decided; do not re-architect.

- Change `run.ts:296` from `resolvePythonExecutable(options.python ?? detectDefaultPython())` to resolve through the shared selector so the CLI ALSO honors `DEEPNOTE_PYTHON`, e.g. `resolvePythonExecutable(selectPythonSpec({ explicit: options.python }))`.
- Tests for precedence (vitest).
- **Fork discipline:** code lands on a `feat/*` branch cut from `upstream/main`; NO `.gitban/`, `.claude/`, `docs/prds/`, or `docs/adr/` files in code commits.
- **Test runner:** vitest (`pnpm test`), not pytest.

### Definition of Done

#### Intent

The CLI `deepnote run` honors `DEEPNOTE_PYTHON` the same way the MCP server does, so a user's editor-selected interpreter is respected whether they run via CLI or MCP. Today the CLI checks `--python` then autodetects, ignoring `DEEPNOTE_PYTHON`. A break would show as the CLI ignoring `DEEPNOTE_PYTHON` while MCP honors it — exactly the divergence ADR-001 exists to remove.

#### Observable outcomes

- [ ] **Capstone:** Given `DEEPNOTE_PYTHON` set and no `--python`, `deepnote run` resolves to the `DEEPNOTE_PYTHON` interpreter (assert the resolved `pythonEnv`); given `--python` set, `--python` wins over `DEEPNOTE_PYTHON`.
- [ ] `run.ts` uses the shared `selectPythonSpec` (no longer `options.python ?? detectDefaultPython()` at `:296`).
- [ ] CLI and MCP pick the same interpreter for the same inputs (parity with step 3A).
- [ ] Tests cover `--python` > `DEEPNOTE_PYTHON` > autodetect.

### Acceptance Criteria

- [ ] `run.ts:296` resolves through `selectPythonSpec`.
- [ ] Capstone scenario verified by vitest precedence tests.
- [ ] Parity with step 3A confirmed (same inputs -> same interpreter).

## Feature Work Phases

| Phase / Task              | Status / Link to Artifact or Card                                               |        Universal Check        |
| :------------------------ | :------------------------------------------------------------------------------ | :---------------------------: |
| **Design & Architecture** | Decided in ADR-001                                                              |     - [ ] Design Complete     |
| **Test Plan Creation**    | Precedence vitest tests (`run.test.ts`)                                         |   - [ ] Test Plan Approved    |
| **TDD Implementation**    | feat/\* branch off upstream/main; depends on `onwhhg`                           | - [ ] Implementation Complete |
| **Integration Testing**   | `pnpm test` (vitest) green                                                      | - [ ] Integration Tests Pass  |
| **Documentation**         | CLI `--python` / `DEEPNOTE_PYTHON` help text consistent (no separate docs card) | - [ ] Documentation Complete  |
| **Code Review**           | gitban reviewer                                                                 |  - [ ] Code Review Approved   |
| **Deployment Plan**       | N/A — CLI not published in this sprint                                          |  - [ ] Deployment Plan Ready  |

## TDD Implementation Workflow

|             Step              | Status/Details                                               |                     Universal Check                      |
| :---------------------------: | :----------------------------------------------------------- | :------------------------------------------------------: |
|  **1. Write Failing Tests**   | `--python` > `DEEPNOTE_PYTHON` > autodetect precedence tests |     - [ ] Failing tests are committed and documented     |
| **2. Implement Feature Code** | route `run.ts:296` through `selectPythonSpec`                |         - [ ] Feature implementation is complete         |
|   **3. Run Passing Tests**    | `pnpm test`                                                  |         - [ ] Originally failing tests now pass          |
|        **4. Refactor**        | keep the call-site minimal                                   | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite**  | `pnpm test` + `pnpm typecheck`                               |      - [ ] All tests pass (unit, integration, e2e)       |
|  **6. Performance Testing**   | N/A                                                          |          - [ ] Performance requirements are met          |

### Implementation Notes

> The CLI still calls `resolvePythonExecutable` on the result — the change is that the input spec now comes from `selectPythonSpec({ explicit: options.python })` instead of `options.python ?? detectDefaultPython()`, so `DEEPNOTE_PYTHON` is honored between `--python` and autodetect.

**Test Strategy:**
vitest precedence tests: `--python` wins; else `DEEPNOTE_PYTHON`; else autodetect. Assert the resolved `pythonEnv`.

**Key Implementation Decisions:**
Converge on step 2A's `selectPythonSpec` so CLI/MCP parity is structural, not coincidental.

```typescript
// was: resolvePythonExecutable(options.python ?? detectDefaultPython())   (run.ts:296)
// now: resolvePythonExecutable(selectPythonSpec({ explicit: options.python }))
```

## Validation & Closeout

| Task                      | Detail/Link                    |
| :------------------------ | :----------------------------- |
| **Code Review**           | [Link to approved PR]          |
| **QA Verification**       | `pnpm test` green              |
| **Staging Deployment**    | N/A                            |
| **Production Deployment** | N/A — CLI publish out of scope |
| **Monitoring Setup**      | N/A                            |

### Follow-up & Lessons Learned

| Topic                       | Status / Action Required |
| :-------------------------- | :----------------------- |
| **Postmortem Required?**    | No                       |
| **Further Investigation?**  | No                       |
| **Technical Debt Created?** | No                       |
| **Future Enhancements**     | None in scope            |

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
