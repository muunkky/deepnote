Sprint closeout card ID: o5pg2k
Sprint card list:

- 5qz6zl (step-1, todo): step-1-s6inrepo-sprint-plan — sprint planning artifact card
- onwhhg (step-2a, done): step-2a-shared-selectpythonspec-resolver-isbaresystempython-export-runtime-core — shared selectPythonSpec resolver + isBareSystemPython export in @deepnote/runtime-core
- 1yecdf (step-2b, done): step-2b-cover-executeagentblock-tool-loop-reconcile-agent-defaults — test coverage for executeAgentBlock tool loop / agent defaults
- mjporx (step-3a, in_progress): step-3a-mcp-deepnote-run-env-resolution-bare-python-hint — MCP deepnote run env resolution + bare-python hint
- pv4px0 (step-3b, in_progress): step-3b-cli-run-interpreter-resolution-converges-on-shared-selector — CLI run interpreter resolution converges on shared selector (THIS card, approved)
- o5pg2k (closeout, todo): s6inrepo-sprint-closeout — sprint closeout card
- sjwaox (step-4, todo): step-4-runtime-core-version-bump-changelog-for-agent-helpers — runtime-core version bump + changelog for agent helpers

The reviewer flagged 1 non-blocking item, grouped into 1 card below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

IMPORTANT dedup signal: this item is almost certainly already covered by existing
in-progress card `mjporx` (step-3a-mcp-deepnote-run-env-resolution-bare-python-hint)
— its title explicitly names the "bare-python-hint" and the reviewer's own note says
"likely already tracked" and asks you to "confirm this is captured on the MCP step (3A)
or a dedicated card." Verify mjporx's scope/DoD/checkboxes actually require emitting the
ADR-001 bare-system-python hint. If mjporx already covers it, do NOT create a duplicate
card — record the dedup. Only create a new card if mjporx does NOT in fact carry this
obligation (i.e. it resolves the env precedence but never surfaces the hint).

### Card 1: ADR-001 bare-system-python actionable hint on a deepnote-run consumer

Sprint: S6INREPO
Files touched: packages/cli/src/commands/run.ts, packages/mcp (deepnote run env resolution call-site), packages/runtime-core/src/python-env.ts (isBareSystemPython consumer)
Items:

- L1 (adr-consumer-gap): ADR-001 requires consumers to surface an actionable bare-system-python hint ("set `DEEPNOTE_PYTHON` or pass a venv") when interpreter resolution lands on bare `python` (detected via `isBareSystemPython` from runtime-core). pv4px0 deliberately scoped to precedence convergence only and does NOT emit the hint (run.ts:296 resolves and proceeds). The hint is a real ADR-001 obligation that must land on a deepnote-run consumer — failure mode if never built: a user with no venv and no `DEEPNOTE_PYTHON` still gets the opaque mid-run failure ADR-001 set out to eliminate. Confirm this is owned by the MCP step (mjporx / step-3A) or a dedicated card. This is NOT a blocker and NOT a dependency-blocked item — it can be executed in this sprint cycle.
