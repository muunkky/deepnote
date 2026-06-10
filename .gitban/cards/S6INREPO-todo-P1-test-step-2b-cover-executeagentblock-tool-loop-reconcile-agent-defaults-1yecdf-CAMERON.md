# Test Implementation Card

**When to use this template:** Adding/verifying test coverage for a code area — here, the runtime agent-block executor's live tool-loop.

---

## Test Overview

**Test Type:** Unit + Integration (provider-fixtured or explicitly-skipped integration)

**Target Component:** `packages/runtime-core/src/agent-handler.ts` — `executeAgentBlock` live `agent.stream` tool-loop (lines 200-216), plus model/turn defaults (lines 153-156)

**Related Cards:** S6INREPO Stream B. Unblocks step 4 (runtime-core version bump + CHANGELOG). Roadmap m1/s6; PRD-001 Phase 2 (`docs/prds/PRD-001-ai-agent-notebook-authoring.md`).

**Coverage Goal:** A test that actually invokes `executeAgentBlock`'s real LLM tool-loop (not the engine-boundary mock) and asserts the stream -> tool-call mapping, runnable in CI with NO `OPENAI_API_KEY`; plus confirmed-intentional model/turn defaults.

### Required Reading

| Path / Anchor                                                    | Why                                                                                                                                                                                                                                   |
| :--------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/runtime-core/src/agent-handler.ts:146,153-156,200-216` | The tool-loop under test (200-216: ToolLoopAgent construction through the fullStream loop — `stepCountIs` at 208, `agent.stream` at 213, fullStream loop at 215); model precedence (153-156, line 152 is blank); `maxTurns=10` (156). |
| `packages/runtime-core/src/agent-handler.test.ts`                | Helpers are covered, but `executeAgentBlock` is never called — this is the gap.                                                                                                                                                       |
| `packages/runtime-core/src/execution-engine.test.ts:57`          | `mockExecuteAgentBlock` stub — today every test mocks `executeAgentBlock` at the engine boundary.                                                                                                                                     |
| `packages/runtime-core/src/execution-engine.ts:243`              | `OPENAI_API_KEY` enforcement — the new test must NOT require a real key in CI.                                                                                                                                                        |
| `docs/prds/PRD-001-ai-agent-notebook-authoring.md` (Phase 2)     | Product intent: the runtime agent-block path must be covered and consumable.                                                                                                                                                          |

---

## Test Strategy

### Test Pyramid Placement

| Layer       | Tests Planned                        | Rationale                                                                                                                                |
| ----------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | 1+ (model-precedence reconciliation) | Confirm/adjust `block.metadata.deepnote_agent_model` (!='auto') -> `process.env.OPENAI_MODEL` -> `'gpt-5'` literal and `maxTurns=10`.    |
| Integration | 1 (the capstone)                     | Invoke `executeAgentBlock` directly against a fixtured/recorded provider; assert `fullStream` events map to expected tool calls/outputs. |
| E2E         | N/A                                  | Live-keyed E2E is OUT of scope (external residual).                                                                                      |
| Performance | N/A                                  | Not a performance concern.                                                                                                               |

### Testing Approach

- **Framework:** vitest (`pnpm test`) — TS monorepo, NOT pytest.
- **Mocking Strategy:** The executor must run against a **fixtured/recorded provider** (no live LLM), OR — if the executor decides recorded-provider is infeasible — an **explicitly-skipped integration test** with a documented manual run procedure. The executor decides, implements, and records the choice and rationale in this card.
  - **No DI seam — `vi.mock` is required for the fixtured path.** `executeAgentBlock` hard-imports `createOpenAI` from `'@ai-sdk/openai'` and `ToolLoopAgent` from `'ai'` with NO dependency-injection seam, and the existing `agent-handler.test.ts` does NOT `vi.mock` either module. So the fixtured-provider path requires `vi.mock('@ai-sdk/openai')` (or `vi.mock('ai')`) to inject the recorded stream. This sharpens (without pinning) the open recorded-vs-skipped decision above.
- **Isolation Level:** Full isolation; no network, no `OPENAI_API_KEY` required in CI.

### Definition of Done

This card changes test behavior, so it carries a Definition of Done.

#### Intent

The agent-block executor's real LLM tool-loop — not just its helpers — has a test that actually invokes it, so a regression in the stream->tool-call mapping is caught; and the model/turn defaults are confirmed-intentional, not unexamined PoC values. Today every test mocks `executeAgentBlock` at the engine boundary, so the loop has zero coverage. A break would show as agent blocks misbehaving with no test catching it.

#### Observable outcomes

- [ ] **Capstone:** A test invokes `executeAgentBlock` directly (NOT the execution-engine mock) against a fixtured/recorded provider and asserts the `fullStream` events map to the expected `add_code_block`/`add_markdown_block` tool calls and outputs, runnable in CI with NO `OPENAI_API_KEY` — OR, if skipped-integration is chosen, the test is explicitly skipped with a documented manual run procedure and the rationale is recorded in this card.
- [ ] Model precedence reconciled: a sourced code comment confirms intent for `block.metadata.deepnote_agent_model` (!='auto') -> `process.env.OPENAI_MODEL` -> `'gpt-5'` literal (agent-handler.ts:153-155, line 152 is blank), OR the precedence is changed with rationale recorded here.
- [ ] `maxTurns=10` (agent-handler.ts:156) confirmed via sourced comment, OR changed with rationale.
- [ ] The new test does NOT require a real `OPENAI_API_KEY` in CI.

---

## Test Scenarios

### Scenario 1: Tool-loop maps stream events to block tool-calls (Happy Path — Capstone)

- **Given:** A fixtured/recorded provider whose `fullStream` emits the events for an agent turn that calls `add_code_block` and `add_markdown_block`.
- **When:** `executeAgentBlock` is invoked directly (not via the execution-engine mock).
- **Then:** The emitted tool calls and their outputs match the expected `add_code_block`/`add_markdown_block` results; runnable in CI with NO `OPENAI_API_KEY`.
- **Priority:** Critical

### Scenario 2: Model precedence reconciliation (Boundary)

- **Given:** `agent-handler.ts:153-155` model precedence (`deepnote_agent_model` != 'auto' -> `OPENAI_MODEL` env -> `'gpt-5'` literal; line 152 is blank).
- **When:** The executor reviews intent.
- **Then:** A sourced code comment confirms the precedence (or it is changed with rationale recorded in this card), and `maxTurns=10` (line 156) is likewise confirmed or changed-with-rationale.
- **Priority:** High

### Scenario 3: No real API key required in CI (Negative / environment)

- **Given:** CI with no `OPENAI_API_KEY` set (note `execution-engine.ts:243` enforces the key on the engine path).
- **When:** The new agent-block test runs.
- **Then:** It runs (fixtured) or is explicitly skipped with a documented manual procedure — never fails for lack of a key.
- **Priority:** Critical

### Scenario 4: Skipped-integration fallback is honest (Negative)

- **Given:** The executor chooses the explicitly-skipped integration approach.
- **When:** The suite runs in CI.
- **Then:** The test is `skip`-marked, a manual run procedure is documented in the test and this card, and the rationale for skipping is recorded here.
- **Priority:** Medium

---

## Test Data & Fixtures

### Required Test Data

| Data Type                | Description                                                                                          | Source                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------- |
| Recorded provider stream | A canned `fullStream` event sequence for an agent turn calling `add_code_block`/`add_markdown_block` | Fixture / recorded cassette |
| Agent block input        | A minimal agent block + notebook context the executor accepts                                        | Factory / fixture           |

### Edge Case Data

- **Empty/Null:** Stream that emits no tool calls (loop terminates cleanly).
- **Maximum Values:** Confirm `maxTurns=10` boundary intent (documented, not necessarily exercised to 10).
- **Invalid Formats:** Malformed tool-call event handling (if the executor surfaces it).
- **Unicode/Special Chars:** N/A for this loop.

### Fixture Setup

```
# Pseudocode: build a recorded provider whose fullStream yields the agent turn
# events, inject it into executeAgentBlock, assert mapped tool calls/outputs.
```

---

## Implementation Checklist

### Setup Phase

- [ ] Test file[s] created in correct location
- [ ] Test fixtures/factories defined
- [ ] Mocks and stubs configured
- [ ] Test database/state initialized [if needed]

### Test Implementation

- [ ] Happy path tests written and passing
- [ ] Edge case tests written and passing
- [ ] Error handling tests written and passing
- [ ] Negative/security tests written and passing
- [ ] Performance assertions added [if applicable]

### Quality Gates

- [ ] All tests pass locally
- [ ] All tests pass in CI
- [ ] No flaky tests introduced
- [ ] Test execution time acceptable
- [ ] Code coverage meets target [if applicable]

### Documentation

- [ ] Test file has clear docstrings/comments
- [ ] Complex test logic explained
- [ ] Setup/teardown documented

---

## Acceptance Criteria

- [ ] All planned scenarios have corresponding tests
- [ ] Tests are deterministic [no flakiness]
- [ ] Tests run in isolation [no order dependency]
- [ ] Tests are fast enough for CI [<X seconds]
- [ ] Coverage target met: `executeAgentBlock` tool-loop covered (capstone) — invoked directly, fixtured/recorded provider, asserts stream -> `add_code_block`/`add_markdown_block` mapping, runs with NO `OPENAI_API_KEY` (or explicitly-skipped with documented manual procedure + recorded rationale).
- [ ] Model precedence (`deepnote_agent_model`!='auto' -> `OPENAI_MODEL` -> `'gpt-5'`) reconciled via sourced comment OR changed-with-rationale; `maxTurns=10` likewise.
- [ ] The test does NOT require a real `OPENAI_API_KEY` in CI.
- [ ] Tests follow project conventions (vitest, `pnpm test`).
- [ ] Fork discipline: code lands on a `feat/*` branch cut from `upstream/main`; NO `.gitban/`, `.claude/`, `docs/prds/`, or `docs/adr/` files in code commits.

---

## Troubleshooting Log (optional)

| Issue                      | Investigation    | Resolution         |
| -------------------------- | ---------------- | ------------------ |
| [Test failure description] | [What you tried] | [How it was fixed] |

---

## Notes

The two viable coverage approaches (recorded/fixtured provider vs. explicitly-skipped integration with a documented manual procedure) are both acceptable; the executor must pick one, implement it, and record the choice + rationale here. Live-keyed end-to-end against real OpenAI is OUT of scope (external residual). Test runner is vitest (`pnpm test`), not pytest.
