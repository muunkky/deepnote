---
verdict: APPROVAL
card_id: ngjse2
review_number: 1
commit: 4814f0b
date: 2026-06-11
has_backlog_items: false
---

# Review — ngjse2 (step 3B / Sub-phase 1B: reactivity bypass on non-Python, both analyzer sites)

## Verdict: APPROVAL

Both gates pass. The diff threads the resolved `kernelName` into the two Python-AST analyzer
call sites and bypasses them on a non-Python kernel, emitting a single-sourced "Reactivity is
Python-only" notice and running blocks in existing order. It matches ADR-004 Decision pt 2 as
reconciled by design-doc KD-5, compiles clean, and is covered by behavior-level TDD tests
including a genuine end-to-end capstone.

## Gate 1 — completion claim (PASS)

- **DoD present and strong.** Intent is plain-English and sanity-checkable (skip the analyzer
  subprocess we know will fail on non-Python source; tell the user reactivity is Python-only;
  python3 unchanged), with a concrete failure-mode description. Observables are user-observable
  (analyzer-not-called, notice emitted, regression on python3), not implementation-detail.
- **Capstone is real and unfakeable.** The capstone walks BOTH arms through the real
  `createRunAction`/`action` entry point with the REAL `isNonPythonKernel` gate (runtime-core
  mocked with `...actual`, so the genuine name-based predicate is exercised, not a duplicate):
  the non-Python `--block` arm asserts the mocked `getUpstreamBlocks` is `not.toHaveBeenCalled()`,
  the notice is emitted, and the block runs in order (`blockIds: undefined`); the identical
  python3 arm asserts the analyzer IS called once and the upstream dependency resolves
  (`blockIds: [upstream, target]`). The mock is the correct oracle here — the observable KD-5
  contract is precisely "the analyzer is not invoked," and a mocked-away analyzer cannot fake
  `not.toHaveBeenCalled()`.
- Acceptance criteria and Observables are all covered by the checkbox set; no trivially-satisfied
  or title-restating boxes. Integrity holds — the executor left reviewer/closeout boxes unchecked.

## Gate 2 — implementation quality (PASS)

**ADR / design-doc compliance.** ADR-004 Decision pt 2 prose scopes the reactivity guard narrowly
to `getUpstreamBlocks` and warns against guarding the whole-notebook *execution* path
(`execution-engine.ts:375`, which is analyzer-free by construction). The diff also guards
`validateRequirements`/`getBlockDependencies`. This is correct, not ADR drift: design-doc KD-5
explicitly corrects ADR-004's narrower claim (KD-5 point 2 — "the whole-notebook path also
analyzes... ADR-004's narrower true claim was only about `getUpstreamBlocks`. Both sites get the
bypass") and the Sub-phase 1B deliverable mandates threading `kernelName` into both functions.
`getBlockDependencies` is verified to be the same Python-AST analyzer (spawns
`scripts/ast-analyzer.py`, throws `AstAnalyzerInternalError` — `packages/reactivity/src/ast-analyzer.ts:74-133`).
The ADR's anti-dead-code warning concerns the *execution* dispatch, not `validateRequirements`'s
pre-flight input validation, which genuinely invokes the analyzer. Two-site bypass is sound.

**Guard placement.** In `resolveUpstreamExecutionBlockIds` the guard sits after the
`if (!options.block) return undefined` early-return and before any scope/DAG work, reusing the
fatal-branch `return undefined` ordered-execution fallback shape — exactly as KD-5 prescribes. In
`validateRequirements` the guard sits *after* the integration check (which is not reactivity-related
and must always run, so SQL-integration validation still fires on non-Python) and *before*
`getBlockDependencies`; skipping input validation matches the pre-existing degraded end-state
(today the Python path already swallows analyzer failure and skips input validation), so no new
correctness gap beyond the disclosed, ADR-accepted trade-off.

**Predicate choice.** The executor used `isNonPythonKernel(kernelName)` rather than the design
doc's literal `kernelName !== DEFAULT_KERNEL_NAME`. These are equivalent on the no-language
pre-connect path (with no `language`, `isNonPythonKernel` reduces to `kernelName !== 'python3'`),
and routing through the shared predicate keeps the bypass single-sourced with the rest of the
degradation work — a better-long-term choice, not a deviation.

**DRY / notice.** `REACTIVITY_PYTHON_ONLY_NOTICE` + `emitReactivityPythonOnlyNotice(isMachineOutput)`
centralise identical text across both sites and route to `debug` (→ `console.error`, suppressed
from machine-output stdout) in machine mode, mirroring the existing python-hint and resolved-kernel
notices. Confirmed `log` → `console.log` and `debug` → `console.error` in `output.ts`, so the
machine-output-suppression test asserts on the right channel.

**TDD evidence.** Tests assert observable behavior (analyzer not-called, notice in stdout,
`runProject` `blockIds` shape), not internals. Failure/regression cases exist (python3 arm,
machine-output suppression, dry-run bypass). The capstone walks the assembled path end-to-end.
`@deepnote/reactivity` is mocked at the call boundary; `isNonPythonKernel`/`selectKernelName`/
`DEFAULT_KERNEL_NAME` are kept real. No overmocking of the system under test.

**Verification run (reviewer-executed):**
- `vitest run packages/cli/src/commands/run.test.ts` from the repo root (the project's canonical
  `pnpm test` CWD) → **176 passed (176)**.
- `tsc --noEmit` (cli) → exit 0.
- `biome check` on `run.ts` + `run.test.ts` → clean, no fixes.

**Note on a transient apparent failure (not a blocker).** Running the suite via
`pnpm --filter @deepnote/cli exec vitest` (CWD = `packages/cli`) surfaces two failures —
`creates ExecutionEngine with correct config` (expects autodetect `'python'`; this machine has no
bare `python`, only `python3`) and the first reactivity test (`ENOENT examples/2_blocks.deepnote`).
Both stem from the file's pre-existing relative-fixture convention (`join('examples', ...)`,
present at lines 135-137 and used at lines 323/363/399/2330 BEFORE this diff) resolving against
CWD. Verified the `creates ExecutionEngine` failure reproduces identically on the parent commit
(`4814f0b~1`) — it is pre-existing and environment-specific, unrelated to this card. The new
`resolveUpstreamTargetPair` helper follows the same established convention. Under the canonical
`vitest run` from repo root (root `package.json` `"test": "vitest run"`), all 176 pass.

## BLOCKERS

None.

## FOLLOW-UP

None. The CWD-relative-fixture coupling is a pre-existing project convention spanning the whole
`run.test.ts` file, not adjacent debt this diff makes worse — surfacing it as a finding here would
be an unanchored refactor opinion rather than a symptom this card introduced.

## Outstanding close-out actions

- Reviewer/closeout-owned boxes remain correctly unchecked: Code Review Approved, PR merged,
  production deploy / monitoring (N/A for a fork library card), stakeholder notification,
  follow-up tickets, associated ticket closed. No tech debt, no follow-up cards.
