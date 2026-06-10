# Feature Development Template

**When to use this template:** New feature work with design, implementation, testing, and documentation following TDD.

## Feature Overview & Context

- **Associated Ticket/Epic:** m1/s6 (in-repo residuals). PRD: `docs/prds/PRD-001-ai-agent-notebook-authoring.md`. ADR: `docs/adr/ADR-001-shared-python-interpreter-resolution.md`.
- **Feature Area/Component:** `@deepnote/runtime-core` — Python interpreter resolution (`packages/runtime-core/src/python-env.ts`, package entry `index.ts`)
- **Target Release/Milestone:** S6INREPO sprint / m1/s6. This is the foundational card of Stream A — step 3A (MCP) and step 3B (CLI) both depend on it.

**Required Checks:**

- [ ] **Associated Ticket/Epic** link is included above.
- [ ] **Feature Area/Component** is identified.
- [ ] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

First, confirm the minimum required documentation has been reviewed for context.

- [ ] `README.md` or project documentation reviewed.
- [ ] Existing architecture documentation or ADRs reviewed.
- [ ] Related feature implementations or similar code reviewed.
- [ ] API documentation or interface specs reviewed [if applicable].

### Required Reading

| Document Type            | Link / Location                                                                                                                                     | Key Findings / Action Required                                                                                                                                                                                                       |
| :----------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ADR**                  | `docs/adr/ADR-001-shared-python-interpreter-resolution.md`                                                                                          | The canonical decision: a single shared helper applies precedence explicit-arg > `DEEPNOTE_PYTHON` env var > autodetection. Both CLI and MCP must call it so they never disagree.                                                    |
| **Code (resolver home)** | `packages/runtime-core/src/python-env.ts` — `resolvePythonExecutable:23`, `detectDefaultPython:109`, `isBareSystemPython:129`, `buildPythonEnv:181` | This is where `selectPythonSpec` is added. Read the existing functions: the ExecutionEngine turns a spec STRING into an executable+env via `server-starter.ts:37,45` — so `selectPythonSpec` returns a spec STRING, NOT a built env. |
| **Code (package entry)** | `packages/runtime-core/src/index.ts:14`                                                                                                             | Today re-exports only `buildPythonEnv` / `detectDefaultPython` / `resolvePythonExecutable`. Must ALSO re-export `selectPythonSpec` AND `isBareSystemPython`.                                                                         |
| **Tests**                | `packages/runtime-core/src/python-env.test.ts`                                                                                                      | Existing test patterns for the env module; new behavioral unit tests for `selectPythonSpec` go here (or alongside).                                                                                                                  |
| **README.md**            | `packages/runtime-core/README.md` (if present) / monorepo `CLAUDE.md`                                                                               | Dev setup: TS monorepo, vitest.                                                                                                                                                                                                      |

## Design & Planning

### Initial Design Thoughts & Requirements

> Scope and approach are decided in ADR-001; do not re-architect.

- Add `selectPythonSpec({ explicit })` to `packages/runtime-core/src/python-env.ts`. It returns `explicit ?? process.env.DEEPNOTE_PYTHON ?? detectDefaultPython()` — a spec STRING, not a built env. The ExecutionEngine is what turns the spec into an executable+env (`server-starter.ts:37,45`).
- Re-export BOTH `selectPythonSpec` and `isBareSystemPython` from `packages/runtime-core/src/index.ts` (today `index.ts:14` re-exports only `buildPythonEnv`/`detectDefaultPython`/`resolvePythonExecutable`).
- Behavioral unit tests (vitest), not structural.
- **Fork discipline:** code lands on a `feat/*` branch cut from `upstream/main`; NO `.gitban/`, `.claude/`, `docs/prds/`, or `docs/adr/` files in code commits.
- **Test runner:** vitest (`pnpm test`) — this is a TS monorepo, not pytest.

### Definition of Done

#### Intent

A single shared helper decides which Python interpreter spec to use, applying the precedence explicit-arg > `DEEPNOTE_PYTHON` env var > autodetection. Both the CLI and the MCP server call it so they never disagree on the interpreter. If this breaks, CLI and MCP would pick different interpreters, or `DEEPNOTE_PYTHON` would be silently ignored.

#### Observable outcomes

- [ ] `selectPythonSpec` returns the explicit arg when provided (even if `DEEPNOTE_PYTHON` is set)
- [ ] `selectPythonSpec` returns `process.env.DEEPNOTE_PYTHON` when no explicit arg
- [ ] `selectPythonSpec` falls back to `detectDefaultPython()` when neither is set
- [ ] **Capstone:** a test imports BOTH `selectPythonSpec` and `isBareSystemPython` from the `'@deepnote/runtime-core'` package entry (not the file path) and asserts `selectPythonSpec`'s precedence behavior — this is the unfakeable, integration-meaningful check (step 3A cannot build without the `isBareSystemPython` re-export).
- [ ] The selector itself is a pure precedence-selection function with no assembly; the behavioral unit tests above fully cover its branches. The capstone above is what proves the package-entry contract that step 3A/3B consume.

### Acceptance Criteria

- [ ] `selectPythonSpec({ explicit })` exists in `packages/runtime-core/src/python-env.ts` and returns a spec STRING.
- [ ] `index.ts` re-exports both `selectPythonSpec` and `isBareSystemPython`.
- [ ] Behavioral vitest unit tests cover the three precedence branches and the package-entry import.

## Feature Work Phases

| Phase / Task              | Status / Link to Artifact or Card                                               |        Universal Check        |
| :------------------------ | :------------------------------------------------------------------------------ | :---------------------------: |
| **Design & Architecture** | Decided in ADR-001                                                              |     - [ ] Design Complete     |
| **Test Plan Creation**    | Behavioral precedence tests in `python-env.test.ts` + package-entry import test |   - [ ] Test Plan Approved    |
| **TDD Implementation**    | feat/\* branch off upstream/main                                                | - [ ] Implementation Complete |
| **Integration Testing**   | `pnpm test` (vitest) green                                                      | - [ ] Integration Tests Pass  |
| **Documentation**         | Inline TSDoc on `selectPythonSpec` (no separate docs card)                      | - [ ] Documentation Complete  |
| **Code Review**           | gitban reviewer                                                                 |  - [ ] Code Review Approved   |
| **Deployment Plan**       | N/A — consumed by step 3A/3B; release handled by step 4                         |  - [ ] Deployment Plan Ready  |

## TDD Implementation Workflow

|             Step              | Status/Details                           |                     Universal Check                      |
| :---------------------------: | :--------------------------------------- | :------------------------------------------------------: |
|  **1. Write Failing Tests**   | Precedence + package-entry import tests  |     - [ ] Failing tests are committed and documented     |
| **2. Implement Feature Code** | `selectPythonSpec` + index.ts re-exports |         - [ ] Feature implementation is complete         |
|   **3. Run Passing Tests**    | `pnpm test`                              |         - [ ] Originally failing tests now pass          |
|        **4. Refactor**        | Keep helper pure                         | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite**  | `pnpm test` + `pnpm typecheck`           |      - [ ] All tests pass (unit, integration, e2e)       |
|  **6. Performance Testing**   | N/A — pure selection function            |          - [ ] Performance requirements are met          |

### Implementation Notes

> `selectPythonSpec` returns a STRING spec, not a built env. The ExecutionEngine (`server-starter.ts:37,45`) turns the spec into an executable+env. Keep the function pure so it is trivially unit-testable.

**Test Strategy:**
vitest behavioral unit tests; manipulate `process.env.DEEPNOTE_PYTHON` per-case and assert the returned spec string. One test imports `selectPythonSpec` and `isBareSystemPython` from `'@deepnote/runtime-core'` (the package entry) to prove the re-exports.

**Key Implementation Decisions:**
Precedence is `explicit ?? process.env.DEEPNOTE_PYTHON ?? detectDefaultPython()` per ADR-001.

```typescript
// selectPythonSpec({ explicit }) => explicit ?? process.env.DEEPNOTE_PYTHON ?? detectDefaultPython()
```

## Validation & Closeout

| Task                      | Detail/Link               |
| :------------------------ | :------------------------ |
| **Code Review**           | [Link to approved PR]     |
| **QA Verification**       | `pnpm test` green         |
| **Staging Deployment**    | N/A                       |
| **Production Deployment** | Release handled by step 4 |
| **Monitoring Setup**      | N/A                       |

### Follow-up & Lessons Learned

| Topic                       | Status / Action Required                    |
| :-------------------------- | :------------------------------------------ |
| **Postmortem Required?**    | No                                          |
| **Further Investigation?**  | No                                          |
| **Technical Debt Created?** | No                                          |
| **Future Enhancements**     | Consumed by step 3A (MCP) and step 3B (CLI) |

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
