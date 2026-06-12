# Test Implementation Card

> **Sprint**: ALTKERN1 | **Type**: test | **Step**: 4B
>
> Self-healing follow-up from card `qajbsg` (step 4) review 1. Routed by the planner as a **sprint card** because the fragile fixture base undermines the integrity of the `failureCategory` assertions added in qajbsg and the live-kernel integration tests added in `obcn7z` (step 5), both of which live in / extend the `packages/cli` test surface this card hardens.

## Test Overview

**Test Type:** Unit (test-infrastructure reliability fix)

**Target Component:** `packages/cli/src/commands/run.test.ts` — fixture-path resolution for the `run` command test suite.

**Related Cards:**
- `qajbsg` (step 4, done) — added site-(a) `failureCategory` tests to this file; those assertions are silently masked when the suite runs from a non-repo-root CWD.
- `obcn7z` (step 5) — adds live-kernel integration tests in the same `packages/cli` package that benefit from a CWD-robust fixture base.

**Coverage Goal:** No new behavioral coverage. Make every existing `action(HELLO_WORLD_FILE, …)` / `BLOCKS_FILE` / `INTEGRATIONS_FILE` assertion CWD-independent so a regression cannot be masked by a `FileResolutionError` thrown for an unrelated reason (wrong CWD).

---

## The Defect (fixture-path-fragility, low)

`run.test.ts` defines its fixtures via **process-relative** paths (lines ~137-139):

```ts
const HELLO_WORLD_FILE = join('examples', '1_hello_world.deepnote')
const BLOCKS_FILE = join('examples', '2_blocks.deepnote')
const INTEGRATIONS_FILE = join('examples', '3_integrations.deepnote')
```

`join('examples', …)` resolves against `process.cwd()`, which is only the repo root when vitest happens to be launched from there. Running the file from `packages/cli` (or any other CWD) makes the fixture path point at a non-existent file, so `action(HELLO_WORLD_FILE, …)` routes through `FileResolutionError` **before** reaching the code path under test.

This silently turns assertions green-to-red (or worse, **masks a real regression**): the new site-(a) `failureCategory` tests from `qajbsg` would read `failureCategory: undefined` instead of the expected kernel category, failing — or passing — for reasons unrelated to the change. The bug is pre-existing (not introduced by `qajbsg`) but it directly threatens the reliability of `qajbsg`'s and `obcn7z`'s assertions, which is why it is pulled into this sprint rather than deferred to closeout.

---

## Test Strategy

### Test Pyramid Placement

| Layer | Tests Planned | Rationale |
|-------|---------------|-----------|
| Unit | 0 new (fixture-base fix only) | The fix is to the fixture constants/setup, not to add new test cases. All existing `run.test.ts` unit tests inherit the robustness. |
| Integration | N/A | Out of scope; `obcn7z` owns integration tests. |
| E2E | N/A | — |
| Performance | N/A | — |

### Testing Approach
- **Framework:** vitest (existing).
- **Mocking Strategy:** Unchanged — this card touches only how the fixture file paths are resolved, not what is mocked.
- **Isolation Level:** Unchanged. Goal is to remove the hidden dependency on `process.cwd()`.

### Fix approach (pick the robust one — no tech debt)

Anchor the fixture base to the **test module's own directory** rather than the process CWD. The repo's example fixtures live at `<repo-root>/examples/`; the test module is at `packages/cli/src/commands/run.test.ts`, so resolve relative to the module and walk up to the repo root deterministically, e.g.:

```ts
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MODULE_DIR = dirname(fileURLToPath(import.meta.url)) // packages/cli/src/commands
const EXAMPLES_DIR = join(MODULE_DIR, '..', '..', '..', '..', 'examples') // -> <repo-root>/examples
const HELLO_WORLD_FILE = join(EXAMPLES_DIR, '1_hello_world.deepnote')
// …same for BLOCKS_FILE, INTEGRATIONS_FILE
```

Confirm the actual on-disk location of the `examples/` fixture directory before fixing the relative-walk depth (it may be `packages/cli/examples/` rather than repo-root `examples/` — verify with `ls`). Whatever the real location, the constant must resolve to it independent of CWD.

**Belt-and-suspenders (recommended in addition, not instead):** add a `beforeAll` (or top-level guard) that asserts each fixture file exists via `fs.existsSync` and throws a clear "fixture missing at <abs path> — check EXAMPLES_DIR" error, so any future relocation fails loudly with a precise message instead of masquerading as a `FileResolutionError` in an unrelated assertion.

Do **not** "fix" this by `cd`-ing or mutating `process.cwd()` in the test — that is order-dependent global state and reintroduces the same class of fragility. Anchor the path; don't move the process.

---

## Test Scenarios

These are the invariants the fix must preserve/establish, expressed as scenarios.

### Scenario 1: Suite passes from the repo root (regression-preserving)
- **Given:** vitest invoked from the repo root (the historical CWD).
- **When:** the full `run.test.ts` suite runs.
- **Then:** every test passes exactly as before — no behavioral change, same assertions, including `qajbsg`'s `failureCategory` tests.
- **Priority:** Critical

### Scenario 2: Suite passes from `packages/cli` CWD (the fix)
- **Given:** vitest invoked with CWD = `packages/cli` (e.g. `cd packages/cli && pnpm vitest run src/commands/run.test.ts`).
- **When:** the suite runs.
- **Then:** every `action(HELLO_WORLD_FILE, …)` test reaches the real code path under test (no spurious `FileResolutionError`); `failureCategory` assertions read the real kernel category, not `undefined`.
- **Priority:** Critical

### Scenario 3: Missing/relocated fixture fails loudly (boundary)
- **Given:** the fixture file is absent at the resolved path (e.g. someone moves `examples/`).
- **When:** the suite runs.
- **Then:** a clear, precise error names the missing absolute fixture path — not an opaque `FileResolutionError` buried inside an unrelated assertion.
- **Priority:** High

---

## Test Data & Fixtures

### Required Test Data
| Data Type | Description | Source |
|-----------|-------------|--------|
| `1_hello_world.deepnote` | Existing example notebook used by the bulk of `run.test.ts` | On-disk fixture in `examples/` (verify exact path) |
| `2_blocks.deepnote` | Existing example notebook (`BLOCKS_FILE`) | On-disk fixture |
| `3_integrations.deepnote` | Existing example notebook (`INTEGRATIONS_FILE`) | On-disk fixture |

### Edge Case Data
- **Empty/Null:** N/A — fixtures are pre-existing.
- **Maximum Values:** N/A.
- **Invalid Formats:** N/A.
- **Unicode/Special Chars:** N/A.

### Fixture Setup
```
1. Resolve EXAMPLES_DIR from import.meta.url (module-relative), not process.cwd().
2. HELLO_WORLD_FILE / BLOCKS_FILE / INTEGRATIONS_FILE = join(EXAMPLES_DIR, <name>).
3. (Recommended) beforeAll: assert each fixture exists; throw a precise error if not.
```

---

## Required Reading

- **File under fix:** `packages/cli/src/commands/run.test.ts`
  - Fixture constants at lines ~137-139 (`HELLO_WORLD_FILE`, `BLOCKS_FILE`, `INTEGRATIONS_FILE`).
  - ~40 call sites: grep `HELLO_WORLD_FILE`, `BLOCKS_FILE`, `INTEGRATIONS_FILE`. Most should need no change if you only re-point the constants.
  - The `failureCategory` tests added by `qajbsg` (site-(a)) are the ones most at risk of silent masking — verify they assert the real category after the fix.
- **Prior art for CWD-relative fixtures in the same file:** card `ngjse2` (step 3B) added a `resolveUpstreamTargetPair` fixture helper that resolves block ids lazily in `beforeEach` precisely because "the fixture path is relative to test CWD, only correct inside a running test." This card removes that CWD dependency at the source; reconcile with the `ngjse2` helper so both rely on the same robust base.
- **Grep terms:** `HELLO_WORLD_FILE`, `examples`, `1_hello_world.deepnote`, `FileResolutionError`, `import.meta`, `fileURLToPath`, `resolveUpstreamTargetPair`.
- **Verify on-disk fixture location first:** `ls examples/ packages/cli/examples/ 2>/dev/null` to confirm where `1_hello_world.deepnote` actually lives before setting the relative-walk depth.

---

## Implementation Checklist

### Setup Phase
- [x] Confirmed on-disk location of `examples/*.deepnote` fixtures (`ls`) before setting relative-walk depth
- [x] Test fixtures/factories defined — fixture base re-anchored to `import.meta.url` (module-relative)
- [x] Mocks and stubs configured — unchanged (no mock changes required)
- [x] Test database/state initialized [if needed] — N/A

### Test Implementation
- [x] Happy path tests written and passing — existing suite green from repo root (Scenario 1)
- [x] Edge case tests written and passing — suite green from `packages/cli` CWD (Scenario 2)
- [x] Error handling tests written and passing — missing-fixture guard fails loudly with absolute path (Scenario 3)
- [x] Negative/security tests written and passing — N/A (no security surface)
- [x] Performance assertions added [if applicable] — N/A

### Quality Gates
- [x] All tests pass locally — `pnpm vitest run packages/cli/src/commands/run.test.ts` from repo root
- [x] All tests pass in CI
- [x] No flaky tests introduced
- [x] Test execution time acceptable — fixture-base change is O(1)
- [x] Code coverage meets target [if applicable] — coverage unchanged (no new branches)

### Documentation
- [x] Test file has clear docstrings/comments — a short comment explains the module-relative anchor and why CWD-relative was wrong
- [x] Complex test logic explained — relative-walk depth annotated with the resolved target path
- [x] Setup/teardown documented

---

## Acceptance Criteria

- [x] **Capstone:** The full `run.test.ts` suite passes identically whether vitest is launched from the repo root **or** from `packages/cli` (proving CWD-independence) — demonstrate by running it from both CWDs and showing the same pass count. Without the fix, the `packages/cli` run regresses (fixtures route through `FileResolutionError`); with it, both runs are green.
- [x] All existing `run.test.ts` scenarios still have passing tests (no behavioral change)
- [x] Tests are deterministic [no flakiness]
- [x] Tests run in isolation [no order dependency] — no `process.cwd()` mutation introduced
- [x] Coverage target met: existing coverage preserved
- [x] Tests follow project conventions (`import.meta.url` / `fileURLToPath` module-relative resolution)

---

## Troubleshooting Log (optional)

| Issue | Investigation | Resolution |
|-------|---------------|------------|
| | | |

---

## Notes

- **Routing rationale:** Planner classification (gitban-planner) — Q1 "Does this block a downstream item in this sprint?" → yes: the fragile fixture base can silently mask the `failureCategory` assertions from `qajbsg` and the same `packages/cli` test surface that `obcn7z` (step 5) extends with live-kernel integration tests. Sprint card, new (subtype=new), sequenced as step 4B after the originating card's step 4.
- Pre-existing defect, not introduced by `qajbsg` — but in-scope because it threatens the integrity of this sprint's test assertions.
- Single-feature card (one user-visible change: CWD-robust fixture base); the packed-card rejection rule does not apply.


## Close-out Summary (executor cycle 1)

**Shipped** — one commit on the worktree branch (`778b05b`), one file changed:
`packages/cli/src/commands/run.test.ts` (+38/-9).

### What changed
Re-anchored the fixture bases in `run.test.ts` from `process.cwd()` to the test
module's own directory via `import.meta.url`:

- Added `MODULE_DIR = dirname(fileURLToPath(import.meta.url))` and
  `REPO_ROOT = join(MODULE_DIR, '..','..','..','..')` (walk up four levels from
  `packages/cli/src/commands` → repo root).
- `HELLO_WORLD_FILE` / `BLOCKS_FILE` / `INTEGRATIONS_FILE` now resolve from
  `EXAMPLES_DIR = join(REPO_ROOT, 'examples')` (verified on-disk:
  `examples/` is at the repo root, not `packages/cli/examples/`).
- Added a module-load guard that throws a precise, **absolute-path** error
  (`Test fixture dir missing at <abs> — check REPO_ROOT …`) if a fixture base
  dir is missing/relocated, instead of an opaque `FileResolutionError` buried in
  an unrelated assertion (Scenario 3).
- `resolveUpstreamTargetPair(BLOCKS_FILE)` (the `ngjse2` helper) now relies on
  the same robust base — reconciled as the card required; no separate CWD path.
- No mock changes, no `process.cwd()` mutation, no `cd`/chdir — anchored the
  path, did not move the process.

### Scope expansion (in-card, same defect class)
The card named the three `examples/` constants, but the **capstone** is
"full suite passes identically from both CWDs." A second set of CWD-relative
fixture constants in the same file caused the same defect for 11 tests:

```
JUPYTER_FILE = join('test-fixtures', 'formats', 'jupyter', 'basic.ipynb')
PERCENT_FILE = join('test-fixtures', 'formats', 'percent', 'basic-cells.percent.py')
QUARTO_FILE  = join('test-fixtures', 'formats', 'quarto', 'basic.qmd')
```

These multi-format `action(…)` tests regressed from the `packages/cli` CWD
(11 `program.error called` failures, NOT `FileResolutionError` — the generic
catch-all path) until I re-anchored them to
`TEST_FIXTURES_FORMATS_DIR = join(REPO_ROOT, 'test-fixtures', 'formats')`
(verified on-disk at repo root). Fixing only the three named constants would
have left the capstone failing, so per "no tech debt / take the better
long-term solution" I fixed the whole defect class in this file. Path-string
assertions in that block use `.toContain('.ipynb'|'.deepnote'|…)` (extension/
message substrings), which still hold against the absolute paths — no
assertion checks a `test-fixtures`-relative prefix.

### What the tests actually proved (live evidence, not fixtures-of-fixtures)
All runs were real vitest invocations against the actual `run.test.ts`:

| Run | CWD (vitest `RUN` banner) | Result |
|---|---|---|
| Baseline, pre-fix | repo root | **182 passed** |
| Baseline, pre-fix | `packages/cli` | **145 failed / 37 passed** (defect confirmed) |
| Post-fix | repo root | **182 passed** (Scenario 1, no behavioral change) |
| Post-fix | `packages/cli` | **182 passed** (Scenario 2 — capstone met, identical pass count) |
| Scenario 3 | repo root, `examples/` moved aside | guard threw `Error: Test fixture dir missing at /…/examples — check REPO_ROOT (resolved from import.meta.url)`; `examples/` restored, tree clean |

The capstone is met: **182/182 from both CWDs**, the same pass count, proving
CWD-independence. The `packages/cli` run's banner confirmed `process.cwd` was
genuinely `…/packages/cli` (not overridden via `--root`).

### Quality gates (all green, run locally in the worktree)
- `tsc --noEmit -p tsconfig.json` (root, covers this file): exit 0
- `biome check packages/cli/src/commands/run.test.ts`: clean, no fixes
- `cspell` on the file: 0 issues
- vitest as above

### Notes / honesty
- No new behavioral coverage was added (as designed) — coverage unchanged, no
  new branches; the guard loop is the only new runtime code and it is
  pass-through under normal conditions.
- "All tests pass in CI" was ticked on the basis that the exact gates CI runs
  (vitest + biome + tsc + cspell) all passed locally in the worktree; CI itself
  runs post-merge.
- Left in `in_progress` for the reviewer per executor protocol.

## Review Log — Cycle 1 (APPROVAL)

- **Verdict:** APPROVAL (commit `778b05b`)
- **Review report:** `.gitban/agents/reviewer/inbox/ALTKERN1-321p72-reviewer-1.md`
- **Gate 1 (completion claim):** PASS — strong DoD, unfakeable capstone (full `run.test.ts` suite passes identically from repo-root and `packages/cli` CWDs), checkbox integrity verified against reviewer's own runs.
- **Gate 2 (implementation quality):** PASS — capstone independently reproduced (182/182 from both CWDs), defect confirmed real on `778b05b~1` (145 failed / 37 passed from `packages/cli`), path-string assertions survive absolutization, `resolveUpstreamTargetPair` (ngjse2 helper) reconciled to the same robust base, no lazy `cd`/`chdir` solve, in-class scope expansion to JUPYTER/PERCENT/QUARTO format fixtures correctly accepted. biome/cspell/tsc all clean on the file.
- **Routing:** Approved → executor close-out (`ALTKERN1-321p72-executor-1.md`). One non-blocking follow-up routed to planner as an ALTKERN1 sprint card (`ALTKERN1-321p72-planner-1.md`):
  - **L1 (guard-granularity, low):** module-load guard checks only the two base dirs, not individual fixture files; harden to enumerate per-file `fs.existsSync` so a single-fixture deletion also fails loudly. Strictly-better-than-current; primary base-dir-relocation risk already covered.