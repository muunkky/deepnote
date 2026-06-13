---
verdict: APPROVAL
card_id: 83gnbp
review_number: 1
commit: e761ad1
date: 2026-06-13
has_backlog_items: true
---

# Review: step-7A block-renderers SQL renderer (LUIVIEW1 / 83gnbp)

## Verdict: APPROVAL

A clean, additive, genuinely read-only SQL renderer that mirrors the established
CodeRenderer pattern and routes its persisted result through the shared
OutputRenderer / MIME registry. Gate 1 and Gate 2 both pass.

## Gate 1 — Completion claim

- **DoD present and required.** The card touches control flow (highlight + defensive
  `outputs` narrowing) and the BLOCK_RENDERERS registry contract, so a DoD is required;
  it is present.
- **Intent** is plain-English and sanity-checkable ("shows the query you wrote,
  syntax-highlighted, and underneath it the table of results last saved... nothing
  re-runs and nothing is editable"). Not a title restatement.
- **Capstone is real and unfakeable.** "a `sql` block renders its query text AND its
  persisted result output (the result table, via OutputRenderer/MIME registry) — assert
  both appear in real DOM." Test `renders the persisted result table through the
  OutputRenderer` walks the live OutputRenderer → DataRenderer → MIME registry path and
  asserts a real `<table>` in jsdom DOM with rich-first precedence (HTML over the
  co-present text/plain). Not mocked, not a return-type assertion.
- **Observables map to tests:** empty-outputs renders query alone (no `.output-renderer`,
  no `<table>`, no crash); read-only R8 (no button/textarea/input/contenteditable);
  additive registration. All checked boxes verified true against the diff and a live run.

## Gate 2 — Implementation quality

- **TDD.** `SqlRenderer.test.tsx` reads as a contract spec, not reverse-engineered from the
  implementation: it asserts on observable DOM behavior (aggregate `textContent`, presence
  of `.hljs-*` token spans, a real `<table>`, absence of run/edit affordances), covers the
  empty-output edge and two read-only negative cases — not happy-path only.
- **Read-only (R8) holds.** Two negative tests assert no `button`/role=button and no
  `textarea`/`input`/`contenteditable`. The component renders only a `<pre><code>` and an
  `<OutputRenderer>`; there is no execution path or run control anywhere in the diff.
- **Additive registry edit is clean.** One import line + one `sql: SqlRenderer,` entry in
  `BLOCK_RENDERERS`. Dispatch logic (`registry[block.type] ?? registry.default`) is
  untouched; sibling keys are unreordered/unreformatted. The merged registry now coexists
  with 7B (`visualization`/`big-number`/`image`) and 7C (inputs/button/separator) keys —
  confirmed keep-both, no contested edit.
- **Security.** `dangerouslySetInnerHTML` carries highlight.js token output, which escapes
  the source while tokenising (only its own safe `.hljs-*` spans reach the DOM) — same
  justified pattern and biome-ignore as the already-approved CodeRenderer. The result HTML
  is not injected raw: it flows through OutputRenderer, sanitized at the existing MIME seam.
- **DRY / reuse.** The result table reuses the shared OutputRenderer rather than a bespoke
  table component, exactly as the design directs.
- **ADR-006/007 isolation.** `IOutput` is consumed type-only from the
  `@deepnote/runtime-server/types` contract subpath; no `node:` builtins, no runtime edge
  on `runtime-core`. Invariant preserved.
- **Grammar choice is justified.** Unlike CodeRenderer's pure `highlightAuto`, SqlRenderer
  selects the explicit `sql` grammar with a `getLanguage('sql')` guard that degrades to
  `highlightAuto` if the common bundle lacks the grammar — correct, since a `sql` block
  always carries SQL, and the guard prevents a `highlight()` throw from crashing the viewer.

## Verification (re-run during review)

- `tsc --noEmit -p apps/studio/tsconfig.json` → exit 0 (confirms `sql` is a valid
  `BlockVM['type']` member and the registry entry typechecks).
- `vitest run src/blocks/SqlRenderer.test.tsx` → 7/7 pass.
- `vitest run src/blocks/` (full merged blocks suite, regression for the registry edit) →
  79/79 pass across 13 files. No sibling renderer regressed.

## FOLLOW-UP

- **[renderer-scaffold-dedup]** `SqlRenderer` and `CodeRenderer` now share near-identical
  scaffolding: the defensive `('outputs' in block && Array.isArray(...) ? ... : []) as
  IOutput[]` narrowing, the `<pre><code className='hljs' dangerouslySetInnerHTML>` shape,
  and the trailing `<OutputRenderer>`. The only intentional divergence is the highlight
  call (auto vs. explicit-sql-with-fallback). This is exactly two occurrences today, so it
  is not a DRY blocker — but if a third highlighted-source renderer lands (7x or later), the
  shared scaffold (a `HighlightedSourceBlock` wrapper taking a `highlight(source) => string`)
  should be extracted. Failure mode if left: the `'outputs' in block` narrowing and the
  biome-ignore security justification get copy-pasted again and can drift out of sync across
  renderers. Non-blocking for this card.

## Outstanding close-out actions

- Code Review box → check on approval routing.
- Deployment/monitoring/stakeholder/ticket-closed boxes are correctly N/A (fork-only) or
  post-merge; leave as-is.
