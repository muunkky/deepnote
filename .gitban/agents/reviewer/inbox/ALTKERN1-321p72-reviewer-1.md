---
verdict: APPROVAL
card_id: 321p72
review_number: 1
commit: 778b05b
date: 2026-06-11
has_backlog_items: true
---

# Review — 321p72 (step 4B: anchor run.test.ts fixture paths to a module-relative base)

## Verdict: APPROVAL

A clean, well-scoped test-infrastructure reliability fix. The diff re-anchors
both fixture families in `packages/cli/src/commands/run.test.ts` from
`process.cwd()`-relative paths to the test module's own directory via
`import.meta.url`, and adds a module-load guard that fails loudly with an
absolute path if a fixture base directory is missing. Capstone independently
verified.

## Gate 1 — Completion claim (PASS)

- **DoD required and present.** This card changes test behavior (fixture
  resolution + a new module-load guard), so a DoD is required and the card
  carries a strong one.
- **Capstone is strong and unfakeable.** "The full `run.test.ts` suite passes
  identically whether vitest is launched from the repo root **or** from
  `packages/cli` … showing the same pass count." This forces real end-to-end
  execution from two distinct CWDs; it cannot be ticked by a single mocked unit
  test, and it directly proves the property under change (CWD-independence).
- **Intent ↔ Observables consistent.** The Defect section describes the
  process-relative fragility precisely; the three scenarios (repo-root green,
  `packages/cli` green, missing-fixture-fails-loudly) map cleanly to the diff.
- **Checkbox integrity verified** against my own runs below — the checked boxes
  are truthful.

## Gate 2 — Implementation quality (PASS)

**Independently verified, not taken on trust:**

- **On-disk fixture locations** — confirmed `examples/` and
  `test-fixtures/formats/` both live at the repo root (no `packages/cli/examples/`),
  so the four-level walk `MODULE_DIR/../../../../` from
  `packages/cli/src/commands` lands exactly on the repo root. Walk depth correct.
- **Capstone, repo-root CWD** — `vitest run … run.test.ts` from repo root:
  `RUN v4.1.8 …/deepnote`, **182 passed (182)**. No behavioral change (Scenario 1).
- **Capstone, `packages/cli` CWD** — ran from `packages/cli` with the shared
  config and *no* `--root` override; the `RUN` banner reported root
  `…/deepnote/packages/cli` (genuinely the package dir, not repo root), and the
  suite still went **182 passed (182)** (Scenario 2). This is the real
  CWD-independence proof: with vitest rooted at `packages/cli`, any surviving
  `process.cwd()`-relative fixture would resolve to a non-existent
  `packages/cli/examples/…` and fail. All 182 pass because the fixtures are
  anchored to `import.meta.url`.
- **Defect was real, not vacuous** — inspected `778b05b~1`: the pre-fix
  constants were `join('examples', …)` (CWD-relative). With vitest rooted at
  `packages/cli` those point at a non-existent dir, matching the executor's
  documented baseline (`145 failed / 37 passed`). The test the fix protects is
  therefore meaningful.
- **Path-string assertions survive absolutization** — grepped every assertion
  touching the fixture consts. They use basename/extension substrings
  (`toContain('1_hello_world.deepnote')`, `toContain('.ipynb')`,
  `toContain('.deepnote')`); none assert a `examples/`- or `test-fixtures/`-
  relative prefix and none do exact-path `toBe`/`toEqual`. All still hold
  against absolute paths.
- **`resolveUpstreamTargetPair` reconciled** — the `ngjse2` helper takes the
  path as a parameter and is called with the now-absolute `BLOCKS_FILE`; it
  reads via `fs.readFileSync`, which is happy with an absolute path. The helper
  now rides the same robust base, as the card required. (Keeping its
  `beforeEach`-lazy resolution is harmless — no CWD coupling remains.)
- **No lazy solve** — the fix anchors the path; it does not `cd`/`chdir` or
  mutate `process.cwd()`. No order-dependent global state introduced
  (Scenario "tests run in isolation" holds).
- **Scope expansion is in-class and correct** — the executor extended the fix
  to the `JUPYTER_FILE`/`PERCENT_FILE`/`QUARTO_FILE` format fixtures in the same
  file. These had the identical `process.cwd()`-relative defect; fixing only the
  three named `examples/` constants would have left the capstone failing for the
  11 multi-format tests. This is the same single defect class in one file, not
  scope creep — the right call under "no tech debt."

**Other gates (run locally on the file):**

- `biome check packages/cli/src/commands/run.test.ts` — clean, no fixes.
- `cspell` on the file — 0 issues.
- `tsc --noEmit -p tsconfig.json` (root) — no errors in `run.test.ts`; the new
  `dirname`/`fileURLToPath` imports and `import.meta.url` typecheck cleanly
  (vitest also compiled the file without error).

**TDD proportionality** — correctly applied. This is a fixture-base reliability
fix with no new behavioral coverage; the card declares 0 new test cases and the
guard is the only new runtime line. Full TDD-first ceremony is not owed for a
CWD-robustness fix to test infrastructure, and the change is gated by a real
end-to-end capstone, so confidence is earned, not asserted.

## FOLLOW-UP

- **L1 (`guard-granularity`, low)** — the module-load guard checks the two
  *base directories* (`EXAMPLES_DIR`, `TEST_FIXTURES_FORMATS_DIR`) for
  existence, not each individual fixture *file*. This catches the dominant and
  most-likely failure mode this fix introduces (a wrong `REPO_ROOT` walk depth
  or a relocated/renamed base dir — exactly the Scenario-3 example "someone
  moves `examples/`"), and that case now fails loudly with the offending
  absolute path. But a single fixture file going missing while its dir survives
  (e.g. `1_hello_world.deepnote` deleted, `examples/` intact) would still fall
  through to the older opaque `FileResolutionError`/read-error path rather than
  the precise guard message. The card's belt-and-suspenders text suggested
  per-*file* `fs.existsSync`. Failure mode: a future single-fixture deletion
  reverts to the imprecise-error behavior the guard was meant to eliminate.
  Non-blocking — the primary risk (base-dir relocation) is fully covered and
  this is a strictly-better-than-before state. A small future hardening could
  enumerate the actual fixture files in the guard loop.

## Close-out actions

None outstanding. Card is correct, capstone independently reproduced
(182/182 from both repo-root and `packages/cli` CWDs), all project quality gates
pass on the changed file. Moving to `in_progress` (approved).
