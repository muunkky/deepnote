---
verdict: APPROVAL
card_id: 3oz7aa
review_number: 1
commit: 1cec326
date: 2026-06-10
has_backlog_items: false
---

# Review: empty-string interpreter fallback + test-fidelity hardening

## Gate 1 — Completion claim: PASS

The card requires a DoD (it changes control flow in `selectPythonSpec` / `resolvePythonEnv`,
JSDoc, and test behavior). The DoD is sound:

- **Intent** is concrete and sanity-checkable: empty/blank interpreter signals must fall
  through precedence like absent ones (the `?? ` vs `||` regression), and three named tests
  that asserted against a mock reimplementation / a tautological expected / a bare
  `toBeDefined()` must now genuinely fail on regression.
- **Observables** are user-observable and specific, with a strong, unfakeable **capstone**:
  blank `DEEPNOTE_PYTHON` → autodetect spec via both the selector and the MCP `deepnote_run`
  path, with the bare-python hint still firing, "proven by a test that fails on the current
  `??` code and passes after the fix." This is not mockable into a false green.
- Checkbox design proves correctness if honestly ticked.

The unticked checkboxes are the documented artifact of the executor's mid-run socket death
(commit 1cec326 salvaged by the dispatcher); per the dispatcher note I reviewed the diff on
its merits, not the checkbox state. Gate 1 passes; proceeding to Gate 2.

## Gate 2 — Implementation quality: PASS

The diff delivers exactly what the Intent promises, with TDD-shaped tests that genuinely
fail on the named regressions. Each Observable is met:

- **Capstone (empty/blank → autodetect, hint fires).** `python-env.test.ts` adds blank /
  whitespace `explicit` and `DEEPNOTE_PYTHON` cases asserting `'python'` (not `''`).
  `execution.python-env.test.ts` adds MCP capstone tests for empty `pythonPath` and blank
  `DEEPNOTE_PYTHON` resolving to the autodetect spec, plus two tests asserting the hint still
  fires for those empty-but-not-real-override cases. All fail on the pre-fix `??` semantics.
- **selectPythonSpec / JSDoc.** `firstNonBlank` collapses empty/whitespace to `undefined`
  before the `??` chain, and crucially returns the value _unchanged_ when non-blank — so a
  legitimate spec with surrounding content is untouched (no destructive trimming of the
  resolved path). JSDoc rewritten to document empties-as-absent and explicitly call out the
  old `??`-passthrough hazard. Matches ADR-001 precedence (`arg > DEEPNOTE_PYTHON >
autodetect`); empties-as-absent is consistent with the ADR's intent.
- **hasOverride.** `isRealOverride` (`value != null && value.trim().length > 0`) replaces the
  `!= null` check, so a blank signal no longer suppresses the bare-python hint. The JSDoc on
  `resolvePythonEnv` is updated to match.
- **CLI fidelity.** The key fidelity fix: the prior `selectPythonSpec` mock (a precedence
  reimplementation) is deleted; the test now mocks only `node:child_process.execSync` (the
  leaf the real `detectDefaultPython` calls via a named ESM import, which the module-factory
  mock correctly intercepts) so the genuine shared selector runs. The full precedence suite
  (`--python` wins, `DEEPNOTE_PYTHON` honored, autodetect fallback) now exercises real code —
  a real precedence regression would fail it.
- **MCP de-tautologized.** `AUTODETECTED_PYTHON` is hardcoded `'python'` (fixed by the same
  `execSync` mock) instead of being derived from `detectDefaultPython()` under test; a wrong
  autodetect wiring now resolves to something else and fails the comparison.
- **agent-handler cap value.** The `toBeDefined()` assertion is replaced by invoking the
  captured `stopWhen` predicate at 9/10/11 steps and asserting `false/true/false` — proving
  the cap value is exactly 10, not merely that some stop condition was wired.

Verification corroborated by the dispatcher on the merged sprint branch: typecheck clean;
runtime-core 228/228, mcp python-env 13/13, cli run 156/156 green; biome clean on all six
changed files. The mock contract is internally consistent — `isPythonAvailable('python')`
calls `execSync('python --version', { stdio: 'ignore' })`, which the test mocks satisfy
exactly, and `isBareSystemPython('python')` returns true so the hint assertions hold.

No lazy solves, no scope dilution, no ADR drift, no DRY violations (the `firstNonBlank` /
`isRealOverride` helpers are appropriately localized; both are single-concern). The two
adjacent follow-ups the diff touches (CLI bare-python hint `ohoh63`, `executeAgentBlock`
tool-wiring/finally coverage `fkxnne`) are already tracked on their own cards and correctly
left out of scope.

## BLOCKERS

None.

## FOLLOW-UP

None. The diff exposes no new untracked debt: the two adjacent gaps it brushes against
(`ohoh63`, `fkxnne`) are already carded, and the empties-as-absent behavior is now covered
at both the unit (runtime-core) and integration (MCP) layers.

## Outstanding close-out actions

- The executor's mid-run death left the card's DoD/Observable/checkbox boxes unticked. They
  are all satisfied by commit 1cec326; the dispatcher/closeout should reconcile the card
  checkbox state to reflect the salvaged, verified work.
