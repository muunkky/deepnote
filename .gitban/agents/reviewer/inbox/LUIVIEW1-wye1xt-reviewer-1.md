---
verdict: APPROVAL
card_id: wye1xt
review_number: 1
commit: 0949539
date: 2026-06-13
has_backlog_items: false
---

# Review: step-7d-block-renderers-unknown-type-fallback (LUIVIEW1 / wye1xt)

**APPROVED.** This is the final renderer card (7D), run after 7A–7C so the full-coverage
capstone is meaningful. It replaces the step-5 placeholder `UnknownBlockRenderer` with the real
graceful fallback and owns the shared `BLOCK_RENDERERS` `default` branch. Both the requested
KEY concerns — capstone genuineness and fallback safety/isolation — verified and held.

## Gate 1 — card structure: PASS

DoD has a plain-English Intent (a future/unrecognized block renders a labelled raw-content card,
never blanks the view; sibling blocks still render) and a real, unfakeable capstone. Checkboxes
cover the acceptance criteria including failure modes (no-content node omitted, XSS-inert,
mixed-notebook isolation). No `No capstone applicable` dodge; the capstone is a real DOM
assertion over assembled blocks. Intent and Observables are consistent.

## Gate 2 — implementation: PASS

### Full-coverage capstone is genuine (the KEY verification)
- `registeredTypes` is derived from `Object.keys(BLOCK_RENDERERS).filter(k => k !== 'default')`
  — the LIVE registry, not a hardcoded list. Confirmed in the diff at
  `apps/studio/src/blocks/UnknownBlockRenderer.test.tsx`.
- Vacuous-pass guard is real and not on a knife-edge: the test asserts
  `registeredTypes.length >= 20`; the live registry (`apps/studio/src/blocks/BlockRenderer.tsx`)
  registers 23 non-default keys, so the per-type loop iterates a genuinely populated set. It also
  spot-asserts `contains('code')` and `contains('separator')`.
- The per-type loop renders each registered type through the production `BlockRenderer` dispatch
  path and asserts (a) the `.block` wrapper carries `data-block-type="<type>"` and (b) crucially
  `data-block-unknown="true"` is **null** — i.e. it did NOT route to the fallback. That negative
  assertion is what proves real coverage rather than "renders something".
- The synthetic-type test uses `__never-registered-synthetic-type__`, first asserts it is NOT in
  `registeredTypes`, then asserts it DOES hit the fallback and the label names it. Genuine,
  non-circular.
- `expect(BLOCK_RENDERERS.default).toBe(UnknownBlockRenderer)` directly proves the `default`
  branch is wired to the real renderer (own file), replacing the placeholder.

### Fallback is genuinely safe (cannot crash, cannot inject)
- `apps/studio/src/blocks/UnknownBlockRenderer.tsx` renders raw `content` as an escaped React
  text node inside `<pre>` — NO `dangerouslySetInnerHTML`. XSS is inert by construction, not by a
  sanitizer that could be misconfigured. The test injects
  `<img src=x onerror="window.__xss=1"><script>...</script>` and asserts `textContent` equals the
  literal payload, `querySelector('img')`/`script` are null, and `globalThis.__xss` is undefined.
- `content` is coerced via `typeof block.content === 'string' ? block.content : ''`, so a
  non-string/absent content cannot throw; empty content omits the content node rather than
  rendering a blank `<pre>`.
- Mixed-notebook R5 capstone renders 4 blocks (markdown/code/unknown/text) through the real
  registry and asserts in jsdom that the unknown block falls back gracefully while `h2`, `code`,
  and the paragraph text all render, with all 4 `.block` wrappers present in DOM order — one
  unknown block cannot blank the view.

### Isolation / boundary (ADR-006/007): held
- New file imports only `import type { BlockVM }` — type-only, zero runtime import, no `node:`
  builtin, no runtime-server runtime coupling. The `apps/` isolation invariant
  (`test-helpers/apps-studio-isolation.test.ts`) passes 3/3 and the root typecheck names zero
  `apps/` files. ADR-006's actual concern (repo-wide toolchain must not sweep `apps/`) is
  respected. (The card's "ADR-006 KDD §6" tag is a design-doc cross-reference to the
  exhaustive-by-construction `default`-branch policy, not a literal ADR section — not a defect.)

### TDD / DaC
- Tests are behavior-first and assert on observable DOM (labels, content text, wrapper presence,
  fallback routing), not internals. Failure/edge cases present (no-content, XSS, synthetic type,
  vacuous-guard). README updated with the per-type coverage matrix and the unknown-type policy
  (`apps/studio/README.md`), matching the shipped behavior.

### Verification run during review
- New file `UnknownBlockRenderer.test.tsx`: 9/9 pass.
- Full `src/blocks` suite: 88/88 pass across 14 files.
- `apps-studio-isolation.test.ts`: 3/3 pass; root typecheck names 0 `apps/` files.

## BLOCKERS
None.

## FOLLOW-UP
None. The card's scope (R5 fallback + R3 coverage) is fully delivered; R7 time-to-first-render is
correctly scoped out as a phase-level DoD line, not this card's deliverable. No tech debt exposed
by the diff.
