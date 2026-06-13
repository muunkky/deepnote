Sprint closeout card ID: o5pg2k
Sprint card list:

- 5qz6zl (step 1, todo): step-1-s6inrepo-sprint-plan — the S6INREPO sprint plan card
- onwhhg (step 2A, in_progress): step-2a-shared-selectpythonspec-resolver-isbaresystempython-export-runtime-core — shared selectPythonSpec resolver + isBareSystemPython export in runtime-core
- 1yecdf (step 2B, in_progress): step-2b-cover-executeagentblock-tool-loop-reconcile-agent-defaults — coverage for executeAgentBlock tool-loop + agent defaults reconciliation (THIS card, just APPROVED)
- mjporx (step 3A, todo): step-3a-mcp-deepnote-run-env-resolution-bare-python-hint — mcp deepnote run env resolution + bare-python hint
- pv4px0 (step 3B, todo): step-3b-cli-run-interpreter-resolution-converges-on-shared-selector — cli run interpreter resolution converges on shared selector
- sjwaox (step 4, todo): step-4-runtime-core-version-bump-changelog-for-agent-helpers — runtime-core version bump + CHANGELOG for agent helpers
- o5pg2k (closeout, todo): s6inrepo-sprint-closeout — the sprint close-out card

The reviewer flagged 2 non-blocking items, grouped into 1 card below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: Cover executeAgentBlock tool-wiring and MCP-lifecycle/close-error branches

Sprint: S6INREPO
Files touched: packages/runtime-core/src/agent-handler.ts, packages/runtime-core/src/agent-handler.test.ts
Items:

- L1 (tool-wiring-coverage-gap): The two real agent tools are registered with `execute: context.addAndExecuteCodeBlock` (add_code_block) and `context.addMarkdownBlock` (add_markdown_block) at agent-handler.ts:199,207, but the new tests' fake agent replays pre-recorded `tool-result` parts rather than invoking the registered tools' `execute`, so the `makeContext` `vi.fn` callbacks are never called. Nothing asserts that `add_code_block` is wired to `context.addAndExecuteCodeBlock` (vs. `add_markdown_block`) — a swapped or dropped `execute` binding would not be caught. Close it by asserting on `captured.settings.tools` that `add_code_block.execute === context.addAndExecuteCodeBlock` (and the markdown counterpart), or have the fake invoke a registered tool's `execute` and assert the context callback fired. This is outside this card's capstone (stream -> event mapping), so it was a follow-up, not a blocker.
- L2 (mcp-merge-coverage-gap): `executeAgentBlock` also merges and instantiates MCP clients (`mergeMcpConfigs` + `createMCPClient`, agent-handler.ts:177-191) and closes them in a `finally` with per-client error handling (lines 247-256). `mergeMcpConfigs` is unit-tested in isolation, but the executor's MCP lifecycle / close-error path inside `executeAgentBlock` is unexercised (the new tests use `mcpServers: []`). Add coverage for the MCP close-error branch inside `executeAgentBlock`.
