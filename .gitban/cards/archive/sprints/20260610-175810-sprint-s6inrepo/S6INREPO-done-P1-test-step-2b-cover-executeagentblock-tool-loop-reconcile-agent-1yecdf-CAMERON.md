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

- [x] **Capstone:** A test invokes `executeAgentBlock` directly (NOT the execution-engine mock) against a fixtured/recorded provider and asserts the `fullStream` events map to the expected `add_code_block`/`add_markdown_block` tool calls and outputs, runnable in CI with NO `OPENAI_API_KEY` — OR, if skipped-integration is chosen, the test is explicitly skipped with a documented manual run procedure and the rationale is recorded in this card.
- [x] Model precedence reconciled: a sourced code comment confirms intent for `block.metadata.deepnote_agent_model` (!='auto') -> `process.env.OPENAI_MODEL` -> `'gpt-5'` literal (agent-handler.ts:153-155, line 152 is blank), OR the precedence is changed with rationale recorded here.
- [x] `maxTurns=10` (agent-handler.ts:156) confirmed via sourced comment, OR changed with rationale.
- [x] The new test does NOT require a real `OPENAI_API_KEY` in CI.

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

- [x] Test file[s] created in correct location
- [x] Test fixtures/factories defined
- [x] Mocks and stubs configured
- [x] Test database/state initialized [if needed]

### Test Implementation

- [x] Happy path tests written and passing
- [x] Edge case tests written and passing
- [x] Error handling tests written and passing
- [x] Negative/security tests written and passing
- [x] Performance assertions added [if applicable]

### Quality Gates

- [x] All tests pass locally
- [x] All tests pass in CI
- [x] No flaky tests introduced
- [x] Test execution time acceptable
- [x] Code coverage meets target [if applicable]

### Documentation

- [x] Test file has clear docstrings/comments
- [x] Complex test logic explained
- [x] Setup/teardown documented

---

## Acceptance Criteria

- [x] All planned scenarios have corresponding tests
- [x] Tests are deterministic [no flakiness]
- [x] Tests run in isolation [no order dependency]
- [x] Tests are fast enough for CI [<X seconds]
- [x] Coverage target met: `executeAgentBlock` tool-loop covered (capstone) — invoked directly, fixtured/recorded provider, asserts stream -> `add_code_block`/`add_markdown_block` mapping, runs with NO `OPENAI_API_KEY` (or explicitly-skipped with documented manual procedure + recorded rationale).
- [x] Model precedence (`deepnote_agent_model`!='auto' -> `OPENAI_MODEL` -> `'gpt-5'`) reconciled via sourced comment OR changed-with-rationale; `maxTurns=10` likewise.
- [x] The test does NOT require a real `OPENAI_API_KEY` in CI.
- [x] Tests follow project conventions (vitest, `pnpm test`).
- [x] Fork discipline: code lands on a `feat/*` branch cut from `upstream/main`; NO `.gitban/`, `.claude/`, `docs/prds/`, or `docs/adr/` files in code commits.

---

## Troubleshooting Log (optional)

| Issue                      | Investigation    | Resolution         |
| -------------------------- | ---------------- | ------------------ |
| [Test failure description] | [What you tried] | [How it was fixed] |

---

## Notes

The two viable coverage approaches (recorded/fixtured provider vs. explicitly-skipped integration with a documented manual procedure) are both acceptable; the executor must pick one, implement it, and record the choice + rationale here. Live-keyed end-to-end against real OpenAI is OUT of scope (external residual). Test runner is vitest (`pnpm test`), not pytest.

## Close-out (executor, cycle 1)

**Status:** Work complete, tests pass, committed. Left in `in_progress` for reviewer.

**Commit:** `7c0f292` on `worktree-agent-a9c2ae6788a7f252e` — code-only (no `.gitban/`/`.claude/`/`docs/` files), 2 files / +263/-2.

### Coverage approach chosen: recorded/fixtured provider (NOT skipped-integration)

`executeAgentBlock` is now invoked **directly** — not via the `execution-engine.test.ts:57` boundary mock. Because the function hard-imports `ToolLoopAgent` (`ai`) and `createOpenAI` (`@ai-sdk/openai`) with no DI seam, the recorded path uses `vi.mock` (the card's sharpened option):

- `vi.mock('ai', ...)` is **partial** — real `tool` and `stepCountIs` are preserved (the module evaluates them at import time and the loop passes `stepCountIs(maxTurns)` as `stopWhen`); only `ToolLoopAgent` is swapped for a `FakeToolLoopAgent` whose `.stream()` replays a recorded cassette of `fullStream` parts + final `text`.
- `vi.mock('@ai-sdk/openai', ...)` stubs `createOpenAI` so no client/network/key is constructed; the returned model object is opaque to the loop and only flows into the captured agent settings.

**Rationale for recorded-over-skipped:** the loop logic worth protecting is the `fullStream` part → `onAgentEvent` mapping. A recorded cassette exercises that mapping deterministically with zero network and NO `OPENAI_API_KEY`; a skipped test would not. This is documented in the test file header comment and the `executeAgentBlock` describe-block comment.

### What the tests actually verify (7 new tests, `agent-handler.test.ts`)

1. **Capstone (Scenario 1 + 3):** a recorded `fullStream` of `reasoning-delta → tool-call(add_code_block) → tool-result → tool-call(add_markdown_block) → tool-result → text-delta×2` is asserted to map **exactly** to the ordered `AgentStreamEvent[]` (`reasoning_delta`, `tool_called`/`tool_output` for both `add_code_block` and `add_markdown_block`, `text_delta`), and `result.finalOutput` returns the final assistant text. Runs with `OPENAI_API_KEY` explicitly asserted `undefined`.
2. Non-string `tool-result.output` is `JSON.stringify`-ed before emit (covers the `outputStr` branch at agent-handler.ts:223-224).
3. Empty stream → no events, empty `finalOutput` (clean loop termination / Scenario 1 edge).
4. No `onAgentEvent` callback → no throw (optional-callback path).
   5–8 (model precedence + turn cap, behavior-verified via captured agent settings): metadata model wins when `!= 'auto'`; falls back to `OPENAI_MODEL` env; falls back to `'gpt-5'` literal; `openai.chat()` variant used when `OPENAI_BASE_URL` set; `stopWhen` (real `stepCountIs(10)`) is wired onto the agent.

**Honest scope notes:**

- This is a **fixtured/recorded** test, NOT verified against a live OpenAI provider — real provider wire-format drift is the explicitly out-of-scope live-keyed E2E residual (per card "Live-keyed E2E is OUT of scope").
- "Error handling" / "Negative-security" boxes are satisfied by the no-key environment assertion (Scenario 3) and the non-string-output / empty-stream paths. The loop has **no malformed-tool-call error branch** to test (Scenario marked it conditional, "if the executor surfaces it"), so none was fabricated.
- "All tests pass in CI" / "Fork discipline" verified at the **local + commit-content** level: the suite passes with the CI-identical `vitest` command and no key, and the commit contains only `packages/runtime-core/src/` code paths. The actual `feat/*`-branch cut from `upstream/main` is the PR agent's step.

### Defaults reconciliation (Scenario 2)

Confirmed-intentional via **sourced comments** added to `agent-handler.ts` (no behavior change):

- Model precedence `deepnote_agent_model != 'auto' → OPENAI_MODEL → 'gpt-5'` — sourced to PRD-001 Phase 2 ("Defaults reconciled") and the agentic-block PoC commit #341 (`ab97044`).
- `maxTurns = 10` cap (applied via `stepCountIs(maxTurns)`) — confirmed as the intended loop cap, not a placeholder.

### Verification run

- `pnpm exec vitest run packages/runtime-core/src/agent-handler.test.ts` → **41 passed** (7 new + 34 pre-existing), 35ms, no key set.
- `pnpm exec biome check <both files>` → exit 0 (only a pre-existing `console.error` advisory on unchanged line 241).
- `pnpm --filter @deepnote/runtime-core exec tsc --noEmit` → exit 0.

No work deferred; no follow-up cards created.

## Review Log — cycle 1 (router)

**Verdict: APPROVAL** (commit `7c0f292`).
Review report: `.gitban/agents/reviewer/inbox/S6INREPO-1yecdf-reviewer-1.md`

- Gate 1 (completion claim): PASS — concrete Intent, real/unfakeable capstone, honest checkbox integrity.
- Gate 2 (implementation quality): PASS — real loop under test (partial `vi.mock('ai')`), fixture faithful to `ai@6.0.116` `TextStreamPart`, ordered-event capstone assertion, comment-only defaults reconciliation. Independent run: 41 passed (7 new), tsc exit 0, biome exit 0.

**Routing:**

- Executor (cycle 1): close-out — check remaining boxes, complete + validate. No blocking close-out actions per reviewer. PR-branch cut is the PR agent's job.
- Planner (cycle 1): 2 non-blocking follow-ups grouped into 1 sprint card (same module `agent-handler.ts` / `agent-handler.test.ts`):
  - L1 tool-wiring-coverage-gap — assert `add_code_block.execute`/`add_markdown_block.execute` bindings (registered-tool `execute` not currently exercised).
  - L2 mcp-merge-coverage-gap — cover the MCP lifecycle / close-error `finally` branch inside `executeAgentBlock`.
