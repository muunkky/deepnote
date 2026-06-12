---
verdict: APPROVAL
card_id: 41mrnp
review_number: 1
commit: 079c133
date: 2026-06-11
has_backlog_items: true
---

# Review — step-3a-sub-phase-1b value-add block hard-fail on non-Python kernel

## Summary

APPROVAL. The diff faithfully implements ADR-004 Decision point 1 (R4 / KD-4) and
the design-doc Sub-phase 1B contract. `VALUE_ADD_BLOCK_TYPES` is derived from the
canonical `executableBlockTypes` minus `'code'` (no schema change, single source of
truth), `UnsupportedBlockOnKernelError` mirrors the house `UnsupportedBlockTypeError`
pattern and carries `blockType` + `kernelName`, and the engine guard fires at the
dispatch seam inside the per-block `try` — before the agent branch and before
`createPythonCode` — so the thrown error is caught and `break`s the loop
(abort-at-block, matching the existing execute-then-break failure semantics at
`execution-engine.ts:431-446`). The `python3` fast-path in `isNonPythonKernel`
guarantees the existing path is byte-stable.

## Gate 1 — completion claim

A DoD is required (this touches control flow, an error type, and the engine dispatch
seam). The DoD is well-formed:

- **Intent** is concrete and outside-the-code: a user on a non-Python kernel hitting a
  value-add block gets an immediate typed failure naming block + kernel, rather than an
  opaque kernel-native parse error or a silent wrong result. A reasonable engineer can
  sanity-check the diff against it.
- **Observable outcomes** are user-observable and testable (abort with typed error; no
  value-add RPC dispatched; plain code+md completes; python3 unaffected; drift-guard
  coverage).
- **Capstone is genuine and unfakeable.** `[markdown, code, sql, code]` on bash vs
  python3 walks the assembled end-to-end behavior: markdown + first code dispatch, abort
  at sql with the typed error, second code never runs, no value-add RPC dispatched; the
  identical notebook on python3 runs all three executable blocks with sql dispatched
  normally. It cannot be ticked by one unit test in isolation and is not mockable away —
  it inspects the actual strings handed to the mocked `kernel.execute`.

Checkbox design is sound — boxes map to the acceptance criteria and the Observables, and
cover failure/regression paths (python3 inertness, plain-code completion) rather than
happy-path only. Integrity verified: every `[x]` is backed by a real, passing test.

### Capstone wording deviation — reviewed, accepted

The card's capstone text says "no `_dntk.*` string is ever passed to `kernel.execute`",
but the test asserts `not.toContain('_dntk.execute_sql')` rather than the literal
substring `_dntk`. I verified this is the correct interpretation, not a weakened capstone:

- Plain `code` blocks are routed through `createPythonCode` unchanged on a non-Python
  kernel (design-doc lines 82-83 route plain code/markdown straight to
  `createPythonCode→execute`). `createPythonCodeForCodeBlock` (`code-blocks.ts:6-14`)
  prepends a **guarded** `if '_dntk' in globals(): _dntk.dataframe_utils...` DataFrame
  preamble (`data-frame.ts:11-12`) to plain code. So a literal `not.toContain('_dntk')`
  assertion would falsely fail on the surviving `code` block on bash.
- ADR-004's settled invariant (line 11, line 50) and the design's R4 (lines 20, 175) are
  about **value-add Python RPC** (`_dntk.execute_sql`, `_dntk.DeepnoteChart`, etc.) — not
  the defensive `if '_dntk' in globals()` guard, which is a no-op by construction on a
  kernel where `_dntk` is never injected. The test asserts exactly the prohibited thing.

The executor documented this deviation transparently in the card close-out and in the
test comments. The guarded plain-code preamble is correctly identified as a separate,
pre-existing concern owned by the real-kernel step, not this card. No card-structure
blocker.

## Gate 2 — implementation quality

- **ADR / design compliance:** guard placement (`execution-engine.ts:256-266`), keyed on
  `isNonPythonKernel(this.config.kernelName ?? DEFAULT_KERNEL_NAME, this.kernelLanguage)`,
  matches ADR-004 Implementation Notes and design KD-4 exactly. The inline comment cites
  the ADR and explains why the seam is before codegen. `agent` is in
  `VALUE_ADD_BLOCK_TYPES`, so an agent block on a non-Python kernel hard-fails before the
  `OPENAI_API_KEY` check and `executeAgentBlock` — the ADR-intended behavior, achieved
  through the same type-agnostic guard.
- **TDD shape:** tests read as specification, not reverse-engineered. Negative and
  regression cases are present (python3 inertness, plain-code completion, no-RPC
  invariant). The capstone exercises the assembled path against real codegen strings, not
  mocked-away collaborators — the mock is the kernel transport boundary, which is correct
  (the SUT is the engine's dispatch decision, not the kernel).
- **KD-4 drift guard is real, not a no-op.** The test structurally parses `python-code.ts`
  for `is<Name>Block(block)` dispatcher guards, resolves each to its `block.type === '...'`
  literal from the guard source files, and asserts every dispatched type except `code` is a
  `VALUE_ADD_BLOCK_TYPE`. I verified all 15 dispatcher guards match the
  `function is<Name>Block ... block.type === '<literal>'` shape, so the extraction
  resolves correctly; the `dispatchedTypes.has('code')`/`has('sql')` sanity assertions
  prevent a silently-empty extraction from passing. A new value-add dispatcher branch left
  unclassified would fail this test — exactly the design-doc risk-mitigation intent.
- **Error type:** `UnsupportedBlockOnKernelError extends DeepnoteError` correctly threads
  an optional `ErrorOptions` for cause-chaining and produces a self-explanatory message.
  Exported from `@deepnote/blocks` alongside the predicates.
- **No lazy solves, no DRY violations, no security concerns.** The only micro-duplication
  is reading `this.config.kernelName ?? DEFAULT_KERNEL_NAME` twice in the guard — trivial,
  not worth a change.

### Verification performed

- `npx vitest run` on both changed test files → **121 passed** (30 + 91).
- `tsc --noEmit` on `@deepnote/blocks` + `@deepnote/runtime-core` → exit 0.
- Confirmed catch/break abort-at-block semantics and the `.error` field assignment path.
- Confirmed SQL codegen emits `_dntk.execute_sql*` and plain code emits the guarded
  preamble, validating the capstone assertion's correctness.

## FOLLOW-UP

- **L1 (test-coverage-gap, low):** The engine guard is type-agnostic and the drift guard
  proves `agent` ∈ `VALUE_ADD_BLOCK_TYPES`, but there is no dedicated engine test asserting
  an `agent` block hard-fails on a non-Python kernel *before* the `OPENAI_API_KEY` check /
  `executeAgentBlock`. Behavior is covered by construction (same guard, same loop), so this
  is defensive only — a single test fixturing an agent block on bash would close it.
- **L2 (cross-card-invariant, informational):** The guarded `if '_dntk' in globals()`
  DataFrame-formatter preamble still rides on plain `code` blocks dispatched to a
  non-Python kernel. It is inert by construction here, but the real-kernel integration
  step (step 5 / R7) is the right place to confirm a live non-Python kernel tolerates that
  guarded preamble (it should, since the guard short-circuits), and to decide whether the
  preamble should be omitted entirely on non-Python kernels for cleanliness. Already
  flagged by the executor; recorded so the planner can route it to the real-kernel card
  rather than losing it.

No card-structure or code-quality blockers. Approving.

### Close-out actions

- Reviewer flips the card out of `in_progress` (approval). PR-merge / deploy / monitoring
  boxes remain owned by later stages, correctly left unchecked.
