---
verdict: APPROVAL
card_id: ohoh63
review_number: 1
commit: 29a863c
date: 2026-06-10
has_backlog_items: true
---

# Review: emit-adr-001-bare-python-hint-on-cli-deepnote-run (ohoh63)

## Summary

APPROVED. The card closes the open CLI half of the ADR-001 obligation: when
`deepnote run` resolves the Python interpreter to a bare system `python` with no
real override, it now emits the same actionable hint the MCP consumer already
returns. The implementation is a faithful, correctly-adapted mirror of the MCP
half, the gating logic is genuinely exercised by tests (not reimplemented), and
there are no precedence regressions.

## Gate 1 — completion claim

DoD is required (this touches control flow and user-observable CLI output) and is
present and sound:

- **Intent** is concrete and externally checkable: a bare-system-python
  resolution with no override should produce a human-readable warning so the
  otherwise-opaque downstream import failure is surfaced up front.
- **Observable outcomes** are user-facing, not implementation-detail: hint fires
  on bare autodetect with no override; silent when `--python`/`DEEPNOTE_PYTHON`
  is a real override; silent for a non-bare interpreter; silent in machine-output
  mode; fires when `DEEPNOTE_PYTHON` is blank (blank ≠ override).
- **Capstone:** the "logs the hint when resolution lands on bare system python
  with no override" test is the unfakeable end-to-end check. It drives the real
  `createRunAction` boundary through the genuine shared `selectPythonSpec` +
  `isBareSystemPython` (runtime-core is `importOriginal`-spread; only
  `ExecutionEngine`/`resolvePythonExecutable` are stubbed, with autodetect forced
  to bare `python` via a `node:child_process.execSync` mock). The hint gating
  cannot be ticked by mocking the system under test. No weak `no-capstone`
  declaration was needed or made.

Checkbox design proves correctness: every acceptance-criteria box maps to a
specific test, and failure modes (override present, blank env, non-bare,
machine-output) are covered, not just the happy path. Checkbox integrity holds —
the green-suite claim (162 passed) was re-run during review and reproduces
exactly. Code-review / PR / deploy boxes are correctly left unchecked.

## Gate 2 — implementation quality

- **ADR-001 compliance.** ADR-001 (lines 71-73, 99-102, 233-237) requires every
  deepnote-run consumer to surface a bare-system-python hint and explicitly calls
  out re-exporting `isBareSystemPython` so consumers can reach it. `run.ts` now
  imports `isBareSystemPython` from `@deepnote/runtime-core` and gates the hint on
  `isBareSystemPython(spec) && !hasOverride`. Matches the ADR.

- **Cross-consumer parity (DRY-adjacent).** `resolvePythonSpecWithHint` mirrors
  the MCP consumer's `resolvePythonEnv` (`packages/mcp/src/tools/execution.ts:113`)
  one-to-one: same precedence call, identical `isRealOverride` blank-handling,
  same gate, same hint sentence. The only delta is the correct surface adaptation
  (`pass pythonPath` → `pass --python`). Two near-identical functions across two
  packages is a watched-but-acceptable duplication here — the shared selector
  (`selectPythonSpec`) and predicate (`isBareSystemPython`) already live in
  runtime-core; only the thin per-consumer wording wrapper is duplicated, which is
  consumer-surface-specific by design (the ADR deliberately keeps producer/consumer
  wording per-surface). Flagged as a follow-up, not a blocker.

- **Blank-vs-absent handling is correct.** `isRealOverride` treats whitespace-only
  values as non-overrides, so `DEEPNOTE_PYTHON=''` falls through to autodetect AND
  still triggers the hint — the exact case where a naive `!= null` check would both
  resolve bare and silence the warning. There is a dedicated test for this.

- **Machine-output safety.** Hint is gated behind `!isMachineOutput`
  (`isMachineOutput` is defined at line 283, well before the line-328 check), so
  `-o json` output stays clean JSON. Covered by a test.

- **No precedence regression.** `pythonEnv` handed to `ExecutionEngine` is still
  the same spec the prior `selectPythonSpec({ explicit })` produced; the hint path
  is purely additive. All 156 pre-existing `run.test.ts` cases (including the
  `pv4px0` precedence suite) remain green.

- **TDD.** Tests read as a contract for the hint behavior (fires/silent matrix),
  define negative cases first-class, and were committed with the implementation.
  Not reverse-engineered from internals — they assert on observable console output
  via `getOutput(consoleLogSpy)`, not on return shapes.

- **Verification reproduced.** `pnpm exec vitest run
packages/cli/src/commands/run.test.ts` → 162 passed, confirming the executor's
  trace.

No blockers.

## BLOCKERS

None.

## FOLLOW-UP

- **L1 (docs-parity-gap).** The MCP README documents the bare-python hint
  (`packages/mcp/README.md:144-147`); the CLI README has no Python-interpreter
  resolution section at all, so the CLI hint is undocumented for parity. The
  card listed this as "Optional", and a yellow status line is largely
  self-explanatory to a user who sees it, so this is non-blocking — but a short
  "Python interpreter" subsection in `packages/cli/README.md` mirroring the MCP
  README would close the documentation half of the parity story.

- **L2 (consumer-coverage-gap).** The card's own "Further Investigation" note
  asks whether other deepnote-run producers/consumers (e.g. the external
  vscode-deepnote producer) honor the hint obligation. ADR-001 explicitly scopes
  the producer as out-of-repo and unverifiable here, so this is a discovery/triage
  item for the planner, not deferred in-scope work from this card.
