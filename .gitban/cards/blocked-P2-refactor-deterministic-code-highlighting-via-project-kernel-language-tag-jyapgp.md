# Deterministic code highlighting via a project/kernel language tag (replace `highlightAuto`)

> **Origin:** LUIVIEW1 card zy7tn8 review 1, item L2 (non-blocking reviewer finding).
> **Status:** BLOCKED on an external prerequisite — no per-block (or project/kernel) language tag is
> currently persisted or surfaced to the SPA. Deterministic highlighting via
> `hljs.highlight(source, { language })` is only possible once that language signal exists in the SPA's
> data model. Acceptable as-is for a read-only viewer today.

## Refactoring Overview & Motivation

* **Refactoring Target:** Syntax-highlighting strategy in the studio code-block renderer.
* **Code Location:** `apps/studio/src/blocks/CodeRenderer.tsx`
* **Refactoring Type:** Replace auto-detection (`hljs.highlightAuto`) with deterministic
  language-directed highlighting (`hljs.highlight(source, { language })`).
* **Motivation:** `CodeRenderer` uses `hljs.highlightAuto` over the `common` language subset because no
  per-block (or project/kernel) language tag is currently available to the SPA. Auto-detection can
  mis-highlight short or ambiguous snippets (a two-line cell can be detected as the wrong language).
  Once a project/kernel-level language signal is surfaced to the SPA, pass it to
  `hljs.highlight(source, { language })` for deterministic, correct highlighting.
* **Business Impact:** Correct, stable syntax highlighting for code cells regardless of snippet length —
  removes the class of mis-detection bugs auto-detection introduces.
* **Scope:** One file (`CodeRenderer.tsx`), the highlight call only. Small. No behaviour change beyond
  highlighting accuracy; read-only viewer.
* **Risk Level:** Low — render-only, single component; falls back to `highlightAuto` (or plaintext) when
  no language is available.
* **Related Work:** BLOCKED on a project/kernel-level language source-of-truth becoming available to the
  SPA. That signal does not exist in the current data model (neither per-block nor project/kernel level
  is persisted or surfaced over the s1 API). Unblock once such a language tag is plumbed to the SPA.

**Required Checks:**
* [ ] **Refactoring motivation** clearly explains why this change is needed.
* [ ] **Scope** is specific and bounded (not open-ended "improve everything").
* [ ] **Risk level** is assessed based on code criticality and usage.

---

## Pre-Refactoring Context Review

Before refactoring, confirm a language signal is available to the SPA and review how `CodeRenderer`
currently invokes highlight.js so the deterministic path degrades gracefully when no language is present.

* [ ] Existing code reviewed and behavior fully understood.
* [ ] Test coverage reviewed - current test suite provides safety net.
* [ ] Documentation reviewed (README, docstrings, inline comments).
* [ ] Style guide and coding standards reviewed for compliance.
* [ ] Dependencies reviewed (internal modules, external libraries).
* [ ] Usage patterns reviewed (who calls this code, how it's used).
* [ ] Previous refactoring attempts reviewed (if any - learn from history).

| Review Source | Link / Location | Key Findings / Constraints |
| :--- | :--- | :--- |
| **Existing Code** | `apps/studio/src/blocks/CodeRenderer.tsx` | Uses `hljs.highlightAuto` over the `common` subset; no language input. |
| **Test Coverage** | `pnpm --filter @deepnote/studio test` | Code-block render tests; add a deterministic-language test once a language signal exists. |
| **Documentation** | `apps/studio/README.md` | Note the highlighting strategy and the language-tag prerequisite. |
| **Style Guide** | Biome (TS) — `pnpm lintAndFormat` | Must stay lint/format clean. |
| **Dependencies** | `highlight.js` (`hljs`) + a project/kernel language signal (the blocking prerequisite) | The language source-of-truth does not yet exist in the SPA's data model. |
| **Usage Patterns** | `CodeRenderer` consumed by the BlockRenderer registry | Read-only viewer; render-only. |
| **Previous Attempts** | None | First pass; deferred from LUIVIEW1 zy7tn8 review 1. |

---

## Refactoring Strategy & Risk Assessment

> Once a project/kernel language tag is available to the SPA, pass it to
> `hljs.highlight(source, { language })`, falling back to `highlightAuto`/plaintext only when no language
> is known.

**Refactoring Approach:**
* Thread the language signal from the SPA's project/kernel data into `CodeRenderer`.
* Call `hljs.highlight(source, { language })` when a language is known; keep `highlightAuto` as the
  fallback for unknown/absent language.

**Incremental Steps:**
1. Confirm the language signal is surfaced to the SPA (prerequisite resolved).
2. Thread the language prop into `CodeRenderer`.
3. Switch the highlight call to `hljs.highlight(source, { language })` with a graceful fallback.
4. Add a deterministic-highlight test (a snippet that `highlightAuto` mis-detects highlights correctly).

**Risk Mitigation:**
* Risk: unknown/unsupported language string. Mitigation: fall back to `highlightAuto` or plaintext.
* Risk: attempting before the signal exists. Mitigation: card stays blocked until the language tag lands.

**Rollback Plan:**
* Single-component, render-only change; `git revert` of the one commit restores `highlightAuto`.

**Success Criteria:**
* `CodeRenderer` uses `hljs.highlight(source, { language })` when a language is known.
* A snippet that `highlightAuto` mis-detects now highlights as the correct language.
* Graceful fallback when no language is available; `pnpm --filter @deepnote/studio test` + `pnpm typecheck` pass; Biome clean.

---

## Refactoring Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Pre-Refactor Test Suite** | Existing studio code-block render tests | - [ ] Comprehensive tests exist before refactoring starts. |
| **Baseline Measurements** | `highlightAuto` usage + a mis-detect repro | - [ ] Baseline metrics captured (complexity, performance, coverage). |
| **Incremental Refactoring** | Thread language + switch highlight call | - [ ] Refactoring implemented incrementally with passing tests at each step. |
| **Documentation Updates** | README highlighting note | - [ ] All documentation updated to reflect refactored code. |
| **Code Review** | gitban reviewer | - [ ] Code reviewed for correctness, style guide compliance, maintainability. |
| **Performance Validation** | N/A (render-only) | - [ ] Performance validated - no regression, ideally improvement. |
| **Staging Deployment** | N/A (fork-only) | - [ ] Refactored code validated in staging environment. |
| **Production Deployment** | N/A (fork-only) | - [ ] Refactored code deployed to production with monitoring. |

---

## Safe Refactoring Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Establish Test Safety Net** | Existing studio code-block tests | - [ ] Comprehensive tests exist covering current behavior. |
| **2. Run Baseline Tests** | `pnpm --filter @deepnote/studio test` | - [ ] All tests pass before any refactoring begins. |
| **3. Capture Baseline Metrics** | Repro of a `highlightAuto` mis-detection | - [ ] Baseline metrics captured for comparison. |
| **4. Make Smallest Refactor** | Thread language prop | - [ ] Smallest possible refactoring change made. |
| **5. Run Tests (Iteration)** | typecheck + studio tests | - [ ] All tests pass after refactoring change. |
| **6. Commit Incremental Change** | per-step commit | - [ ] Incremental change committed (enables easy rollback). |
| **7. Repeat Steps 4-6** | switch highlight call + add test | - [ ] All incremental refactoring steps completed with passing tests. |
| **8. Update Documentation** | README highlighting note | - [ ] All documentation updated. |
| **9. Style & Linting Check** | `pnpm lintAndFormat` + `pnpm typecheck` | - [ ] Code passes linting, type checking, and style guide validation. |
| **10. Code Review** | gitban reviewer | - [ ] Changes reviewed for correctness and maintainability. |
| **11. Performance Validation** | N/A (render-only) | - [ ] Performance validated - no regression detected. |
| **12. Deploy to Staging** | N/A | - [ ] Refactored code validated in staging environment. |
| **13. Production Deployment** | N/A | - [ ] Gradual production rollout with monitoring. |

#### Refactoring Implementation Notes

**Refactoring Techniques Applied:**
* Replace auto-detection with directed highlighting; graceful fallback.

**Design Patterns Introduced:**
* None — direct highlight.js API usage with a language input.

**Code Quality Improvements:**
* Deterministic highlighting: `highlightAuto` -> `highlight(source, { language })`.

**Before/After Comparison:**
```ts
// Before: auto-detection over the common subset (can mis-detect short snippets)
const html = hljs.highlightAuto(source).value;

// After: deterministic when a language is known; fall back otherwise
const html = language
  ? hljs.highlight(source, { language }).value
  : hljs.highlightAuto(source).value;
```

---

## Refactoring Validation & Completion

| Task | Detail/Link |
| :--- | :--- |
| **Code Location** | `apps/studio/src/blocks/CodeRenderer.tsx` |
| **Test Suite** | `pnpm --filter @deepnote/studio test` |
| **Baseline Metrics (Before)** | `highlightAuto`; a reproducible mis-detection |
| **Final Metrics (After)** | `highlight(source, { language })` when language known; correct highlighting |
| **Performance Validation** | N/A — render-only |
| **Style & Linting** | Biome + `tsc --noEmit` clean |
| **Code Review** | gitban reviewer |
| **Documentation Updates** | README highlighting note |
| **Staging Validation** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Further Refactoring Needed?** | Per-block language override if a per-cell language signal later exists. |
| **Design Patterns Reusable?** | Directed-highlight pattern applies to any code surface. |
| **Test Suite Improvements?** | Deterministic-highlight test added. |
| **Documentation Complete?** | README highlighting note. |
| **Performance Impact?** | None (render-only). |
| **Team Knowledge Sharing?** | Note the language-tag prerequisite. |
| **Technical Debt Reduced?** | Yes — removes the mis-detection class of bugs. |
| **Code Quality Metrics Improved?** | Yes — deterministic highlighting. |

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
Blocked on a project/kernel-level language source-of-truth becoming available to the SPA. `CodeRenderer` uses `hljs.highlightAuto` because no per-block (or project/kernel) language tag is currently persisted or surfaced over the s1 API to the SPA. Switching to deterministic `hljs.highlight(source, { language })` is only possible once such a language signal exists in the SPA's data model — that source-of-truth does not exist today, so this cannot be executed in isolation. Auto-detection is acceptable as-is for a read-only viewer. Unblock once a project/kernel language tag is plumbed to the SPA. Source: LUIVIEW1 card zy7tn8 review 1, item L2 (non-blocking).
