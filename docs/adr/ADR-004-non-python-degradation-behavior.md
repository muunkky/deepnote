# ADR-004: Hard-fail Python-only value-add blocks and bypass reactivity gracefully when the selected kernel is non-Python

> **Status**: Accepted | **Date**: 2026-06-11 | **Deciders**: CAMERON (approved via adversarial adr-reviewer gate)

## Context

ADR-002 made the kernel selectable: a `kernelName` rides on `RuntimeConfig`, `KernelClient.connect()` threads it into the `@jupyterlab/services` session-start call, and the existing `deepnote-toolkit` Jupyter server hosts any registered kernelspec. That ADR deliberately scoped itself to the _launch model_ and left two questions open and named for separate decisions: where `kernelName` _comes from_ (the sibling selection decision, now **ADR-003**), and **what happens to the Python-only constructs in a notebook once the running kernel is not Python** — this ADR.

Two such constructs exist, and both are Python all the way down:

- **Value-add blocks emit Python RPC into `deepnote-toolkit`.** The engine compiles every executable block to a Python string through a single dispatcher, `createPythonCode(block)`, called unconditionally at `packages/runtime-core/src/execution-engine.ts:375`, then hands that string to `kernel.execute(code)`. The differentiating block types do not emit neutral Python — they emit `_dntk.*` RPC that only the toolkit running _inside a Python kernel_ can answer: SQL blocks emit `_dntk.execute_sql(...)` / `_dntk.execute_sql_with_connection_json(...)` (`packages/blocks/src/blocks/sql-blocks.ts:28,73`), DataFrame formatting emits `_dntk.dataframe_utils.configure_dataframe_formatter(...)` guarded by `if '_dntk' in globals()` (`packages/blocks/src/blocks/data-frame.ts:11-12`), visualization blocks emit `_dntk.DeepnoteChart(...)` (`packages/blocks/src/blocks/visualization-blocks.ts`), input blocks emit Python variable assignments (`input-blocks.ts`), and agent blocks generate and inject Python via a separate branch that opens at `execution-engine.ts:236` (`if (isAgentBlock(block))`) and closes at the `} else {` preceding the dispatcher at `:374` (`packages/runtime-core/src/agent-handler.ts`). Sent to a Julia or R kernel these strings are not Deepnote features — they are syntactically alien text that the kernel will reject (or worse, partially mis-parse) with an opaque, kernel-native error that names neither the block nor the kernel. PRD-002 lists all five block types as out of scope for non-Python kernels and states the settled invariant: **the runtime must never emit Python RPC to a non-Python kernel** (Non-Goals; Technical Considerations). The _invariant_ is settled; the _user-facing behavior when such a block is encountered_ is the open decision this ADR owns (PRD-002 Open Questions; Scenario 5).

- **Reactivity is a Python-AST analyzer, and only fires on non-default paths.** Dependency analysis spawns a Python subprocess that `ast.parse()`s block content and extracts SQL template vars with `jinja2`; its TypeScript wrapper defines a supported-cell-types list and a typed `AstAnalyzerInternalError` (`packages/reactivity/src/ast-analyzer.ts:9-14,16-32`; `scripts/ast-analyzer.py`). Fed non-Python source it would throw at `ast.parse()`. Critically — and this nuance is load-bearing, carried forward from ADR-002's review and PRD-002 — the whole-notebook `deepnote run` path **never invokes the analyzer**: it runs blocks in `sortingKey` order through `execution-engine.ts:375`. Analysis lives in `resolveUpstreamExecutionBlockIds`, which is called from both the whole-notebook run path (`run.ts:879`) and the dry-run path (`run.ts:708`); but that function opens with an `if (!options.block) { return undefined }` **early-return** at `packages/cli/src/commands/run.ts:444`, so the actual analyzer invocation (`getUpstreamBlocks` at `run.ts:459`) is reached only on the `--block` path — past that early-return. The early-return is precisely what makes the whole-notebook case analyzer-free. So the `ast.parse()` crash exposure is confined to the `--block` / dag / analyze / lint paths; the primary scenario has none.

A third force is the **override-collision seam**, which this ADR shares with the sibling selection ADR (the still-to-be-written kernel-selection source & precedence NOM). That selection ADR — not this one — must decide _who wins_ when an explicit non-Python `--kernel` override is applied to a notebook that declares (or defaults to) Python; PRD-002 treats this precedence as an open question and requires the precedence decision and its degradation interaction be defined _together_ (Error & Edge Cases; Open Questions). The selection ADR owns "who wins"; this ADR owns "what then happens to the Python value-add blocks that notebook contains" — given whatever precedence selection picks. The two must compose into one coherent behavior, but this ADR does not pre-decide the precedence.

Two product forces shape the choice. CI/CD authors are a **Primary** PRD-002 segment who need determinism: a run that silently skips a SQL block which was supposed to load data produces wrong results with a green exit. And ADR-002 already established the legibility bar — failures must be typed and name the relevant entities — which the existing `UnsupportedBlockTypeError extends DeepnoteError` (`packages/blocks/src/errors.ts:53`, thrown at `packages/blocks/src/python-code.ts:90` for genuinely unknown block types) gives us a pattern to mirror.

## Decision

We will make non-Python kernels degrade **deterministically and legibly**, with two coordinated behaviors:

1. **Value-add blocks hard-fail.** When the selected `kernelName` is non-Python and execution reaches a value-add block (SQL, visualization, DataFrame-formatting, input, agent — the block types whose codegen emits `_dntk.*` RPC or Python literals), the runtime will **abort the run at that block with a typed error** that names both the offending block type and the active kernel (e.g. "SQL blocks require the Python kernel; this notebook is running on 'ir'."). It will **not** emit the Python RPC to the kernel and will **not** silently skip the block. Plain code blocks and markdown are unaffected and run normally on the selected kernel. A future opt-in _skip-with-reason_ mode is recorded as a **deferred extension**, not built here.

2. **Reactivity is bypassed gracefully, never attempted.** Reactive dependency analysis is treated as **Python-only**. On the only paths that invoke it (`--block` / dag / analyze / lint — i.e. the `getUpstreamBlocks` invocation at `run.ts:459`, reached past the `if (!options.block)` early-return at `run.ts:444`), when the selected kernel is non-Python the runtime will **skip the analyzer entirely** — executing the requested block(s) in their existing order without a DAG and surfacing a clear "reactivity is Python-only; running without dependency analysis" notice — rather than calling the analyzer and catching its `AstAnalyzerInternalError`. The whole-notebook `deepnote run` path is untouched because the early-return short-circuits before any analysis.

3. **The override-collision case resolves through (1) — conditionally on the selection ADR's precedence choice.** This ADR owns the degradation behavior given whatever precedence the selection ADR picks. **IF** the selection ADR decides the non-Python `--kernel` override _wins_ over a notebook that declares/defaults to Python (the PRD's lean), **THEN** the value-add blocks in that notebook take the hard-fail path in (1): the run aborts at the first value-add block with the typed, kernel-naming error. If the selection ADR instead lands the other way (declared-language wins, or the override is rejected when it conflicts with value-add blocks), the non-Python kernel never runs against those blocks and the hard-fail path in (1) is simply never triggered by that collision. Either way, selection owns precedence; this ADR owns the resulting behavior, and its override-collision composition is contingent on — not a substitute for — the selection ADR's precedence decision.

This ADR decides **behavior and its triggering condition** (non-Python kernel → these two outcomes), not the plumbing. The exact error type name and message wording, _where_ in the engine the value-add-block guard is placed (block-classification predicate vs. dispatcher seam), how "non-Python" is determined from `kernelName` / kernelspec `language`, the `--output json` failure-category value, and the test matrix belong to the design doc.

## Rationale

### Key Factors

1. **Hard-fail is the only behavior that preserves determinism for the Primary CI segment.** A SQL block exists to load data that downstream blocks consume. Warn-and-skip lets the run continue past a missing dataframe, so downstream code either crashes with a confusing `NameError`-equivalent in the _target_ language (blaming the wrong block) or — worse — runs against stale/empty state and produces a _plausible but wrong_ result with exit code 0. For a pipeline author, a silent wrong answer is the most expensive failure mode there is. Aborting at the unsupported block, naming it, is the behavior that lets CI react correctly: the run is red, and the reason is legible. PRD-002 leans hard-fail for exactly this reason (Scenario 5; Delivery Phases ADR-3).

2. **A typed, entity-naming error is already the house pattern, and the alternative is an opaque kernel-native crash.** If the runtime did _not_ guard and simply let `createPythonCode` feed `_dntk.execute_sql(...)` to an R kernel, the user would get R's parser complaining about Python syntax — an error that names neither "SQL block" nor "this is a Python-only feature." Mirroring `UnsupportedBlockTypeError` (`errors.ts:53`, `python-code.ts:90`) gives a typed, catchable failure that the CLI's `--output json` channel can categorize, satisfying ADR-002's legibility bar without inventing a new mechanism.

3. **Reactivity is genuinely Python-coupled, so "bypass" is honest and "attempt-and-catch" is wasteful.** The analyzer is not language-pluggable — it is `ast.parse()` + `jinja2` (Python AST and Python templating). There is no degraded-but-useful DAG to extract from non-Python source; the only possible analyzer outcome is the `AstAnalyzerInternalError`. Bypassing it up front (gated on the same non-Python condition as factor 1) is strictly better than spawning a subprocess we _know_ will fail and then catching it: it avoids the process spawn, avoids a Python-specific error class leaking toward the user, and states the truth plainly ("reactivity is Python-only"). PRD-002 already classifies language-pluggable reactivity as a future, separate-ADR concern (Future Considerations).

4. **Confining the reactivity guard to the `--block`/dag/analyze/lint paths is correct, not laziness.** It would be tempting to add a defensive analyzer guard on the whole-notebook path "for safety." But that path never calls the analyzer: `execution-engine.ts:375` runs in `sortingKey` order, and the shared `resolveUpstreamExecutionBlockIds` function returns at its `if (!options.block)` early-return (`run.ts:444`) before reaching `getUpstreamBlocks` (`run.ts:459`) when no `--block` is given — which is the whole-notebook and most dry-run case. Adding a guard where the analyzer never runs is dead code that misleads future readers about where the exposure is. The guard belongs exactly where the analyzer is invoked.

5. **Composing with the selection ADR keeps one coherent story — once that ADR decides precedence.** This ADR makes the Python value-add blocks degrade deterministically; the selection ADR will decide whether a non-Python override even reaches those blocks. If selection lands on "override wins" (the PRD's lean), the combined behavior — "you asked to run this on R; the SQL block can't run on R, so we stop and tell you" — is exactly what a user who typed `--kernel ir` against a SQL-bearing notebook should expect. Splitting precedence (selection ADR) from behavior (here) keeps each ADR single-purpose; the seam between them is explicit, but the _composed_ outcome is contingent on the precedence the selection ADR has not yet chosen, not asserted here as settled.

## Consequences

### Positive

- CI runs are deterministic: a non-Python notebook either completes correctly or fails red at a named block — never green-but-wrong. This directly satisfies PRD-002's "unsupported-block behavior is explicit" and "never emits broken code" success criteria.
- The settled invariant ("never emit `_dntk` RPC to a non-Python kernel") is enforced _by construction_ at the guard, not by hoping codegen happens to produce neutral output.
- Reactivity degradation is crash-free on every analyzer-invoking path; no `AstAnalyzerInternalError` reaches the user (PRD-002's "reactivity degrades, never crashes" criterion).
- The typed error reuses the existing `DeepnoteError`/`UnsupportedBlockTypeError` family, so the CLI's `--output json` categorization and the broader failure-legibility work (ADR-002) get a clean hook with no new error infrastructure.
- The Python path is provably unchanged: the guard's triggering condition is "kernel is non-Python," which is false for the `python3` default, so every existing notebook takes the identical path it does today.

### Negative

- A user with a mostly-portable non-Python notebook that contains _one_ incidental value-add block cannot run the portable remainder in a single pass — the run stops at that block. This is the deliberate cost of determinism over completion. _Mitigated_ by the named error (the user knows exactly which block to remove or convert) and by the deferred opt-in skip mode below, which is a clean future extension rather than a redesign.
- Hard-fail means the _first_ value-add block aborts the run, so a user fixing blocks one at a time sees them surface serially rather than all at once. _Acceptable_: this matches the existing execute-then-`break`-on-failure loop (`execution-engine.ts:394-397`) and avoids pretending to "run" blocks that fundamentally cannot run.
- The reactivity bypass means `--block` against a non-Python notebook runs _without_ upstream dependency resolution, so a user who relied on the DAG to pull in upstream blocks must order/select blocks themselves. _Acceptable and disclosed_: reactivity is out of scope for non-Python per PRD-002, and the notice tells the user this is happening.

### Neutral

- Introduces a behavioral coupling between `kernelName` (ADR-002) and block dispatch / analyzer invocation: both now branch on "is the kernel Python." This is the intended composition of the two ADRs, localized to the guard sites.
- Establishes "Python-only" as an explicit, named property of value-add blocks and of reactivity, which a future per-language value-add bridge or language-pluggable analyzer (both PRD-002 Future Considerations) would relax rather than contradict.
- The override-collision behavior (Decision point 3) remains contingent until the selection ADR decides precedence; if that ADR lands against "override wins," point 3's hard-fail composition is never exercised by the collision and would need no rewrite — only its triggering becomes moot.

## Alternatives Considered

### Alternative 1: Warn-and-skip value-add blocks (run continues)

**Description**: On a non-Python kernel, encountering a value-add block, emit a warning naming the block and the kernel, skip emitting its Python RPC, and continue the run (PRD-002 Scenario 5, Candidate A).

**Pros**:

- The run completes; a notebook that is "mostly portable code plus a stray viz block" still produces output for its code blocks.
- Honors the never-emit-RPC invariant just as hard-fail does.
- Lower friction for exploratory, non-CI use.

**Cons**:

- Breaks determinism for the Primary CI segment: a skipped SQL block means downstream blocks run against missing/stale state, yielding a confusing downstream error in the target language or a silently wrong result with exit code 0.
- "Continue past a block that was supposed to load data" is precisely the failure mode pipeline authors cannot tolerate, and the one PRD-002 calls out as the reason for the hard-fail lean.

**Why not chosen**: It optimizes for run-completion at the cost of correctness, inverting the priority of the Primary segment. The completion benefit is real but belongs to an explicit, opt-in mode a user _chooses_ — not the default. Recorded as the deferred extension in Implementation Notes; cleanly reopenable if an exploratory-use case is prioritized.

### Alternative 2: Best-effort / attempt-anyway (no guard)

**Description**: Add no degradation logic; let `createPythonCode` produce the `_dntk.*` string as today and let `kernel.execute` send it to whatever kernel is selected, surfacing whatever the kernel returns.

**Pros**:

- Zero new code; the existing dispatcher and execute loop are untouched.

**Cons**:

- Violates PRD-002's settled invariant — Python RPC _is_ emitted to a non-Python kernel.
- The user gets an opaque, kernel-native parse/runtime error that names neither the block type nor the fact that this is a Python-only feature — the exact opacity ADR-002's legibility bar exists to prevent.
- For reactivity, it is strictly the `AstAnalyzerInternalError` crash PRD-002 forbids.

**Why not chosen**: It produces broken, illegible output and directly breaks two settled invariants. It is the status quo the degradation decision exists to replace, not a genuine option.

### Alternative 3 (reactivity): Attempt analysis and catch the failure

**Description**: On the `--block`/dag/analyze/lint paths, still invoke the Python-AST analyzer on non-Python code, then catch `AstAnalyzerInternalError` and fall back to ordered execution.

**Pros**:

- Reuses the existing analyzer-invocation path verbatim; the fallback already partly exists (the `fatal` branch at `run.ts:463-466` runs a single block without deps).
- One uniform code path regardless of language.

**Cons**:

- Spawns a Python subprocess that is _known_ to fail for non-Python input — wasted work and latency on every non-Python `--block` run.
- Relies on the analyzer failing _cleanly_ every time; any partial parse (e.g. a non-Python file that happens to be valid-ish Python at the top) could yield a misleading partial DAG rather than a clean failure.
- Conflates a genuine analyzer fault with the expected "wrong language" case, muddying diagnostics and the `fatal` fallback's meaning.

**Why not chosen**: Bypassing on a known condition (non-Python kernel) is cheaper, more honest, and less fragile than provoking and catching a guaranteed failure. Attempt-and-catch is appropriate for _unexpected_ faults, not for a condition we can test up front.

## Implementation Notes

- **Guard condition**: both behaviors trigger on "the selected kernel is non-Python," derived from `RuntimeConfig.kernelName` (ADR-002) — e.g. anything other than the `python3` default, or, more robustly, the kernelspec `language` from the `/api/kernelspecs` map ADR-002 already reads. The design doc picks the exact predicate; it must keep `python3` (and any Python kernelspec) on the unchanged path.
- **Value-add guard placement**: the natural seam is at or just before the `createPythonCode(block)` dispatch (`execution-engine.ts:375`) plus the agent branch — which opens at the branch head `execution-engine.ts:236` (`if (isAgentBlock(block))`) and closes at the `} else {` to the dispatcher at `:374` (the `agentContext`/`executeAgentBlock` sub-region at `:328-340` sits _within_ that branch). Classify value-add block types and throw the typed error instead of compiling/executing. Mirror `UnsupportedBlockTypeError extends DeepnoteError` (`errors.ts:53`); the concrete type name (e.g. a `PythonOnlyBlockError`/`UnsupportedBlockOnKernelError`) and message wording are design-doc choices. The error must carry the block type and the kernel name as fields so the CLI can render them and map them onto an `--output json` category.
- **Reactivity guard placement**: at the analyzer-invoking site — the `getUpstreamBlocks` call (`run.ts:459`), reached on the `--block` path past the `if (!options.block)` early-return at `run.ts:444`, plus the dag/analyze/lint path — short-circuit before spawning the subprocess when the kernel is non-Python, returning the no-DAG/ordered result and a user notice. Do not add a guard on the whole-notebook path (`execution-engine.ts:375`); the early-return already makes that path analyzer-free.
- **Deferred extension (not built)**: an opt-in `--skip-unsupported` (or equivalent) that converts the hard-fail into warn-and-skip for users who explicitly want run-completion over determinism. Recorded so the hard-fail default does not foreclose it.
- **Out of scope here**: the `--output json` failure-category field value and exit-code mapping (owned by the ADR-002-seeded failure-legibility work and the design doc); per-language value-add bridging and language-pluggable reactivity (PRD-002 Future Considerations, each its own future ADR); the override-vs-declared precedence itself (the kernel-selection source & precedence NOM).

## Validation

- **In-repo, must hold once built**: a value-add block (start with SQL) in a notebook run against a non-Python kernel aborts the run with the typed, kernel-naming error **before** any `_dntk.*` string is sent to the kernel (assert no Python RPC is dispatched); a plain code + markdown non-Python notebook with no value-add blocks still completes; a non-Python notebook run with `--block` (or dag/analyze/lint) executes in order and **does not** raise `AstAnalyzerInternalError` to the user; the `python3` default path is byte-for-byte behaviorally unchanged (existing Python suites pass, value-add blocks still execute).
- **Override-collision test (contingent on the selection ADR)**: this test is meaningful only _if_ the selection ADR decides the non-Python override wins. Under that precedence, a Python-declaring notebook containing a SQL block, run with a non-Python `--kernel` override, must hard-fail with the typed error — confirming that selection (the selection ADR) and behavior (this ADR) compose. If the selection ADR instead rejects or loses the override on conflict, this case never reaches a non-Python kernel and the test does not apply; the design doc finalizes the test only after precedence is decided.
- **Revisit if**: a concrete exploratory/notebook-authoring use case makes run-completion more valuable than determinism for some users (then build the deferred opt-in skip mode); or a language-pluggable reactivity analyzer is designed (then reactivity stops being unconditionally bypassed for non-Python and this guard narrows — its own ADR per PRD-002); or the selection ADR decides the override-vs-declared precedence (then Decision point 3 and the override-collision test resolve from contingent to concrete).
- **Honest limits**: this ADR does not validate that any _specific_ non-Python kernel (Julia/R/JS) runs correctly — that is ADR-002's hosting claim and the integration-test work. It validates only the _degradation_ behavior of Python-only constructs. It also does not decide the override-vs-declared precedence, nor enumerate the full set of value-add block types as a frozen contract: the classification predicate is a design-doc artifact that must track the dispatcher in `python-code.ts` as block types evolve.

## Related Decisions

- **ADR-001** (`docs/adr/ADR-001-shared-python-interpreter-resolution.md`) — resolves _which Python runs the toolkit server_; unchanged by this ADR. The Python path stays on its existing `selectPythonSpec*` resolution.
- **ADR-002** (`docs/adr/ADR-002-non-python-kernel-launch-model.md`) — adds `RuntimeConfig.kernelName` and the launch model; this ADR decides what the Python-only constructs do once that `kernelName` is non-Python. The "is the kernel non-Python" condition derives from ADR-002's `kernelName` / `/api/kernelspecs` `language`.
- **ADR-003** (`docs/adr/ADR-003-kernel-name-selection.md`) — decides where `kernelName` comes from _and_ that an explicit non-Python `--kernel` override wins over a notebook that declares/defaults to Python. This ADR's override-collision behavior (Decision point 3) is the downstream of that precedence: given ADR-003's "explicit override wins", the orphaned Python value-add blocks take the hard-fail path decided here. Selection owns precedence; degradation (here) owns behavior.
- **PRD-002** (`docs/prds/PRD-002-alternative-language-kernels.md`) — Scenario 5 (value-add block in a non-Python notebook), Error & Edge Cases (override collision; reactivity on `--block`), Open Questions (hard-fail vs warn-and-skip; override-vs-declared precedence), and the "unsupported-block behavior is explicit" / "reactivity degrades, never crashes" success criteria.

## References

- `packages/runtime-core/src/execution-engine.ts:375` — `createPythonCode(block)` called unconditionally; the agent-block branch opens at `:236` (`if (isAgentBlock(block))`) and closes at the `} else {` to the dispatcher at `:374`; `:328-340` is the `agentContext`/`executeAgentBlock` region _within_ that branch.
- `packages/blocks/src/python-code.ts:29,90` — single Python dispatcher; `UnsupportedBlockTypeError` thrown for unknown types (pattern to mirror).
- `packages/blocks/src/errors.ts:53` — `UnsupportedBlockTypeError extends DeepnoteError` (typed-error pattern).
- `packages/blocks/src/blocks/sql-blocks.ts:28,73` (`_dntk.execute_sql*`), `packages/blocks/src/blocks/data-frame.ts:11-12` (`_dntk.dataframe_utils.configure_dataframe_formatter`), `packages/blocks/src/blocks/visualization-blocks.ts` (`_dntk.DeepnoteChart`), `packages/blocks/src/blocks/input-blocks.ts`, `packages/runtime-core/src/agent-handler.ts` — the Python-RPC value-add seams.
- `packages/reactivity/src/ast-analyzer.ts:9-14` (`AstAnalyzerInternalError`), `:16-32` (supported-cell-types list), `scripts/ast-analyzer.py` (`ast.parse` + `jinja2`) — the Python-AST reactivity logic.
- `packages/cli/src/commands/run.ts:444` — `if (!options.block) { return undefined }` early-return in `resolveUpstreamExecutionBlockIds` (called from `:879` whole-notebook and `:708` dry-run); `:459` — `getUpstreamBlocks` analyzer invocation, reached only on the `--block` path past that early-return. The early-return is what keeps the whole-notebook run analyzer-free.

---

## Revision History

| Date       | Status   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-06-11 | Proposed | Initial proposal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-06-11 | Proposed | Reframed override-collision (Decision point 3, Key Factor 5, validation test, Related Decisions) as _contingent_ on the still-unwritten kernel-selection source & precedence NOM rather than asserting a settled "non-Python override wins" outcome; corrected the `run.ts:444` citation to describe the `if (!options.block)` early-return and the actual analyzer invocation at `getUpstreamBlocks` (`run.ts:459`) on the `--block` path, noting `resolveUpstreamExecutionBlockIds` is called from both `run.ts:879` and `run.ts:708`; corrected agent-branch citations to the branch head `execution-engine.ts:236` through the else-to-dispatcher at `:374`, with `:328-340` described as within the branch. Decision unchanged. |
| 2026-06-11 | Accepted | Promoted NOM-004 → ADR-004 via the draft→review→revise→verify gate: adversarial review (request-changes, 3 findings) applied; independent verify confirmed all findings resolved, citations accurate, no solutioning introduced. Accepted alongside ADR-003 (companion selection decision).                                                                                                                                                                                                                                                                                                                                                                                                                                          |
