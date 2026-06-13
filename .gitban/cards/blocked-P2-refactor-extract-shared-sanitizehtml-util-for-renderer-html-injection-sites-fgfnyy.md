# Code Refactoring: extract shared `sanitizeHtml()` util

**When to use this template:** This is a deferred, structure-only refactor — consolidating the inlined `DOMPurify.sanitize` call sites in `apps/studio` behind one shared `sanitizeHtml()` util so a future sanitizer-policy change lives in one place. **It is BLOCKED**: there is no current trigger; see the blocking reason at the bottom.

---

## Refactoring Overview & Motivation

* **Refactoring Target:** Inlined `DOMPurify.sanitize` call sites across the `apps/studio` block/MIME renderers.
* **Code Location:** `apps/studio/src/` — the HTML MIME renderer (HtmlMime), the SVG MIME renderer (SvgMime), `apps/studio/src/blocks/ImageRenderer.tsx`, and the markdown render seam (`renderMarkdown.ts`, the `DOMPurify.sanitize` call). Grep terms: `DOMPurify.sanitize`, `sanitize`, `dangerouslySetInnerHTML`.
* **Refactoring Type:** Extract Function — consolidate 3+ inline sanitize call sites into one shared `sanitizeHtml(dirty: string): string` util.
* **Motivation:** `DOMPurify.sanitize` is currently inlined at 3+ injection sites. All are correct today and consistent with the package's pre-existing inline convention — there is **no behaviour risk and no DRY violation under the current policy**. A single shared util only becomes valuable once a sanitizer-config policy must be hardened (e.g. a custom `ALLOWED_URI_REGEXP` or `FORBID_ATTR`), so that policy lives in one place instead of being edited at every site.
* **Business Impact:** Future sanitizer-hardening lands in one reviewable place instead of N call sites — reduces the chance a hardening change misses a site.
* **Scope:** ~4 call sites, tens of lines. Small and bounded.
* **Risk Level:** Low — pure extraction, no behaviour change. The risk is doing it *prematurely* (a util with a single config and no second policy is speculative abstraction).
* **Related Work:** Surfaced by LUIVIEW1 card `4svfd0` review 1 (reviewer scoped it to the "renderer-hardening backlog", explicitly NOT card 4svfd0). Sibling renderer cards that inline sanitize: `zy7tn8` (markdown seam), `k61ziu` (HTML/SVG MIME), `4svfd0` (ImageRenderer).

**Required Checks:**
* [ ] **Refactoring motivation** clearly explains why this change is needed. — captured above; note the trigger is a *future* hardening requirement.
* [ ] **Scope** is specific and bounded (not open-ended "improve everything"). — 4 call sites, extract one util.
* [ ] **Risk level** is assessed based on code criticality and usage. — Low; behaviour-preserving.

---

## Pre-Refactoring Context Review

Before refactoring, confirm the sanitizer-hardening requirement that unblocks this card actually exists, then review every current call site so the extracted util preserves each site's exact options.

* [ ] Existing code reviewed and behavior fully understood (each call site's DOMPurify options captured).
* [ ] Test coverage reviewed - the renderer tests covering each injection site provide the safety net.
* [ ] Documentation reviewed (renderer READMEs / inline comments at each sanitize site).
* [ ] Style guide and coding standards reviewed for compliance (Biome).
* [ ] Dependencies reviewed (`dompurify`; the `@deepnote/blocks` markdown seam).
* [ ] Usage patterns reviewed (every `DOMPurify.sanitize` call in `apps/studio/src`).
* [ ] Previous refactoring attempts reviewed (none — this is the first).

| Review Source | Link / Location | Key Findings / Constraints |
| :--- | :--- | :--- |
| **Existing Code** | HtmlMime, SvgMime MIME renderers (`apps/studio/src/.../mime/`) | Inline `DOMPurify.sanitize`; SVG site may carry SVG-specific options — preserve per-site config exactly. |
| **Existing Code** | `apps/studio/src/blocks/ImageRenderer.tsx` | `deepnote_img_src` sanitized inline. |
| **Existing Code** | markdown seam `renderMarkdown.ts` | `marked` parse → `DOMPurify.sanitize` → `dangerouslySetInnerHTML`. |
| **Test Coverage** | renderer/MIME vitest suites | Lock current behaviour before extracting; each site's tests must pass unchanged. |
| **Dependencies** | `dompurify` | Single dep; util is a thin wrapper. |
| **Usage Patterns** | `grep -rn "DOMPurify.sanitize" apps/studio/src` | Enumerate every site before extraction. |
| **Previous Attempts** | n/a | First attempt. |

---

## Refactoring Strategy & Risk Assessment

> Extract one `sanitizeHtml()` util only once a real hardening requirement exists, so the util encodes a *consolidated policy* rather than a same-as-N-sites passthrough.

**Refactoring Approach:**
* Extract Function: create `apps/studio/src/.../sanitizeHtml.ts` exporting `sanitizeHtml(dirty, opts?)`, encoding the consolidated DOMPurify policy required by the triggering hardening card. Replace each inline call site with a call to it.

**Incremental Steps:**
1. Confirm the hardening requirement (the unblocking trigger) and capture the exact consolidated DOMPurify policy it mandates.
2. Enumerate every `DOMPurify.sanitize` site in `apps/studio/src`; record each site's current options.
3. Add the `sanitizeHtml()` util + unit tests covering the consolidated policy (incl. any per-site SVG options preserved via an opts arg).
4. Replace call sites one at a time, running that site's renderer tests after each swap.
5. Update inline comments / renderer docs to point at the shared util.

**Risk Mitigation:**
* Risk: a site has subtly different DOMPurify options (e.g. SVG profile) and a naive extraction loosens/tightens it. Mitigation: capture per-site options first; thread them through an `opts` argument; assert per-site in tests.
* Risk: premature abstraction. Mitigation: this card stays BLOCKED until a real hardening requirement exists — do not execute speculatively.

**Rollback Plan:**
* Pure structural change behind passing tests; `git revert` the extraction commit restores the inline sites.

**Success Criteria:**
* All existing renderer/MIME tests pass unmodified.
* Every former inline site routes through `sanitizeHtml()`; no `DOMPurify.sanitize` left inline in `apps/studio/src` except inside the util.
* The consolidated hardening policy is expressed once, in the util.
* Biome/typecheck clean.

---

## Refactoring Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Pre-Refactor Test Suite** | Existing renderer/MIME vitest suites serve as the net; add util unit tests. | - [ ] Comprehensive tests exist before refactoring starts. |
| **Baseline Measurements** | Enumerate call sites + per-site options (the baseline policy table). | - [ ] Baseline captured (call-site inventory + per-site options). |
| **Incremental Refactoring** | Extract util, swap sites one at a time. | - [ ] Refactoring implemented incrementally with passing tests at each step. |
| **Documentation Updates** | Repoint inline comments / renderer docs at the util. | - [ ] All documentation updated to reflect refactored code. |
| **Code Review** | Reviewed as part of the triggering hardening card's PR. | - [ ] Code reviewed for correctness, style compliance, maintainability. |
| **Performance Validation** | N/A — sanitize cost unchanged. | - [ ] No regression (sanitize cost unchanged). |
| **Staging Deployment** | N/A — `apps/studio` local UI. | - [ ] Validated in the local studio app. |
| **Production Deployment** | N/A — fork/showcase context. | - [ ] N/A for this fork context. |

---

## Safe Refactoring Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Establish Test Safety Net** | Renderer/MIME suites cover each site; add util tests. | - [ ] Comprehensive tests exist covering current behavior. |
| **2. Run Baseline Tests** | `pnpm test` green before changes. | - [ ] All tests pass before any refactoring begins. |
| **3. Capture Baseline Metrics** | Call-site inventory + per-site DOMPurify options. | - [ ] Baseline captured. |
| **4. Make Smallest Refactor** | Add util; swap the first (simplest) site. | - [ ] Smallest possible refactoring change made. |
| **5. Run Tests (Iteration)** | That site's tests pass. | - [ ] All tests pass after refactoring change. |
| **6. Commit Incremental Change** | Commit per-site swap. | - [ ] Incremental change committed. |
| **7. Repeat Steps 4-6** | Swap remaining sites. | - [ ] All incremental steps completed with passing tests. |
| **8. Update Documentation** | Repoint comments/docs. | - [ ] All documentation updated. |
| **9. Style & Linting Check** | Biome + typecheck. | - [ ] Code passes linting, type checking, style validation. |
| **10. Code Review** | Folded into the triggering hardening card's review. | - [ ] Changes reviewed for correctness and maintainability. |
| **11. Performance Validation** | Sanitize cost unchanged. | - [ ] No regression detected. |
| **12. Deploy to Staging** | N/A — local studio app. | - [ ] Validated in the local studio app. |
| **13. Production Deployment** | N/A — fork context. | - [ ] N/A. |

#### Refactoring Implementation Notes

> Filled when the card unblocks and executes.

**Refactoring Techniques Applied:** Extract Function (one shared `sanitizeHtml()`), per-site options threaded via an `opts` argument.

---

## Refactoring Validation & Completion

| Task | Detail/Link |
| :--- | :--- |
| **Code Location** | `apps/studio/src/.../sanitizeHtml.ts` (new util) + swapped call sites (HtmlMime, SvgMime, ImageRenderer.tsx, renderMarkdown seam). |
| **Test Suite** | Util unit tests + existing renderer/MIME suites, all passing. |
| **Baseline Metrics (Before)** | 3+ inline `DOMPurify.sanitize` sites; policy duplicated. |
| **Final Metrics (After)** | One util; policy expressed once. |
| **Performance Validation** | No regression — sanitize cost unchanged. |
| **Style & Linting** | Biome + typecheck clean. |
| **Code Review** | Folded into the triggering hardening card's PR. |
| **Documentation Updates** | Inline comments / renderer docs repointed at the util. |
| **Staging Validation** | Local studio app. |
| **Production Deployment** | N/A (fork context). |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Further Refactoring Needed?** | TBD at execution. |
| **Design Patterns Reusable?** | The util is the consolidation point for all future sanitizer policy. |
| **Test Suite Improvements?** | Add per-site option assertions if not already present. |
| **Documentation Complete?** | Repoint comments to the util at execution. |
| **Performance Impact?** | Neutral. |
| **Team Knowledge Sharing?** | Not needed. |
| **Technical Debt Reduced?** | Yes — single sanitizer-policy seam once a hardening requirement exists. |
| **Code Quality Metrics Improved?** | Duplication of sanitize policy removed. |

### Completion Checklist

* [ ] Comprehensive tests exist before refactoring (util tests + existing renderer suites).
* [ ] All tests pass before refactoring begins (baseline established).
* [ ] Baseline captured (call-site inventory + per-site options).
* [ ] Refactoring implemented incrementally (one site at a time).
* [ ] All tests pass after each step.
* [ ] Documentation updated (comments/docs repointed at the util).
* [ ] Code passes style/type validation (Biome, tsc).
* [ ] Code reviewed.
* [ ] No performance regression.
* [ ] Validated in the local studio app.
* [ ] N/A: production deployment (fork context).
* [ ] Duplication of sanitize policy removed.
* [ ] N/A: high-risk rollback drill (low-risk structural change behind passing tests).

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them.


## BLOCKED
Pre-emptive refactor with no current trigger — has a true forward dependency. Extracting one shared sanitizeHtml() util changes no behaviour today (all 3+ inline DOMPurify.sanitize sites in apps/studio are correct and consistent with the package's pre-existing inline convention; no DRY violation under current policy). The util only becomes valuable once a concrete sanitizer-hardening requirement exists — e.g. a custom ALLOWED_URI_REGEXP or FORBID_ATTR policy that must live in one place instead of being edited at every site. That hardening requirement has not been made. CONCRETE PREREQUISITE: the first card that actually needs to change the sanitizer-config policy. Pick this up alongside (or fold it into) that card; do not execute speculatively. Surfaced by LUIVIEW1 4svfd0 review 1, scoped by the reviewer to the renderer-hardening backlog (explicitly NOT card 4svfd0).
