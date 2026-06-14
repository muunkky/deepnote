# studio viewer: residual review-hardening (defense-in-depth + display robustness)

> Lower-severity findings from the `/code-review high` cross-cutting pass over the assembled m3/s2 viewer (`apps/studio`). The three **reachable crashes** that pass surfaced (prototype-key registry bypass, malformed-hash URIError, undefined-stream-text TypeError) were already fixed inline with regression tests (milestone commit `663d2c7`). These residuals are real but non-crashing — tracked here rather than fixed inline to keep the closeout clean.

## Refactor Scope & Context

* **Component:** `apps/studio` (read-only viewer SPA), roadmap m3/s2.
* **Origin:** `/code-review high` integration pass (PR muunkky/deepnote #10).
* **Why deferred:** none is a crash or a live security hole; each is defense-in-depth or a display-correctness edge on malformed/untrusted persisted data.

**Required Checks:**
* [ ] Component/scope identified above.
* [ ] Originating review documented (PR #10 / code-review high).

## Residual findings

| # | File | Finding | Suggested fix |
| :-- | :-- | :-- | :-- |
| 1 | `blocks/CodeRenderer.tsx`, `blocks/SqlRenderer.tsx` | highlight.js output is injected via `dangerouslySetInnerHTML` **without** the shared DOMPurify seam — the lone live-markup sink not behind it. Inert today (hljs escapes during tokenising), but no defense-in-depth if hljs ever regresses. | Route the highlighted HTML through `DOMPurify.sanitize` (or a shared `sanitizeHtml`) like every other sink. Pairs with backlog `fgfnyy` (shared sanitizer util) and `cbina3` (shared HighlightedSourceBlock scaffold). |
| 2 | `blocks/inputs/InputCheckboxRenderer.tsx` | `checked` is the raw `deepnote_variable_value`; a persisted **string** `"false"`/`"0"` is truthy → checkbox renders checked (inverse of the persisted value). | Normalise to a boolean (`value === true || value === 'true'`) before the `checked` prop. |
| 3 | `blocks/inputs/InputDateRangeRenderer.tsx` | a length-1 / half-set range array renders the literal text `"… – undefined"`. | Guard the end element; render a single date or a clean partial range. |
| 4 | `outputs/mime/SvgMime.tsx` | SVG sanitized with the correct `USE_PROFILES.svg` profile (defended today), but no explicit `FORBID_TAGS: ['foreignObject']` belt-and-suspenders against a future DOMPurify mXSS namespace-confusion regression. | Add `FORBID_TAGS: ['foreignObject']` to the SVG sanitize config. |
| 5 | `shell/Shell.tsx` | `activeNotebookId` is seeded once via a `useState` initializer; if the `project` prop ever changes to a different project (not reachable today — `App` loads once), the active id goes stale and the hashchange effect never recomputes it. **Latent** — will bite the s3/s4 reload/edit paths. | Recompute `activeNotebookId` when `project` identity changes (effect or `key`), or derive it rather than seed-once. Revisit when s4 (save/reload) lands. |

## Definition of Done

### Intent

The viewer already cannot crash on untrusted persisted input (fixed inline). This card closes the *quality* residuals: every live-markup path goes through the one sanitizer seam (no lone exception), boolean/range inputs display their persisted value faithfully regardless of serialization shape, the SVG profile carries an explicit `foreignObject` belt-and-suspenders, and the shell's active-notebook selection survives a future project-prop swap.

### Observable outcomes

- [ ] CodeRenderer/SqlRenderer highlighted HTML passes through the DOMPurify seam (test: a crafted hljs token string with markup is neutralised).
- [ ] A checkbox whose persisted value is the string `"false"` renders **unchecked** (test).
- [ ] A half-set date-range renders no literal `"undefined"` (test).
- [ ] SVG sanitize config explicitly forbids `foreignObject` (test asserts a `foreignObject` payload is stripped).
- [ ] Shell recomputes the active notebook when the `project` prop changes (test), or this item is explicitly folded into the s4 save/reload card.

## Validation & Closeout

| Task | Detail |
| :--- | :--- |
| **Code Review** | gitban-reviewer |
| **Tests** | one regression test per finding; studio suite green |

### Completion Checklist

* [ ] All five residuals addressed or explicitly re-deferred with reason.
* [ ] Tests added; studio suite + isolation invariant green.
* [ ] Documentation/comments updated where behaviour changed.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them.
