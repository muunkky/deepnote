---
verdict: APPROVAL
card_id: fkxnne
review_number: 1
commit: 2b3a4dd26c12a861c34c965571d8f18ca7f2c43c
date: 2026-06-10
has_backlog_items: false
---

# Review: harden-executeagentblock-tool-wiring-and-mcp-finally-coverage (fkxnne)

Test-only card. Single file touched: `packages/runtime-core/src/agent-handler.test.ts` (+183 lines, 6 new tests). No production code changed. Closes two non-blocking assertion gaps surfaced in S6INREPO card `1yecdf` review 1.

## Gate 1 — completion claim: PASS

The card touches test behavior, so a DoD applies. The structured TDD template carries it:

- **Intent** is concrete (Overview + Motivation): two named assertion gaps — (1) tool-binding `execute` identity never asserted because the fake `ToolLoopAgent` replays recorded `tool-result` parts instead of invoking registered tools; (2) the MCP client-instantiation path and close-error `finally` branch never entered because all prior tests used `mcpServers: []`.
- **Observable outcomes** are the 6 enumerated test cases, each with a concrete input/expected pair.
- **Capstone for a test-hardening card = mutation verification.** The card claims the new assertions catch real regressions (swapped binding fails the identity test; removed close try/catch fails the close-error test). This is the correct, unfakeable bar for a coverage card, and I independently reproduced both mutations (see Gate 2).
- Checkboxes map to verifiable conditions, not trivial existence claims. No deferred in-scope work; the "deferred: none" claim is accurate.

## Gate 2 — implementation quality: PASS

Cross-referenced the tests against the production code (`agent-handler.ts:177-256`):

- **Tool-binding identity (3 tests).** `tools.add_code_block.execute === context.addAndExecuteCodeBlock` and `tools.add_markdown_block.execute === context.addMarkdownBlock`, plus a cross-wire guard. Mock seam is correct: only `ToolLoopAgent` is faked; the real `tool()` helper from `ai` is preserved (partial mock), so the captured `settings.tools[name].execute` is the exact production reference — identity (`toBe`) is meaningful, not a "is a function" no-op. `context.addAndExecuteCodeBlock` / `addMarkdownBlock` are stable per-`makeContext()` vi.fns, so the identity comparison is well-formed.
- **MCP lifecycle (3 tests).** `@ai-sdk/mcp` `createMCPClient` and `@ai-sdk/mcp/mcp-stdio` `Experimental_StdioMCPTransport` are mocked; a FIFO `clientQueue` hands one fake client per merged config. Tests cover: happy path (both clients `.close()` once, no throw, result preserved), close-error `finally` (rejecting client caught per-client, healthy client STILL closed, result unaffected, `console.error` called once containing the offending server name `mcp-a`), and MCP-tool-merge (provided tool present without displacing the two built-ins, `client.tools()` called once). All assertions match the production `finally` at lines 247-256, including the `mergedMcpConfig[index]?.name` server-name lookup the error message uses.
- **Mutation verification reproduced independently.**
  - Removed the per-client `try/catch` in the `finally` (let the close rejection escape) → close-error test fails. Confirmed.
  - Swapped `add_code_block`'s `execute: context.addAndExecuteCodeBlock` to `context.addMarkdownBlock` → `binds add_code_block.execute...` identity test fails. Confirmed (ran with `-t "execute bindings"`).
- **Honest scope.** The card correctly states these run against the fixtured-cassette fake agent and fake MCP clients — not a live OpenAI key or a real spawned stdio child — and flags real provider wire-format / real stdio-MCP transport as the explicitly out-of-scope live-keyed E2E residual that card `1yecdf` already established. No scope dilution; the residual is named, not silently dropped.
- **TDD posture.** This is a test-after-the-fact coverage card by design (production already worked), which the template and DaC rules permit for assertion-gap closure. The mutation evidence substitutes for "test-first" by proving the assertions are load-bearing.

## Verification run

- `vitest run src/agent-handler.test.ts` → 47 passed (was 41; +6). Matches the card claim.
- Pre-existing unrelated `execution-engine.test.ts` ENOENT failure is out of this card's scope and untouched by this diff (single file changed).

## BLOCKERS

None.

## FOLLOW-UP

None blocking. The card's own follow-up notes (apply the binding-identity assertion pattern to other executor paths that replay recorded fixtures rather than invoking registered callbacks) are documentation-grade and correctly judged not to need a new card. No additional findings — the diff is a clean, well-targeted, mutation-verified coverage addition.
