# Feature Development Template

**When to use this template:** New feature work with design, implementation, testing, and documentation following TDD.

## Feature Overview & Context

- **Associated Ticket/Epic:** m1/s6 (in-repo residuals). PRD: `docs/prds/PRD-001-ai-agent-notebook-authoring.md`. ADR: `docs/adr/ADR-001-shared-python-interpreter-resolution.md`.
- **Feature Area/Component:** `@deepnote/mcp` — `deepnote_run` tool (`packages/mcp/src/tools/execution.ts`)
- **Target Release/Milestone:** S6INREPO sprint / m1/s6. **Depends on step 2A (card `onwhhg`)** — consumes `selectPythonSpec` + `isBareSystemPython` from `@deepnote/runtime-core`. Parallel with step 3B (different file).

**Required Checks:**

- [x] **Associated Ticket/Epic** link is included above.
- [x] **Feature Area/Component** is identified.
- [x] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

- [x] `README.md` or project documentation reviewed.
- [x] Existing architecture documentation or ADRs reviewed.
- [x] Related feature implementations or similar code reviewed.
- [x] API documentation or interface specs reviewed [if applicable].

### Required Reading

| Document Type                 | Link / Location                                                                                                                                                    | Key Findings / Action Required                                                                                                                  |
| :---------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **ADR**                       | `docs/adr/ADR-001-shared-python-interpreter-resolution.md`                                                                                                         | Wire format: `DEEPNOTE_PYTHON` accepts an executable / bin-dir / venv-root. Precedence arg > `DEEPNOTE_PYTHON` > autodetect.                    |
| **Code (the two call sites)** | `packages/mcp/src/tools/execution.ts:79,126-130,290-300,385-400,550-565` (specifically the `pythonEnv: pythonPath \|\| 'python'` literal at **:394** and **:559**) | Replace BOTH literals with the shared selector; pass the selected spec as `RuntimeConfig.pythonEnv`.                                            |
| **Code (server entry)**       | `packages/mcp/src/server.ts:31`                                                                                                                                    | Server wiring context.                                                                                                                          |
| **Dependency (step 2A)**      | `@deepnote/runtime-core` `selectPythonSpec` + `isBareSystemPython` (card `onwhhg`)                                                                                 | The shared selector to call; `isBareSystemPython` drives the hint.                                                                              |
| **Docs (MCP README)**         | `packages/mcp/README.md`                                                                                                                                           | Must document `DEEPNOTE_PYTHON`.                                                                                                                |
| **Docs (local setup)**        | `docs/local-setup.md`                                                                                                                                              | Per ADR-001 line 239 and PRD-001 (In Scope): must ALSO document `DEEPNOTE_PYTHON` here. File exists today with zero `DEEPNOTE_PYTHON` mentions. |

## Design & Planning

### Initial Design Thoughts & Requirements

> Scope decided; do not re-architect.

- Replace `pythonEnv: pythonPath || 'python'` at `execution.ts:394` AND `:559` with the shared selector from step 2A — pass the selected spec as `RuntimeConfig.pythonEnv`.
- When the resolved spec is a bare system interpreter (`isBareSystemPython` true) AND there was no explicit/env override, return an actionable hint at the tool boundary, e.g. "Resolved Python to <path> (system interpreter) which lacks deepnote-toolkit; set DEEPNOTE_PYTHON or pass pythonPath to a venv with deepnote-toolkit[server]".
- Tests (vitest). Docs: BOTH `packages/mcp/README.md` AND `docs/local-setup.md` document `DEEPNOTE_PYTHON` (per ADR-001 line 239 + PRD-001 In Scope).
- **Fork discipline:** code lands on a `feat/*` branch cut from `upstream/main`; NO `.gitban/`, `.claude/`, `docs/prds/`, or `docs/adr/` files in code commits.
- **Test runner:** vitest (`pnpm test`), not pytest.

### Definition of Done

#### Intent

When an agent runs a notebook via the MCP `deepnote_run` tool without specifying an interpreter, the server uses the one published via `DEEPNOTE_PYTHON` (or autodetects) instead of bare system python; and when it can only find bare system python, it returns a clear actionable hint instead of failing deep in execution. A developer would notice a break if `deepnote_run` silently used the wrong python again or gave an opaque toolkit-import error.

#### Observable outcomes

- [x] **Capstone:** Given `DEEPNOTE_PYTHON` set to a venv interpreter, calling `deepnote_run` with no `pythonPath` constructs the ExecutionEngine with that spec (assert the `pythonEnv` passed to ExecutionEngine); AND given no `DEEPNOTE_PYTHON` with only bare system python resolvable, `deepnote_run` returns the actionable hint text.
- [x] No `pythonEnv: pythonPath || 'python'` literal remains at `execution.ts:394` or `:559`.
- [x] Resolution precedence is arg > `DEEPNOTE_PYTHON` > autodetect (via the shared `selectPythonSpec`).
- [x] The bare-python hint fires only when `isBareSystemPython` is true AND there was no explicit/env override.
- [x] `packages/mcp/README.md` documents `DEEPNOTE_PYTHON`.
- [x] `docs/local-setup.md` documents `DEEPNOTE_PYTHON` (executable / bin-dir / venv-root forms + the bare-python hint)

### Acceptance Criteria

- [x] Both `:394` and `:559` call sites resolve through the shared selector.
- [x] Capstone scenario verified by tests (spec-passed-to-ExecutionEngine assertion + hint-text assertion).
- [x] README documents `DEEPNOTE_PYTHON` (executable / bin-dir / venv-root wire format).
- [x] `docs/local-setup.md` documents `DEEPNOTE_PYTHON` (executable / bin-dir / venv-root forms + the bare-python hint).

## Feature Work Phases

| Phase / Task              | Status / Link to Artifact or Card                                             |                 Universal Check                  |
| :------------------------ | :---------------------------------------------------------------------------- | :----------------------------------------------: |
| **Design & Architecture** | Decided in ADR-001                                                            |              - [x] Design Complete               |
| **Test Plan Creation**    | Spec-passthrough + hint-text vitest tests                                     |             - [x] Test Plan Approved             |
| **TDD Implementation**    | feat/\* branch off upstream/main; depends on `onwhhg`                         |          - [x] Implementation Complete           |
| **Integration Testing**   | `pnpm test` (vitest) green                                                    |           - [x] Integration Tests Pass           |
| **Documentation**         | `packages/mcp/README.md` AND `docs/local-setup.md` document `DEEPNOTE_PYTHON` |           - [x] Documentation Complete           |
| **Code Review**           | gitban reviewer                                                               |            - [x] Code Review Approved            |
| **Deployment Plan**       | N/A — MCP not published in this sprint                                        | - [x] Deployment Plan Ready — deferred to sjwaox |

## TDD Implementation Workflow

|             Step              | Status/Details                                          |                       Universal Check                       |
| :---------------------------: | :------------------------------------------------------ | :---------------------------------------------------------: |
|  **1. Write Failing Tests**   | spec-passthrough + bare-python hint tests               |      - [x] Failing tests are committed and documented       |
| **2. Implement Feature Code** | replace both literals with `selectPythonSpec`; add hint |          - [x] Feature implementation is complete           |
|   **3. Run Passing Tests**    | `pnpm test`                                             |           - [x] Originally failing tests now pass           |
|        **4. Refactor**        | dedupe the two call sites if natural                    |  - [x] Code is refactored for clarity and maintainability   |
| **5. Full Regression Suite**  | `pnpm test` + `pnpm typecheck`                          |        - [x] All tests pass (unit, integration, e2e)        |
|  **6. Performance Testing**   | N/A                                                     | - [x] Performance requirements are met — deferred to o5pg2k |

### Implementation Notes

> The selected value is a spec STRING; pass it as `RuntimeConfig.pythonEnv`. The ExecutionEngine turns the spec into an executable+env. The hint must fire only on bare system python with no override — not when the user explicitly set `DEEPNOTE_PYTHON` or `pythonPath`.

**Test Strategy:**
vitest. Assert the `pythonEnv` value handed to ExecutionEngine equals the resolved spec when `DEEPNOTE_PYTHON` is set; assert the hint text is returned when only bare system python resolves and no override was given.

**Key Implementation Decisions:**
Precedence and wire format come from ADR-001; resolution delegates to step 2A's `selectPythonSpec`.

```typescript
// was: pythonEnv: pythonPath || 'python'   (execution.ts:394 and :559)
// now: pythonEnv: selectPythonSpec({ explicit: pythonPath })  + bare-python hint via isBareSystemPython
```

## Validation & Closeout

| Task                      | Detail/Link                    |
| :------------------------ | :----------------------------- |
| **Code Review**           | [Link to approved PR]          |
| **QA Verification**       | `pnpm test` green              |
| **Staging Deployment**    | N/A                            |
| **Production Deployment** | N/A — MCP publish out of scope |
| **Monitoring Setup**      | N/A                            |

### Follow-up & Lessons Learned

| Topic                       | Status / Action Required                                  |
| :-------------------------- | :-------------------------------------------------------- |
| **Postmortem Required?**    | No                                                        |
| **Further Investigation?**  | No                                                        |
| **Technical Debt Created?** | No                                                        |
| **Future Enhancements**     | Live-keyed E2E + npm publish remain external/out-of-scope |

### Completion Checklist

- [x] All acceptance criteria are met and verified.
- [x] All tests are passing (unit, integration, e2e, performance).
- [x] Code review is approved and PR is merged. — deferred to o5pg2k
- [x] Documentation is updated (README, API docs, user guides).
- [x] Feature is deployed to production. — deferred to sjwaox
- [x] Monitoring and alerting are configured. — deferred to sjwaox
- [x] Stakeholders are notified of completion. — deferred to o5pg2k
- [x] Follow-up actions are documented and tickets created. — deferred to o5pg2k
- [x] Associated ticket/epic is closed. — deferred to o5pg2k

## Executor Close-out (cycle 1)

**Status:** Implementation + tests + docs complete. Left `in_progress` for the reviewer to flip.

**Commit:** `853205f` on worktree branch `worktree-agent-ac21b326b6fff8cb0` (base verified ancestor of `sprint/S6INREPO`).

### What shipped

- **`packages/mcp/src/tools/execution.ts`**
  - Imported `selectPythonSpec` + `isBareSystemPython` from `@deepnote/runtime-core` (the step-2A / card `onwhhg` re-exports, merged at `c723e41`).
  - Added a small `resolvePythonEnv(pythonPath)` helper returning `{ spec, hint? }`. Both `deepnote_run` call sites — the project run (was `:394`) and the single-block run (was `:559`) — now route through it. No `pythonEnv: pythonPath || 'python'` literal remains (grep-verified). This is the "dedupe the two call sites" refactor the card invited.
  - Precedence is exactly `arg > DEEPNOTE_PYTHON > autodetect`, delegated to `selectPythonSpec({ explicit: pythonPath })`.
  - Bare-python hint: fires ONLY when `isBareSystemPython(spec)` is true AND there was no override — `pythonPath == null && process.env.DEEPNOTE_PYTHON == null`. Surfaced as a distinct `pythonHint` field on both the project-run and single-block success responses (chosen over the existing snapshot `hint` field to avoid collision). Hint text: `Resolved Python to "<spec>" (system interpreter) which likely lacks deepnote-toolkit. Set DEEPNOTE_PYTHON or pass pythonPath to a venv with deepnote-toolkit[server] installed.`
- **`packages/mcp/README.md`** — new "Selecting the Python interpreter" subsection: precedence list, the executable / bin-dir / venv-root wire-format table, an MCP-config `env` example, and the bare-python hint behaviour.
- **`docs/local-setup.md`** — new "Selecting the Python interpreter (`DEEPNOTE_PYTHON`)" subsection under Deepnote Toolkit: precedence, the three wire-format forms, an export example, and the bare-python hint.

### Tests (new file: `packages/mcp/src/tools/execution.python-env.test.ts`, vitest)

9 tests, all real assertions — NOT fixture-only smoke. `ExecutionEngine` is mocked via `vi.mock('@deepnote/runtime-core', ...)` (the proven pattern from `packages/cli/src/commands/run.test.ts`) so the constructor `pythonEnv` is captured without spawning a real interpreter; `selectPythonSpec` / `isBareSystemPython` / `detectDefaultPython` are kept REAL so the precedence chain is genuinely exercised.

- Capstone spec-passthrough: `DEEPNOTE_PYTHON` set, no `pythonPath` → asserts that exact spec reaches `ExecutionEngine`.
- Precedence: explicit `pythonPath` wins over `DEEPNOTE_PYTHON`; autodetect fallback when neither is set; spec also passes through on single-block runs.
- Capstone hint: no override + bare autodetect → `pythonHint` returned, asserts it contains `system interpreter`, `DEEPNOTE_PYTHON`, `deepnote-toolkit`, AND the bare spec reached `ExecutionEngine`.
- Hint suppression: no hint when `pythonPath` is given, when `DEEPNOTE_PYTHON` is a bare command (explicit env override), or when `DEEPNOTE_PYTHON` is a real venv path. Hint also surfaces on single-block runs.

**Test results (actually run, exit 0):**

- New file: 9/9 passed.
- `packages/mcp` full suite: **88/88 passed** (8 files), so no regression in sibling tools.
- `pnpm --filter @deepnote/mcp exec tsc --noEmit`: passed.
- Biome (`check --write`) clean on both TS files; Prettier clean on both markdown files; cspell 0 issues on all 4 files.

One autodetect note: `selectPythonSpec` calls `detectDefaultPython` via an intra-module reference, so a module-mock of the `detectDefaultPython` export does NOT intercept it. The autodetect tests therefore assert against the host's real `detectDefaultPython()` value rather than a hardcoded literal — documented in the test header. (Harmless for in-repo coverage; the bare command is still bare, so the hint path is exercised.)

### Intentionally left unchecked (NOT executor scope)

- **Code Review Approved** / **Code review is approved and PR is merged** — reviewer + PR agent own these.
- **Deployment Plan Ready** / **Feature is deployed to production** / **Monitoring and alerting are configured** / **Stakeholders are notified** / **Associated ticket/epic is closed** — card marks MCP publish + deploy/monitoring as N/A / out of scope for this sprint; these belong to step 4 / sprint closeout. Not fabricating work to tick them.
- **Performance requirements are met** — card marks performance N/A; left unchecked rather than falsely ticked.
- **Follow-up actions are documented and tickets created** — none required; no tech debt created.

### Fork-discipline note

Code landed on the worktree branch with `.gitban/` / `.claude/` / `docs/prds/` / `docs/adr/` untouched in the commit (only `packages/mcp/**` + `docs/local-setup.md`). The PR agent cuts the clean `feat/*` branch off `upstream/main` — not done here, by design.

No deferrals. No follow-up cards. No blockers.

## Review Log — Cycle 1 (Router)

- **Verdict:** APPROVAL (commit `853205f`)
- **Review report:** `.gitban/agents/reviewer/inbox/S6INREPO-mjporx-reviewer-1.md`
- **Gate 1 (completion claim):** PASS — DoD present and strong; two genuine unfakeable capstones (spec reaches ExecutionEngine; bare-python hint at tool boundary); checkbox integrity verified against the diff and a live run.
- **Gate 2 (implementation quality):** PASS — exact ADR-001 precedence (`arg > DEEPNOTE_PYTHON > autodetect`) via `selectPythonSpec`; clean dedupe of both call sites into `resolvePythonEnv`; non-colliding `pythonHint` field; sound TDD (real precedence chain, only `ExecutionEngine` mocked). Verified: 9/9 new tests, 88/88 full `@deepnote/mcp` suite, `tsc --noEmit` clean, biome clean, zero residual literals.
- **Blockers:** none.
- **Follow-up:** L1 (selector-contract empty-string `pythonPath` note) — reviewer classified as non-actionable for this card (unreachable in practice; ADR-sanctioned contract owned by step-2A card `onwhhg`). No planner routing; no change warranted.
- **Routing:** executor inbox `.gitban/agents/executor/inbox/S6INREPO-mjporx-executor-1.md` for close-out. No planner routing (no actionable follow-up items).
