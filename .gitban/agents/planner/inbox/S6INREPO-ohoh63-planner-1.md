Sprint closeout card ID: o5pg2k
Sprint card list:

- 5qz6zl (step 1, done): step-1-s6inrepo-sprint-plan — sprint planning artifact
- onwhhg (step 2a, done): step-2a-shared-selectpythonspec-resolver-isbaresystempython-export-runtime-core — shared selectPythonSpec resolver + isBareSystemPython export in runtime-core
- 1yecdf (step 2b, done): step-2b-cover-executeagentblock-tool-loop-reconcile-agent-defaults — test coverage for executeAgentBlock tool loop / agent defaults
- mjporx (step 3a, done): step-3a-mcp-deepnote-run-env-resolution-bare-python-hint — MCP consumer bare-python hint
- pv4px0 (step 3b, done): step-3b-cli-run-interpreter-resolution-converges-on-shared-selector — CLI run interpreter resolution converges on shared selector
- sjwaox (step 4, done): step-4-runtime-core-version-bump-changelog-for-agent-helpers — runtime-core version bump + changelog
- 3oz7aa (step 6, done): step-6-code-review-remediation-empty-string-interpreter-fallback-test-fidelity-hardening-pr-2 — empty-string interpreter fallback + test fidelity hardening
- ohoh63 (in_progress): emit-adr-001-bare-python-hint-on-cli-deepnote-run — CLI deepnote-run bare-python hint (this card; APPROVED)
- fkxnne (in_progress, P2): harden-executeagentblock-tool-wiring-and-mcp-finally-coverage — executeAgentBlock tool wiring + MCP finally coverage
- o5pg2k (in_progress): s6inrepo-sprint-closeout — sprint closeout card

The reviewer flagged 2 non-blocking items, grouped into 2 cards below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: Document the CLI deepnote-run bare-python interpreter hint in packages/cli/README.md

Sprint: S6INREPO
Files touched: packages/cli/README.md
Items:

- L1 (docs-parity-gap): The MCP README documents the bare-python hint (`packages/mcp/README.md:144-147`), but the CLI README has no Python-interpreter resolution section at all, so the newly-shipped CLI hint (card ohoh63) is undocumented for parity. Add a short "Python interpreter" subsection to `packages/cli/README.md` mirroring the MCP README: describe interpreter precedence (`--python` > `DEEPNOTE_PYTHON` > autodetect) and the bare-system-python warning, matching the MCP wording for cross-consumer parity. The card listed this as "Optional" and a yellow status line is largely self-explanatory, so it is non-blocking, but it closes the documentation half of the ADR-001 parity story.

### Card 2 [BLOCKED — out-of-repo, unverifiable here]: Triage whether external deepnote-run producers/consumers honor the ADR-001 bare-python hint obligation

Sprint: S6INREPO
Files touched: none in-repo (discovery/triage only)
Items:

- L2 (consumer-coverage-gap): The card's own "Further Investigation" note asks whether other deepnote-run producers/consumers (e.g. the external vscode-deepnote producer) honor the bare-python hint obligation. ADR-001 explicitly scopes the producer as out-of-repo and unverifiable from this repository, so no code or test can be written here to satisfy it. BLOCKED reason: the work targets an external/out-of-repo component (vscode-deepnote) that does not exist in this tree and cannot be verified or modified from this sprint — it is a discovery/triage item requiring access to a component outside this repo. Capture for triage rather than execution in this cycle.
