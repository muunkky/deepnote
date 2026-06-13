# Bug Fix Template

## Bug Overview & Context

* **Ticket/Issue ID:** LUI1WEDGE sprint; surfaced by reviewer-1 on card sqm7ox (review 1), finding L1 (test-env-coupling)
* **Affected Component/Service:** `@deepnote/cli` serve/ui command test suite (`packages/cli/src/commands/serve.test.ts`)
* **Severity Level:** P1 - High (latent test-suite defect; opaque failure mode that will bite the contrib-slice / CI work in step 8)
* **Discovered By:** Adversarial code review (gitban-reviewer) on card sqm7ox
* **Discovery Date:** 2026-06-12
* **Reporter:** reviewer-1 (sqm7ox review 1)

**Required Checks:**
* [x] Ticket/Issue ID is linked above
* [x] Component/Service is clearly identified
* [x] Severity level is assigned based on impact

---

## Bug Description

### What's Broken

Suite 6 (`serve command (mocked, suite 6)`) and the Phase-7 `ui alias` suite in `packages/cli/src/commands/serve.test.ts` resolve a real on-disk fixture through `process.cwd()`:

```ts
// packages/cli/src/commands/serve.test.ts:18
const HELLO_WORLD_FILE = resolve(process.cwd(), 'examples', '1_hello_world.deepnote')
```

Every `runAction(...)` based test (and the line-278 negative path `resolve(process.cwd(), 'does-not-exist.deepnote')`) is therefore coupled to the vitest invocation's working directory. The tests pass only when vitest is launched from the repo root. Card sqm7ox added four more `runAction`-based ui-alias tests (lines ~338-387) that inherit this coupling, widening the blast radius.

### Expected Behavior

The fixture should resolve relative to the test file itself, so the suite passes regardless of the cwd vitest is invoked from. The negative-capstone test added in the sqm7ox commit already demonstrates the correct pattern:

```ts
// packages/cli/src/commands/serve.test.ts:408
const here = dirname(fileURLToPath(import.meta.url))
```

`fileURLToPath` / `import.meta.url` is already imported at line 3, so no new import is needed.

### Actual Behavior

When vitest is invoked from any directory other than the repo root (e.g. `pnpm vitest` run from inside `packages/cli`, or a future CI step that sets a package-scoped cwd), `HELLO_WORLD_FILE` points at a non-existent path. The `runAction` harness then fails with an opaque `"SIGINT handler was never registered"` assertion rather than a clear "fixture not found" — masking the real cause and costing debugging time.

### Reproduction Rate

* [x] 100% - Always reproduces (when cwd != repo root)
* [ ] 75% - Usually reproduces
* [ ] 50% - Sometimes reproduces
* [ ] 25% - Rarely reproduces
* [ ] Cannot reproduce consistently

---

## Steps to Reproduce

**Prerequisites:**
* Repo checked out, `pnpm install --frozen-lockfile` complete
* `packages/cli/src/commands/serve.test.ts` present on the sprint branch

**Reproduction Steps:**

1. `git checkout sprint/LUI1WEDGE` (or `workspace`)
2. Change into the package dir: run vitest with a non-root cwd, e.g. `pnpm --filter @deepnote/cli exec vitest run src/commands/serve.test.ts` from inside `packages/cli`, or invoke vitest with cwd set to `packages/cli`
3. Observe suite-6 / ui-alias `runAction` tests fail
4. Note the failure message is `SIGINT handler was never registered`, not a fixture-not-found error

**Error Messages / Stack Traces:**

```
AssertionError: SIGINT handler was never registered
  (raised by the runAction harness when createServeAction never reaches the
   listen/register path because the fixture file at
   <cwd>/examples/1_hello_world.deepnote does not exist)
```

---

## Environment Details

| Environment Aspect | Required | Value | Notes |
| :--- | :--- | :--- | :--- |
| **Environment** | Optional | Local / CI | Any cwd != repo root |
| **OS** | Optional | Linux | Platform-independent; cwd-dependent |
| **Browser** | Optional | N/A | CLI test |
| **Application Version** | Optional | sprint/LUI1WEDGE | Pre-existing; widened by sqm7ox |
| **Database Version** | Optional | N/A | |
| **Runtime/Framework** | Optional | Node 22.21 / vitest | |
| **Dependencies** | Optional | vitest | |
| **Infrastructure** | Optional | pnpm workspace | |

---

## Impact Assessment

| Impact Category | Severity | Details |
| :--- | :--- | :--- |
| **User Impact** | None | Test-only defect; no shipped behavior affected |
| **Business Impact** | Low | Slows contributors; risks a red CI on the contrib slice |
| **System Impact** | Medium | Opaque failure masks root cause; couples suite to invocation cwd |
| **Data Impact** | None | No data involved |
| **Security Impact** | None | No security surface |

**Business Justification for Priority:**

P1 because the contrib-diff cut (step 8, card dx99dj) slices code onto a clean branch off upstream/main and runs CI there; a cwd-sensitive suite is exactly the class of latent failure that produces a confusing red on that slice. Fixing it now keeps the suite portable and the failure mode legible before that work begins.

---

## Documentation & Code Review

Before diving into troubleshooting, review existing documentation and code to understand the system context.

| Item | Applicable | File / Location | Notes / Evidence | Key Findings / Action Required |
|---|:---:|---|---|---|
| README or component documentation reviewed | no | packages/cli/README.md | Not needed; test-only change | No README change required |
| Related ADRs (Architecture Decision Records) reviewed | no | docs/adr/ | No ADR governs test fixture resolution | None; behavior-preserving test fix |
| API documentation reviewed | no | n/a | No API surface touched | None |
| Test suite documentation reviewed | yes | packages/cli/src/commands/serve.test.ts | Line 18 uses `process.cwd()`; line 408 already uses `fileURLToPath(import.meta.url)` | Adopt the line-408 pattern for `HELLO_WORLD_FILE` and the line-278 negative path |
| IaC configuration reviewed (Terraform, CloudFormation, etc.) | no | .github/workflows/ | No infra change | None |
| New Documentation (Action Item) | N/A | **N/A** | No docs to author | None |

---

## Root Cause Investigation

Use this section to systematically investigate the root cause. Document each hypothesis, test, and finding.

| Iteration # | Hypothesis | Test/Action Taken | Outcome / Findings |
| :---: | :--- | :--- | :--- |
| **1** | The suite fails from non-root cwd because the fixture path is relative to cwd | Inspected `serve.test.ts:18` | Confirmed: `resolve(process.cwd(), 'examples', '1_hello_world.deepnote')` |
| **2** | The harness obscures the missing-fixture cause | Traced the `runAction` failure path | The missing file means the serve action never reaches SIGINT registration, so the harness asserts `SIGINT handler was never registered` |
| **3** | A cwd-independent pattern already exists in the same file | Searched the file for `import.meta` | Line 408 already uses `dirname(fileURLToPath(import.meta.url))`; the import exists at line 3 |

---

### Hypothesis testing iterations

**Iteration 1:** Fixture path is cwd-relative

**Hypothesis:** The fixture constant is resolved against `process.cwd()`, so it only exists when vitest runs from the repo root.

**Test/Action Taken:** Read `packages/cli/src/commands/serve.test.ts` line 18.

**Outcome:** Confirmed — `const HELLO_WORLD_FILE = resolve(process.cwd(), 'examples', '1_hello_world.deepnote')`.

---

**Iteration 2:** The harness masks the real cause

**Hypothesis:** The visible failure (`SIGINT handler was never registered`) is a symptom, not the cause.

**Test/Action Taken:** Traced what `runAction` asserts when `createServeAction` is given a non-existent fixture path.

**Outcome:** Confirmed — the action short-circuits before registering the SIGINT handler, so the harness's post-condition assertion fires with an unrelated-looking message.

---

**Iteration 3:** The fix pattern already exists in-file

**Hypothesis:** The correct cwd-independent resolution is already used elsewhere in the same file.

**Test/Action Taken:** Grepped for `fileURLToPath` / `import.meta` in `serve.test.ts`.

**Outcome:** Confirmed — line 408 (`ui local-first guarantee` suite) uses `dirname(fileURLToPath(import.meta.url))`; `fileURLToPath` is imported at line 3.

---

### Root Cause Summary

**Root Cause:**

`HELLO_WORLD_FILE` (and the line-278 negative-path `does-not-exist.deepnote`) is resolved against `process.cwd()` instead of the test file's own location. The fixture lives at `<repo-root>/examples/1_hello_world.deepnote`, so any invocation cwd other than the repo root makes the path invalid, and the `runAction` harness surfaces an opaque `SIGINT handler was never registered` assertion rather than a fixture-not-found error.

**Code/Config Location:**

`packages/cli/src/commands/serve.test.ts` line 18 (primary), line 278 (negative-path `process.cwd()` usage).

**Why This Happened:**

The suite predates the cwd-independent pattern; the fixture constant was written with `process.cwd()` and never revisited. Pre-existing, not introduced by card sqm7ox — but sqm7ox added four more `runAction`-based tests that inherit the coupling, which is what brought it to the reviewer's attention.

---

## Solution Design

### Fix Strategy

Replace cwd-relative fixture resolution with file-relative resolution, mirroring the pattern already used at line 408. Compute the repo-root (or examples dir) from `dirname(fileURLToPath(import.meta.url))` and build `HELLO_WORLD_FILE` (and the line-278 negative path) from that anchor. Behavior-preserving when run from the repo root; the only change is that the suite now also passes from any other cwd. Verify by running the affected suite from a non-root cwd.

### Code Changes

* `packages/cli/src/commands/serve.test.ts` — replace `resolve(process.cwd(), 'examples', '1_hello_world.deepnote')` (line 18) with a `fileURLToPath(import.meta.url)`-anchored resolution; apply the same anchoring to the line-278 `resolve(process.cwd(), 'does-not-exist.deepnote')` negative-path call. Reuse the existing line-3 `fileURLToPath` import and the `dirname`/`resolve` imports.

### Rollback Plan

This is a test-only change. If it regresses, revert the single-file commit (`git revert <hash>`); no deployment, migration, or runtime impact.

---

## TDD Implementation Workflow

This section enforces Test-Driven Development (TDD) best practices.

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Test** | Demonstrate the failure by running suite 6 / ui-alias from a non-root cwd (the failing condition *is* the existing suite under a non-root cwd) | - [ ] A failing condition that reproduces the bug is recorded (suite run from non-root cwd) |
| **2. Verify Test Fails** | Capture the `SIGINT handler was never registered` failure from non-root cwd | - [ ] Suite was run from non-root cwd and fails as expected |
| **3. Implement Code Fix** | Anchor `HELLO_WORLD_FILE` + line-278 path to `fileURLToPath(import.meta.url)` | - [ ] Code changes are complete and committed |
| **4. Verify Test Passes** | Re-run the affected suite from the same non-root cwd | - [ ] The suite now passes from a non-root cwd |
| **5. Run Full Test Suite** | `pnpm test` from repo root; confirm cli + serve suites still green | - [ ] All existing tests still pass (no regressions) |
| **6. Code Review** | gitban reviewer | - [ ] Code review approved |
| **7. Update Documentation** | None required (test-only) | - [ ] Documentation reviewed (no change needed) |
| **8. Deploy to Staging** | N/A (test-only) | - [ ] N/A |
| **9. Staging Verification** | N/A | - [ ] N/A |
| **10. Deploy to Production** | N/A | - [ ] N/A |
| **11. Production Verification** | N/A | - [ ] N/A |

### Test Code (Failing Test)

> The failing condition is the existing suite executed from a non-root cwd. After the fix, the same invocation passes.

```typescript
// Demonstrate failure (pre-fix) and pass (post-fix) by running from a non-root cwd:
//   cd packages/cli && pnpm exec vitest run src/commands/serve.test.ts
//
// Pre-fix: suite 6 / ui-alias runAction tests fail with
//   AssertionError: SIGINT handler was never registered
// because HELLO_WORLD_FILE = resolve(process.cwd(), 'examples', '1_hello_world.deepnote')
// points at a path that does not exist under packages/cli.
//
// Fix: anchor to the test file, matching serve.test.ts:408
//   const here = dirname(fileURLToPath(import.meta.url))
//   const HELLO_WORLD_FILE = resolve(here, <relative path to examples/1_hello_world.deepnote>)
```

---

## Infrastructure as Code (IaC) Considerations (optional)

**No infrastructure changes required — test-only fix.**

* [x] Infrastructure changes NOT required
* [x] IaC code update not applicable
* [x] IaC review not applicable
* [x] IaC non-prod test not applicable
* [x] IaC automated deploy not applicable

| IaC Component | Change Required | Status |
| :--- | :--- | :--- |
| **Environment Variables** | None | N/A |
| **Scaling** | None | N/A |
| **New Resource** | None | N/A |

**Note:** No infrastructure touched.

---

## Testing & Verification

### Test Plan

| Test Type | Test Case | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **Unit Test** | Suite 6 runAction tests from repo root | All pass | - [ ] Pass |
| **Integration Test** | Suite 6 + ui-alias runAction tests from `packages/cli` cwd | All pass (was failing) | - [ ] Pass |
| **Regression Test** | Full `pnpm test` from repo root | No regressions | - [ ] Pass |
| **Edge Case 1** | Negative path (line 278 `does-not-exist.deepnote`) from non-root cwd | Still asserts the intended not-found behavior | - [ ] Pass |
| **Edge Case 2** | ui-alias four new tests from non-root cwd | All pass | - [ ] Pass |
| **Performance Test** | N/A | N/A | - [ ] N/A |
| **Manual Test** | Run suite from two different cwds | Identical results | - [ ] Pass |

### Verification Checklist

* [ ] Original bug is no longer reproducible (suite passes from non-root cwd)
* [ ] All new/affected tests pass
* [ ] All existing tests still pass (no regressions)
* [ ] Code review completed and approved
* [ ] Documentation reviewed (no change needed)
* [ ] Staging verification N/A (test-only)
* [ ] Production verification N/A (test-only)
* [ ] No new opaque failure modes introduced

---

## Regression Prevention

To prevent this bug from returning, add the following safeguards:

* [ ] **Automated Test:** The fixed suite itself now passes from any cwd
* [ ] **Integration Test:** Affected suite verified from a non-root cwd
* [ ] **Type Safety:** N/A
* [ ] **Linting Rules:** Consider flagging `process.cwd()` in test files (optional, not required here)
* [ ] **Code Review Checklist:** Prefer `fileURLToPath(import.meta.url)` over `process.cwd()` for test fixtures
* [ ] **Monitoring/Alerting:** N/A (test-only)
* [ ] **Documentation:** Lesson captured in this card

---

## Validation & Finalization

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban reviewer (post-fix) |
| **Test Results** | `pnpm test` + non-root-cwd run of serve.test.ts |
| **Staging Verification** | N/A (test-only) |
| **Production Verification** | N/A (test-only) |
| **Documentation Update** | None required |
| **Monitoring Check** | N/A |

### Follow-up gitban cards

| Topic | Action Required | Tracker | Gitban Cards |
| :--- | :--- | :--- |
| **Postmortem** | No (test-env coupling, not an outage) | this card | n/a |
| **Documentation Debt** | No | this card | n/a |
| **Technical Debt** | Resolved by this card (removes cwd coupling) | this card | this card |
| **Process Improvement** | Optional: prefer import.meta-anchored fixtures repo-wide | this card | n/a |
| **Related Bugs** | None known | this card | n/a |

### Completion Checklist

* [ ] Root cause is fully understood and documented
* [ ] Fix follows TDD process (reproduce from non-root cwd → fix → passes from non-root cwd)
* [ ] All tests pass (suite from root and non-root cwd; full `pnpm test`)
* [ ] Documentation reviewed (no change needed)
* [ ] No manual infrastructure changes
* [ ] Verified (test-only; no deploy)
* [ ] No new opaque failure modes introduced
* [ ] Regression prevention measures noted
* [ ] Postmortem N/A (not P0/P1 outage)
* [ ] Follow-up tickets created for related issues (none)
* [ ] Associated review finding (sqm7ox L1) is closed
