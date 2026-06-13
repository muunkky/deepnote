---
verdict: APPROVAL
card_id: mxxsr6
review_number: 1
commit: 56da693
date: 2026-06-13
has_backlog_items: false
---

# Review — step 7C: input / button / separator renderers (LUIVIEW1)

## Gate 1 — completion claim: PASS

The DoD is strong. Intent is plain-English and concrete (each widget shows its last-saved
state but cannot be changed; slider sits at saved position, checkbox shows checked state,
button shows label but does nothing, separator draws a line). Per-renderer capstones are
present and unfakeable — each asserts real DOM (jsdom + RTL) from fixtures, not mocks:

- Capstone (input): asserts label + persisted `deepnote_variable_value` in real DOM with the
  `assertNoMutatingControl` invariant.
- Capstone (button): asserts label in real DOM, `disabled`, `onclick === null`, and an inert
  fired click.
- Capstone (separator): asserts the `<hr data-separator>` element.

This is a composed feature (10 registry keys across three groups) and it carries three
group-level capstones plus a public-dispatch assertion — exactly the right capstone design
for a packed card. Checkboxes cover the acceptance criteria and prove correctness if honest.
Integrity verified: every checked box is backed by a real test in the diff.

## Gate 2 — implementation quality: PASS

**Read-only enforcement is genuine — verified at source, not just in tests.** A source-level
grep across all new renderer files finds zero `onClick`/`onChange`/`onInput`/`onSubmit`/
`onKeyDown` handlers, zero `useState`, zero `dispatch`. The only matches for `onClick` are in
ButtonRenderer's doc-comments. The constraint (R8) is structurally enforced, not merely
asserted:
- Six input kinds render static text only.
- `input-checkbox` is a real `<input type=checkbox>` but `disabled` + `readOnly`, no change
  handler — an inert reflection of persisted state.
- `input-slider` is a native `<progress>` (non-interactive by definition), with the numeric
  value also shown as text.
- `button` is a `disabled` `<button>` with no `onClick` — clicking is inert.

The `assertNoMutatingControl` helper is the right design: it whitelists exactly the two
allowed native elements (disabled checkbox, progress) and rejects any `<select>`, `<textarea>`,
or non-checkbox/enabled `<input>`. Applied across all eight input tests. This is the
load-bearing invariant and it is honestly tested.

**Test-repoint keeps the unknown-fallback honest.** Repointing `BlockRenderer.test.tsx`'s
fallback test from `separator` (now a registered key) to a synthetic `future-block` is
correct and necessary. Verified `future-block` is registered nowhere in source and is not a
real `BlockVM` type (cast via `as`), so the `default` branch is genuinely exercised. Had the
test kept `separator`, it would have passed for the wrong reason (hitting a registered
renderer) — the repoint preserves the invariant. This is the only edit to a sibling-shared
file and it is minimal and well-commented.

**Additive registry edit is clean.** The ten keys are appended into the `BLOCK_RENDERERS`
object literal; dispatch logic is untouched. `BlockRenderer.inputs.test.tsx` explicitly guards
the keep-both seam (asserts code/markdown/text-cell-callout/default remain registered),
which is the right defense against a non-additive clobber during merge with 7A/7B/7D.

**Metadata shapes are correct.** Cross-referenced the fields the renderers read against the
canonical `@deepnote/blocks` definitions: slider value is a string (`'5'`) with numeric
min/max, checkbox value a boolean, select a string-or-array, date-range a `[start, end]` tuple
or relative string. The renderers narrow on the `type` discriminant before reading metadata
and handle both the array and scalar cases for select and date-range. The slider's
`max={span}` / `value={safeValue - min}` offset correctly positions non-zero-based ranges,
with a guarded zero/negative span.

**TDD evidence.** Tests are behavior-driven (assert on rendered DOM and the read-only
invariant, not internal shapes), include failure/edge cases (unchecked checkbox, empty file
placeholder, relative date-range string, no-title button fallback), and the capstones walk
real assembled DOM. This reads test-first, not reverse-engineered.

**Boundary / isolation (ADR-006/007).** No `node:` builtins in any new file; `@deepnote/blocks`
is consumed type-only via `BlockVM`. Consistent with the package-layout boundary.

**Verification reproduced.** Ran `vitest run src/blocks/` in the parent tree: **13 files / 79
tests passed** (post-merge with siblings). Green.

## FOLLOW-UP

None. The deferred README block-type coverage-matrix note is correctly scoped to the Phase 8
closeout (shared territory with 7D) and is not in-scope for this packed card — that is a
legitimate deferral to a real downstream checkpoint, not an escape hatch for incomplete work.
