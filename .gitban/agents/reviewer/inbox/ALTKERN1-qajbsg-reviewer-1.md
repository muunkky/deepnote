---
verdict: APPROVAL
card_id: qajbsg
review_number: 1
commit: 5e0e5aa
date: 2026-06-11
has_backlog_items: false
---

# Review — qajbsg (Sub-phase 1B: failureCategory discriminant for the 4 failure classes)

## Verdict: APPROVAL

## Gate 1 — Completion claim

The card requires a DoD (touches `BlockResult`/`RunResult` public types, control flow in
`onBlockDone`/`buildMachineRunResult`/the outer catch, and the `--output json`/`toon` machine
contract). The DoD is present and strong:

- **Intent** is concrete and externally checkable: a CI/CD author can tell *why* a headless
  non-Python run failed from a single stable field, with the explicit failure mode named
  (`kernel-died` silently collapsing into `in-block` at the `run.ts:1058` string-flattening
  boundary). Not a title restatement, not marketing.
- **Observable outcomes** are user-observable JSON-payload assertions, not implementation details.
- **Capstone is real and unfakeable** — four mocked failure scenarios in sequence must yield
  four *distinct* `failureCategory` values with `kernel-died !== in-block`. It cannot pass by
  mocking the system under test away: it asserts on the genuine `outputJson` payload after the
  real `run.ts` surfacing logic runs, and `Set(...).size === 4` forces non-collapse. This is
  exactly the capstone that catches a decompose-but-don't-assemble failure.
- Checkboxes cover the acceptance criteria and Observables; each maps to a testable condition.
  Integrity verified — the unchecked boxes (Integration Tests, Code Review, Deployment, etc.)
  are correctly deferred/reviewer-owned per the card's own Integration row (real missing-kernel
  e2e is step 5), and the executor's scope-honesty note discloses the mocked-unit boundary
  truthfully.

Gate 1 passes.

## Gate 2 — Implementation quality

Reviewed `git show 5e0e5aa` (run.ts +64, run.test.ts +170) against
`docs/designs/phase1-alternative-language-kernels.md` (KD-6, KD-8) and PRD-002 R6.

**Design compliance — exact:**
- KD-6 site (b): `onBlockDone` (`run.ts:1196-1200`) computes the discriminant from the
  still-typed `result.error` (`instanceof KernelDiedError ? 'kernel-died' : 'in-block'`) on the
  object-literal field built immediately before `error: result.error?.message` flattens it.
  `BlockExecutionResult.error` is confirmed `Error | undefined` (runtime-core `types.ts:35`), so
  the `instanceof` is against a live instance. `buildMachineRunResult` (`run.ts:1382-1383`) reads
  `blockResults.find(b => !b.success)?.failureCategory ?? 'in-block'` — no `instanceof` on a
  string. Matches the design's reference snippet line-for-line.
- KD-6 site (a): outer catch (`run.ts:619-634`) reads `error.category` from the typed kernel
  family and spreads it into the json/toon payloads only when defined; `KernelNotRegisteredError`
  added to the `InvalidUsage` branch, the rest map to `Error`. Exit codes not otherwise
  subdivided (KD-6).
- KD-8: the typed `category` discriminant in runtime-core `kernel-errors.ts` is the single read
  mechanism at both sites. Verified the dependency exists and is exported (`index.ts:14-15`).

**Out-of-card-plan change is a justified root-cause fix, not scope creep or a lazy solve.**
The card's site-(a) plan assumed the typed error reaches the outer catch intact. It does not by
default — `startExecutionEngine` wrapped *all* `engine.start()` failures in a generic
`Error("Failed to start server: …")`, which would flatten `missing-kernel`/`kernel-launch`/
`kernel-died` to a string and leave `failureCategory` permanently `undefined` for the two
pre-summary classes. The fix (`run.ts:1114-1120`) re-throws the three kernel-error classes
unwrapped while preserving the cleanup (`engine.stop()`) and the generic install hint for genuine
server-startup failures. This is the better long-term solution and is honestly documented in the
close-out; without it the capstone's missing-kernel/kernel-launch assertions cannot pass.

**Tests — genuine TDD, real paths, not internals-mirroring.** The `@deepnote/runtime-core` mock
spreads `...actual`, so the *real* `KernelDiedError`/`KernelNotRegisteredError`/`KernelLaunchError`
classes are preserved — both the test imports and production `run.ts` resolve to the same classes,
so the `instanceof` identity holds (no false-positive/false-negative trap). Tests drive the real
`createRunAction` outer catch and `onBlockDone`/`buildMachineRunResult` via the mocked engine, then
re-parse the genuine `outputJson`/`outputToon` output. The load-bearing `kernel-died`-through-
`onBlockDone` case walks the exact string-flattening boundary the design flagged as the trap.
Failure cases and the negative (`kernel-died !== in-block`) are present, not happy-path-only.

**Quality gates verified by reviewer (from repo-root CWD — the fixture
`examples/1_hello_world.deepnote` resolves against the repo root):**
- `vitest run packages/cli/src/commands/run.test.ts` → **182 passed, 0 failed** (6 new
  `failureCategory` tests all green, capstone included).
- Root `tsc --noEmit -p tsconfig.json` → clean (exit 0). Additive optional field; no consumer break.
- `biome check` on both changed files → clean.

Note for the record: running the suite with CWD inside `packages/cli` produces one spurious
failure (`creates ExecutionEngine with correct config` → `File or directory not found:
examples/1_hello_world.deepnote`). This reproduces on the *parent* commit `6df81ec` with none of
this diff's changes and is purely a relative-fixture-path/CWD artifact of the test harness — not a
defect in this card. Run from repo root, the suite is fully green.

## BLOCKERS

None.

## FOLLOW-UP

- L1 (`fixture-path-fragility`): `run.test.ts` resolves fixtures via the process-relative path
  `join('examples', '1_hello_world.deepnote')`, which only works when vitest's CWD is the repo
  root. Running the file from `packages/cli` (or any other CWD) silently routes every
  `action(HELLO_WORLD_FILE, …)` test through `FileResolutionError` instead of the path under test,
  masking real assertions (e.g. the new site-(a) tests would read `failureCategory: undefined`
  rather than the kernel category). Failure mode: a future contributor running the single file
  from the package dir sees confusing red that has nothing to do with their change. Anchoring the
  fixture path to a module-relative base (or asserting the fixture exists in a `beforeAll`) would
  remove the trap. Pre-existing, not introduced here.

## Outstanding close-out actions

- Executor profiling log was written on the worktree filesystem (gitignored there) and not staged;
  the dispatcher reconciles parent card-state after merge, per the executor git-operations rule.
  No action required of this card.
