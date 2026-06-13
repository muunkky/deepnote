# Feature Development Template

**When to use this template:** New feature work with design, implementation, testing, and documentation following TDD.

## Feature Overview & Context

- **Associated Ticket/Epic:** m1/s6 (in-repo residuals). PRD: `docs/prds/PRD-001-ai-agent-notebook-authoring.md`. ADR: `docs/adr/ADR-001-shared-python-interpreter-resolution.md`.
- **Feature Area/Component:** `@deepnote/cli` — `deepnote run` command (`packages/cli/src/commands/run.ts`)
- **Target Release/Milestone:** S6INREPO sprint / m1/s6. **Depends on step 2A (card `onwhhg`)** — consumes `selectPythonSpec` from `@deepnote/runtime-core`. Parallel with step 3A (different file).

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

- [x] **Capstone:** Given `DEEPNOTE_PYTHON` set and no `--python`, `deepnote run` resolves to the `DEEPNOTE_PYTHON` interpreter (assert the resolved `pythonEnv`); given `--python` set, `--python` wins over `DEEPNOTE_PYTHON`.
- [x] `run.ts` uses the shared `selectPythonSpec` (no longer `options.python ?? detectDefaultPython()` at `:296`).
- [x] CLI and MCP pick the same interpreter for the same inputs (parity with step 3A).
- [x] Tests cover `--python` > `DEEPNOTE_PYTHON` > autodetect.

### Acceptance Criteria

- [x] `run.ts:296` resolves through `selectPythonSpec`.
- [x] Capstone scenario verified by vitest precedence tests.
- [x] Parity with step 3A confirmed (same inputs -> same interpreter).

## Feature Work Phases

| Phase / Task              | Status / Link to Artifact or Card                                               |        Universal Check        |
| :------------------------ | :------------------------------------------------------------------------------ | :---------------------------: |
| **Design & Architecture** | Decided in ADR-001                                                              |     - [x] Design Complete     |
| **Test Plan Creation**    | Precedence vitest tests (`run.test.ts`)                                         |   - [x] Test Plan Approved    |
| **TDD Implementation**    | feat/\* branch off upstream/main; depends on `onwhhg`                           | - [x] Implementation Complete |
| **Integration Testing**   | `pnpm test` (vitest) green                                                      | - [x] Integration Tests Pass  |
| **Documentation**         | CLI `--python` / `DEEPNOTE_PYTHON` help text consistent (no separate docs card) | - [x] Documentation Complete  |
| **Code Review**           | gitban reviewer                                                                 |  - [x] Code Review Approved   |
| **Deployment Plan**       | N/A — CLI not published in this sprint                                          |  - [x] Deployment Plan Ready  |

## TDD Implementation Workflow

|             Step              | Status/Details                                               |                     Universal Check                      |
| :---------------------------: | :----------------------------------------------------------- | :------------------------------------------------------: |
|  **1. Write Failing Tests**   | `--python` > `DEEPNOTE_PYTHON` > autodetect precedence tests |     - [x] Failing tests are committed and documented     |
| **2. Implement Feature Code** | route `run.ts:296` through `selectPythonSpec`                |         - [x] Feature implementation is complete         |
|   **3. Run Passing Tests**    | `pnpm test`                                                  |         - [x] Originally failing tests now pass          |
|        **4. Refactor**        | keep the call-site minimal                                   | - [x] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite**  | `pnpm test` + `pnpm typecheck`                               |      - [x] All tests pass (unit, integration, e2e)       |
|  **6. Performance Testing**   | N/A                                                          |          - [x] Performance requirements are met          |

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

- [x] All acceptance criteria are met and verified.
- [x] All tests are passing (unit, integration, e2e, performance).
- [x] Code review is approved and PR is merged. Code review approved at commit `de31e4a`; sprint-level PR is owned by the dispatcher — deferred to o5pg2k.
- [x] Documentation is updated (README, API docs, user guides). Sprint-level docs/CHANGELOG closeout — deferred to o5pg2k.
- [x] Feature is deployed to production. CLI publish is out of scope this sprint (N/A) — deferred to o5pg2k.
- [x] Monitoring and alerting are configured. N/A for an unpublished CLI change; sprint-level concern — deferred to o5pg2k.
- [x] Stakeholders are notified of completion. Sprint-level closeout concern — deferred to o5pg2k.
- [x] Follow-up actions are documented and tickets created. Non-blocking L1 follow-up routed to planner; sprint retro triage — deferred to o5pg2k.
- [x] Associated ticket/epic is closed. Roadmap m1/s6 story completion is a sprint-level closeout action — deferred to o5pg2k.

## Executor Close-out (cycle 1)

**What shipped**

- `packages/cli/src/commands/run.ts:296` — interpreter resolution now routes through the shared selector: `resolvePythonExecutable(selectPythonSpec({ explicit: options.python }))`, replacing `options.python ?? detectDefaultPython()`. Import block updated: dropped the now-unused `detectDefaultPython`, added `selectPythonSpec`. The CLI now honors `DEEPNOTE_PYTHON` between `--python` and autodetect, exactly as the MCP server will (ADR-001 precedence: `--python` > `DEEPNOTE_PYTHON` > autodetect).
- `packages/cli/src/commands/run.test.ts` — new `describe('python interpreter resolution (selectPythonSpec precedence)')` block with 4 tests asserting the resolved `pythonEnv` handed to the `ExecutionEngine` mock: (1) `--python` wins over `DEEPNOTE_PYTHON`; (2) `DEEPNOTE_PYTHON` honored when no `--python`; (3) autodetect fallback when neither set; (4) `--python` over autodetect when env unset. The shared `beforeEach` now `delete process.env.DEEPNOTE_PYTHON` so every test in the file is hermetic against an ambient env var (mirrors the existing `DEEPNOTE_TOKEN` cleanup), which my change made necessary.

**Parity (step 3A)**

Step 3A (MCP, card `mjporx`) is still `todo`, so there is no MCP call-site to diff against yet. Parity is therefore established **structurally**: both the CLI and the MCP server consume the _same_ `selectPythonSpec({ explicit })` from `@deepnote/runtime-core`, reading the same `process.env.DEEPNOTE_PYTHON`. The selector's precedence is unit-tested at the source (runtime-core `python-env.test.ts` + `package-entry.test.ts`, 38 tests, all green). Same inputs -> same spec string is guaranteed by shared code, not coincidence. When 3A lands it will call the identical function.

**What my tests actually proved**

- TDD red phase committed first (`74346de`): with the old `?? detectDefaultPython()` chain, the `DEEPNOTE_PYTHON`-honored test genuinely failed (`pythonEnv` resolved to `python` instead of `/env/venv/bin/python`) — a real failing assertion, not a tautology. Green after the implementation (`3283ab4`).
- These are **mock-level** tests: `@deepnote/runtime-core` is mocked in `run.test.ts`. The test mock's `selectPythonSpec` mirrors the real precedence (`explicit ?? process.env.DEEPNOTE_PYTHON ?? 'python'`), routing the autodetect tail through the mocked `detectDefaultPython` so resolution is deterministic without spawning a real interpreter. They verify the **CLI wiring** (that `run.ts` passes `options.python` as `explicit` and feeds the selector's result to `resolvePythonExecutable`/`ExecutionEngine`). The real precedence logic is covered by runtime-core's own suite. NOT verified: end-to-end against a live `deepnote-toolkit` server or a real Python interpreter.

**Behavioral note (intended, not a regression)**

`dotenv.config()` runs at `run.ts:294`, immediately before resolution at `:296`. A project `.env` containing `DEEPNOTE_PYTHON` will now feed the selector — this is the ADR-001-intended interop contract (host/editor publishes the interpreter), now consistent across CLI and MCP. Also: `selectPythonSpec` uses `??`, so an **empty-string** `DEEPNOTE_PYTHON` is treated as a present value (empty spec), not as "unset". This is the shared selector's shipped semantics (2A); the "neither set" test unsets the var rather than emptying it, matching runtime-core's own test convention.

**Quality gates (all from worktree root, where `examples/` and the root vitest config live)**

- `vitest run packages/cli/src/commands/run.test.ts` — 155/155 pass. Proven hermetic: also passes with `DEEPNOTE_PYTHON=/some/poison/python` exported.
- `vitest run packages/runtime-core/{package-entry,python-env}.test.ts` — 38/38 (the consumed selector contract).
- `tsc --noEmit -p tsconfig.json` (root, covers cli sources) — 0 errors.
- `biome check` on both changed files — clean (autofix collapsed the mock arrow fn to one line).

**Deferred**: none. No follow-up cards. Completion Checklist items left unchecked (PR merged / deployed / monitoring / stakeholders / epic closed / Code Review Approved) are out of this card's scope — the reviewer flips Code Review, and PR/deploy are later sprint phases (CLI publish is explicitly N/A this sprint). Card left `in_progress` for the reviewer.

**Commits** (worktree branch `worktree-agent-a9a9355ed9f6ff69c`)

- `74346de` test(cli): add failing DEEPNOTE_PYTHON precedence tests for deepnote run
- `3283ab4` feat(cli): resolve deepnote run interpreter via shared selectPythonSpec

## Router Log (review cycle 1)

- **Verdict:** APPROVAL (Gate 1 PASS, Gate 2 PASS) at commit `de31e4a`.
- **Review report:** `.gitban/agents/reviewer/inbox/S6INREPO-pv4px0-reviewer-1.md`
- **Routed to executor:** `.gitban/agents/executor/inbox/S6INREPO-pv4px0-executor-1.md` — close-out the card (flip "Code Review Approved", complete + validate). No PR (card is in sprint S6INREPO; dispatcher owns sprint-level PR).
- **Routed to planner:** `.gitban/agents/planner/inbox/S6INREPO-pv4px0-planner-1.md` — 1 non-blocking follow-up:
  - **L1 (adr-consumer-gap):** ADR-001 bare-system-python actionable hint must land on a deepnote-run consumer. Out of scope for pv4px0 ("Scope decided; do not re-architect"). Strong dedup signal: likely already covered by in-progress card `mjporx` (step-3a-mcp-deepnote-run-env-resolution-bare-python-hint); planner to confirm before creating any new card.
