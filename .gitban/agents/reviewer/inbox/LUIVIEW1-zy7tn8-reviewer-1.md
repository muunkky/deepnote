---
verdict: APPROVAL
card_id: zy7tn8
review_number: 1
commit: 0ef87a5
date: 2026-06-13
has_backlog_items: true
---

# Review — LUIVIEW1 step 5: type-keyed BlockRenderer registry + code/markdown/text renderers

## Gate 1 — Completion claim: PASS

This card touches React component contracts, control flow (registry dispatch), and test
behaviour, so a DoD is required. It has one:

- **Intent** is plain-English and verifiable from outside the code: code cells show
  highlighted source (+ saved outputs once step 6 lands), markdown reads as prose, the seven
  text-cell kinds render with correct structure, a central registry picks the renderer by
  type, nothing is editable/runnable. A reasonable engineer can sanity-check the diff against
  it.
- **Capstone is strong and unfakeable:** "each of code / markdown / text renders correctly
  *from the fixture via the registry* — assert real DOM." Not mockable — it walks the shared
  `sampleProject` tree through `BlockRenderer` and asserts hljs token spans / heading
  elements / fixture text in real jsdom DOM. This is exactly the capstone that catches a
  decompose-but-don't-assemble failure.
- Observables and checkboxes are testable, cover the read-only (R8) constraint and the
  registry-`default`-branch requirement, and map to real tests.

The persisted-output *rendering fidelity* gated on step 6's real OutputRenderer is the
design's stated sequencing (per the dispatcher note and the card's deferred section), not
diluted scope: the output *wiring* (`block.outputs ?? []` → `OutputSlot` → DOM) is present
and tested here, and a stream output's text is asserted to reach the DOM. Gate 1 passes.

## Gate 2 — Implementation quality: PASS

**Verified, not assumed:**

- **Full suite green.** After `pnpm install --frozen-lockfile` (lockfile up to date — the 4
  deps linked cleanly), the studio suite is **64 passed / 11 files**; the 5 new block test
  files are **35 passed**. The card's count is accurate.
- **Isolation invariant holds.** `tsc -p tsconfig.json --listFilesOnly` names **zero**
  `apps/` files (backend program does not pull the SPA in), and there are **no `node:`
  builtins** in any new block file. Studio `tsc --noEmit` exits 0.
- **Boundary (ADR-006/007) compliant.** `BlockVM` is derived type-only from
  `@deepnote/runtime-server/types` (ADR-007 line 116: SPA depends on the server's published
  types). `@deepnote/blocks` is an ADR-007-approved workspace dep for the block model, and
  `markdown.ts`/`text-blocks.ts` are pure-TS (no `node:` edge) — so importing `createMarkdown`
  is a legitimate runtime edge, not a boundary violation.

**Registration seam is genuinely additive (the dispatcher's specific concern).** `BLOCK_RENDERERS`
is a flat object literal `Partial<Record<BlockVM['type'], FC>> & { default }`; dispatch is
`BLOCK_RENDERERS[block.type] ?? BLOCK_RENDERERS.default` and never branches on concrete types.
Steps 7A–7D each add one key — a keep-both-mergeable line in the literal with no edit to the
dispatch logic. The `default` branch is structurally present (tested) and identifiable in the
DOM (`data-block-unknown`), so an unregistered type (the `separator` test) is caught rather
than crashing. This is the right shape for the later cards.

**Reuse discipline is real, not cosmetic.** `TextRenderer` consumes the *public* `createMarkdown`
export (which delegates to `createMarkdownForTextBlock`) rather than re-deriving the text-cell→
markdown mapping in the SPA. Confirmed `createMarkdownForTextBlock` reads `metadata.checked` to
emit `[x]`/`[ ]`, which gfm turns into the (disabled) task-list checkbox the read-only test
asserts on. `TextRenderer` is registered only for the seven text-cell kinds, so the
`UnsupportedBlockTypeError` throw-path in `createMarkdown` is never reachable from it. This is
the ADR-007 §6 "don't re-declare" discipline applied to behaviour.

**Security seam is sound and centralized.** Markdown/text prose funnels through one
`renderMarkdownToSafeHtml` seam (marked → DOMPurify → inject), and tests prove `<script>`,
`onerror=`, and `javascript:` payloads are stripped on both the markdown and text paths.
`CodeRenderer` injects only highlight.js's own escaped token spans (no raw `block.content`
reaches the DOM unescaped). The `biome-ignore noDangerouslySetInnerHtml` annotations are
justified per-seam, not blanket-disabled.

**TDD evidence.** Tests are behaviour-first (assert on rendered DOM structure, not internals),
include failure/edge cases (empty content, no-outputs, non-stream output, unregistered type,
three injection vectors), and the structure leads the code. Not reverse-engineered.

No blockers. Approving.

## FOLLOW-UP

- **L1 (`placeholder-fidelity-gap`):** `OutputSlot` renders non-`stream` persisted outputs
  (`execute_result` / `display_data` / `error`) as an empty `data-output-pending` div — content
  is silently dropped until step 6's real `OutputRenderer` lands. This is the intended seam, but
  the gap is invisible to a user (an error output would show as blank), so step 6 must ensure it
  replaces this for *all* output types, not just stream. Already implied by step 6's scope;
  flagging so the planner can confirm the step-6 card's capstone exercises a non-stream output
  end-to-end.

- **L2 (`highlight-language-detection`):** `CodeRenderer` uses `hljs.highlightAuto` over the
  `common` language subset because no per-block language tag is persisted. Auto-detection can
  mis-highlight short/ambiguous snippets (e.g. a 1-line Python cell detected as another
  language). Acceptable for a read-only viewer and out of scope here, but if a project/kernel-
  level language becomes available to the SPA later, a future card could pass it to
  `hljs.highlight(source, { language })` for deterministic highlighting.

- **L3 (`fixture-duplication`):** `testBlocks.ts` (`makeBlock`) duplicates the shape of the
  shared `__fixtures__` factory with an `as BlockVM` cast. Justified by the comment (colocated,
  covers shapes the shell fixture doesn't enumerate), and only two factories exist so DRY isn't
  yet breached — but if steps 7A–7D each add a third/fourth colocated block factory, consolidate
  toward one typed factory to avoid drift in what "a valid persisted block" looks like across
  test suites.
