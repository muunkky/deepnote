# Dynamic Chromium revision discovery in HMR e2e `cdp.ts` (replace hard-coded `chromium-1223`)

> **Origin:** LUIVIEW1 card 5mz1md review 1, Sprint Retrospective Item 1 (non-blocking reviewer finding).
> **Status:** BLOCKED on a concrete trigger — the first time a Playwright browser-cache revision bump
> breaks the hard-coded default lookup. Deferred because an `HMR_CHROME_BIN` override exists today and
> the HMR e2e test is gated out of the always-on `pnpm test`, so nothing downstream depends on it.

## Refactoring Overview & Motivation

* **Refactoring Target:** Chromium binary discovery in the HMR e2e DevTools driver.
* **Code Location:** `apps/studio/e2e/cdp.ts` (`findChromeBinary()` + the module header comment).
* **Refactoring Type:** Replace a hard-coded cache-revision path with dynamic cache-revision discovery
  (glob the Playwright cache dir / resolve the latest `chromium-*` revision).
* **Motivation:** `findChromeBinary()` defaults to a Playwright-cached Chromium path with the revision
  hard-coded (`~/.cache/ms-playwright/chromium-1223/...`). A future `playwright install` browser-cache
  revision bump will silently break the default lookup, surfacing as an opaque "DevTools endpoint did not
  come up" failure on a fresh checkout until someone sets `HMR_CHROME_BIN`. The module header also states
  "no Playwright/Puppeteer dependency" — true for the runtime DevTools driver, but the binary itself
  originates from `playwright install chromium`, so the header wording should be reconciled too.
* **Business Impact:** A fresh checkout's HMR e2e keeps working across Playwright cache bumps without a
  manual `HMR_CHROME_BIN` override, and the failure mode stops being an opaque endpoint timeout.
* **Scope:** One file (`cdp.ts`): the `findChromeBinary()` default-resolution path and the header comment.
  Small. No behaviour change beyond binary discovery robustness.
* **Risk Level:** Low — e2e-only helper, gated out of `pnpm test`; falls back to `HMR_CHROME_BIN`.
* **Related Work:** Unblock the first time a Playwright cache bump breaks the pinned `chromium-1223`
  default (the concrete trigger).

**Required Checks:**
* [ ] **Refactoring motivation** clearly explains why this change is needed.
* [ ] **Scope** is specific and bounded (not open-ended "improve everything").
* [ ] **Risk level** is assessed based on code criticality and usage.

---

## Pre-Refactoring Context Review

Before refactoring, review how `findChromeBinary()` resolves the default path and how the `HMR_CHROME_BIN`
override interacts with it so the dynamic-discovery path degrades gracefully.

* [ ] Existing code reviewed and behavior fully understood.
* [ ] Test coverage reviewed - current test suite provides safety net.
* [ ] Documentation reviewed (README, docstrings, inline comments).
* [ ] Style guide and coding standards reviewed for compliance.
* [ ] Dependencies reviewed (internal modules, external libraries).
* [ ] Usage patterns reviewed (who calls this code, how it's used).
* [ ] Previous refactoring attempts reviewed (if any - learn from history).

| Review Source | Link / Location | Key Findings / Constraints |
| :--- | :--- | :--- |
| **Existing Code** | `apps/studio/e2e/cdp.ts` `findChromeBinary()` | Defaults to pinned `chromium-1223`; `HMR_CHROME_BIN` override path. |
| **Test Coverage** | HMR e2e (gated out of `pnpm test`) | Needs a browser binary + live dev server; not in the always-on suite. |
| **Documentation** | `cdp.ts` module header | Reconcile "no Playwright dependency" wording vs the cache-origin binary. |
| **Style Guide** | Biome (TS) — `pnpm lintAndFormat` | Must stay lint/format clean. |
| **Dependencies** | Playwright browser cache (`~/.cache/ms-playwright/chromium-*`) | Revision changes across `playwright install`. |
| **Usage Patterns** | HMR e2e driver only | Not on any always-on path. |
| **Previous Attempts** | None | First pass; deferred from LUIVIEW1 5mz1md review 1. |

---

## Refactoring Strategy & Risk Assessment

> Resolve the cached Chromium revision dynamically (glob `~/.cache/ms-playwright/chromium-*`, pick the
> latest) instead of pinning `chromium-1223`, and reconcile the module header to describe the binary's
> Playwright-cache origin accurately. Keep `HMR_CHROME_BIN` as the explicit override.

**Refactoring Approach:**
* Glob the Playwright cache dir for `chromium-*` and resolve the newest revision.
* Reword the module header to describe the cache-origin binary accurately.

**Incremental Steps:**
1. Add dynamic `chromium-*` discovery with a deterministic latest-revision pick.
2. Keep `HMR_CHROME_BIN` as the override and a clear error when nothing resolves.
3. Reconcile the module header comment.

**Risk Mitigation:**
* Risk: no cached browser present. Mitigation: clear actionable error pointing at `playwright install` / `HMR_CHROME_BIN`.

**Rollback Plan:**
* Single e2e helper; `git revert` restores the pinned path.

**Success Criteria:**
* `findChromeBinary()` resolves across cache-revision bumps without a manual override.
* Module header accurately describes the binary's Playwright-cache origin.
* `pnpm lintAndFormat` + `pnpm typecheck` clean.

---

## Refactoring Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Pre-Refactor Test Suite** | HMR e2e (manual / gated) | - [ ] Comprehensive tests exist before refactoring starts. |
| **Baseline Measurements** | Pinned-revision repro of the break | - [ ] Baseline metrics captured (complexity, performance, coverage). |
| **Incremental Refactoring** | Dynamic discovery + header reconcile | - [ ] Refactoring implemented incrementally with passing tests at each step. |
| **Documentation Updates** | Module header comment | - [ ] All documentation updated to reflect refactored code. |
| **Code Review** | gitban reviewer | - [ ] Code reviewed for correctness, style guide compliance, maintainability. |
| **Performance Validation** | N/A (e2e helper) | - [ ] Performance validated - no regression, ideally improvement. |
| **Staging Deployment** | N/A (fork-only) | - [ ] Refactored code validated in staging environment. |
| **Production Deployment** | N/A (fork-only) | - [ ] Refactored code deployed to production with monitoring. |

---

## Safe Refactoring Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Establish Test Safety Net** | HMR e2e (manual) | - [ ] Comprehensive tests exist covering current behavior. |
| **2. Run Baseline Tests** | `pnpm test` (studio suite) | - [ ] All tests pass before any refactoring begins. |
| **3. Capture Baseline Metrics** | Repro of the pinned-revision break | - [ ] Baseline metrics captured for comparison. |
| **4. Make Smallest Refactor** | Dynamic `chromium-*` glob | - [ ] Smallest possible refactoring change made. |
| **5. Run Tests (Iteration)** | typecheck + studio tests | - [ ] All tests pass after refactoring change. |
| **6. Commit Incremental Change** | per-step commit | - [ ] Incremental change committed (enables easy rollback). |
| **7. Repeat Steps 4-6** | header reconcile | - [ ] All incremental refactoring steps completed with passing tests. |
| **8. Update Documentation** | Module header comment | - [ ] All documentation updated. |
| **9. Style & Linting Check** | `pnpm lintAndFormat` + `pnpm typecheck` | - [ ] Code passes linting, type checking, and style guide validation. |
| **10. Code Review** | gitban reviewer | - [ ] Changes reviewed for correctness and maintainability. |
| **11. Performance Validation** | N/A | - [ ] Performance validated - no regression detected. |
| **12. Deploy to Staging** | N/A | - [ ] Refactored code validated in staging environment. |
| **13. Production Deployment** | N/A | - [ ] Gradual production rollout with monitoring. |

#### Refactoring Implementation Notes

**Refactoring Techniques Applied:**
* Replace hard-coded path with dynamic cache discovery; graceful fallback to `HMR_CHROME_BIN`.

**Design Patterns Introduced:**
* None — direct filesystem glob over the Playwright cache.

**Code Quality Improvements:**
* Pinned `chromium-1223` -> latest-revision discovery; honest module header.

**Before/After Comparison:**
```ts
// Before: pinned revision (breaks on a cache bump)
const def = join(home, '.cache/ms-playwright/chromium-1223/chrome-linux/chrome');

// After: resolve the newest cached revision
const def = resolveLatestChromium(join(home, '.cache/ms-playwright'));
```

---

## Refactoring Validation & Completion

| Task | Detail/Link |
| :--- | :--- |
| **Code Location** | `apps/studio/e2e/cdp.ts` |
| **Test Suite** | HMR e2e (gated) + studio `pnpm test` |
| **Baseline Metrics (Before)** | Pinned `chromium-1223`; opaque endpoint-timeout failure mode |
| **Final Metrics (After)** | Dynamic latest-revision discovery; honest header |
| **Performance Validation** | N/A — e2e helper |
| **Style & Linting** | Biome + `tsc --noEmit` clean |
| **Code Review** | gitban reviewer |
| **Documentation Updates** | Module header comment |
| **Staging Validation** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Further Refactoring Needed?** | None anticipated. |
| **Design Patterns Reusable?** | Cache-discovery applies to any browser-cached e2e helper. |
| **Test Suite Improvements?** | Optional discovery unit test. |
| **Documentation Complete?** | Module header reconciled. |
| **Performance Impact?** | None. |
| **Team Knowledge Sharing?** | Note the cache-revision dependency. |
| **Technical Debt Reduced?** | Yes — removes the silent-break class. |
| **Code Quality Metrics Improved?** | Yes — robust discovery. |

### Completion Checklist

* [ ] Comprehensive tests exist before refactoring (95%+ coverage target).
* [ ] All tests pass before refactoring begins (baseline established).
* [ ] Baseline metrics captured (complexity, coverage, performance).
* [ ] Refactoring implemented incrementally (small, safe steps).
* [ ] All tests pass after each refactoring step (continuous validation).
* [ ] Documentation updated (docstrings, README, inline comments, architecture docs).
* [ ] Code passes style guide validation (linting, type checking).
* [ ] Code reviewed by at least 2 team members.
* [ ] No performance regression (ideally improvement).
* [ ] Refactored code validated in staging environment.
* [ ] Production deployment successful with monitoring.
* [ ] Code quality metrics improved (complexity, coverage, maintainability).
* [ ] Rollback plan documented and tested (if high-risk refactor).

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them.


## BLOCKED
Blocked on a concrete trigger: the first time a Playwright browser-cache revision bump breaks the hard-coded `chromium-1223` default lookup in `findChromeBinary()`. Until then the `HMR_CHROME_BIN` override works and the HMR e2e is gated out of the always-on `pnpm test`, so nothing downstream depends on it. Unblock when a cache-revision bump first breaks the pinned default. Source: LUIVIEW1 5mz1md review 1, retrospective Item 1 (non-blocking).
