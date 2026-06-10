---
verdict: APPROVAL
card_id: 1yecdf
review_number: 1
commit: 7c0f292
date: 2026-06-10
has_backlog_items: true
---

# Review — card 1yecdf (S6INREPO step 2B): cover executeAgentBlock tool-loop, reconcile agent defaults

**Verdict: APPROVAL.**

This card backfills coverage for the runtime agent-block executor's live tool-loop
(`executeAgentBlock` in `packages/runtime-core/src/agent-handler.ts`) and reconciles
the model/turn-cap defaults as confirmed-intentional via sourced comments. The work
is well-targeted, the fixture is faithful to the real provider contract, and the
capstone genuinely exercises the loop the card set out to protect.

## Gate 1 — completion claim (PASS)

The card changes test behavior, so it requires a DoD, and it has a strong one:

- **Intent** is concrete and externally checkable: the agent-block executor's real
  LLM tool-loop (not just its helpers) now has a test that actually invokes it, so a
  regression in the stream -> tool-call mapping is caught; defaults are confirmed
  intentional. A reasonable engineer can sanity-check the diff against this. Good.
- **Capstone** is real and unfakeable: it requires a test that invokes
  `executeAgentBlock` _directly_ (not the `execution-engine.test.ts:57` boundary
  mock) against a fixtured provider, asserts the `fullStream` -> `add_code_block`/
  `add_markdown_block` event mapping, and runs with NO `OPENAI_API_KEY`. The card's
  fallback (skipped-integration) is also honestly specified. This is not a
  return-type/"works correctly" capstone — it pins observable, ordered behavior.
- **Checkboxes** cover the acceptance criteria and observables; none are
  trivially-satisfied or title-restating.
- **Checkbox integrity:** the executor's close-out is honest about scope — it does
  NOT claim live-provider verification (correctly flagged as the out-of-scope
  live-keyed E2E residual), does NOT fabricate a malformed-tool-call error test the
  loop has no branch for, and correctly notes "CI passes" is verified at the
  local + commit-content level. The "no-capstone" trap does not apply — a real
  capstone was authored and exercised.

Gate 1 passes; proceeding to Gate 2.

## Gate 2 — implementation quality (PASS)

Verified independently:

- **The real loop runs.** `vi.mock('ai', ...)` is _partial_ — only `ToolLoopAgent`
  is swapped for the fake; real `tool` and `stepCountIs` are preserved. So the
  production `for await (const part of streamResult.fullStream)` body at
  `agent-handler.ts:228-240` is the code under test, not a mock of it. This is not
  the overmocking-replaces-SUT anti-pattern: the feature's value (the part ->
  `onAgentEvent` mapping) is exactly what the cassette drives end to end.
- **Fixture is faithful to reality, not self-consistent fiction.** I cross-checked
  the cassette part shapes against the installed `ai@6.0.116` `TextStreamPart`
  union (`node_modules/.pnpm/ai@6.0.116_zod@3.25.76/.../dist/index.d.ts`):
  `text-delta`/`reasoning-delta` carry `text`; `tool-call` carries
  `toolName`/`input`; `tool-result` carries `toolName`/`output`. The cassette uses
  these exact field names, and the production loop only reads
  `part.type`/`part.text`/`part.toolName`/`part.output`. The one realistic risk
  this approach cannot catch — real provider wire-format drift — is the explicitly
  out-of-scope live-keyed E2E residual, correctly called out.
- **Capstone assertion is unfakeable.** It asserts the _full ordered_
  `AgentStreamEvent[]` (reasoning_delta -> tool_called/tool_output x2 ->
  text_delta x2) and `result.finalOutput`, with `OPENAI_API_KEY` asserted
  `undefined`. Could not be ticked by a single trivial unit run.
- **Branch coverage is genuine, not cosmetic.** The non-string-output test really
  exercises the `JSON.stringify` branch at `agent-handler.ts:237`; the empty-stream
  and no-callback tests cover clean termination and the optional-chaining path.
- **Defaults reconciliation is comment-only with zero behavior change.** I filtered
  the `agent-handler.ts` diff to non-comment lines and it is empty — every changed
  line is a sourced comment (PRD-001 Phase 2 / PoC #341). The precedence tests
  (`metadata != 'auto'` -> `OPENAI_MODEL` -> `'gpt-5'`, plus the `openai.chat()`
  base-URL variant and `stopWhen`/`stepCountIs(10)` wiring) verify the chain
  behaviorally via captured agent settings — unfakeable, since `gpt-5` only
  surfaces when both higher-precedence sources are unset.
- **TDD proportionality:** this is a coverage-backfill card against pre-existing
  PoC behavior with comment-only production change, so test-after concerns do not
  apply.
- **No lazy solves, no security issues, no ADR drift.** Only `docs/adr/ADR-001`
  exists and is unrelated. No secrets; the token is a literal fixture string and
  no client/network is constructed.

Independent verification run:

- `pnpm exec vitest run packages/runtime-core/src/agent-handler.test.ts` -> **41
  passed** (7 new + 34 pre-existing), no `OPENAI_API_KEY` set.
- `pnpm --filter @deepnote/runtime-core exec tsc --noEmit` -> exit 0.
- `biome check` on both files -> exit 0; the sole warning is a _pre-existing_
  `console.error` advisory on unchanged line 254, not introduced by this diff.

## BLOCKERS

None.

## FOLLOW-UP

- **L1 (tool-wiring-coverage-gap).** The two real agent tools are registered with
  `execute: context.addAndExecuteCodeBlock` / `context.addMarkdownBlock`
  (`agent-handler.ts:199,207`), but the fake agent replays _pre-recorded_
  `tool-result` parts rather than invoking the registered tools' `execute`. The
  `makeContext` `vi.fn` callbacks are therefore never called, so nothing asserts
  that `add_code_block` is wired to `context.addAndExecuteCodeBlock` (vs.
  `add_markdown_block`). A swapped or dropped `execute` binding would not be caught
  by this suite. This is genuinely outside the card's capstone (stream -> event
  _mapping_), so it is a follow-up rather than a blocker — but it is the next gap a
  paranoid maintainer hits. Closing it: assert on `captured.settings.tools` that
  `add_code_block.execute === context.addAndExecuteCodeBlock` (and the markdown
  counterpart), or have the fake invoke a registered tool's `execute` and assert
  the context callback fired. Small, mechanical follow-up card.

- **L2 (mcp-merge-coverage-gap).** `executeAgentBlock` also merges and instantiates
  MCP clients (`mergeMcpConfigs` + `createMCPClient`, `agent-handler.ts:177-191`)
  and closes them in a `finally` with per-client error handling (lines 247-256).
  `mergeMcpConfigs` is unit-tested in isolation, but the executor's MCP
  lifecycle/close-error path inside `executeAgentBlock` is unexercised (the tests
  use `mcpServers: []`). Not in this card's scope; flag for the planner to decide
  whether the close-error branch warrants its own coverage card.

## Outstanding close-out actions

None blocking. The card may move to its next state. The PR agent owns cutting the
clean `feat/*` branch off `upstream/main` (the executor correctly did not do this
on the worktree).
