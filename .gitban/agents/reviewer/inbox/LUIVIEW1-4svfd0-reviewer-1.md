---
verdict: APPROVAL
card_id: 4svfd0
review_number: 1
commit: 4edb127
date: 2026-06-13
has_backlog_items: true
---

# Review — LUIVIEW1 step 7B: visualization / big-number / image renderers

## Verdict: APPROVAL

A packed card with three user-visible renderers, each carrying its own real-DOM
capstone. Gate 1 (card structure) and Gate 2 (implementation) both pass.

## Gate 1 — completion claim

DoD is present and strong for a packed card. Intent is plain-English and consistent
with the diff. The card carries a **separate, unfakeable capstone per renderer** — the
packed-card requirement:

- **Viz capstone** — asserts a persisted `image/png` bundle surfaces as a live `<img>`
  whose `src` carries the data-URI + base64, AND a persisted `text/html` bundle surfaces
  its marker text. Both route through the shared `OutputRenderer` → `DataRenderer` →
  MIME registry, so the capstone exercises the real assembly, not a mock.
- **Big-number capstone** — asserts BOTH branches in real DOM: the persisted output tile
  wins when `outputs` present (and the stale authoring metadata is verified absent), and
  the `deepnote_big_number_*` metadata tile renders when `outputs` is empty. The
  persisted-first/metadata-fallback precedence (KDD M1) is the load-bearing behaviour and
  it is directly asserted.
- **Image capstone** — asserts a real `<img src>` for http/https and data-URI sources,
  AND that a `javascript:alert(1)` src does not survive into the DOM (`src` no longer
  carries the scheme, no `[onerror]`, `onerror` absent from innerHTML).

Checkbox design proves correctness if honestly checked; integrity verified against the
diff and a live test run.

## Gate 2 — implementation quality

- **Tests run green.** 15/15 pass in the `studio` vitest project across the three new
  test files (viz 5, big-number 5, image... 4 + shared = 15 total). TDD shape is sound:
  tests assert behaviour/real DOM, cover both precedence branches and the no-output edge,
  and include negative cases (sanitization, no-comparison, read-only invariant). Not
  reverse-engineered from implementation.
- **No-execution invariant holds structurally.** All three renderers import only
  type-only `IOutput`, the shared `OutputRenderer`, `createMarkdown`, `DOMPurify`, and
  `BlockVM`. Zero kernel/run/fetch/execute surface — every grep hit for those terms is in
  a comment. Render is a pure function of persisted state (R8).
- **Additive registration is clean.** `BlockRenderer.tsx` appends exactly three keys
  (`visualization`, `big-number`, `image`) and three imports — no reorder of existing
  keys, no dispatch-logic edit. Keep-both-mergeable with sibling 7A/7C/7D as the card
  requires.
- **Persisted-first (M1) is correctly implemented.** Both viz and big-number read
  `outputs` defensively off the `BlockVM` union (`'outputs' in block && Array.isArray`)
  and only fall back to metadata when empty. Viz never re-renders the raw spec as a chart
  (would require a kernel) — it emits a labelled placeholder, matching the design.
- **Sanitization is real and follows the package convention.** ImageRenderer reuses the
  persistence package's public `createMarkdown` (the same derivation `createMarkdownForImageBlock`
  the file format uses, keeping the viewer in lockstep), then `DOMPurify.sanitize(...)`
  before `dangerouslySetInnerHTML` — the identical inline pattern `HtmlMime`/`SvgMime` use.
  This is the established seam in this package (there is no shared sanitizer util), so it
  is not a DRY violation. The `biome-ignore` for `noDangerouslySetInnerHtml` is justified
  and documented at the call site.
- **Dep-isolation holds.** `package.json` is unchanged in the commit; no native
  vega/plotly was added (Decision 3a degrades to the persisted-image path, which satisfies
  R3 without a frontend dep). `dompurify` was already a studio dependency.
- **ADR-006/007 boundary holds.** Root `tsc -p tsconfig.json --listFilesOnly` names
  **0** `apps/` files; `tsc --noEmit -p apps/studio/tsconfig.json` is clean. The SPA takes
  only a type-only edge on `@deepnote/runtime-server/types`.

## Outstanding close-out actions

- Review checkbox + remaining deploy/PR/stakeholder boxes are reviewer/PR-stage owned;
  leave as-is. Card moves to `in_progress` for the router.

## FOLLOW-UP

- **doc-count-drift** — The executor close-out claims "22/22" new renderer tests
  (6/6/5). The actual committed suite is 15 tests (viz 5, big-number 5, image 5 →
  but only 15 collected/pass in the studio project run; image file declares 5, big-number
  5, viz 5). The implementation and capstones are correct and green; only the prose count
  in the close-out is imprecise. Non-blocking — a note for whoever drafts the showcase
  post so the test-count claim is restated from a real run, not the close-out text.
- **shared-sanitizer-extraction** (deferred-refactor, sprint-wide) — `DOMPurify.sanitize`
  is now inlined at 3+ injection sites (`HtmlMime`, `SvgMime`, `ImageRenderer`, and the
  markdown seam). All correct today and consistent with the pre-existing convention, so
  no behaviour risk. If a future card needs to harden the sanitizer config (e.g. a custom
  `ALLOWED_URI_REGEXP` or `FORBID_ATTR` policy), a single shared `sanitizeHtml()` util
  would centralize that policy instead of needing edits at every site. Adjacent to 7B's
  scope, not introduced by it — capture for the renderer-hardening backlog, not this card.
