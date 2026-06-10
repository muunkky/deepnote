# step 1: case-insensitive external integration ID matching

> Sprint **EXTIDCI1**, step 1. Supersedes hand-rolled backlog card `ca0ios`. Follow-on to #325 (card 234rnd / PR deepnote/deepnote#399), which made the *built-in* check case-insensitive; this card finishes the job for *external* IDs. Fork contribution — read-only upstream, no `.gitban`/`.claude` in code commits, deploy/staging/prod steps N/A.

## Bug Overview & Context

* **Ticket/Issue ID:** Follow-on to [#325](https://github.com/deepnote/deepnote/issues/325); surfaced by the code review of PR #399 (tag `external-id-casing-followup`).
* **Affected Component/Service:** `@deepnote/cli` — SQL integration collection & lint analysis
* **Severity Level:** P1 - High / Latent correctness defect (duplicate user-facing entries + redundant API fetch)
* **Discovered By:** Adversarial code review of PR #399
* **Discovery Date:** 2026-06-10
* **Reporter:** gitban-reviewer

**Required Checks:**
* [x] Ticket/Issue ID is linked above
* [x] Component/Service is clearly identified
* [x] Severity level is assigned based on impact

---

## Bug Description

### What's Broken

After #325, *built-in* integration IDs match case-insensitively, but *external* integration IDs are still keyed on raw casing in two places, so the same external integration referenced in different casing is treated as two integrations.

### Expected Behavior

An external integration referenced in different casing across SQL blocks is collected once, reported once (missing/configured), and fetched once — with a single original-casing representative (first-seen) preserved for display.

### Actual Behavior

`collectRequiredIntegrationIds` dedups its result `Set` on the raw string, and `checkMissingIntegrations` keys its `configured`/`missing`/`usage` collections on raw casing. `getIntegrationEnvVarName`/`convertToEnvironmentVariableName` uppercase, so `my-warehouse` and `My-Warehouse` collapse to one env var (`SQL_MY_WAREHOUSE`) — yet surface as two distinct required/missing entries, and `fetch-and-merge-integrations.ts` fetches both casings.

### Reproduction Rate

* [x] 100% - Always reproduces
* [ ] 75% - Usually reproduces
* [ ] 50% - Sometimes reproduces
* [ ] 25% - Rarely reproduces
* [ ] Cannot reproduce consistently

---

## Steps to Reproduce

**Prerequisites:**
* A `.deepnote` project with two SQL blocks referencing the same external integration in different casing (`My-Warehouse`, `my-warehouse`), env var `SQL_MY_WAREHOUSE` unset.

**Reproduction Steps:**

1. Author the two SQL blocks above.
2. Run `deepnote lint` (or call `collectRequiredIntegrationIds` / `checkForIssues`).
3. Observe the integration reported as missing twice, and `collectRequiredIntegrationIds` returning two ids.

**Error Messages / Stack Traces:**

```
lint: SQL integration "My-Warehouse" is not configured (set SQL_MY_WAREHOUSE)
lint: SQL integration "my-warehouse" is not configured (set SQL_MY_WAREHOUSE)
   (one integration, reported twice; same env var)
```

---

## Environment Details

| Environment Aspect | Required | Value | Notes |
| :--- | :--- | :--- | :--- |
| **Environment** | Optional | Local CLI | OS-independent |
| **OS** | Optional | Any | Pure string handling |
| **Browser** | Optional | N/A | Not a web surface |
| **Application Version** | Optional | post-#399 `@deepnote/cli` | builds on isBuiltinIntegration |
| **Database Version** | Optional | N/A | — |
| **Runtime/Framework** | Optional | Node 22.21.0, vitest | analysis tests need Python+jinja2 (/tmp/dn-venv) |
| **Dependencies** | Optional | @deepnote/blocks, zod | — |
| **Infrastructure** | Optional | N/A | — |

---

## Impact Assessment

| Impact Category | Severity | Details |
| :--- | :--- | :--- |
| **User Impact** | Medium | Same integration reported as missing/configured twice; confusing lint output |
| **Business Impact** | Low | OSS correctness/consistency |
| **System Impact** | Low | Redundant API fetch for the same integration |
| **Data Impact** | None | — |
| **Security Impact** | None | — |

**Business Justification for Priority:**

P1 because it is a user-facing correctness inconsistency on the same path #325 touched; leaving external IDs case-sensitive while built-ins are case-insensitive is an internal contradiction. Not P0 — no crash, no data loss.

---

## Documentation & Code Review

| Item | Applicable | File / Location | Notes / Evidence | Key Findings / Action Required |
|---|:---:|---|---|---|
| README/component docs reviewed | yes | packages/cli/README.md | Integration model | No README contract change. |
| Related ADRs reviewed | no | docs/adr | None govern ID casing | None needed. |
| API documentation reviewed | no | N/A | No public signature change | Internal behavior. |
| Test suite documentation reviewed | yes | collect-integrations.test.ts, analysis.test.ts | Existing fixtures (`makeFileWithSqlBlocks`, `createTestFile`) | Extend with mixed-case external cases. |
| IaC configuration reviewed | no | N/A | No infra | N/A. |
| New Documentation (Action Item) | N/A | **N/A** | — | None. |

---

## Root Cause Investigation

| Iteration # | Hypothesis | Test/Action Taken | Outcome / Findings |
| :---: | :--- | :--- | :--- |
| **1** | Required-IDs Set keyed on raw casing | Read collect-integrations.ts `collectRequiredIntegrationIds` | Confirmed — `ids.add(integrationId)` on a `Set<string>`, raw casing |
| **2** | Missing/configured keyed on raw casing | Read analysis.ts `checkMissingIntegrations` (lines 510-567) | Confirmed — `configuredIntegrations`/`missingIntegrations` `Set<string>` + `integrationUsage` `Map<string,...>` all keyed raw; env var derived via `getIntegrationEnvVarName` (uppercases) |
| **3** | Downstream fetch also case-sensitive on input | Read fetch-and-merge-integrations.ts | `idsToFetch` keeps raw casing; duplicate casings both fetched |

---

### Hypothesis testing iterations

**Iteration 1:** Required-IDs dedup is case-sensitive — Confirmed in `collectRequiredIntegrationIds`.

**Iteration 2:** Missing/configured/usage are case-sensitive — Confirmed in `checkMissingIntegrations`; the `summary.missing`/`summary.configured` arrays therefore contain per-casing duplicates.

**Iteration 3:** The downstream env-var/fetch already normalizes (uppercase / lowercase) — Confirmed, which is exactly why duplicates collapse to one env var, proving the collection layer is the right place to normalize.

---

### Root Cause Summary

**Root Cause:** External integration IDs are deduplicated and keyed on their raw, case-preserving string in `collectRequiredIntegrationIds` and `checkMissingIntegrations`, while the env-var derivation that follows is case-insensitive — so casings that map to one integration surface as multiple required/missing entries and trigger redundant fetches.

**Code/Config Location:**
* `packages/cli/src/integrations/collect-integrations.ts` (`collectRequiredIntegrationIds`)
* `packages/cli/src/utils/analysis.ts` (`checkMissingIntegrations`, ~lines 510-567)

**Why This Happened:** #325 normalized only the built-in check; external-ID normalization was explicitly deferred. This card closes that gap.

---

## Solution Design

### Fix Strategy

Normalize external integration IDs case-insensitively at the point of collection/aggregation while preserving the first-seen original casing as the single display representative. Mirror the existing lowercase convention (`fetch-and-merge-integrations.ts:23-24`). Prefer a small shared normalization helper over duplicating `.toLowerCase()` keying logic in both functions.

### Code Changes

* `packages/cli/src/integrations/collect-integrations.ts` — dedup `collectRequiredIntegrationIds` by lowercased key, keep first-seen original casing (e.g. `Map<string,string>` lower→original, return `Array.from(map.values())`).
* `packages/cli/src/utils/analysis.ts` — key `configuredIntegrations`/`missingIntegrations`/`integrationUsage` in `checkMissingIntegrations` by lowercased id, store/display first-seen original casing; `summary.missing`/`summary.configured` contain one representative per integration.
* Consider a shared helper (e.g. `normalizeIntegrationId`) if it reduces duplication cleanly.
* Tests: extend `collect-integrations.test.ts` and `analysis.test.ts` with mixed-case external cases.

### Rollback Plan

Pure logic change, no migration. Revert the commit to restore prior behavior.

---

## Definition of Done

### Intent

A CLI user who references the same external database integration in more than one SQL block sees it treated as one integration no matter how they capitalized the ID — `deepnote lint` reports it as missing/configured exactly once, and the CLI fetches its credentials once. If this regressed, someone would notice `deepnote lint` listing the same integration twice (once per casing) or the CLI making duplicate credential fetches for what is obviously one integration.

### Observable outcomes

- [ ] `collectRequiredIntegrationIds` returns a single entry for an external integration referenced in two casings, preserving the first-seen casing.
- [ ] `checkMissingIntegrations` lists that integration exactly once in `summary.missing` (and once in `summary.configured` when configured), using the first-seen casing.
- [ ] Behavior is unchanged for integrations referenced in a single consistent casing (no regression to existing tests).
- [ ] **Capstone:** Given a project with two SQL blocks `sql_integration_id: "My-Warehouse"` and `sql_integration_id: "my-warehouse"` (same external integration, `SQL_MY_WAREHOUSE` unset), `collectRequiredIntegrationIds` returns exactly `["My-Warehouse"]` and `deepnote lint`'s `missing` summary is exactly `["My-Warehouse"]` (one entry, not two).

---

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Test** | mixed-case external dedup tests in both suites | - [ ] A failing test that reproduces the bug is committed |
| **2. Verify Test Fails** | `pnpm --filter @deepnote/cli test` (PATH=/tmp/dn-venv/bin:$PATH) | - [ ] Test suite was run and the new test fails as expected |
| **3. Implement Code Fix** | normalize collect + analysis | - [ ] Code changes are complete and committed |
| **4. Verify Test Passes** | re-run vitest | - [ ] The original failing test now passes |
| **5. Run Full Test Suite** | `pnpm test`, `pnpm typecheck`, `pnpm lintAndFormat` | - [ ] All existing tests still pass (no regressions) |
| **6. Code Review** | dispatcher reviewer | - [ ] Code review approved by at least one peer |
| **7. Update Documentation** | JSDoc on any new helper | - [ ] Documentation is updated (DaC) |
| **8. Deploy to Staging** | Fork contribution — N/A | - [ ] Fix deployed to staging environment |
| **9. Staging Verification** | Fork contribution — N/A | - [ ] Bug fix verified in staging environment |
| **10. Deploy to Production** | Fork contribution — N/A | - [ ] Fix deployed to production environment |
| **11. Production Verification** | Fork contribution — N/A | - [ ] Bug fix verified in production environment |

### Test Code (Failing Test)

```typescript
it('capstone: collects a mixed-case external integration once, first-seen casing', () => {
  const file = makeFileWithSqlBlocks(['My-Warehouse', 'my-warehouse'])
  expect(collectRequiredIntegrationIds(file)).toEqual(['My-Warehouse'])
})
```

---

## Infrastructure as Code (IaC) Considerations (optional)

* [x] Infrastructure changes required — none (N/A, pure code)
* [x] IaC code updated — N/A
* [x] IaC changes reviewed and approved — N/A
* [x] IaC changes tested in non-production environment — N/A
* [x] IaC changes deployed via automation — N/A

| IaC Component | Change Required | Status |
| :--- | :--- | :--- |
| **Environment Variables** | None | N/A |
| **Scaling** | None | N/A |
| **New Resource** | None | N/A |

**Note:** No infrastructure involved.

---

## Testing & Verification

### Test Plan

| Test Type | Test Case | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **Unit Test** | collect: two casings same external | one entry, first-seen casing | - [ ] Pass |
| **Integration Test** | analysis: two casings same external, env unset | `missing` has one entry | - [ ] Pass |
| **Regression Test** | single-casing external + built-in cases | unchanged from post-#399 | - [ ] Pass |
| **Edge Case 1** | configured (env set) mixed casing | one `configured` entry | - [ ] Pass |
| **Edge Case 2** | two genuinely different externals | both reported (no over-merge) | - [ ] Pass |
| **Performance Test** | N/A | N/A | - [x] Pass — N/A |
| **Manual Test** | `deepnote lint` on mixed-case fixture | one missing entry | - [ ] Pass |

### Verification Checklist

* [ ] Original bug is no longer reproducible
* [ ] All new tests pass
* [ ] All existing tests still pass (no regressions)
* [ ] Code review completed and approved
* [ ] Documentation updated
* [x] Staging environment verification complete — N/A (fork)
* [x] Production environment verification complete — N/A (fork)
* [x] Monitoring shows healthy metrics — N/A (fork)

---

## Regression Prevention

* [ ] **Automated Test:** Unit test for mixed-case external dedup
* [ ] **Integration Test:** lint-level test for single missing entry
* [ ] **Type Safety:** shared normalization keeps both call sites consistent
* [x] **Linting Rules:** N/A
* [x] **Code Review Checklist:** N/A (fork)
* [x] **Monitoring/Alerting:** N/A (fork)
* [ ] **Documentation:** JSDoc on the normalization helper

---

## Validation & Finalization

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | dispatcher reviewer |
| **Test Results** | `pnpm --filter @deepnote/cli test` |
| **Staging Verification** | N/A — fork |
| **Production Verification** | N/A — fork |
| **Documentation Update** | JSDoc |
| **Monitoring Check** | N/A — fork |

### Follow-up gitban cards

| Topic | Action Required | Tracker | Gitban Cards |
| :--- | :--- | :--- |
| **Postmortem** | No | this card | this card |
| **Documentation Debt** | No | this card | this card |
| **Technical Debt** | No — removes an inconsistency | this card | this card |
| **Process Improvement** | This sprint exists because external-ID work was wrongly hand-deferred; now dispatched properly | this card | EXTIDCI1 |
| **Related Bugs** | Supersedes hand-rolled ca0ios | this card | ca0ios (archived) |

### Completion Checklist

* [ ] Root cause is fully understood and documented
* [ ] Fix follows TDD process (failing test → fix → passing test)
* [ ] All tests pass (unit, integration, regression)
* [ ] Documentation updated (DaC)
* [x] No manual infrastructure changes — confirmed none
* [x] Deployed and verified — N/A (fork)
* [x] Monitoring confirms fix is working — N/A (fork)
* [ ] Regression prevention measures added
* [x] Postmortem completed (if required) — N/A
* [ ] Follow-up tickets created for related issues
* [ ] Associated ticket is closed

### Note on validation

Structured bug card; deploy/monitoring/IaC items checked-and-annotated as deferred (fork contribution).