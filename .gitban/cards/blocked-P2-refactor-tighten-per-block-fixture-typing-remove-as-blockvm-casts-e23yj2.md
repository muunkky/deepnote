# Tighten per-block fixture typing (remove `as BlockVM` casts)

> **Origin:** LUIVIEW1 card 5mz1md review 1, item L2 (non-blocking reviewer finding).
> **Status:** BLOCKED on an external prerequisite — see "Related Work" and the block reason. The
> concrete per-type block contracts this refactor must conform to do not exist yet; they are defined by
> the block-renderer registry cards (LUIVIEW1 steps 5–7D: zy7tn8 / k61ziu / 83gnbp / 4svfd0 / mxxsr6 /
> wye1xt). Until that registry lands there is no stable discriminated-union target to type the fixture
> blocks against, so this cannot be executed in isolation today.

## Refactoring Overview & Motivation

* **Refactoring Target:** Per-block construction in the studio sample-project test fixture.
* **Code Location:** `apps/studio/src/__fixtures__/sampleProject.ts`
* **Refactoring Type:** Replace loose type casts with precisely-typed literals (tighten typing).
* **Motivation:** Each block in the fixture is constructed via `{ ... } as BlockVM`, matching the
  upstream `blocks` package test convention (`... as DeepnoteBlock`). The per-block cast widens past the
  `BlockVM` discriminated union: if a future block-type field becomes required, the cast would suppress
  that mismatch at the block level. The envelope-level `: ApiProject` annotation still catches structural
  envelope drift, so the casts are acceptable as-is today — this is a typing-precision improvement, not a
  correctness bug.
* **Business Impact:** Stronger compile-time guarantees on the fixture so renderer-registry refactors
  can't silently drift the fixture's per-block shapes; the fixture becomes a true conformance sample for
  the block contracts the renderer registry defines.
* **Scope:** One file (`sampleProject.ts`), the per-block literal constructions only. Tens of lines. No
  production code, no behaviour change.
* **Risk Level:** Low — test fixture only; the existing envelope annotation already provides a safety net,
  and the change is type-level only.
* **Related Work:** Blocked on LUIVIEW1 block-renderer registry cards (steps 5–7D): zy7tn8, k61ziu,
  83gnbp, 4svfd0, mxxsr6, wye1xt. Those cards define the concrete per-type block contracts (the
  discriminated-union members) this refactor types against. Unblock once the registry's per-type
  contracts are stable.

**Required Checks:**
* [ ] **Refactoring motivation** clearly explains why this change is needed.
* [ ] **Scope** is specific and bounded (not open-ended "improve everything").
* [ ] **Risk level** is assessed based on code criticality and usage.

---

## Pre-Refactoring Context Review

Before refactoring, review the renderer registry's per-type block contracts (once they land) and the
current fixture so the cast-replacement conforms exactly to the discriminated union rather than re-widening it.

* [ ] Existing code reviewed and behavior fully understood.
* [ ] Test coverage reviewed - current test suite provides safety net.
* [ ] Documentation reviewed (README, docstrings, inline comments).
* [ ] Style guide and coding standards reviewed for compliance.
* [ ] Dependencies reviewed (internal modules, external libraries).
* [ ] Usage patterns reviewed (who calls this code, how it's used).
* [ ] Previous refactoring attempts reviewed (if any - learn from history).

| Review Source | Link / Location | Key Findings / Constraints |
| :--- | :--- | :--- |
| **Existing Code** | `apps/studio/src/__fixtures__/sampleProject.ts` (per-block construction) | Each block built as `{ ... } as BlockVM`; cast widens past the discriminated union. |
| **Test Coverage** | studio fixture consumers + `pnpm --filter @deepnote/studio test` | Envelope `: ApiProject` annotation already catches structural envelope drift. |
| **Documentation** | n/a | Convention mirrors upstream `blocks` package (`... as DeepnoteBlock`). |
| **Style Guide** | Biome (TS) — `pnpm lintAndFormat` | Must stay lint/format clean. |
| **Dependencies** | `BlockVM` / `ApiProject` types + block-renderer registry (steps 5–7D) | The per-type contracts to conform to are defined by the renderer registry — the blocking prerequisite. |
| **Usage Patterns** | Fixture consumed by studio component/render tests | Only test code depends on it; no production consumers. |
| **Previous Attempts** | None | First pass; deferred from LUIVIEW1 review 1. |

---

## Refactoring Strategy & Risk Assessment

> Replace each per-block `as BlockVM` cast with a precisely-typed block literal that conforms to the
> concrete discriminated-union member defined by the renderer registry, so the compiler enforces the
> per-type block shape instead of the cast suppressing it.

**Refactoring Approach:**
* Once the renderer registry defines the per-type block contracts, type each fixture block as its concrete
  union member (e.g. a code block literal typed as the code-block variant) rather than casting the whole
  object to the widened `BlockVM`.

**Incremental Steps:**
1. Confirm the renderer-registry per-type contracts are stable (prerequisite resolved).
2. Replace one block's `as BlockVM` cast with a precisely-typed literal; run typecheck.
3. Repeat per block type until all casts are removed.
4. Keep the envelope `: ApiProject` annotation; verify it and the per-block types both hold.

**Risk Mitigation:**
* Risk: re-widening via a new cast. Mitigation: prefer annotations/satisfies over `as`; let `tsc` enforce.
* Risk: contract churn if attempted before the registry stabilises. Mitigation: card stays blocked until
  steps 5–7D land.

**Rollback Plan:**
* Pure type-level change in a single test fixture; `git revert` of the one commit fully restores prior state.

**Success Criteria:**
* No `as BlockVM` casts remain in `sampleProject.ts`; each block is typed as its concrete union member.
* `pnpm --filter @deepnote/studio test` and `pnpm typecheck` pass; Biome clean.
* A newly-required block-type field would now surface as a typecheck error at the block level.

---

## Refactoring Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Pre-Refactor Test Suite** | Existing studio fixture tests | - [ ] Comprehensive tests exist before refactoring starts. |
| **Baseline Measurements** | Casts count + typecheck baseline | - [ ] Baseline metrics captured (complexity, performance, coverage). |
| **Incremental Refactoring** | Per-block cast replacement | - [ ] Refactoring implemented incrementally with passing tests at each step. |
| **Documentation Updates** | n/a (fixture-internal) | - [ ] All documentation updated to reflect refactored code. |
| **Code Review** | gitban reviewer | - [ ] Code reviewed for correctness, style guide compliance, maintainability. |
| **Performance Validation** | n/a (type-level only) | - [ ] Performance validated - no regression, ideally improvement. |
| **Staging Deployment** | n/a (test fixture) | - [ ] Refactored code validated in staging environment. |
| **Production Deployment** | n/a (test fixture) | - [ ] Refactored code deployed to production with monitoring. |

---

## Safe Refactoring Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Establish Test Safety Net** | Existing studio fixture tests | - [ ] Comprehensive tests exist covering current behavior. |
| **2. Run Baseline Tests** | `pnpm --filter @deepnote/studio test` | - [ ] All tests pass before any refactoring begins. |
| **3. Capture Baseline Metrics** | Count of `as BlockVM` casts | - [ ] Baseline metrics captured for comparison. |
| **4. Make Smallest Refactor** | Replace one block's cast | - [ ] Smallest possible refactoring change made. |
| **5. Run Tests (Iteration)** | typecheck + studio tests | - [ ] All tests pass after refactoring change. |
| **6. Commit Incremental Change** | per-block commit | - [ ] Incremental change committed (enables easy rollback). |
| **7. Repeat Steps 4-6** | until all casts removed | - [ ] All incremental refactoring steps completed with passing tests. |
| **8. Update Documentation** | n/a | - [ ] All documentation updated. |
| **9. Style & Linting Check** | `pnpm lintAndFormat` + `pnpm typecheck` | - [ ] Code passes linting, type checking, and style guide validation. |
| **10. Code Review** | gitban reviewer | - [ ] Changes reviewed for correctness and maintainability. |
| **11. Performance Validation** | n/a (type-level) | - [ ] Performance validated - no regression detected. |
| **12. Deploy to Staging** | n/a | - [ ] Refactored code validated in staging environment. |
| **13. Production Deployment** | n/a | - [ ] Gradual production rollout with monitoring. |

#### Refactoring Implementation Notes

**Refactoring Techniques Applied:**
* Replace cast with precisely-typed literal (prefer `satisfies` / annotation over `as`).

**Design Patterns Introduced:**
* None — conform to the existing `BlockVM` discriminated union.

**Code Quality Improvements:**
* Per-block type precision: widened `as BlockVM` casts -> concrete union-member typing.

**Before/After Comparison:**
```ts
// Before: per-block cast widens past the discriminated union
const codeBlock = { /* ... */ } as BlockVM;

// After: typed as the concrete union member (shape enforced by tsc)
const codeBlock = { /* ... */ } satisfies CodeBlockVM; // concrete contract from renderer registry
```

---

## Refactoring Validation & Completion

| Task | Detail/Link |
| :--- | :--- |
| **Code Location** | `apps/studio/src/__fixtures__/sampleProject.ts` |
| **Test Suite** | `pnpm --filter @deepnote/studio test` (fixture consumers) |
| **Baseline Metrics (Before)** | N per-block `as BlockVM` casts |
| **Final Metrics (After)** | 0 per-block casts; each block typed as its concrete union member |
| **Performance Validation** | N/A — type-level change only |
| **Style & Linting** | Biome + `tsc --noEmit` clean |
| **Code Review** | gitban reviewer |
| **Documentation Updates** | N/A (fixture-internal) |
| **Staging Validation** | N/A (test fixture) |
| **Production Deployment** | N/A (test fixture) |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Further Refactoring Needed?** | Apply the same precise-typing convention to any future fixtures. |
| **Design Patterns Reusable?** | The `satisfies`-over-`as` convention applies to all VM fixtures. |
| **Test Suite Improvements?** | Stronger compile-time conformance of the fixture to block contracts. |
| **Documentation Complete?** | N/A |
| **Performance Impact?** | None (type-level). |
| **Team Knowledge Sharing?** | Note the convention if upstream `blocks` fixtures are revisited. |
| **Technical Debt Reduced?** | Yes — removes widening casts once contracts exist. |
| **Code Quality Metrics Improved?** | Yes — per-block type precision. |

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
Blocked on the LUIVIEW1 block-renderer registry (steps 5–7D: zy7tn8, k61ziu, 83gnbp, 4svfd0, mxxsr6, wye1xt). Those cards define the concrete per-type block contracts (the BlockVM discriminated-union members) that this refactor must type the fixture blocks against. Until the renderer registry's per-type contracts are stable there is no fixed discriminated-union target to conform to, so replacing the `as BlockVM` casts with precisely-typed literals cannot be done in isolation. Unblock once the registry's per-type block contracts have landed and stabilised. Source: LUIVIEW1 card 5mz1md review 1, item L2 (non-blocking).


## Scope extension — fixture-factory consolidation (LUIVIEW1 zy7tn8 review 1, item L3)

A second LUIVIEW1 reviewer finding (card zy7tn8 review 1, item L3 — `fixture-duplication`) overlaps
this card and is **merged here** rather than tracked as a duplicate. Both concern `as BlockVM` casts in
test fixtures, and both are gated on the same prerequisite (the block-renderer registry, steps 5–7D,
defining concrete per-type block contracts). This card's scope is therefore **widened** from one file to
the studio block-test fixture-factory surface as a whole:

* **Original scope:** `apps/studio/src/__fixtures__/sampleProject.ts` — replace per-block
  `{ ... } as BlockVM` casts with precisely-typed literals.
* **Added scope (L3):** `apps/studio/src/blocks/testBlocks.ts` (`makeBlock`) duplicates the shape of the
  shared `__fixtures__` block factory with an `as BlockVM` cast. Today only two factories exist, so DRY
  is not yet breached and the colocation is justified — but steps 7A–7D (cards 83gnbp / 4svfd0 / mxxsr6 /
  wye1xt) each potentially add a third/fourth colocated block factory. **Consolidate toward ONE typed
  factory** so "a valid persisted block" cannot drift across test suites, and so the same precise
  per-type typing (removing the `as BlockVM` cast) applies at the single consolidated factory.

**Combined goal:** one typed block-fixture factory, conforming to the renderer registry's per-type
discriminated-union contracts, with no `as BlockVM` casts — shared across `sampleProject.ts`,
`testBlocks.ts`, and any factories introduced by the 7A–7D renderer cards.

**Why still blocked:** unchanged — the consolidated factory must type against the concrete per-type
block contracts the renderer registry defines (steps 5–7D). Until those land and stabilise there is no
fixed discriminated-union target to consolidate and type against. Re-evaluate the consolidation timing
after 7A–7D land, since those cards are what would introduce the third/fourth factory that makes
consolidation worthwhile.

**Files touched (combined):** `apps/studio/src/__fixtures__/sampleProject.ts`,
`apps/studio/src/blocks/testBlocks.ts` (`makeBlock`).
**Source:** LUIVIEW1 card 5mz1md review 1 item L2 (original) + card zy7tn8 review 1 item L3 (merged).
