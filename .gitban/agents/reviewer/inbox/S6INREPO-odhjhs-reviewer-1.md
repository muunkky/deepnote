---
verdict: APPROVAL
card_id: odhjhs
review_number: 1
commit: 8543495
date: 2026-06-10
has_backlog_items: false
---

# Review: extract shared `selectPythonSpecWithHint` into runtime-core (dedupe CLI/MCP bare-python hint)

## Summary

APPROVAL. This is a textbook behavior-preserving Extract-Method-to-shared-module
refactor that closes exactly the drift class ADR-001 targets. The duplicated
bare-system-python hint resolution (`isRealOverride` gate + identical hint string),
previously copy-pasted into `cli/run.ts` (`resolvePythonSpecWithHint`) and
`mcp/execution.ts` (`resolvePythonEnv`), is now a single runtime-core export
`selectPythonSpecWithHint({ explicit, argLabel })`. Both consumers are reduced to
one-line delegates. The card's self-attestation holds up under verification.

## Gate 1 — Completion claim

The card requires a DoD (it touches a public API contract — a new runtime-core
export — plus control flow in two consumers). The DoD is strong:

- **Intent** is plain-English, names the outside-the-code symptom (one
  implementation of the warning instead of two copy-pasted ones; CLI and MCP
  observably identical because it is literally the same code) and the regression
  signature (CLI/MCP hint divergence or a stale duplicate reappearing). Not a
  title restatement.
- **Observable outcomes** are concrete and testable, including the deletion of
  both inline resolvers and the removal of the duplicated inline `isRealOverride`.
- **Capstone** is legitimate and unfakeable: bare autodetect + no override surfaces
  the hint via the single shared helper, proven by (a) 11 new runtime-core unit
  tests exercising the override matrix and blank cases, and (b) the EXISTING CLI
  and MCP suites passing UNCHANGED. The "existing consumer suites pass unmodified"
  framing is a good behavior-preservation capstone for a refactor — it cannot be
  ticked by a self-consistent rewrite of the tests.
- Checkbox design is sound; if every box is true the work is correct. Integrity
  verified below (boxes are honest).

Gate 1 PASS.

## Gate 2 — Implementation quality

Verified the full 3-commit range (`2b19de6^..8543495`).

**Helper (`packages/runtime-core/src/python-env.ts`).** Clean. Computes the spec
via the existing `selectPythonSpec`, and rather than re-introducing an inline
`isRealOverride` it reuses the existing `firstNonBlank` helper for the non-blank
override check (`firstNonBlank(explicit) != null || firstNonBlank(process.env.DEEPNOTE_PYTHON) != null`)
— this is a DRY improvement over both prior copies, not just a move. The
`isBareSystemPython(spec) && !hasOverride` gate is preserved exactly. JSDoc is
thorough and correctly documents the compute-vs-surface split (helper computes,
consumer surfaces). Exported from `index.ts`; present in the built `dist/index.d.ts`.

**Behavior-preservation of the hint string (the key check).** The unified message is
`Resolved Python to "<spec>" (system interpreter) which likely lacks deepnote-toolkit. Set DEEPNOTE_PYTHON or pass <argLabel> pointing at a venv with deepnote-toolkit[server] installed.`

- For the CLI (`argLabel: '--python'`) this is **byte-identical** to the prior CLI
  string (which already said "pass --python pointing at a venv").
- For the MCP (`argLabel: 'pythonPath'`) the only delta is the prior "pass pythonPath
  **to** a venv" becoming "pass pythonPath **pointing at** a venv" — a cosmetic
  wording fragment. I confirmed independently that NO test in
  `execution.python-env.test.ts` or `run.test.ts` asserts on the "to a venv" /
  "pointing at" fragment (grep over both suites); the hint assertions only check
  `system interpreter`, `DEEPNOTE_PYTHON`, and `deepnote-toolkit`, all preserved.
  The card disclosed this change honestly. Acceptable.

**Hint-fires-only-on-bare-autodetect-with-no-real-override** is preserved and is
exactly what the 11 new tests pin: bare+no-override fires; explicit arg / real
`DEEPNOTE_PYTHON` / non-bare spec → no hint; blank explicit / blank env / both
blank → fires (blank is not an override); explicit bare env override → no hint.
These are real failure/edge cases, not happy-path-only — consistent with TDD.

**CLI `!isMachineOutput` print gate** stays in `run.ts` at the call site
(`if (pythonHint && !isMachineOutput) log(getChalk().yellow(pythonHint))`); only
the resolution moved. Confirmed.

**Consumers.** Both reduced to thin delegates; now-unused imports
(`isBareSystemPython`, `selectPythonSpec`) dropped from both. No dead code left.

**Versioning/docs.** runtime-core 0.4.0 → 0.5.0 (correct semver minor for an
additive public export, no signature change to existing exports). CHANGELOG entry
under `[0.5.0] / Added` accurately describes the new export and the dedup.

**ADR compliance.** ADR-001 explicitly motivates centralizing the resolution chain
in runtime-core so "CLI and MCP resolve interpreters by different code" cannot
recur; this card moves the last duplicated layer (the hint) into that shared home.
ADR-001 defers exact hint wording to the design doc, so the cosmetic MCP wording
shift is not an ADR violation.

**Verification I ran (not just trusting the attestation):**

- `vitest run` on all three suites: 224 passed (runtime-core 49 incl. 11 new, MCP
  13 unchanged, CLI 162 unchanged) — matches the attested baselines exactly.
- `biome check` on all 4 changed source files: clean, no fixes.
- `tsdown --dts` build of runtime-core: exit 0, new export present in emitted
  `.d.ts`; the MCP/CLI suites passing against the new signature confirms the
  consumer call sites typecheck.

No lazy solves, no widened catches, no loosened types. DRY improved. Security N/A
(no secrets, no injection surface — pure string construction with a controlled
`argLabel` from two literal call sites).

Gate 2 PASS.

## BLOCKERS

None.

## FOLLOW-UP

None. The diff exposes no untested path, no consumer-coverage gap, and no adjacent
debt the change worsens. The one residual cosmetic ADR-text/hint-text mismatch
(ADR-001 line 73 quotes "pass pythonPath to a venv" as illustrative prose) is
immaterial — the ADR delegates wording to the design doc and the quote is
descriptive, not normative.

## Close-out actions

- Flip the two `Code reviewed (gitban reviewer)` checkboxes to `[x]` (Code Review
  row in Refactoring Phases, and Completion Checklist item) — they were correctly
  left unticked for the reviewer.
