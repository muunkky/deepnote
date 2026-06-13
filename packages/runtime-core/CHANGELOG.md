# Changelog

All notable changes to `@deepnote/runtime-core` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0]

A minor (additive) release adding non-Python kernel selection to the runtime. It adds
new public exports and two optional `RuntimeConfig` fields, and widens
`KernelClient.connect` with an optional parameter — no existing exported signature
changes.

### Added

#### Alternative-language kernel selection (PRD-002 Phase 1)

Powers the new `deepnote run --kernel <name>` CLI flag: a notebook can now run on any
Jupyter kernel registered with the `deepnote-toolkit` server (e.g. `bash`, `ir`,
`ijulia`), not just `python3`.

- `selectKernelName({ explicit, declared })` (plus `SelectKernelNameOptions` and
  `DEFAULT_KERNEL_NAME = 'python3'`) — a pure precedence resolver for the kernel name:
  explicit `--kernel` flag > notebook-declared language (Phase 2, reserved) > the
  `python3` default. Resolved on a channel independent of `DEEPNOTE_PYTHON` interpreter
  selection.
- `isNonPythonKernel(kernelName, language?)` — predicate used to gate Python-only
  behaviour (value-add blocks, the reactivity AST analyzer) off on non-Python kernels.
- `KernelClient.connect(serverUrl, kernelName?)` — now accepts an optional kernel name
  (defaults to `python3`, so existing callers are unchanged), replacing the previously
  hardcoded `python3`. Before connecting it pre-flights `GET /api/kernelspecs` and, when
  the requested kernel is not registered, throws a typed `KernelNotRegisteredError`
  listing the available kernels — instead of surfacing the server's opaque HTTP 500.
- `KernelNotRegisteredError`, `KernelLaunchError`, `KernelDiedError` (plus the
  `KernelFailureCategory` union and the `KernelspecSummary` type) — typed errors that let
  callers distinguish missing-kernelspec, launch-failure, and mid-run kernel-death from
  ordinary in-block errors.
- `RuntimeConfig.kernelName?` and `RuntimeConfig.kernelStartupTimeoutMs?` — optional
  fields that thread the selected kernel name and a configurable kernel startup/idle
  timeout from configuration through `ExecutionEngine` into `KernelClient.connect`.

Existing Python notebooks behave identically: every new surface defaults to `python3`.

## [0.5.0]

A minor (additive) release that adds one new public export and changes no existing
exported signature.

### Added

#### Public export — shared bare-system-python hint

- `selectPythonSpecWithHint({ explicit, argLabel })` — selects the Python interpreter
  spec via `selectPythonSpec` and attaches an actionable `hint` when resolution lands on
  a bare system interpreter (`isBareSystemPython`) with no real (non-blank) override
  (`explicit` argument or `DEEPNOTE_PYTHON`). `argLabel` parameterises the caller-surface
  noun embedded in the hint (`--python` for the CLI, `pythonPath` for the MCP tool).

  This centralises the ADR-001 bare-system-python warning that was previously copy-pasted
  into the CLI (`deepnote run`) and MCP (`deepnote_run`) consumers, so the two can no
  longer diverge on hint behaviour. Both consumers now call this helper; the prior inline
  resolvers (CLI `resolvePythonSpecWithHint`, MCP `resolvePythonEnv`'s hint logic) were
  removed.

## [0.4.0]

This is the first published release that surfaces the agent-block execution path
and a shared Python-interpreter resolver as public package exports. The bump from
`0.3.0` is a minor (additive) release: it adds new public surface from
`@deepnote/runtime-core` and changes no existing exported signatures.

### Added

#### Public exports — agent-block execution

The runtime agent-block executor was refactored so the agent path can be reused
outside the CLI (e.g. a VS Code extension), and its primary entry points are now
re-exported from the package root (`@deepnote/runtime-core`):

- `executeAgentBlock(block, context)` — runs an agent block's LLM tool-loop and
  streams `AgentStreamEvent`s, returning an `AgentBlockResult`.
- `serializeNotebookContext(...)` — serializes a notebook into the context the
  agent receives.
- `serializeNotebookContextFromBlocks(...)` — the block-list variant of the above.
- `createBlocksWithAttachedOutputsFromCollectedOutputs(...)` — reattaches
  collected execution outputs to their blocks.

Accompanying public types are also exported: `AgentBlockContext`,
`AgentBlockResult`, and `AgentStreamEvent`.

#### Public exports — Python interpreter resolution

Shared helpers for selecting and classifying a Python interpreter spec, used by
the MCP server and CLI so interpreter-resolution precedence stays consistent
across consumers (see `docs/adr/ADR-001-shared-python-interpreter-resolution.md`):

- `selectPythonSpec({ explicit })` — resolves the interpreter spec with
  `explicit` argument > `DEEPNOTE_PYTHON` env var precedence.
- `isBareSystemPython(pythonPath)` — classifies a spec as a bare system Python
  (e.g. `python`, `python3`, `python3.11`) versus an explicit path.

### Internal (not part of the public package entry)

The agent-handler refactor also produced these module-level exports in
`src/agent-handler.ts`. They are exported for in-package use and unit testing and
are **not** re-exported from the package root, so they are not part of the public
`@deepnote/runtime-core` API surface and may change without a major bump:

- `resolveEnvVars(env)`
- `mergeMcpConfigs(projectServers, blockServers)`
- `buildSystemPrompt(...)`

### Tests

- Added direct coverage for the `executeAgentBlock` LLM tool-loop against a
  recorded fixture provider (no live `OPENAI_API_KEY` required in CI), asserting
  the `fullStream` event → tool-call mapping for `add_code_block` /
  `add_markdown_block`, plus the model-precedence and `maxTurns` defaults.

### Notes

- Publishing to npm is intentionally **not** performed as part of this change;
  it remains a maintainer-only step.
