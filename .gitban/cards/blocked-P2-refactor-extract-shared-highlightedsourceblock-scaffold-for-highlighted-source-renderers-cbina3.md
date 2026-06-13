# Extract shared `HighlightedSourceBlock` scaffold for highlighted-source renderers

> **Origin:** LUIVIEW1 card 83gnbp review 1, item `renderer-scaffold-dedup` (non-blocking reviewer finding).
> **Status:** BLOCKED on a true future dependency — a THIRD highlighted-source renderer landing. Today
> there are exactly two occurrences (`CodeRenderer` + `SqlRenderer`); the reviewer explicitly states this
> is **not** a DRY blocker at two call sites and that the shared scaffold should be extracted **only** "if
> a third highlighted-source renderer lands." Extracting now would be premature abstraction over two
> sites, and the triggering renderer does not exist yet.

## Refactoring Overview & Motivation

* **Refactoring Target:** Shared scaffolding across the studio highlighted-source block renderers.
* **Code Location:** `apps/studio/src/blocks/SqlRenderer.tsx`, `apps/studio/src/blocks/CodeRenderer.tsx`
  (+ a new shared `HighlightedSourceBlock` wrapper if/when extracted).
* **Refactoring Type:** Extract a shared wrapper component to remove copy-pasted scaffolding.
* **Motivation:** `SqlRenderer` and `CodeRenderer` share near-identical scaffolding — the defensive
  `('outputs' in block && Array.isArray(...) ? ... : []) as IOutput[]` narrowing, the
  `<pre><code className='hljs' dangerouslySetInnerHTML>` shape, and the trailing `<OutputRenderer>`. The
  only intentional divergence is the highlight call (`CodeRenderer`'s `highlightAuto` vs. `SqlRenderer`'s
  explicit `sql` grammar with a `highlightAuto` fallback). When a third highlighted-source renderer lands,
  extract a shared `HighlightedSourceBlock` wrapper taking a `highlight(source) => string` callback.
* **Business Impact:** Prevents the `'outputs' in block` narrowing and the `biome-ignore` security
  justification from being copy-pasted a third time and drifting out of sync across renderers.
* **Scope:** Two existing renderer files + one new shared wrapper. Tens of lines. Render-only; no
  behaviour change.
* **Risk Level:** Low — render-only components; the abstraction is mechanical once a third site exists.
* **Related Work:** BLOCKED on a third highlighted-source renderer (a 7x-or-later renderer) being added.
  Until a third occurrence exists, two call sites do not warrant the shared abstraction (premature
  abstraction). Unblock when the third highlighted-source renderer lands.

**Required Checks:**
* [ ] **Refactoring motivation** clearly explains why this change is needed.
* [ ] **Scope** is specific and bounded (not open-ended "improve everything").
* [ ] **Risk level** is assessed based on code criticality and usage.

---

## Pre-Refactoring Context Review

Before refactoring, review all (then ≥3) highlighted-source renderers so the extracted wrapper captures
exactly the shared scaffolding and exposes only the `highlight(source) => string` callback as the
divergence point.

* [ ] Existing code reviewed and behavior fully understood.
* [ ] Test coverage reviewed - current test suite provides safety net.
* [ ] Documentation reviewed (README, docstrings, inline comments).
* [ ] Style guide and coding standards reviewed for compliance.
* [ ] Dependencies reviewed (internal modules, external libraries).
* [ ] Usage patterns reviewed (who calls this code, how it's used).
* [ ] Previous refactoring attempts reviewed (if any - learn from history).

| Review Source | Link / Location | Key Findings / Constraints |
| :--- | :--- | :--- |
| **Existing Code** | `apps/studio/src/blocks/CodeRenderer.tsx`, `apps/studio/src/blocks/SqlRenderer.tsx` | Share the `'outputs' in block` narrowing, the `<pre><code className='hljs' dangerouslySetInnerHTML>` shape, and the trailing `<OutputRenderer>`. Only the highlight call diverges. |
| **Test Coverage** | `pnpm --filter @deepnote/studio test` | Per-renderer render tests; the extracted wrapper must keep them green. |
| **Documentation** | n/a | Internal component refactor. |
| **Style Guide** | Biome (TS) — `pnpm lintAndFormat` | The `biome-ignore` security justification for `dangerouslySetInnerHTML` must live in one place after extraction. |
| **Dependencies** | `highlight.js` (`hljs`), `OutputRenderer`, `IOutput` | The wrapper takes a `highlight(source) => string` callback so each renderer supplies its own highlight strategy. |
| **Usage Patterns** | `CodeRenderer` / `SqlRenderer` consumed by the BlockRenderer registry | Render-only; read-only viewer. |
| **Previous Attempts** | None | First pass; deferred from LUIVIEW1 card 83gnbp review 1. |

---

## Refactoring Strategy & Risk Assessment

> Once a third highlighted-source renderer exists, extract a shared `HighlightedSourceBlock` wrapper that
> owns the `'outputs' in block` narrowing, the `<pre><code className='hljs' dangerouslySetInnerHTML>`
> shape (with the single `biome-ignore` security justification), and the trailing `<OutputRenderer>`,
> parameterised only by a `highlight(source) => string` callback.

**Refactoring Approach:**
* Introduce `HighlightedSourceBlock` taking the block plus a `highlight(source) => string` callback.
* Re-express each renderer as a thin call into the wrapper supplying its own highlight strategy.

**Incremental Steps:**
1. Confirm a third highlighted-source renderer exists (prerequisite resolved).
2. Extract the shared scaffolding into `HighlightedSourceBlock` with a `highlight` callback prop.
3. Convert each renderer to delegate to the wrapper; run typecheck + studio tests after each.

**Risk Mitigation:**
* Risk: extracting before a third site exists (premature abstraction). Mitigation: card stays blocked
  until the third renderer lands.
* Risk: the `dangerouslySetInnerHTML` security justification drifting. Mitigation: centralise the
  `biome-ignore` in the wrapper.

**Rollback Plan:**
* Render-only component refactor; `git revert` of the extraction commit restores the per-renderer scaffolding.

**Success Criteria:**
* A single `HighlightedSourceBlock` wrapper owns the shared scaffolding; each highlighted-source renderer
  is a thin delegate supplying its own `highlight(source) => string`.
* The `'outputs' in block` narrowing and the `biome-ignore` security justification exist in exactly one place.
* `pnpm --filter @deepnote/studio test` + `pnpm typecheck` pass; Biome clean.

---

## Refactoring Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Pre-Refactor Test Suite** | Existing per-renderer render tests | - [ ] Comprehensive tests exist before refactoring starts. |
| **Baseline Measurements** | Count of duplicated scaffolding sites (≥3) | - [ ] Baseline metrics captured (complexity, performance, coverage). |
| **Incremental Refactoring** | Extract wrapper + convert renderers | - [ ] Refactoring implemented incrementally with passing tests at each step. |
| **Documentation Updates** | n/a (component-internal) | - [ ] All documentation updated to reflect refactored code. |
| **Code Review** | gitban reviewer | - [ ] Code reviewed for correctness, style guide compliance, maintainability. |
| **Performance Validation** | N/A (render-only) | - [ ] Performance validated - no regression, ideally improvement. |
| **Staging Deployment** | N/A (fork-only) | - [ ] Refactored code validated in staging environment. |
| **Production Deployment** | N/A (fork-only) | - [ ] Refactored code deployed to production with monitoring. |

---

## Safe Refactoring Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Establish Test Safety Net** | Existing per-renderer render tests | - [ ] Comprehensive tests exist covering current behavior. |
| **2. Run Baseline Tests** | `pnpm --filter @deepnote/studio test` | - [ ] All tests pass before any refactoring begins. |
| **3. Capture Baseline Metrics** | Duplicated-scaffolding site count | - [ ] Baseline metrics captured for comparison. |
| **4. Make Smallest Refactor** | Extract the wrapper | - [ ] Smallest possible refactoring change made. |
| **5. Run Tests (Iteration)** | typecheck + studio tests | - [ ] All tests pass after refactoring change. |
| **6. Commit Incremental Change** | per-step commit | - [ ] Incremental change committed (enables easy rollback). |
| **7. Repeat Steps 4-6** | convert each renderer | - [ ] All incremental refactoring steps completed with passing tests. |
| **8. Update Documentation** | n/a | - [ ] All documentation updated. |
| **9. Style & Linting Check** | `pnpm lintAndFormat` + `pnpm typecheck` | - [ ] Code passes linting, type checking, and style guide validation. |
| **10. Code Review** | gitban reviewer | - [ ] Changes reviewed for correctness and maintainability. |
| **11. Performance Validation** | N/A (render-only) | - [ ] Performance validated - no regression detected. |
| **12. Deploy to Staging** | N/A | - [ ] Refactored code validated in staging environment. |
| **13. Production Deployment** | N/A | - [ ] Gradual production rollout with monitoring. |

#### Refactoring Implementation Notes

**Refactoring Techniques Applied:**
* Extract shared wrapper component; parameterise the single divergence point via a callback.

**Design Patterns Introduced:**
* A `HighlightedSourceBlock` wrapper taking a `highlight(source) => string` strategy callback.

**Code Quality Improvements:**
* Single home for the `'outputs' in block` narrowing, the `dangerouslySetInnerHTML` security
  justification, and the trailing `<OutputRenderer>`.

**Before/After Comparison:**
```tsx
// Before: each renderer copy-pastes the narrowing + <pre><code hljs> + <OutputRenderer> scaffold
// After: thin delegate over the shared wrapper
<HighlightedSourceBlock block={block} highlight={(src) => hljs.highlight(src, { language: 'sql' }).value} />
```

---

## Refactoring Validation & Completion

| Task | Detail/Link |
| :--- | :--- |
| **Code Location** | `apps/studio/src/blocks/CodeRenderer.tsx`, `apps/studio/src/blocks/SqlRenderer.tsx`, new `HighlightedSourceBlock` wrapper |
| **Test Suite** | `pnpm --filter @deepnote/studio test` |
| **Baseline Metrics (Before)** | ≥3 duplicated scaffolding sites |
| **Final Metrics (After)** | 1 shared wrapper; renderers are thin delegates |
| **Performance Validation** | N/A — render-only |
| **Style & Linting** | Biome + `tsc --noEmit` clean |
| **Code Review** | gitban reviewer |
| **Documentation Updates** | N/A (component-internal) |
| **Staging Validation** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Further Refactoring Needed?** | Route any future highlighted-source renderer through the wrapper from the start. |
| **Design Patterns Reusable?** | The strategy-callback wrapper applies to any source-highlighting block. |
| **Test Suite Improvements?** | Wrapper-level test covering the shared scaffolding. |
| **Documentation Complete?** | N/A |
| **Performance Impact?** | None (render-only). |
| **Team Knowledge Sharing?** | Note the rule-of-three trigger for this extraction. |
| **Technical Debt Reduced?** | Yes — removes triplicated scaffolding once a third site exists. |
| **Code Quality Metrics Improved?** | Yes — single source for the narrowing + security justification. |

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
Blocked on a true future dependency — a THIRD highlighted-source renderer landing (a 7x-or-later renderer). Today there are exactly two highlighted-source renderers (CodeRenderer + SqlRenderer). The LUIVIEW1 card 83gnbp review 1 reviewer explicitly states this is NOT a DRY blocker at two call sites and that the shared HighlightedSourceBlock scaffold should be extracted ONLY "if a third highlighted-source renderer lands." Extracting now would be premature abstraction over two sites, and the triggering third renderer does not exist yet. Unblock and execute when a third highlighted-source renderer is added, so the dedup is done once (and only once) the rule-of-three trigger fires. Source: LUIVIEW1 card 83gnbp review 1, item renderer-scaffold-dedup (non-blocking).
