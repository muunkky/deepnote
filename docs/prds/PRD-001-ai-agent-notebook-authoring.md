# PRD-001: AI agents author, edit, and execute Deepnote notebooks — remaining in-repo scope

> **Status**: Draft | **Date**: 2026-06-10 | **Author**: CAMERON
> **Roadmap**: m1/s6

## Problem Statement

AI coding agents — in Cursor, Claude, and the Deepnote VS Code extension — already create,
edit, convert, and run Deepnote notebooks through the `@deepnote/mcp` server, and notebooks
can contain agent blocks that an LLM executes at runtime. The core capability works. But three
rough edges still degrade the agent experience and the reliability of the building blocks:

1. **Layout drift on Cloud import.** Notebooks an agent authors via MCP could import into
   Deepnote Cloud with blocks collapsed into one row instead of laid out cleanly.
2. **Silent wrong-environment execution.** When an agent runs a notebook through the MCP
   server, execution falls back to bare system `python` — which usually lacks
   `deepnote-toolkit` and the user's integrations — instead of the environment the user
   already selected in their editor. The result is a confusing failure deep in execution
   rather than a clear, actionable message.
3. **Unproven runtime agent-block path.** The runtime agent-block executor is implemented and
   wired, and its extracted helpers are unit-tested — but the live `executeAgentBlock`
   tool-loop _itself_ has no test that invokes it (the engine stubs it out), its model/turn
   defaults are unexamined, and the helper exports are not in a published release — so
   downstream consumers can't pin them and a regression in the stream/tool-call path can land
   unseen.

A user driving an agent against Deepnote notebooks should get clean output, run in a capable
environment (or a clear message when they can't), and trust that the agent-block runtime is
covered and consumable.

## Background & Context

**Why now.** Story m1/s6 is the AI-native layer of the Deepnote open-source toolchain. Its
foundational features are shipped: the bounded MCP toolset (PRs #273/#258/#259/#271), the MCP
workflow prompts (#273), the agent block type (#336), the agentic-block PoC (#341), and the
core of runtime agent-block execution (#342/#369/#370). What remains is the long tail that
turns "works in a demo" into "reliable for agents" — and that tail is exactly the three items
above. This is the right time because the surrounding features are done and these residuals are
now the gating quality issues, not net-new capability.

**Current state (verified against the codebase).**

- **blockGroup handling (#289):** `packages/mcp/src/tools/writing.ts:412` sets
  `blockGroup: randomUUID()` for every block the server creates, and the public block spec
  does not let a caller override it — so each block already gets a unique group. This was the
  in-repo fix (PR #310, merged as `ddb0c6d`) for the symptom behind issue #289. Tests in
  `writing.test.ts` assert uniqueness across `create`/`add_block`/`add_notebook`.
- **Environment resolution (#288):** the CLI resolves the interpreter correctly —
  `packages/cli/src/commands/run.ts:296`:
  `const pythonEnv = await resolvePythonExecutable(options.python ?? detectDefaultPython())`.
  The MCP server does **not**: `packages/mcp/src/tools/execution.ts:394` and `:559` both do
  `pythonEnv: pythonPath || 'python'`, and `packages/mcp/src/server.ts:31` reads only
  `DEEPNOTE_WORKSPACE` — there is no interpreter discovery, config, or env-var channel.
  `@deepnote/runtime-core` already exports the building blocks via
  `packages/runtime-core/src/python-env.ts`: `resolvePythonExecutable` (line 23),
  `detectDefaultPython` (109), `isBareSystemPython` (129), and `buildPythonEnv` (181).
- **Runtime agent-block execution:** `packages/runtime-core/src/agent-handler.ts` implements
  `executeAgentBlock` (a `ToolLoopAgent` over `@ai-sdk/openai`, exposing `add_code_block` /
  `add_markdown_block` + merged MCP tools). The model is resolved by precedence —
  `block.metadata.deepnote_agent_model` (when not `'auto'`) → `OPENAI_MODEL` env → the literal
  `'gpt-5'` fallback (`agent-handler.ts:152-155`) — and `maxTurns = 10` (line 156, applied via
  `stepCountIs(maxTurns)` at 208). `ExecutionEngine` enforces `OPENAI_API_KEY` for agent blocks
  (`execution-engine.ts:243`) and reports per-block success and failure via `onBlockDone`.
  **Test coverage is more nuanced than it first looks:** the extracted helpers
  (`resolveEnvVars`, `serializeNotebookContext`, `buildSystemPrompt`, `mergeMcpConfigs`, and the
  rest) have their own unit tests in `agent-handler.test.ts` (498 lines), and engine-level
  integration is well tested. The narrow, specific gap is `executeAgentBlock` _itself_ — the
  `agent.stream` tool-loop at `agent-handler.ts:200-213` — which no test invokes:
  `execution-engine.test.ts:57` stubs it (`executeAgentBlock: mockExecuteAgentBlock`) and
  `agent-handler.test.ts` exercises every _other_ export but never calls it. The published
  `@deepnote/runtime-core` is `0.3.0` with **no CHANGELOG**; `executeAgentBlock` and the helpers
  are exported from `index.ts` today but post-date that tag, so they are not in a published
  release.

**Ecosystem note.** The Deepnote VS Code extension — the stated reuse consumer of the
runtime-core helpers and the env "producer" for #288 — lives in a **separate repository**
(`github.com/deepnote/vscode-deepnote`, referenced in `docs/local-setup.md`). It is not in
this monorepo, which bounds what can be built and verified here.

## User Segments

### AI coding agents (and the developers driving them)

- **Who**: Developers using Cursor/Claude/VS Code who let an agent author, edit, and run
  Deepnote notebooks through the MCP server.
- **Current pain**: Agent-run notebooks fail opaquely when the MCP server falls back to bare
  `python`; generated notebooks can look wrong after Cloud import.
- **Desired outcome**: Runs use a capable environment (or fail with a clear fix); generated
  notebooks render cleanly.
- **Priority**: Primary.

### Deepnote VS Code extension users

- **Who**: Developers who selected a Python kernel in the extension and then use MCP-driven
  execution against the same project.
- **Current pain**: The MCP server ignores their selected environment.
- **Desired outcome**: MCP execution honors the editor-selected interpreter once the extension
  can publish it.
- **Priority**: Secondary (full outcome depends on the external extension repo).

### Downstream consumers of `@deepnote/runtime-core`

- **Who**: The VS Code extension and future embedders that reuse the execution engine and
  agent helpers.
- **Current pain**: Agent helpers are unreleased (latest tag `0.3.0` predates them); no
  CHANGELOG; the live tool-loop is uncovered.
- **Desired outcome**: A released, documented, test-covered surface they can pin.
- **Priority**: Secondary.

## Goals & Non-Goals

### Goals

- An agent running a notebook through MCP executes in a real, capable Python environment — the
  one the user selected — resolved by the **same logic the CLI already uses**, or fails with a
  clear, actionable message when the resolved interpreter can't run Deepnote.
- The MCP server and CLI never diverge on which interpreter they pick.
- The runtime agent-block path is trustworthy: its live LLM tool-loop has automated coverage,
  its model/turn defaults are intentional and documented, and its reusable helpers are
  release-ready (versioned + CHANGELOG) for downstream consumers.
- Each remaining s6 node lands in an **honest** state: in-repo work done and verified;
  outcomes that physically depend on closed Cloud, the external extension repo, a live API
  key, or a maintainer publish are **explicitly recorded as external residuals**, never
  silently claimed.

### Non-Goals

- **Changing Deepnote Cloud's importer / row-grouping renderer** — closed-source, not in this
  repo. The only in-repo lever (unique `blockGroup` per block) is already merged.
- **Building or modifying the VS Code extension** — it lives in `vscode-deepnote`, a separate
  repo. The env "producer" side and Cursor end-to-end verification happen there.
- **Live, OpenAI-keyed agent-block execution in CI** — requires a secret key CI does not have;
  in-repo coverage uses recorded/fixtured or explicitly-skipped integration tests.
- **Publishing `@deepnote/runtime-core` to npm** — a maintainer-only release action. This PRD
  makes the package release-_ready_; it does not perform the publish.
- **Closing upstream issues #288/#289** — this account has read-only access to
  `deepnote/deepnote`.
- **Provider-agnostic agent blocks** — the current implementation is OpenAI-based; a provider
  abstraction is a separate initiative, revisitable when a second provider is required.
- **New MCP tools or changes to the tool surface** — this is reliability work on existing
  tools, not capability expansion.

## User Experience

### Scenario 1: Agent runs a notebook via MCP without specifying an interpreter

**Today.** The agent calls `deepnote_run` with no `pythonPath`. The MCP server sets
`pythonEnv: 'python'` (execution.ts:394) and launches whatever `python` is first on its PATH —
typically a bare system interpreter with no `deepnote-toolkit`. Execution fails partway through
with an opaque import/runtime error.

**Desired.** The MCP server resolves the interpreter through an explicit order —
`pythonPath` arg → a shared editor-published channel (env var and/or project config) →
`detectDefaultPython()` — reusing `resolvePythonExecutable`. If resolution lands on a bare
system interpreter (`isBareSystemPython` is true) lacking the toolkit, the server returns a
clear hint, e.g.:

```
Resolved Python to /usr/bin/python (system interpreter), which does not have
deepnote-toolkit installed. Set DEEPNOTE_PYTHON (or pass pythonPath) to a venv created with
`pip install "deepnote-toolkit[server]"`. See docs/local-setup.md.
```

### Scenario 2: Agent runs a notebook and the editor has published an interpreter

The user selected a Python kernel in their editor, which publishes it through the agreed channel
(env var and/or project config — decided by the Phase 1 ADR). The agent calls `deepnote_run`
with no `pythonPath`. The MCP server resolves the interpreter from that channel (ahead of
`detectDefaultPython()`), `buildPythonEnv` activates the venv for the spawned kernel, and the run
executes with `deepnote-toolkit` and the user's integrations available — no manual `pythonPath`,
no bare-python fallback. **External residual:** the _publishing_ step is done by the VS Code
extension in the external `vscode-deepnote` repo; this repo can verify it _reads_ the channel
correctly (unit tests) but cannot verify that a real editor populates it.

### Scenario 3: Agent authors a multi-block notebook, user imports it to Cloud

The agent calls `add_notebook` with several blocks. Each block already receives a unique
`blockGroup` (writing.ts:412), so blocks are not collapsed into a single group on the way out.
**Note:** whether the imported notebook _renders_ one-row-per-block is decided by Deepnote
Cloud's closed-source importer and **cannot be verified in this repo** — this is documented as
an external residual, not asserted as fixed.

### Scenario 4: Developer relies on the runtime agent-block executor

A developer adds an agent block and runs it. The `executeAgentBlock` tool-loop is exercised by
at least one automated test (recorded/fixtured provider, or an explicitly-skipped integration
test with a documented manual procedure), so a regression in the stream/tool-call mapping is
caught. The `@deepnote/runtime-core` package is versioned past `0.3.0` with a CHANGELOG entry
describing the agent helpers, so the VS Code extension can pin a real release.

### Error & Edge Cases

- **Missing `OPENAI_API_KEY`**: already handled — `execution-engine.ts:243` throws a clear
  message. Preserved and covered by test.
- **Resolved interpreter missing/invalid**: surfaced as an actionable hint (Scenario 1), not a
  deep stack trace.
- **No editor-published environment present**: falls back to `detectDefaultPython()` exactly
  like the CLI, so behavior is predictable and consistent across tools.

## Success Criteria

| Criterion                          | Measurement                                                                                                                                                                              | Target                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --- | ----------------- |
| MCP↔CLI env-resolution parity     | MCP `deepnote_run` resolves via the same `resolvePythonExecutable`/`detectDefaultPython` chain as `cli/run.ts:296`, plus a shared editor-published channel                               | Unit tests assert resolution order; no remaining bare `pythonPath                    |     | 'python'` default |
| Bare-python / toolkit-missing hint | When resolution lands on `isBareSystemPython`, MCP returns an actionable message                                                                                                         | Covered by a unit test                                                               |
| Agent tool-loop coverage           | `executeAgentBlock`'s real stream/tool-loop is exercised (recorded/fixtured) or an explicitly-skipped integration test exists with a documented manual run                               | At least one such test; engine tests no longer the _only_ coverage                   |
| runtime-core release readiness     | Version bumped past `0.3.0`; CHANGELOG documents the agent refactor + helper exports                                                                                                     | `package.json` version changed + `CHANGELOG.md` present (publish itself is external) |
| Defaults reconciled                | the `'gpt-5'` final-fallback model (precedence: `deepnote_agent_model` metadata → `OPENAI_MODEL` → `'gpt-5'`) and `maxTurns = 10` are confirmed intentional (sourced comment) or changed | Verified in code review                                                              |
| #289 node honesty                  | Roadmap node re-scoped to the OSS-controllable fix (unique `blockGroup`, merged) with the Cloud-import residual annotated                                                                | Roadmap node content reflects it; no claim that Cloud render is verified             |

## Scope & Boundaries

### In Scope

- MCP server env-resolution chain in `packages/mcp/src/tools/execution.ts`, reusing
  runtime-core's `resolvePythonExecutable`/`detectDefaultPython`, with an explicit shared
  channel (env var and/or project config) so an editor can publish its selected interpreter.
- A bare-system-python / toolkit-missing hint using `isBareSystemPython`.
- Parity so MCP and CLI choose the same interpreter.
- Runtime-agent-execution in-repo hardening: live tool-loop test coverage, version bump +
  CHANGELOG, model/turn defaults reconciliation.
- #289 roadmap re-scope/annotation (no new code — the fix is merged).
- Documentation updates: `packages/mcp/README.md`, `docs/local-setup.md`.

### Out of Scope

- Deepnote Cloud importer behavior — closed-source; revisit only with Cloud-side access.
- The VS Code extension changes (env producer) and Cursor E2E — external `vscode-deepnote` repo.
- npm publish of `@deepnote/runtime-core` — maintainer-only; revisit at release time.
- Upstream issue closure (#288/#289) — read-only access.
- Provider-agnostic agent blocks — separate initiative.

### Future Considerations

- Sharing integration credentials (not just the interpreter) across editor and MCP — blocked
  on VS Code SecretStorage semantics; design the env channel so it can extend to this later.
- A formal `.deepnote` project-config schema if the env channel chooses a config file.

## Delivery Phases

### Phase 1: Reliable MCP execution environment (#288 consumer side)

**What ships:** MCP env-resolution chain (arg → editor-published channel → autodetect) reusing
runtime-core helpers; the bare-python/toolkit-missing hint; MCP↔CLI parity.

**Launch criteria (in-repo, verifiable here):** resolution chain (arg → editor-published
channel → autodetect) reusing `resolvePythonExecutable`/`buildPythonEnv`; bare-python /
toolkit-missing hint; MCP↔CLI parity; unit tests for resolution order and the hint; no bare
`'python'` default remaining; docs updated.

**External residual (not verifiable here):** an actual editor populating the shared channel —
the producer lives in `vscode-deepnote`. Treat end-to-end "MCP honors the editor-selected
interpreter" like the #289 Cloud residual: documented, not asserted. The headline value that
ships in-repo is the resolution chain + hint + parity, which stand alone even if no producer
ever populates the channel.

**Decisions needed:** an **ADR** fixing the interop contract — env var (`DEEPNOTE_PYTHON`) vs
project config file vs both — **must precede coding**, since it defines a public channel the
external extension will target.

**Dependencies:** runtime-core `python-env` helpers (already present).

### Phase 2: Trustworthy runtime agent-block execution

**What ships:** automated coverage for the `executeAgentBlock` tool-loop (recorded/fixtured or
documented skipped-integration); version bump + CHANGELOG for `@deepnote/runtime-core`;
reconciliation of the `'gpt-5'` / `maxTurns = 10` defaults.

**Launch criteria:** tool-loop test present and green; CHANGELOG + version reflect the agent
helpers; defaults confirmed or changed with rationale.

**Decisions needed:** a **design doc** on the test strategy (recorded fixtures vs skipped
integration); a status decision on `s5/runtime-core-package` (all four children are done while
the story sits `in_progress` under epic #162).

**Dependencies:** none external for the in-repo slice; the s5 ExecutionEngine is present.

### Phase 3: Honest #289 re-scope + documentation

**What ships:** roadmap node re-scoped to the merged OSS fix with the Cloud-import residual
annotated; README/docs note on block-group behavior. **No code.**

**Launch criteria:** roadmap node and docs reflect the true state; no assertion of Cloud-side
verification.

**Decisions needed:** none.

**Dependencies:** none.

## Technical Considerations

- The MCP server today has **no configuration or discovery mechanism** (`server.ts` reads only
  `DEEPNOTE_WORKSPACE`). Adding env resolution introduces the project's first MCP-side
  interpreter channel — the contract for it is an architectural decision (Phase 1 ADR).
- The CLI **already** resolves correctly (`run.ts:296`); MCP should converge on the same
  shared helpers so the two never diverge.
- Agent blocks are **OpenAI-based** (`@ai-sdk/openai`); `OPENAI_API_KEY` is enforced at
  `execution-engine.ts:243`. CI cannot run the live path, so in-repo coverage must be
  recorded/fixtured or explicitly skipped — and that limitation must be documented, not hidden.
- `@deepnote/runtime-core` is consumed by the external VS Code extension; the extracted agent
  helpers must be **released** (version + CHANGELOG here; publish elsewhere) for downstream
  pinning.
- **Fork discipline:** code changes land on `feat/*` branches cut from `upstream/main` (no
  `.gitban`/`.claude`/`docs/prds`/`docs/adr` in those trees); lifecycle docs and board live on
  `workspace`. Board mutations and code edits stay in separate commits.

## Risks & Open Questions

### Risks

| Risk                                                                                              | Impact                                       | Likelihood                  | Mitigation                                                                   |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------- |
| Cloud keys row layout off a metadata field (e.g. `deepnote_app_block_group_id`), not `blockGroup` | #289 "fix" may not fully resolve the symptom | Unknown (unverifiable here) | Do not assert sufficiency; document residual + open question for maintainers |
| Interop channel chosen here doesn't match what the extension can publish                          | Env sharing never actually connects          | Medium                      | ADR + flag the cross-repo contract to maintainers before coding              |
| Recorded fixtures for the tool-loop drift from the real OpenAI API                                | False confidence                             | Medium                      | Keep a documented manual/integration procedure alongside fixtures            |
| Reconciling defaults changes agent behavior                                                       | Behavioral regression                        | Low                         | Treat as review-gated; prefer documenting intent over changing values        |

### Open Questions

- Which interop channel for the selected interpreter — `DEEPNOTE_PYTHON` env var, a project
  config file, or both? (Resolved by the Phase 1 ADR; affects the extension contract.)
- Is `'gpt-5'` the intended _final-fallback_ model (behind `deepnote_agent_model` metadata and
  `OPENAI_MODEL`) and `maxTurns = 10` the intended cap, or PoC-era placeholders from #341?
  (Owner: Deepnote runtime maintainers.)
- Should `s5/runtime-core-package` be marked done (all children done) to formally clear the
  `runtime-agent-execution` dependency, or is it intentionally held under epic #162?
- Is a recorded/fixtured (unkeyed) tool-loop test an acceptable "done" bar, or is a real
  keyed integration run required before the node is considered complete?
- Who owns the corresponding change in `vscode-deepnote`, and is it scheduled?

## Related Documents

- Roadmap: `m1/s6` (this PRD's `docs_ref`), nodes `mcp-server/{block-group-handling,
shared-env-with-vscode}` and `agentic-notebooks/runtime-agent-execution`.
- Existing references (non-lifecycle): `packages/mcp/README.md`, `docs/deepnote-mcp.md`,
  `docs/deepnote-agent.md`, `docs/vscode-extension.md`, `docs/local-setup.md`,
  `skills/deepnote/references/blocks-agent.md`.
- GitHub: issues #288 (shared env) and #289 (blockGroup layout) — both OPEN upstream; PRs #310
  (merged blockGroup fix), #342/#369/#370 (runtime agent execution).
- ADRs: none yet. Phase 1 requires a new ADR (interop contract for the shared interpreter
  channel); see `docs/adr/` once written.

---

## Revision History

| Date       | Author  | Notes                                                                                                                                                                                                                                                                                                                                         |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-10 | CAMERON | Initial draft                                                                                                                                                                                                                                                                                                                                 |
| 2026-06-10 | CAMERON | Revised per adversarial review (prd-reviewer): precise agent-block test-coverage picture — helpers covered, only `executeAgentBlock` loop uncovered (B1); model precedence chain (S1); added success-path UX scenario (S2); split Phase 1 into in-repo deliverable vs external residual (S3); minor citation + `buildPythonEnv` fixes (M1/M2) |
