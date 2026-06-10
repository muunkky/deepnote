# ADR-001: Resolve the Python interpreter via one shared chain, with `DEEPNOTE_PYTHON` as the editor-publish contract

> **Status**: Accepted | **Date**: 2026-06-10 | **Deciders**: CAMERON (approved via adversarial adr-reviewer gate)

## Context

Deepnote notebooks are executed by `@deepnote/runtime-core`'s `ExecutionEngine`, which is
consumed by two in-repo callers — the CLI (`@deepnote/cli`) and the MCP server
(`@deepnote/mcp`) — and, out of repo, by the Deepnote VS Code extension. Which Python
interpreter the engine runs against is decided by each caller _before_ it constructs the engine.
Today those callers disagree:

- The **CLI** resolves correctly: `packages/cli/src/commands/run.ts:296` does
  `const pythonEnv = await resolvePythonExecutable(options.python ?? detectDefaultPython())` —
  an explicit `--python` flag, else autodetection.
- The **MCP server** does **not**: `packages/mcp/src/tools/execution.ts:393` and `:558` both
  construct `new ExecutionEngine({ pythonEnv: pythonPath || 'python', … })`. When the agent
  calls `deepnote_run` without a `pythonPath` (the common case), the engine launches whatever
  bare `python` is first on the server process's `PATH` — typically a system interpreter with
  no `deepnote-toolkit` and none of the user's integrations. Execution then fails deep inside
  the run with an opaque error. The MCP server has no other discovery: `server.ts:31` reads only
  `process.env.DEEPNOTE_WORKSPACE`.

Two tensions are in play. **First**, two consumers of the same engine resolve interpreters by
different logic, so they can pick different interpreters for the same project — a latent
correctness and support problem independent of issue #288. **Second**, the user has _already
told their editor_ which interpreter to use (the VS Code extension prompts for and stores a
selected kernel), but there is no contract by which that selection reaches the MCP server. The
extension lives in a **separate repository** (`github.com/deepnote/vscode-deepnote`), so we
cannot change the "producer" side here; we can only define a contract it can adopt and build
the "consumer" side that honors it.

A relevant structural fact constrains the solution space: **MCP servers are launched by their
client** (Cursor, Claude Desktop, or the extension), and MCP clients already pass a
caller-controlled `env` block to the server process they spawn — the same host→server
configuration model used by LSP and DAP. Whatever contract we choose must let the in-repo
consumer ship and be tested on its own (the external producer may not exist yet), keep the CLI
and MCP convergent, and not over-commit to a mechanism we cannot iterate on across a repo
boundary.

The existing on-disk conventions (`packages/cli/src/constants.ts`) are `.env`
(`DEFAULT_ENV_FILE`, secrets) and `.deepnote.env.yaml` (`DEFAULT_INTEGRATIONS_FILE`,
integration credentials). Neither stores a selected interpreter path today.

## Decision

We will resolve the Python interpreter through **one shared resolution chain in
`@deepnote/runtime-core`**, used by both the CLI and the MCP server, with this precedence:

1. **Explicit caller argument** — CLI `--python`, MCP `deepnote_run` `pythonPath`. (Highest: a
   per-invocation arg is the most specific, deliberate signal, so it wins over the ambient host
   default. If a "live editor selection should override a stale passed arg" need ever appears,
   that is a revisit trigger — and would belong _within_ the env tier, not above the arg.)
2. **The `DEEPNOTE_PYTHON` environment variable** — the **public interop contract** by which an
   editor or host publishes the user-selected interpreter when it spawns the server or CLI.
3. **`detectDefaultPython()` autodetection** — the existing fallback (matches today's CLI).

The shared resolver's job is to **select the interpreter spec** via that precedence; it does
**not** itself build the spawn environment. Turning a spec into a concrete executable plus the
kernel's `PATH`/`VIRTUAL_ENV` already happens inside `ExecutionEngine` — `server-starter.ts:37,45`
calls `resolvePythonExecutable` then `buildPythonEnv` — so both callers get an identically-built
spawn environment for free simply by passing the selected spec as `RuntimeConfig.pythonEnv`.

`DEEPNOTE_PYTHON` carries the **same forms** the `--python` flag and MCP `pythonPath` already
accept — an executable path, a `bin/` directory, or a venv root — resolved by the existing
`resolvePythonExecutable`. The canonical value an editor publishes is an **executable path**
(VS Code's selected `python.defaultInterpreterPath`); defining this wire format now is the one
irreversible, cross-repo commitment in this ADR, so it is stated explicitly rather than left to
the design doc.

When resolution lands on a **bare system interpreter** (`isBareSystemPython` returns true) — no
override, no `DEEPNOTE_PYTHON`, and autodetection found only system `python` — the consumer
surfaces an **actionable hint** ("set `DEEPNOTE_PYTHON` or pass `pythonPath` to a venv with
`deepnote-toolkit[server]`") instead of failing opaquely mid-run.

We adopt a **single environment variable (`DEEPNOTE_PYTHON`)** as the contract now. A
project-local **config-file source is explicitly deferred** as a documented extension point in
the resolution chain (a future tier between the env var and autodetection), **not built** in
this decision.

This ADR decides the _contract and the shared-resolution principle_. The exact helper
signature, hint wording, and test plan belong to the design doc; the producer-side adoption in
`vscode-deepnote` is out of scope.

## Rationale

### Key Factors

1. **The MCP spawn model makes an env var the idiomatic, lowest-friction channel.** MCP clients
   and the extension already launch the server with a configurable `env` block, exactly as LSP/DAP
   hosts configure the servers they spawn. Publishing the interpreter as `DEEPNOTE_PYTHON`
   therefore costs the external producer essentially one line and requires no filesystem
   coordination, no new file format, and no write-permission assumptions. A contract the external
   team can adopt trivially is far more likely to actually get adopted.
2. **A single shared chain fixes the divergence structurally.** Part of the problem is that the
   CLI and MCP resolve interpreters by different code. Centralizing the chain in runtime-core —
   the package both already depend on — means they cannot drift apart again; convergence is
   enforced by construction, not by discipline.
3. **The consumer is independently shippable and honestly verifiable.** `DEEPNOTE_PYTHON` is a
   passive variable: if no producer sets it, the chain simply falls through to autodetection, so
   the in-repo consumer is correct and fully unit-testable on its own (arg > env > autodetect, plus
   the bare-python hint). This matters acutely here — the producer is in another repo we cannot
   change or test, so the contract must be valuable and provable from the consumer side alone.
4. **It is the least speculative option, and the decisive cost is external-producer adoption
   friction.** One env var is the minimum that turns the silent bare-`python` failure into capable
   execution or a clear hint. A config-file source could even reuse the existing local-only `.env`
   channel (already `.gitignore`d, already loaded by the CLI at `run.ts:294`), which largely
   neutralizes the commit/staleness objection — so the genuinely decisive factor is **adoption
   friction for the external producer**: the extension sets one spawn-env line versus writing and
   maintaining a file it must keep in sync. Deferring the config source (rather than rejecting it)
   keeps the door open without building speculative machinery.
5. **It extends cleanly to the future credential-sharing case.** A `DEEPNOTE_*` environment
   namespace can later carry integration hints alongside `DEEPNOTE_WORKSPACE` and `DEEPNOTE_PYTHON`
   without inventing a new mechanism — so we satisfy the "design for later credential sharing"
   constraint without committing to it now.

## Consequences

### Positive

- The common agent flow (`deepnote_run` with no `pythonPath`) runs in a capable environment when
  the host publishes `DEEPNOTE_PYTHON`, and otherwise fails with an actionable hint instead of an
  opaque deep error.
- CLI and MCP can no longer diverge on interpreter choice — they call the same resolver.
- The external `vscode-deepnote` producer can adopt the contract with a one-line `env` addition
  whenever it chooses; nothing here blocks on it.
- The decision is verifiable in-repo (the consumer chain + hint) without fabricating any
  externally-dependent outcome.

### Negative

- Environment variables are **ephemeral and per-process**: a `DEEPNOTE_PYTHON` set by a spawning
  editor does not persist to a separately, manually-launched server. _Acceptable_ — the editor sets
  it on each spawn, and humans running by hand use the explicit arg or rely on venv autodetection.
- A machine-specific interpreter path is **not shareable via git** through this channel. _Acceptable
  and intended_ — such a path should not be committed to a shared project file anyway; this is a
  reason the env var is a better fit than a committed config file for the primary case.
- **End-to-end "editor publishes → MCP consumes" cannot be verified in this repository**, because
  the producer is external. We can only verify the consumer reads and resolves `DEEPNOTE_PYTHON`
  correctly. This is a documented residual, **not** a claim of end-to-end completeness.

### Neutral

- Introduces the project's first env-var contract beyond `DEEPNOTE_WORKSPACE`, establishing a
  `DEEPNOTE_*` namespace precedent.
- Broadens runtime-core's public API: a shared spec-selection resolver **and** `isBareSystemPython`
  (today file-local, not re-exported by `index.ts:14`) are added to the package's public surface;
  both callers depend on the selector.

### Known consumers / adoption status

> _Factual adoption finding — does not change the Decision. Recorded from a static source review
> (spike `vxiipn`) of the public `deepnote/vscode-deepnote` repository at commit `923ec53`,
> cross-referenced against runtime-core's precedence contract._

- **The sole external `deepnote run` producer — the `vscode-deepnote` extension** (VS Code /
  Cursor / Windsurf) — **satisfies this ADR's contract structurally, but via the chain's
  `explicit` (highest-precedence) tier, not via `DEEPNOTE_PYTHON`.** It sets `DEEPNOTE_PYTHON`
  nowhere (0 occurrences in `src/`). Instead it manages its own venv with
  `deepnote-toolkit[server]` pre-installed and passes that absolute path as `pythonEnv` when it
  spawns the toolkit Jupyter server / CLI (`src/kernels/deepnote/deepnoteServerStarter.node.ts:272`
  — `pythonEnv: venvPath.fsPath`). `startServer` resolves `pythonEnv` directly and never consults
  `selectPythonSpec` / `DEEPNOTE_PYTHON`.
- Because that interpreter is always an explicit toolkit-bearing venv, `isBareSystemPython` is
  never true for extension users, so the opaque bare-`python` failure this ADR targets is
  **structurally unreachable** for them. (Note also: the extension spawns the toolkit Jupyter
  server and the `deepnote` CLI, **not** the in-repo MCP server.)
- **Implication:** `DEEPNOTE_PYTHON` currently has **zero external env-var adopters** — the one
  known producer does not need it. The env-var tier remains relevant for hosts that do **not**
  supply an explicit interpreter (e.g. an MCP client such as Cursor / Claude Desktop spawning the
  deepnote MCP server). This **strengthens** the Decision rather than weakening it: the consumer
  side is correct, and the env-var contract is unadopted-but-unneeded by the current producer
  precisely because that producer already wins at the higher `explicit` tier.

## Alternatives Considered

### Alternative 1: Read `DEEPNOTE_PYTHON` in the MCP server only (no shared chain)

**Description**: Patch `execution.ts:393/558` to read `process.env.DEEPNOTE_PYTHON` directly,
leaving the CLI's inline resolution untouched.

**Pros**:

- Smallest possible diff; solves the immediate MCP symptom.

**Cons**:

- Leaves the CLI and MCP resolving by different code — the divergence (Factor 2) persists, and a
  future change to one won't track the other.
- Duplicates the precedence logic in two places, inviting drift.

**Why not chosen**: This alternative shares the _same_ `DEEPNOTE_PYTHON` contract as the Decision
and differs only in _locality_ (MCP-local vs. a shared chain) — so the real tradeoff is "fix the
CLI/MCP divergence now vs. later." It fixes the symptom but not the underlying divergence;
centralizing costs little more now and removes a whole class of future inconsistency.

### Alternative 2: Project-local config file (`.deepnote.env.yaml` `python:` key or `.deepnote/config.json`)

**Description**: The editor writes the selected interpreter into a project-local file that the
CLI, MCP, and editor all read.

**Pros**:

- Persists across sessions and is human-readable/editable.
- One artifact serves all consumers, including manually-launched ones.

**Cons**:

- Requires the external producer to _write a file_ (more invasive to adopt than setting an env
  var on spawn) and raises write-permission and concurrency questions.
- A machine-specific interpreter path doesn't belong in a committed project file — it needs
  `.gitignore` handling and is staleness-prone (path moves when a venv is recreated).
- More mechanism than the primary spawn-based case requires.

**Why not chosen**: Higher adoption and maintenance cost for benefit the spawn-env channel
already delivers for the main use case. Retained as a **deferred extension point** in the chain
if a concrete non-spawn, persistence-needing use case appears.

### Alternative 3: Live handshake / IPC between MCP and the editor

**Description**: The MCP server queries the editor at runtime for the current interpreter via a
bidirectional channel.

**Pros**:

- Always reflects the live editor selection, even mid-session changes.

**Cons**:

- A bespoke cross-repo protocol; couples the MCP server to an editor that may not be present
  (CLI/CI/standalone use).
- Disproportionate complexity for "tell me which interpreter."

**Why not chosen**: Over-engineered for the need and hostile to the standalone/CLI cases.

### Alternative 4: Do nothing (keep bare `'python'`, rely on the `pythonPath` arg)

**Description**: Status quo; agents must pass `pythonPath` explicitly every call.

**Pros**:

- Zero work.

**Cons**:

- The silent-failure bug persists for the overwhelmingly common no-arg agent call; the editor's
  known selection stays unused.

**Why not chosen**: This is the problem statement, not a solution.

## Implementation Notes

- Add a shared _spec-selection_ resolver to `@deepnote/runtime-core` (e.g.
  `selectPythonSpec({ explicit })`) returning `explicit ?? process.env.DEEPNOTE_PYTHON ??
detectDefaultPython()` — a spec string, **not** a built env. The `ExecutionEngine` continues to
  turn that spec into an executable + spawn env internally (`server-starter.ts:37,45`); the helper
  does not call `buildPythonEnv`. Export the selector from `index.ts`.
- **Also re-export `isBareSystemPython` from `index.ts`** — today `index.ts:14` re-exports only
  `buildPythonEnv`/`detectDefaultPython`/`resolvePythonExecutable`, so the MCP consumer cannot
  reach `isBareSystemPython` to surface the hint. Exposing it is part of this work.
- MCP: replace `pythonEnv: pythonPath || 'python'` at `execution.ts:393` and `:558` with the
  shared resolver; surface the `isBareSystemPython` hint at the tool boundary.
- CLI: switch `run.ts:296` to the same shared resolver so it also honors `DEEPNOTE_PYTHON`.
- Document `DEEPNOTE_PYTHON` in `packages/mcp/README.md` and `docs/local-setup.md`.
- The design doc specifies the exact signature, hint text, and unit-test matrix. Producer-side
  adoption in `vscode-deepnote` is tracked as an external residual, not built here.

## Validation

- **In-repo, must hold:** unit tests assert the precedence `arg > DEEPNOTE_PYTHON > autodetect`
  for _both_ the CLI and MCP resolvers; a test asserts the bare-system-python hint fires when
  `isBareSystemPython` is true and no override/env is present; no `pythonEnv: … || 'python'`
  literal remains in `execution.ts`.
- **Revisit if:** a concrete use case needs project-persistent interpreter selection (then
  promote the deferred config-file tier); or the extension team determines it cannot set an env
  var on spawn and needs a file channel instead (then re-decide the primary channel).
- **Honest limit:** the producer→consumer end-to-end path is **not** validated in this repo; only
  the consumer chain and hint are. Closing that loop requires a change in `vscode-deepnote` and a
  manual run in Cursor.

## Related Decisions

- None yet (this is NOM-001, the first ADR in the repo).

## References

- `docs/prds/PRD-001-ai-agent-notebook-authoring.md` — Phase 1 names this ADR a pre-coding blocker.
- Roadmap `m1/s6/mcp-server/shared-env-with-vscode`; GitHub issue #288.
- MCP server launch/`env` configuration model (host spawns server with a configurable environment).
- VS Code Python interpreter selection (`python.defaultInterpreterPath` — an executable path, the
  canonical `DEEPNOTE_PYTHON` value per the Decision's wire-format note); Python Environments API;
  LSP/DAP host→server configuration — prior art for host-publishes-config-to-spawned-server.
- `pyenv` `.python-version`, `direnv` `.envrc`, Jupyter kernelspec — config-file precedents
  contrasted in Alternative 2.

---

## Revision History

| Date       | Status   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-10 | Proposed | Initial proposal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-06-10 | Proposed | Revised per adversarial review (adr-reviewer): shared resolver selects the interpreter _spec_ not the built env, which the engine builds via `server-starter.ts` (B2); specified the `DEEPNOTE_PYTHON` wire format — same forms as `--python`, canonical = executable path (B3); flagged that `isBareSystemPython` must be added to `index.ts` public exports (B1); sharpened config-file deferral to rest on external-producer adoption friction, noting `.env` reuse (S2); stated precedence rationale (S3); clarified Alt 1 shares the contract (S1) |
| 2026-06-10 | Accepted | Promoted NOM-001 → ADR-001 after adversarial adr-reviewer returned APPROVE-as-ADR-001 (all findings resolved, code-verified, no new blocking issues)                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-06-10 | Accepted | Added "Known consumers / adoption status" note under Consequences (factual finding from spike `vxiipn`, static review of `deepnote/vscode-deepnote` @ `923ec53`): the sole external `deepnote run` producer satisfies the contract via the `explicit` tier (passes an explicit toolkit venv as `pythonEnv`), sets `DEEPNOTE_PYTHON` nowhere, and never hits `isBareSystemPython` — so `DEEPNOTE_PYTHON` has zero external adopters but the env-var tier stays relevant for hosts without an explicit interpreter. Decision unchanged.                   |
