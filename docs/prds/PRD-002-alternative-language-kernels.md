# PRD-002: Run alternative-language Jupyter kernels in the OSS notebook runtime

> **Status**: Draft | **Date**: 2026-06-11 | **Author**: muunkky
> **Roadmap**: m2/s5/alternative-kernels

## Problem Statement

A data scientist who keeps a Julia or R notebook in the `.deepnote` format wants to run it with
the Deepnote CLI the same way a Python notebook runs today — `deepnote run notebook.deepnote` —
and get cell outputs back. Today they cannot: the OSS runtime is hard-wired to Python end to
end. The kernel name is the literal `'python3'` (`packages/runtime-core/src/kernel-client.ts:78`),
every executable block is compiled to a Python string (`packages/blocks/src/python-code.ts:29`,
called unconditionally at `packages/runtime-core/src/execution-engine.ts:375`), and there is no
`--kernel` or `--language` flag anywhere in the CLI — `--python` is defined at
`packages/cli/src/cli.ts:274`, but no kernel/language selector exists. A user with a non-Python
`.deepnote` notebook has no path to execute it, and the format itself has no place to even record
which language a code block is written in. The same gap also bites on import: `deepnote run`
auto-converts an `.ipynb` / `.py` / `.qmd` file into `.deepnote` in memory before executing it
(`packages/cli/src/commands/run.ts:247-249,271` via `resolveAndConvertToDeepnote`), and a
Julia/R `.ipynb` carries its language natively in `kernelspec` / `language_info` — but the
Jupyter importer does not read those fields, so an imported non-Python notebook silently lands as
Python. (Note: the primary single-language whole-notebook scenario is _not_ affected by
reactivity. Whole-notebook `deepnote run notebook.deepnote` executes blocks in `sortingKey` order
and never invokes the Python-AST analyzer — that analyzer fires only on the `--block` / dag /
analyze / lint paths, gated by `if (!options.block)` at `packages/cli/src/commands/run.ts:444`. So
the `ast.parse()` crash exposure is confined to those non-default paths, not the headline run.)

## Background & Context

**Why now.** Upstream epic #162, "Make Deepnote a first-class notebook runtime," is OPEN and
explicitly calls for **multi-language execution (Python, JavaScript, R, Julia)** that runs
anywhere — local, VS Code, CLI, CI/CD, WASM/browser, remote containers. Community issue #154,
"Feature Scope: Alternative Language Kernels," is a concrete user asking whether Julia and other
Jupyter kernels work with the Deepnote format. The recently-accepted ADR-001 (shared Python
interpreter resolution) just hardened the _Python_ execution seam — the CLI and MCP now resolve
one interpreter through one chain. That work makes the language assumption baked into the runtime
the next visible limit: the resolution problem for Python is solved, but the runtime can only
ever resolve _a Python_. This is the right moment to define what "multi-kernel" means as a
product before any architecture is committed, because the kernel abstraction touches the exact
seam ADR-001 just stabilized.

**Current state (verified against the codebase).** Deepnote's OSS execution path is Python-only,
but the _wire protocol underneath it is already standard Jupyter_ — which is the opening this PRD
builds on:

- **Transport is standard Jupyter; only the kernel name is Python.** `KernelClient.connect()`
  uses `@jupyterlab/services` (`ServerConnection`, `KernelManager`, `SessionManager`) and starts
  a session with `kernel: { name: 'python3' }` hardcoded — `connect()` takes no kernel parameter
  (`packages/runtime-core/src/kernel-client.ts:55,74-79`). The transport is language-agnostic;
  the kernel selection is not.
- **The server is a bespoke Python package, not a vanilla Jupyter launch.**
  `ExecutionEngine.start()` → `startServer()` spawns `python -m deepnote_toolkit server`
  (`packages/runtime-core/src/server-starter.ts:33,50-58`). `startServer()` / `ServerOptions`
  take no kernel or language field. `deepnote-toolkit` is a Python package that manages Jupyter /
  Streamlit / LSP servers — it is **not itself a kernel**.
- **Every block compiles to Python.** `createPythonCode(block)` is a single dispatcher with no
  language parameter (`packages/blocks/src/python-code.ts:29`), called unconditionally by the
  engine (`execution-engine.ts:375`). It throws `UnsupportedBlockTypeError` for unknown block
  types (`python-code.ts:90`). Variable injection emits Python literals via `toPythonLiteral()`
  (`execution-engine.ts:462-486`).
- **The differentiating blocks are Python-RPC into the toolkit.** SQL blocks emit
  `_dntk.execute_sql()` (`packages/blocks/src/blocks/sql-blocks.ts`), visualization blocks emit
  `_dntk.DeepnoteChart(...)` (`visualization-blocks.ts`), DataFrame formatting calls
  `_dntk.dataframe_utils.configure_dataframe_formatter()` (`data-frame.ts`), input blocks emit
  Python variable assignments (`input-blocks.ts`), and agent blocks generate and inject Python
  (`packages/runtime-core/src/agent-handler.ts`). These are Deepnote's value-add, and they are
  Python all the way down.
- **The format has no language field in its core schema.** `codeBlockSchema` is `type:
z.literal('code')` plus optional content and executable metadata — no `language` property
  (`packages/blocks/src/deepnote-file/deepnote-file-schema.ts:169-174`); same for
  `sqlBlockSchema` (`:176-189`). Metadata schemas use `.passthrough()` (`:44-45`), so additive
  fields survive round-trips. A `language` field exists _only_ in the conversion layer:
  Quarto→Deepnote writes `metadata.language` **only for non-Python cells** — the write is guarded
  by `cell.language && cell.language !== 'python'`
  (`packages/convert/src/quarto-to-deepnote.ts:473-474`), and Deepnote→Quarto reads
  `cell.language || 'python'` (`deepnote-to-quarto.ts:99`). So Python is never recorded
  explicitly anywhere; it is purely the read-side default. The Jupyter importer does **not**
  carry language at all: `jupyter-to-deepnote.ts` does not read `kernelspec` / `language_info`
  and only restores Deepnote roundtrip metadata, so an imported non-Python notebook loses its
  language. The project-level `environmentSchema` carries `python.version` / `python.environment`
  only — no language or kernel field (`:493-506`).
- **Reactivity is Python-AST-coupled, but only on non-default paths.** Dependency analysis spawns
  a Python subprocess running `packages/reactivity/src/scripts/ast-analyzer.py`, which parses block
  content with `ast.parse` (`ast-analyzer.py:137`) and extracts SQL variables with Python `jinja2`
  (`ast-analyzer.py:7`). A non-Python code block fed to it would fail at `ast.parse()` with
  `AstAnalyzerInternalError`. Critically, the whole-notebook `deepnote run notebook.deepnote` path
  never calls the analyzer: `getUpstreamBlocks` / `getBlockDependencies` fire only inside the
  `if (!options.block)` gate at `run.ts:444` (the `--block` path, `run.ts:459`) and on the
  dag/analyze/lint validation path (`run.ts:793`); whole-notebook execute just runs blocks in
  `sortingKey` order (`execution-engine.ts:375`). So the crash exposure is confined to the
  `--block` / dag / analyze / lint paths, not the primary single-language scenario.
- **Kernel failures are undifferentiated today.** `kernel-client.ts:82-120` throws only generic
  errors — `new Error('Failed to start kernel')`, `'Kernel is dead'`, and a timeout error. There
  is no distinction between "kernelspec not registered," "kernel registered but failed to
  launch," and "kernel died mid-run," and no machine-readable failure classification for headless
  callers. Concretely, the CLI has exactly **three** exit codes today — `Success=0`, `Error=1`,
  `InvalidUsage=2` (`packages/cli/src/exit-codes.ts:11-19`) — and the machine-readable `RunResult`
  carries only a boolean `success` (`run.ts:156-157`); `--output json` emits `{ success, error }`
  with no failure-category field. There is also a latent collision: a missing kernelspec would
  naturally map to `InvalidUsage=2` (bad argument) while a launch failure maps to `Error=1`, so two
  of the four failure classes already split across existing codes by accident rather than design.
- **ADR-001 resolves a Python path only.** Its precedence (explicit arg > `DEEPNOTE_PYTHON` env >
  autodetect) lives in `selectPythonSpec*` (`packages/runtime-core/src/python-env.ts:160,210`)
  and the selected spec rides as `RuntimeConfig.pythonEnv` (`packages/runtime-core/src/types.ts`).
  There is no `language`/`kernel` field on `RuntimeConfig`, and the bare-interpreter hint names
  `deepnote-toolkit[server]` (`python-env.ts:219-221`). ADR-001 resolves only a Python
  interpreter spec and is silent on kernel/language selection — its documented scope is Python
  interpreter resolution, with the `vscode-deepnote` producer side called out as the only
  explicit non-goal.

**What changed.** Nothing yet on the multi-kernel front in OSS. (Deepnote _Cloud_ supports
non-Python kernels via a Docker `DEFAULT_KERNEL_NAME` env var, but that is read only by the Cloud
Docker image — there is **zero occurrence of `DEFAULT_KERNEL_NAME` in `packages/`**, so it is not
a seam in `runtime-core`/`server-starter.ts`/`kernel-client.ts` and the Phase 1 spike should not
chase it as an existing hook. In that Cloud mode the variable explorer, SQL cells, input cells,
and autocomplete do not work — `docs/running-your-own-kernel.md`.) This PRD scopes the first OSS
step.

The exporter is also more limited than it looks: `convertBlocksToJupyterNotebook`
(`packages/convert/src/deepnote-to-jupyter.ts:48-68`) today emits **no `kernelspec` and no
`language_info`** — only `deepnote_*` metadata plus `nbformat`. A `.deepnote` exported to `.ipynb`
therefore produces a kernelspec-less notebook that Jupyter tooling treats as Python by convention,
so the export side cannot merely "thread an existing field"; it has nothing to thread.

## User Segments

### Polyglot data scientists with existing non-Python notebooks

- **Who**: R / Julia / JavaScript users who already have `.deepnote` (or convertible) notebooks
  and want to execute them with the Deepnote CLI or runtime. In practice the most common artifact
  they hold is an existing Julia/R `.ipynb`, which `deepnote run` converts to `.deepnote` before
  executing.
- **Current pain**: There is no way to run a non-Python notebook — the kernel is hardcoded to
  `python3` (`kernel-client.ts:78`) and all blocks compile to Python (`python-code.ts:29`). The
  notebook simply cannot execute in its source language, and importing a non-Python `.ipynb`
  loses its language at the conversion boundary (`jupyter-to-deepnote.ts`).
- **Desired outcome**: `deepnote run` executes a single-language non-Python notebook end to end
  and returns cell outputs, using a Jupyter kernel they already have installed — whether the
  notebook is authored as `.deepnote` or imported from `.ipynb`.
- **Priority**: Primary.

### CI/CD and automation authors

- **Who**: Engineers running notebooks headlessly in pipelines (the "run anywhere" arm of #162).
- **Current pain**: A pipeline can only execute Python notebooks; an R or Julia notebook in the
  repo has no headless execution path through Deepnote. When a kernel does fail today, the error
  is a single generic `Error('Failed to start kernel')` with no machine-readable category, so a
  pipeline cannot distinguish a missing kernel from a crashed one.
- **Desired outcome**: A deterministic, scriptable CLI invocation that runs a non-Python notebook
  and fails loudly with a clear, categorized message — distinguishable on a stable machine-readable
  field in `--output json` — when the required kernel is missing or fails to launch.
- **Priority**: Primary.

### `.deepnote` format adopters and converters

- **Who**: Users and tools (e.g. the Quarto and Jupyter converters) that read/write the
  `.deepnote` format and need it to faithfully represent a notebook's language.
- **Current pain**: The core schema has no `language` field (`deepnote-file-schema.ts:169-174`);
  language only survives via conversion-layer passthrough for non-Python Quarto cells
  (`quarto-to-deepnote.ts:473-474`) and is dropped entirely on Jupyter import
  (`jupyter-to-deepnote.ts`), so a non-Python notebook's language is not first-class or validated.
- **Desired outcome**: Language is a recognized, validated part of the format, defaulting to
  Python so every existing notebook is unaffected, and preserved across conversion in both
  directions.
- **Priority**: Secondary.

### Community issue #154 requester / evaluators

- **Who**: Users evaluating whether Deepnote's open format and runtime can host their existing
  Jupyter-kernel workflow (Julia and others).
- **Current pain**: No documented answer or working path; the feature is requested, not delivered.
- **Desired outcome**: A clear, documented statement of which languages run, with what behavior
  (and what degrades), so they can decide whether to adopt.
- **Priority**: Secondary.

## Goals & Non-Goals

### Goals

- A user can execute a **single-language, non-Python** `.deepnote` notebook (plain code +
  markdown) end to end through the OSS runtime and receive MIME-typed cell outputs, using a
  standard Jupyter kernel already installed on their machine — whether the notebook is authored
  natively or imported from a non-Python `.ipynb`.
- The runtime selects the kernel from an **explicit, predictable source** the user controls, and
  Python remains the default so every existing notebook runs unchanged.
- When the required kernel is **not installed**, the user gets a clear, actionable message naming
  the missing kernel — not an opaque mid-run failure — and a kernel that is registered but fails
  to launch is reported distinctly from a kernel that is simply missing.
- The `.deepnote` format can **faithfully record a notebook's language** as a first-class,
  validated field, consistent with how the conversion layer already carries `metadata.language`,
  and that language is **preserved through import/export** rather than dropped at a converter.
- Multi-kernel work **builds on ADR-001's resolution seam rather than contradicting it** — Python
  resolution and behavior are unchanged for Python notebooks.

### Non-Goals

- **Polyglot notebooks (multiple kernels / languages in one notebook).** Out of scope: the
  current model is one session per run (`kernel-client.ts:74-79`) and cross-kernel variable
  sharing requires explicit serialization with known stability problems. _Revisit_ once
  single-language non-Python execution is proven and a concrete polyglot use case appears.
- **Deepnote value-add blocks (SQL, visualization, DataFrame formatting, input, agent) for
  non-Python kernels.** These are Python-RPC into `deepnote-toolkit`
  (`sql-blocks.ts`, `visualization-blocks.ts`, `data-frame.ts`, `input-blocks.ts`,
  `agent-handler.ts`); there is no toolkit equivalent in R/Julia/JS, and whether the toolkit's
  RPC surface is even reimplementable is an open question. Non-Python notebooks support plain
  code + markdown only. _Revisit_ per-language if demand justifies a toolkit port.
- **Reactive dependency analysis (the DAG) for non-Python code.** The analyzer is Python-AST +
  jinja2 (`ast-analyzer.py:137,7`) and would fail at `ast.parse()` on non-Python code — but only
  on the paths that invoke it: `--block`, dag, analyze, and lint (gated by `if (!options.block)` at
  `run.ts:444`). The whole-notebook `deepnote run` path never analyzes, so the primary scenario is
  unaffected; on the `--block`/dag/analyze/lint paths, reactivity _degrades_ (does not crash the
  run) for non-Python notebooks. _Revisit_ when a language-pluggable analysis approach is designed
  (its own ADR).
- **Auto-installing kernels on the user's behalf.** Kernel install requires both a package
  install and a language-specific registration step (`IRkernel::installspec()`, `ijsinstall`,
  IJulia pkg-mode) plus system prereqs — invasive, error-prone, and outside what a notebook
  runner should silently do. The runtime _detects and reports_; it does not install. _Revisit_
  only if a guided-setup story is explicitly prioritized.
- **WASM / browser execution.** Named in #162 but a fundamentally different runtime target with
  no relationship to the local Jupyter-kernel path. _Revisit_ as its own initiative after local
  multi-kernel lands.
- **Remote / container kernels.** Also named in #162; depends on a connection/transport story
  beyond local kernel discovery. _Revisit_ after local single-language execution is proven.
- **Generalizing or renaming `DEEPNOTE_PYTHON`.** ADR-001's env-var contract is a public,
  recently-accepted Python interop contract — but per ADR-001's adoption-status section it has
  **zero current external env-var adopters**: the `vscode-deepnote` extension satisfies the
  contract at the higher-precedence _explicit_ tier and sets `DEEPNOTE_PYTHON` in **0 places**. So
  this is a public-but-unadopted contract, not a live consumer relationship. Whether kernel
  selection extends it, parallels it, or stays separate is an **ADR decision**, not a PRD
  mandate; this PRD flags the seam (Open Questions) and does not pre-commit. _Revisit_ in the
  Phase 1 ADR.
- **Building or modifying the VS Code extension.** It lives in the external `vscode-deepnote`
  repo; this account has read-only upstream access. Editor-side kernel selection is an external
  residual. _Permanent (access-bound), no revisit_ within this repo's roadmap — it can only be
  picked up if write access to `vscode-deepnote` is gained.
- **Closing upstream `deepnote/deepnote#162` / `deepnote/deepnote#154`.** Read-only access to
  `deepnote/deepnote`; this PRD delivers in-repo capability, not issue closure. _Permanent
  (access-bound), no revisit_ — issue closure requires upstream write access this account does not
  have.

## User Experience

The selection mechanism shown in these scenarios (CLI flag vs. a `language` declared in the
notebook) is an Open Question for the Phase 1 ADR; see Delivery Phases for which source each phase
actually delivers. The scenarios illustrate the _capability_ and _messaging_, not a committed CLI
surface.

### Scenario 1: Run a Julia notebook end to end (kernel installed)

The user has IJulia installed and registered (`jupyter kernelspec list` shows `julia-1.10`).
Their notebook's code blocks are Julia. In Phase 1 the kernel is named with a CLI flag (the only
selection source guaranteed available before the Phase 2 `language` field lands); once Phase 2
ships, the notebook can declare its own language and no flag is needed (see Phase 1 / Phase 2).

```
$ deepnote run --kernel julia-1.10 analysis.deepnote
Resolved kernel: julia-1.10 (Julia 1.10)
Running block 1/3 (code) ... ok
Running block 2/3 (markdown) ... ok
Running block 3/3 (code) ... ok
Done. 2 code blocks executed, 0 errors.
```

Code blocks execute against the Julia kernel over the standard Jupyter protocol; outputs come
back as MIME bundles (`text/plain`, `image/png`, …) exactly as Python outputs do today. Markdown
is unaffected.

### Scenario 2: Required kernel is not installed

The user selects R, but no R kernel is registered.

```
$ deepnote run --kernel ir model.deepnote
Error: the 'ir' kernel (R) is not installed.
Install it, then register it with Jupyter:
  R -e 'install.packages("IRkernel"); IRkernel::installspec()'
Installed kernels: python3, julia-1.10
```

The runtime fails before executing any block, names the missing kernel, lists what _is_
available, and points at the registration step — it does not attempt to install anything. This is
a _missing-kernelspec_ failure, distinct from a kernel that is registered but fails to launch
(Scenario 6).

### Scenario 3: Discover available kernels

```
$ deepnote run --list-kernels
Available Jupyter kernels:
  python3     Python 3.11    (default)
  julia-1.10  Julia 1.10
  ir          R 4.3
```

The user can see which kernels the runtime can target before running, so they know whether their
notebook will execute. (`--list-kernels` is one concrete rendering of the in-scope capability
"enumerate registered kernels before a run"; the exact CLI surface is a design-doc decision.) The
_source_ of this kernel list — the toolkit server's kernelspec API vs. an independent kernelspec
scan — is determined by the Phase 1 server/launch ADR, not by this PRD; Scenario 3 illustrates the
surface, not the source. (The same open question that asks whether `python -m deepnote_toolkit
server` can host a non-Python kernel also governs whether it can _enumerate_ one, so an
implementer must not assume the toolkit server's kernelspec API reports anything beyond `python3`
until that ADR settles it.)

### Scenario 4: A Python notebook — nothing changes

```
$ deepnote run pipeline.deepnote
Resolved kernel: python3 (default)
...
```

A notebook with no `language` field (or `language: python`) and no `--kernel` flag resolves to
`python3` exactly as today, through the unchanged ADR-001 interpreter chain. SQL, visualization,
DataFrame, input, and agent blocks all work as they do now. **No behavior change for any existing
notebook.**

### Scenario 5: Non-Python notebook containing a value-add block

The user's R notebook contains an SQL block (a Python-RPC construct). Because value-add blocks
are Python-only, the runtime does not silently emit broken code. The **product lean is hard-fail**
— CI/CD authors are a Primary segment and need determinism, so an unsupported block aborting with a
clear reason is the safer default unless the Phase 1 degradation ADR shows skip-with-reason is
demonstrably safer. The ADR owns the final choice; both candidate behaviors are shown so the ADR's
decision is grounded in concrete UX.

_Candidate A — warn-and-skip (run completes):_

```
$ deepnote run --kernel ir report.deepnote
Resolved kernel: ir (R 4.3)
Running block 1/2 (code) ... ok
Running block 2/2 (sql) ... skipped
  SQL blocks are only supported on the Python kernel; this notebook runs on 'ir'.
Done. 1 code block executed, 1 block skipped.
```

_Candidate B — hard-fail (run stops at the unsupported block):_

```
$ deepnote run --kernel ir report.deepnote
Resolved kernel: ir (R 4.3)
Running block 1/2 (code) ... ok
Running block 2/2 (sql) ... error
Error: SQL blocks require the Python kernel; this notebook runs on 'ir'. Aborting.
```

In both cases the runtime refuses to emit Python RPC to a non-Python kernel and tells the user
exactly why. The ADR picks one behavior; the success criterion (below) measures only that the
chosen behavior is defined, tested, and never emits broken code.

### Scenario 6: Kernel registered but fails to launch

The user selects a kernel that _is_ registered but cannot start (e.g. a broken IJulia
installation). Today this surfaces as a generic `Error('Failed to start kernel')`; the target
behavior is a distinct, categorized failure.

```
$ deepnote run --kernel julia-1.10 analysis.deepnote
Resolved kernel: julia-1.10 (Julia 1.10)
Error: kernel 'julia-1.10' is registered but failed to launch.
  <kernel launch diagnostic>
```

This is reported as a _kernel-launch-failure_, distinct from a missing-kernelspec error
(Scenario 2) and from an in-block runtime error (below), so headless callers can react
appropriately.

### Error & Edge Cases

- **Language declared but unknown to the runtime**: clear error naming the declared language and
  the kernels available, before any execution.
- **No `language` field present**: resolves to Python (`deepnote-to-quarto.ts:99` already
  establishes Python as the implicit default) — backward compatible.
- **Importing a non-Python `.ipynb` / `.qmd` / `.py`**: `deepnote run` converts these to
  `.deepnote` in memory (`run.ts:247-249,271`). The Jupyter importer must derive the new
  `language` field from `kernelspec.name` / `language_info.name` (defaulting to Python when
  absent) so an imported Julia/R notebook keeps its language instead of silently becoming Python.
- **CLI kernel override conflicts with a notebook that declares Python and contains value-add
  blocks**: when a user runs `--kernel ir` against a notebook that declares (or defaults to)
  Python and contains SQL/viz/input/agent blocks, the override-vs-declared precedence and the
  resulting value-add-block behavior must be defined together — i.e. if the non-Python override
  wins, the Python value-add blocks fall into the Scenario 5 skip-or-fail path. The Phase 1
  selection ADR must decide this precedence _and_ its interaction with value-add degradation, not
  just the selection source in isolation.
- **Reactivity requested on a non-Python notebook (`--block` / dag / analyze / lint only)**: these
  are the only invocations that call the analyzer (gated by `if (!options.block)` at `run.ts:444`);
  on them, reactive DAG analysis degrades gracefully (blocks execute in order; the user is told
  reactivity is Python-only) rather than failing at `ast.parse()`. The default whole-notebook
  `deepnote run` never analyzes, so it has no exposure here.
- **Kernel starts but a block errors at runtime**: surfaced per-block via the existing IOPub
  handler / `onBlockDone` path, same as Python today — and kept distinct from kernel-start
  failures so CI can tell a code error from an environment error.

## Success Criteria

| Criterion                                                                    | Measurement                                                                                                                                                                                                                                                                                                                               | Target                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Non-Python notebook executes end to end                                      | A single-language non-Python `.deepnote` notebook (code + markdown) runs via `deepnote run` against an installed Jupyter kernel and returns outputs                                                                                                                                                                                       | At least one non-Python kernel (e.g. Julia or R) runs an integration test green; cell outputs captured                                                                                                                     |
| Kernel selection is deterministic and visible                                | For identical inputs the resolved kernel is the same every time; the selected kernel is echoed in CLI output; whatever precedence the ADR chooses is documented and unit-tested                                                                                                                                                           | Unit tests assert the resolution order is deterministic; selected kernel appears in CLI output; precedence documented                                                                                                      |
| Python default preserved (zero regression)                                   | Notebooks with no `language` field, and all existing Python value-add blocks, behave identically to today                                                                                                                                                                                                                                 | Existing Python test suites pass unchanged; a "no language field → python3" test asserts the default                                                                                                                       |
| Imported non-Python notebook keeps its language                              | A non-Python `.ipynb` carries its language through conversion into the `language` declaration rather than defaulting to Python                                                                                                                                                                                                            | Test: a Julia/R `.ipynb` converts to a `.deepnote` whose code blocks resolve to the source language, not python3                                                                                                           |
| Missing-kernel message is actionable                                         | When the declared/selected kernel is not registered, the runtime fails before execution with a message naming the kernel, listing installed kernels, and pointing to registration                                                                                                                                                         | Covered by a unit/integration test asserting message content and pre-execution failure                                                                                                                                     |
| Failure classes are distinguishable for CI                                   | The four kernel-failure classes — missing kernelspec, kernel-launch failure, kernel-died-mid-run, in-block runtime error — are each distinguishable on a stable machine-readable field in `--output json`; whether exit codes are also subdivided is an ADR decision (`RunResult` carries only boolean `success` today, `run.ts:156-157`) | Tests assert all four classes carry distinct machine-readable categories in `--output json`; no two classes collapse to the same field value                                                                               |
| Language is first-class in the format                                        | The core schema validates a language declaration on code blocks (defaulting to Python), consistent with conversion-layer `metadata.language`; physical placement (block-level field vs. `metadata.language` vs. reconciliation) is TBD by the Phase 2 design doc                                                                          | Schema test: notebook with a validated language declaration parses and validates; notebook without it still parses (`.passthrough()` preserved)                                                                            |
| Existing Python notebooks round-trip byte-stable                             | Adding `language` to the schema does not materialize `language: python` into notebooks that never had it                                                                                                                                                                                                                                  | Test: a pre-existing Python `.deepnote` round-trips (parse → serialize) with no spurious `language` field added                                                                                                            |
| Discovery surfaced to the user                                               | A user-facing way to enumerate the registered kernels before a run exists and lists installed kernels                                                                                                                                                                                                                                     | Test asserts the enumeration lists registered kernels; exact CLI surface left to design                                                                                                                                    |
| Unsupported-block behavior is explicit                                       | A value-add block (SQL/viz/input/agent) in a non-Python notebook produces the behavior chosen by the degradation decision (skip-with-reason or documented hard-fail) rather than emitting broken code                                                                                                                                     | Test asserts the chosen behavior and message; no Python RPC emitted to a non-Python kernel                                                                                                                                 |
| Reactivity degrades, never crashes (on the `--block`/dag/analyze/lint paths) | On the only paths that invoke the analyzer (gated by `if (!options.block)` at `run.ts:444`), a non-Python notebook does not fail in `ast-analyzer.py`                                                                                                                                                                                     | Test/behavior confirms ordered execution; no `AstAnalyzerInternalError` reaches the user. (Exact wording and presence of a "reactivity is Python-only" user notice is a design-doc detail, not a launch-gating assertion.) |
| ADR-001 consistency                                                          | Python interpreter resolution and the `DEEPNOTE_PYTHON` contract are unchanged for Python notebooks                                                                                                                                                                                                                                       | Code review confirms the Python path still routes through `selectPythonSpec*`; no regression to ADR-001 behavior                                                                                                           |

## Scope & Boundaries

### In Scope

- A user-controlled, predictable way to select the Jupyter kernel for a run, with Python as the
  default and the selection threaded to the seam at `kernel-client.ts:78` (`connect()` currently
  takes no kernel parameter).
- End-to-end execution of single-language, non-Python notebooks (plain code + markdown) over the
  existing standard-Jupyter transport.
- **Preserving language through import**: the Jupyter importer
  (`packages/convert/src/jupyter-to-deepnote.ts`) derives the `language` declaration from
  `kernelspec.name` / `language_info.name` (defaulting to Python) so a non-Python `.ipynb` run
  via `deepnote run` does not silently become Python. (Import fan-out: a single notebook-level
  `kernelspec` must be stamped onto the N per-block language declarations the importer builds — see
  Technical Considerations.)
- **Preserving language through export**: the Jupyter exporter
  (`packages/convert/src/deepnote-to-jupyter.ts:48-68`) emits **no `kernelspec` / `language_info`
  today**, so export currently drops language on the way out. In scope is **adding**
  kernelspec/language_info emission derived from the `language` declaration so a non-Python
  `.deepnote` round-trips to an `.ipynb` whose kernelspec matches its language — not threading an
  already-existing field.
- **Kernel discovery**: a user-facing way to enumerate the registered kernels before a run. (The
  exact CLI surface — e.g. a `--list-kernels` flag — is a design-doc decision.)
- **Distinct, scriptable kernel-failure reporting**: a missing-kernel error that names the
  kernel, lists installed kernels, and points to registration; a kernel-launch failure reported
  distinctly; a kernel-died-mid-run failure distinct again; all kept distinct from in-block
  runtime errors. The four classes must be distinguishable on a stable machine-readable field in
  `--output json` (`RunResult` carries only boolean `success` today); detection and reporting
  only, no auto-install.
- A first-class, validated **`language` declaration** in the `.deepnote` core schema, defaulting to
  Python, consistent with the conversion layer's existing `metadata.language`, and omitted on
  serialization for Python so existing notebooks round-trip unchanged. (Physical placement —
  block-level field vs. `metadata.language` vs. reconciliation — is a Phase 2 design-doc decision.)
- **Defined, tested behavior for value-add blocks in non-Python notebooks** (the product lean is
  hard-fail; skip-with-reason if the ADR shows it is safer) so no broken Python RPC is emitted to a
  non-Python kernel.
- **Graceful reactivity degradation** for non-Python notebooks on the analyzer-invoking paths
  (`--block` / dag / analyze / lint), so the `ast.parse()` crash is bypassed; the default
  whole-notebook run never analyzes and has no exposure.
- Documentation: which languages run, what behavior degrades, and how to install/register a
  kernel; an in-repo answer to `deepnote/deepnote#154` hosted in `docs/running-your-own-kernel.md`.

### Out of Scope

- Polyglot notebooks; non-Python value-add blocks (SQL/viz/DataFrame/input/agent); reactive DAG
  for non-Python; auto-install of kernels; WASM/browser; remote/container kernels; generalizing
  `DEEPNOTE_PYTHON`; VS Code extension changes; upstream issue closure. (See Non-Goals for the
  reasoning and revisit triggers on each.)

### Future Considerations

- **Per-language value-add bridging** (an R/Julia equivalent of SQL-returns-DataFrame) — only if
  a documented/reimplementable toolkit RPC surface exists and demand justifies it.
- **Language-pluggable reactivity** — a per-language dependency analyzer to replace the
  Python-AST monopoly; would warrant its own ADR.
- **Per-block vs per-notebook language** — this PRD assumes a notebook-level language for the
  first step; a per-block model (toward polyglot) is a future expansion the schema should not
  foreclose. The Phase 2 design doc must decide this _now_, because import already forces the
  question: a single notebook-level `kernelspec` must be stamped onto N per-block declarations (see
  the import fan-out in Technical Considerations).
- **Editor-side kernel selection** — surfacing kernel choice in the VS Code extension (external
  repo), analogous to ADR-001's editor-publishes-interpreter pattern.

## Delivery Phases

Each phase delivers independent, user-visible value. Phase 1 selects the kernel from a CLI flag
(the only source guaranteed available before the schema field lands); Phase 2 makes the language
a first-class, notebook-declared field so a user can run a non-Python notebook with **no flag** —
which is why notebook-declared selection is a Phase 2 capability that builds on Phase 1, not an
independent layer.

### Phase 1: Run one non-Python kernel end to end via a CLI flag (minimal slice)

**What ships:** the smallest path that lets a user execute a single-language, non-Python notebook
(code + markdown only) via `deepnote run` against an already-installed Jupyter kernel, **selecting
the kernel with a CLI flag** (e.g. `--kernel julia-1.10`). The CLI flag is the source because it
is the only selection input guaranteed available before Phase 2's `language` field exists. A
user-controlled kernel selection (defaulting to Python when no flag is given) is threaded from the
CLI through the runtime to the session-start seam (`kernel-client.ts:78`); the kernel name stops
being a hardcoded literal. Python notebooks are entirely unaffected. Value-add blocks on a
non-Python kernel are explicitly handled as "not supported here" (the product lean is hard-fail),
not left to emit broken Python; reactivity is bypassed gracefully on the only paths that invoke it
(`--block` / dag / analyze / lint) — the whole-notebook run never analyzes, so it needs no guard.
_Note:_ Scenarios 1, 5, and 6 are shown with the `--kernel` flag; the no-flag, notebook-declared
variant of those scenarios is unlocked by Phase 2.

**Sequencing within the phase:** the degradation-behavior decision and the kernel-selection /
ADR-001-relationship decision are **prerequisite steps of Phase 1** — the degradation ADR and the
selection ADR are produced first, then the code is built against their outcomes. The launch
criteria below reference those decided behaviors rather than presuming them.

**Launch criteria (in-repo, verifiable here):** a non-Python kernel (e.g. Julia or R) runs a
code+markdown notebook to completion in an integration test and returns outputs; kernel selection
is deterministic for identical inputs and the chosen precedence is unit-tested; "no flag / no
language field → python3" default test passes; all existing Python suites pass unchanged; a
value-add block in a non-Python notebook produces the behavior chosen by the degradation decision
(tested); a non-Python notebook run with `--block` (or dag/analyze/lint) does not crash reactivity
at `ast.parse()` — the whole-notebook path is unaffected because it never analyzes (`run.ts:444`);
the four kernel-failure classes (missing kernelspec, launch failure, kernel-died-mid-run, in-block
error) are each distinguishable on a stable machine-readable field in `--output json`.

**Decisions needed (ADRs):**

- **ADR — kernel selection contract & its relationship to ADR-001.** Where kernel choice comes
  from in the long run (CLI flag, notebook `language` field, env channel, precedence among them),
  the precedence when a CLI override and a notebook-declared language disagree (including the
  collision case where a `--kernel` override is non-Python but the notebook declares Python and
  contains value-add blocks), and explicitly how it relates to ADR-001's `DEEPNOTE_PYTHON` /
  `selectPythonSpec*` seam — extend, parallel, or keep separate. **Must precede coding.**
- **ADR — server/launch model for non-Python kernels.** The current server is `python -m
deepnote_toolkit server` (`server-starter.ts:50-58`), which is bespoke and toolkit-bearing;
  whether a non-Python kernel is launched through that same server (and whether the toolkit can
  even host a foreign kernel) or via a different launch path is an architectural decision. To bound
  the spike, the candidate launch models are roughly: **(a) reuse the toolkit server** and ask it
  to start a foreign kernelspec (smallest delta if the toolkit can host one); **(b) launch the
  kernel directly via jupyter-client / `@jupyterlab/services`** without the toolkit (the transport
  is already kernel-agnostic, `kernel-client.ts:55,74-79`); or **(c) run a parallel non-toolkit
  Jupyter server** alongside the existing one for non-Python kernels. The discriminating product
  constraint — not an architecture choice — is that _whatever is chosen must not regress the Python
  value-add path, which depends on the toolkit server being present_ (`_dntk.*` RPC). The ADR picks
  among these; the PRD only bounds them. This also determines the answer to the open research
  question of whether changing the kernel name alone is sufficient, and how kernel-launch failures
  are detected and categorized into the four classes.
- **ADR — value-add-block behavior on a non-Python kernel** (warn-and-skip vs. hard-fail). This is
  an ADR (not "ADR or design doc"): the **product lean is hard-fail**, because CI/CD authors are a
  Primary segment and need determinism, so the default is to abort with a clear reason unless the
  ADR demonstrates skip-with-reason is safer. The already-settled invariant "never emit broken
  Python RPC to a non-Python kernel" is _not_ an open decision and is dropped from this ADR's
  scope; likewise reactivity degradation is an already-settled invariant (degrade on the
  analyzer-invoking paths, never crash), tracked as a launch criterion rather than an open ADR
  question. **Prerequisite to Phase 1's degradation launch criterion.**

**Phase 1 spike checklist (researchable, not stakeholder forks):**

- Can `python -m deepnote_toolkit server` host / enumerate a foreign (non-Python) kernelspec, or
  is a different launch path required? (Feeds ADR-2.)
- Is changing the hardcoded `python3` kernel name sufficient to connect, given codegen still emits
  Python? (Necessary-vs-sufficient.)
- Does `deepnote-toolkit` expose a documented/reimplementable RPC surface, or inject IPython
  magics into "plain" code? (Read the package source — answerable by inspection, not by asking a
  stakeholder. Feeds the "plain code purity" claim and future value-add bridging.)

**Dependencies:** ADR-001 (interpreter resolution seam); standard-Jupyter transport already
present (`@jupyterlab/services` in `kernel-client.ts`).

### Phase 2: Language as a first-class, notebook-declared format field

**User-visible value:** a notebook author can declare `language: julia` in the file (or import a
Julia/R `.ipynb` and have its language preserved) and run it with `deepnote run notebook.deepnote`
— **no `--kernel` flag** — with the runtime picking up the declared language. This is the
no-flag, notebook-declared experience depicted in Scenarios 1/5/6; it requires Phase 1's selection
plumbing to read the field, so Phase 2 builds on Phase 1 rather than standing alone.

**What ships:** a validated `language` declaration in the core `.deepnote` schema
(`deepnote-file-schema.ts`), defaulting to Python so all existing notebooks parse unchanged and
**omitted on serialization for Python** so pre-existing Python notebooks round-trip byte-stable;
the conversion layer reconciled with the core declaration — specifically, the Quarto converter
(which writes `metadata.language` **only for non-Python cells**, `quarto-to-deepnote.ts:473-474`,
and reads `cell.language || 'python'`, `deepnote-to-quarto.ts:99`); the Jupyter **importer**
(which today carries **no** language; `jupyter-to-deepnote.ts` must learn to derive `language`
from `kernelspec.name` / `language_info.name`); and the Jupyter **exporter** (which today emits no
`kernelspec`/`language_info` at all, `deepnote-to-jupyter.ts:48-68`, and must **add** that
emission derived from the `language` declaration — not thread an existing field). The import side
also carries a structural fan-out: `kernelspec`/`language_info` live at _notebook_ level, while
`convertCellToBlock` (`jupyter-to-deepnote.ts:212`) builds blocks one cell at a time with no
notebook-metadata access, so a single notebook-level kernelspec must be stamped onto N per-block
language declarations — concrete input to the per-block-vs-per-notebook placement decision below.
Phase 1's selection plumbing is extended to read this declaration as a selection source.
Documentation of the field.

**Launch criteria:** schema validates a language declaration on code blocks; a notebook _without_
it still parses (passthrough preserved); a pre-existing Python `.deepnote` round-trips with **no
spurious `language` field** materialized; a non-Python `.ipynb` import populates the declaration
from `kernelspec`/`language_info` and resolves to the source language (not python3); a non-Python
`.deepnote` **exports** to an `.ipynb` whose `kernelspec`/`language_info` matches the declared
language (the export-side round-trip assertion); round-trip conversion tests pass in both
directions; default-to-Python asserted; `deepnote run` of a language-declaring notebook selects
the declared kernel with no flag.

**Decisions needed:** per-block vs per-notebook language placement, including the physical
location of the declaration (block-level field vs. `metadata.language` vs. reconciliation) — a
design-doc decision the import fan-out forces; whether the core declaration supersedes or wraps the
conversion-layer `metadata.language`; the serialization rule that keeps Python notebooks free of a
materialized `language` field.

**Dependencies:** Phase 1 (provides the selection plumbing this field feeds). Phase 2 is what
turns the scenarios' notebook-declared selection from illustration into delivered behavior.

### Phase 3: Kernel discovery and missing-kernel guidance

**What ships:** a user-facing way to enumerate registered kernels before a run (e.g.
`--list-kernels` or equivalent — _source_ of the list determined by the Phase 1 server/launch ADR,
per Scenario 3), and the actionable missing-kernel / kernel-launch-failure reporting (names the
kernel, lists installed kernels, points to registration) that fires before or at launch with
distinct, scriptable categories. Detection and reporting only — no auto-install.

**Launch criteria:** the discovery affordance enumerates registered kernels; a notebook
declaring/selecting an absent kernel fails before block execution with the tested, actionable
message; a registered-but-unlaunchable kernel surfaces a distinct category; documentation updated,
including an in-repo answer to `deepnote/deepnote#154` hosted in `docs/running-your-own-kernel.md`
(stating which languages run and what degrades).

**Decisions needed:** none architectural beyond Phase 1's selection and server/launch ADRs (which
own the failure-categorization contract); the discovery surface is an implementation detail
(design doc).

**Dependencies:** Phase 1 (kernel selection and the failure-categorization contract) and Phase 2
(language field to know what kernel a notebook wants).

## Technical Considerations

These are product constraints with architectural implications — hand-off material for the ADR
author, **not** a prescribed design.

- **The Jupyter kernel protocol is the natural interop seam.** The transport is _already_
  standard Jupyter (`@jupyterlab/services` in `kernel-client.ts:55,74-79`); only the kernel name
  is hardcoded. Any kernel a user installs registers via a Jupyter kernelspec. This is the
  lowest-friction interop surface — but research did **not** establish that changing the kernel
  name alone is sufficient, because the entire codegen pipeline still emits Python. The ADR must
  resolve "necessary vs sufficient."
- **The bespoke server is the open architectural question.** `python -m deepnote_toolkit server`
  is a Python-package launch (`server-starter.ts:50-58`); `startServer()` takes no kernel field.
  Whether a non-Python kernel can be hosted by that server, or needs a different launch, is the
  central decision and gates Phase 1.
- **Language must survive conversion, not only authoring — and the import has a structural
  fan-out.** `deepnote run` auto-converts `.ipynb` / `.py` / `.qmd` into `.deepnote` before
  execution (`run.ts:247-249,271`). The Jupyter importer (`jupyter-to-deepnote.ts`) currently
  ignores `kernelspec` / `language_info` and only restores Deepnote roundtrip metadata, so a
  non-Python notebook's language is lost at the boundary. The product requires the importer to map
  `language_info.name` / `kernelspec.name` to the new `language` declaration (defaulting to
  Python). Note the fan-out this forces: `kernelspec` / `language_info` are **notebook-level**,
  but `convertCellToBlock` (`jupyter-to-deepnote.ts:212`) builds blocks one cell at a time with no
  notebook-metadata access — so a single notebook-level kernelspec must be stamped onto N per-block
  language declarations. That is direct, concrete input to the per-block-vs-per-notebook placement
  decision (otherwise deferred to a Phase 2 design doc), not merely a polyglot-future aside.
  Symmetrically, the exporter `convertBlocksToJupyterNotebook` (`deepnote-to-jupyter.ts:48-68`)
  emits **no `kernelspec` and no `language_info` today** — only `deepnote_*` metadata and
  `nbformat` — so a `.deepnote` exported to `.ipynb` is kernelspec-less and Jupyter/Cloud treat it
  as Python by convention, recreating the very language-loss this PRD fixes, on the export side.
  Phase 2 must therefore **add** kernelspec/language_info emission derived from the `language`
  declaration, not thread an existing field, so an imported polyglot notebook is not silently
  coerced to Python on the way back out.
- **Kernel discovery and install friction is a real product cost, not a detail.** Installing a
  kernel needs both a package install _and_ a language-specific registration step (IRkernel,
  ijavascript, IJulia), plus system prereqs and pre-compilation for some languages. The product
  stance here is **detect and report, never auto-install** — the ADR should not smuggle
  auto-install back in.
- **The format change is additive and must stay backward-compatible in both directions.** The
  core schema has no `language` field today (`deepnote-file-schema.ts:169-174`) but uses
  `.passthrough()` (`:44-45`), and Python is the implicit read-side default
  (`deepnote-to-quarto.ts:99`) — never written explicitly. Any new field must default to Python so
  every existing notebook _parses_ unchanged. Equally important is the _write_ direction: there is
  no formal version-migration framework, so the field must be **omitted-when-Python on
  serialization** rather than materialized into notebooks that never had it — otherwise schema
  defaults (`.default({})`) and snapshot writes could stamp `language: python` into existing files,
  dirtying their git diffs and surprising Cloud import. (If the project instead chooses to accept
  Python notebooks gaining `language: python` on next save, that must be an explicit, justified
  decision.)
- **Value-add blocks are Python-RPC and have no non-Python equivalent.** SQL, visualization,
  DataFrame, input, and agent blocks all emit `_dntk.*` calls or Python literals
  (`sql-blocks.ts`, `visualization-blocks.ts`, `data-frame.ts`, `input-blocks.ts`,
  `agent-handler.ts`, `execution-engine.ts:462-486`). The runtime must **not** emit these to a
  non-Python kernel; the product needs a defined behavior (skip-with-reason or hard-fail) and a
  clear message — including the override-collision case where a Python-declaring notebook with
  value-add blocks is run against a non-Python `--kernel` override.
- **Reactivity is Python-AST-coupled and degrades, not extends — but only on non-default paths.**
  The analyzer parses with `ast.parse` (`ast-analyzer.py:137`) and jinja2 (`ast-analyzer.py:7`);
  non-Python code crashes it with `AstAnalyzerInternalError`. Crucially, the analyzer is invoked
  **only** on the `--block` path (`getUpstreamBlocks`, gated by `if (!options.block)` at
  `run.ts:444`, then `run.ts:459`) and the dag/analyze/lint validation path (`getBlockDependencies`,
  `run.ts:793`). The whole-notebook `deepnote run notebook.deepnote` path — the Problem Statement
  invocation and every UX scenario — runs blocks in `sortingKey` order (`execution-engine.ts:375`)
  and never analyzes, so it has **no** `ast.parse()` exposure. The guard the ADR must size is
  therefore confined to the `--block`/dag/analyze/lint paths; on those, reactive analysis must be
  bypassed gracefully for non-Python notebooks, not invoked. (The previously-cited
  `ast-analyzer.ts:16-32` is the supported-cell-types list, not the jinja2 logic.)
- **Consistency with ADR-001 is mandatory.** ADR-001 centralized Python interpreter resolution
  (`selectPythonSpec*`, `RuntimeConfig.pythonEnv`) and defined `DEEPNOTE_PYTHON` as a public
  cross-repo contract — but per its adoption-status section that contract has **zero current
  external env-var adopters**: the `vscode-deepnote` extension satisfies it at the higher-precedence
  _explicit_ tier and sets `DEEPNOTE_PYTHON` in 0 places. Kernel selection touches the same seam
  (`RuntimeConfig` has no `language`/`kernel` field today; the bare-interpreter hint names
  `deepnote-toolkit[server]`). The ADR must build on this seam — extending or paralleling it
  deliberately — and must not change Python behavior. Because the env-var has no live consumer, the
  real hazard is muddying the _future_ semantics of a public-but-unadopted contract, not breaking
  an active integration. Any genuine tension is surfaced as an Open Question, not resolved by fiat
  here.
- **Kernel-failure observability matters for CI, and there is no differentiation today.** CI
  authors are a Primary segment. Currently `kernel-client.ts:82-119` throws only generic,
  undifferentiated errors — `Error('Failed to start kernel')`, `'Kernel is dead'`, and a timeout
  error — so a headless caller cannot tell _why_ a run failed. The runtime must surface **four**
  distinct failure categories: (1) **missing kernelspec** (the requested kernel is not
  registered), (2) **kernel-launch failure** (registered but won't start), (3) **kernel died**
  (started, then crashed mid-run), and (4) **in-block runtime error** (the user's code raised).
  Categories (1) and (2) should be surfaced pre-execution or at launch where possible. The
  **falsifiable CI contract this PRD commits to** is a single channel: each of the four classes is
  distinguishable by a stable machine-readable field in `--output json`. Today that channel cannot
  express it — there are exactly three exit codes (`Success=0`, `Error=1`, `InvalidUsage=2`,
  `exit-codes.ts:11-19`) and `RunResult` carries only a boolean `success` (`run.ts:156-157`).
  Whether the ADR _also_ subdivides exit codes is its decision, not a PRD mandate — but note the
  latent collision it must confront: a missing kernelspec maps naturally to `InvalidUsage=2` while
  a launch failure maps to `Error=1`, so two of the four classes already split across existing
  codes by accident; if the ADR keeps the existing codes, that pre-decides part of the
  "distinct exit code" question.
- **Fork discipline.** Code changes land on `feat/*` branches cut from `upstream/main` (no
  `.gitban`/`.claude`/`docs/prds`/`docs/adr` in those trees); lifecycle docs and board live on
  `workspace`. Board mutations and code edits stay in separate commits.

## Risks & Open Questions

### Risks

| Risk                                                                                                                  | Impact                                                                                                      | Likelihood | Mitigation                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Changing the kernel name is necessary but not sufficient — the bespoke toolkit server cannot host a non-Python kernel | Phase 1 minimal slice doesn't actually run; deeper launch rework needed                                     | Medium     | Phase 1 ADR resolves the server/launch model before coding, choosing among bounded candidates (reuse-toolkit-server vs. direct jupyter-client launch vs. parallel non-toolkit server) under the constraint that the Python value-add path must not regress; spike the toolkit-hosts-foreign-kernel question first |
| `deepnote-toolkit`'s `_dntk` RPC surface is coupled to IPython/Jupyter internals and not reimplementable              | Forecloses any future per-language value-add bridging                                                       | Medium     | Keep value-add blocks firmly out of scope (skip-with-reason); treat reimplementability as a separate future investigation                                                                                                                                                                                         |
| Adding a `language` field interacts badly with the conversion layer or materializes into existing files               | Round-trip conversions or Cloud import misbehave; existing Python notebooks gain spurious `language` fields | Low–Medium | Phase 2 reconciles Quarto (non-Python-only write) and Jupyter (no language today) explicitly; omit-when-Python on serialization; round-trip + import tests; default-to-Python preserves all existing notebooks                                                                                                    |
| Imported non-Python `.ipynb` silently coerced to Python                                                               | A user's actual Julia/R notebook runs as python3 and errors confusingly                                     | Medium     | Phase 2 makes `jupyter-to-deepnote.ts` derive `language` from `kernelspec`/`language_info`; import test asserts source language survives                                                                                                                                                                          |
| Exporter emits no kernelspec, so a re-exported non-Python notebook lands as Python                                    | Round-trip re-creates the exact language-loss the PRD set out to fix, on the export side                    | Medium     | Phase 2 **adds** kernelspec/language_info emission to `deepnote-to-jupyter.ts:48-68` (none exists today); export-side round-trip test asserts the `.ipynb` kernelspec matches the declared language                                                                                                               |
| Kernel install/registration friction makes the feature feel broken to users                                           | Adoption stalls; perceived as half-working                                                                  | Medium     | User-facing kernel enumeration + actionable missing-kernel message + docs answering `deepnote/deepnote#154` in `docs/running-your-own-kernel.md`; explicit "we detect, you install" stance                                                                                                                        |
| Bolting kernel selection onto `DEEPNOTE_PYTHON` muddies a public-but-unadopted contract's future semantics            | Future producers/consumers face an overloaded env channel; harder to reason about                           | Low–Medium | ADR-001 records zero external env-var adopters (the extension wins at the explicit tier), so there is no live consumer to break — but the ADR still decides extend-vs-parallel deliberately; Python path provably unchanged; flagged as Open Question, not pre-committed                                          |
| Kernel failures stay undifferentiated, so CI cannot react                                                             | Pipelines can't distinguish missing kernel from launch failure from kernel-died from code error             | Medium     | Phase 1 server/launch ADR defines four failure classes distinguishable on a stable `--output json` field (the channel can't express it today: 3 exit codes, boolean `success` only); tested against all four classes                                                                                              |
| IPython magics injected by the toolkit (unverified) leak Python-only assumptions into "plain" code                    | Non-Python "plain code" path subtly Python-tainted                                                          | Low        | Verify the no-magics assumption (research marked it medium confidence) during Phase 1 spike                                                                                                                                                                                                                       |

### Open Questions

- **Where does kernel selection come from, and how does it relate to ADR-001?** CLI flag,
  notebook `language` field, env channel, or a precedence among them — and does it extend,
  parallel, or stay separate from `DEEPNOTE_PYTHON` / `selectPythonSpec*`? This includes the
  precedence when a CLI override disagrees with a notebook-declared language, and the collision
  where a non-Python override meets a Python-declaring notebook with value-add blocks. _Decided by
  the Phase 1 ADR. Affects the CLI surface, `RuntimeConfig`, and the cross-repo contract with the
  VS Code extension._
- **Can the bespoke `deepnote_toolkit server` host a non-Python Jupyter kernel, or is a different
  launch path required?** Research did not establish this. _Decided by the Phase 1 server/launch
  ADR (spike first). Determines the size and shape of Phase 1._
- **Is changing the hardcoded `python3` kernel name sufficient to connect to a non-Python kernel,
  given the codegen pipeline emits Python?** _Decided by the Phase 1 ADR/spike. Affects whether
  Phase 1 is "a flag" or "a pipeline change."_
- **Beyond the committed `--output json` channel, does the ADR also subdivide exit codes for the
  four failure classes?** The PRD commits the falsifiable contract to a stable machine-readable
  field in `--output json`; whether exit codes are additionally subdivided (and how the latent
  `InvalidUsage=2` vs. `Error=1` collision is resolved) is left to the ADR. _Decided by the Phase 1
  server/launch ADR. Affects CI semantics and the observability success criteria._
- **Unsupported-block behavior: hard-fail (the product lean) vs. warn-and-skip?** _Decided by the
  Phase 1 degradation ADR; the lean is hard-fail for CI determinism unless the ADR shows
  skip-with-reason is safer. Affects UX (Scenario 5) and CI semantics._
- **Per-block vs per-notebook language placement in the schema?** Forced now by the import fan-out
  (a notebook-level kernelspec stamped onto N per-block declarations). _Decided by the Phase 2
  design doc. Affects forward-compatibility toward polyglot._
- **Who owns editor-side kernel selection in `vscode-deepnote`, and is it scheduled?** _Tracked as
  an external residual; not gating this PRD. This repo delivers the runtime/CLI/format side only,
  and has read-only upstream access to the editor repo._

(The previously-listed "does `deepnote-toolkit` expose a documented RPC surface or inject IPython
magics?" item is **not** a stakeholder fork — it is answerable by reading the package source — and
has moved to the Phase 1 spike checklist under Delivery Phases.)

## Related Documents

- **ADR-001** — `docs/adr/ADR-001-shared-python-interpreter-resolution.md`. The accepted Python
  interpreter-resolution contract this PRD must stay consistent with; the kernel-selection ADR
  builds on its `selectPythonSpec*` / `DEEPNOTE_PYTHON` / `RuntimeConfig.pythonEnv` seam.
- **PRD-001** — `docs/prds/PRD-001-ai-agent-notebook-authoring.md`. House-style reference;
  establishes the in-repo-deliverable-vs-external-residual framing reused here.
- **Upstream epic `deepnote/deepnote#162`** — "Make Deepnote a first-class notebook runtime"
  (OPEN); the multi-language / run-anywhere vision this PRD scopes the first OSS step toward.
- **Community issue `deepnote/deepnote#154`** — "Feature Scope: Alternative Language Kernels" (the
  Julia/Jupyter request this PRD answers in-repo via the Phase 1 capability and a documented answer
  hosted in `docs/running-your-own-kernel.md`).
- **Cloud reference** — `docs/running-your-own-kernel.md` (Cloud/Docker `DEFAULT_KERNEL_NAME`
  precedent; **zero occurrences of `DEFAULT_KERNEL_NAME` in `packages/`** — Cloud-Docker-only, not a
  seam in OSS `runtime-core`/CLI; in that Cloud mode non-Python loses variable explorer / SQL /
  input / autocomplete; also hosts the in-repo answer to `deepnote/deepnote#154`).
- **Relevant packages / seams**:
  - `packages/runtime-core/src/kernel-client.ts:55,74-79,82-120` (hardcoded `python3`; session
    start; generic undifferentiated kernel-failure errors)
  - `packages/runtime-core/src/server-starter.ts:33,50-58` (`deepnote_toolkit server` launch)
  - `packages/runtime-core/src/execution-engine.ts:375,462-486` (`createPythonCode`,
    `toPythonLiteral`)
  - `packages/runtime-core/src/python-env.ts:160,210,219-221` (ADR-001 resolver; toolkit hint)
  - `packages/runtime-core/src/types.ts` (`RuntimeConfig` — no language/kernel field)
  - `packages/blocks/src/python-code.ts:29,90` (single Python dispatcher)
  - `packages/blocks/src/blocks/{sql-blocks,visualization-blocks,data-frame,input-blocks}.ts`
    (Python-RPC value-add); `packages/runtime-core/src/agent-handler.ts`
  - `packages/blocks/src/deepnote-file/deepnote-file-schema.ts:44-45,169-174,176-189,493-506`
    (passthrough metadata; code/SQL/environment schemas — where `language` would land)
  - `packages/reactivity/src/scripts/ast-analyzer.py:137` (`ast.parse`), `:7` (`jinja2` import)
    — the Python-AST + jinja2 reactivity logic (`ast-analyzer.ts:16-32` is the supported-cell-types
    list, not this logic); invoked only via the `--block`/dag/analyze/lint paths
    (`packages/cli/src/commands/run.ts:444,459,793`), never on whole-notebook `deepnote run`
  - `packages/convert/src/quarto-to-deepnote.ts:473-474`,
    `packages/convert/src/deepnote-to-quarto.ts:99` (conversion-layer `language`, non-Python-only
    write; Python read-side default)
  - `packages/convert/src/jupyter-to-deepnote.ts` (importer ignores `kernelspec`/`language_info`;
    `convertCellToBlock` at `:212` builds blocks per-cell with no notebook-metadata access — the
    import fan-out), `packages/convert/src/deepnote-to-jupyter.ts:48-68`
    (`convertBlocksToJupyterNotebook` emits **no** `kernelspec`/`language_info` today — Phase 2 must
    _add_ emission derived from the `language` declaration)
  - `packages/cli/src/cli.ts:274` (defines `--python`; no `--kernel`/`--language`),
    `packages/cli/src/commands/run.ts:247-249,271` (`resolveAndConvertToDeepnote` auto-converts
    `.ipynb`/`.py`/`.qmd` before execution), `run.ts:156-157` (`RunResult` — boolean `success`
    only, no failure-category field)
  - `packages/cli/src/exit-codes.ts:11-19` (the only three exit codes today: `Success=0`,
    `Error=1`, `InvalidUsage=2` — the latent missing-kernelspec vs. launch-failure collision)
  - `packages/mcp/src/tools/execution.ts:107-108` (ADR-001 resolver consumer; no kernel discovery)

---

## Revision History

| Date       | Author  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-11 | muunkky | Initial draft                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-06-11 | muunkky | Incorporated adversarial review: `.ipynb` import language-preservation path; kernel-failure categorization for CI; Phase 1 CLI-flag selection vs Phase 2 notebook-declared field; falsifiable success criteria; omit-when-Python serialization; override/value-add precedence edge case; factual corrections (`--python` framing, non-Python-only Quarto write, ADR-001 scope wording); `--list-kernels` reframed as capability |
| 2026-06-11 | muunkky | Incorporated PRD review: re-scoped reactivity to --block path; exporter must add kernelspec; four-class CI failure contract via --output json; discovery source tied to server/launch ADR; ADR-2 options sketched; corrected DEEPNOTE_PYTHON-adopter premise per ADR-001; ADR-3 lane chosen; minors                                                                                                                             |
