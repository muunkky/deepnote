Sprint closeout card ID: drmgh6
Sprint card list:
- j97w5m (step 2, done): spa-foundation framework + bundler setup (apps/studio isolated)
- 5mz1md (step 3, done): spa-foundation app shell + routing
- 4p6tbf (step 4, done): spa-foundation project load over s1 API state (real GET /api/project)
- zy7tn8 (step 5, in_progress→approved): block-renderers — code/markdown/text + BlockRenderer registry
- k61ziu (step 6, todo): block-renderers — jupyter ioutput MIME renderer
- 83gnbp (step 7a, todo): block-renderers — SQL renderer
- 4svfd0 (step 7b, todo): block-renderers — visualization / big-number / image renderers
- mxxsr6 (step 7c, todo): block-renderers — input / button / separator renderers
- wye1xt (step 7d, todo): block-renderers — unknown-type fallback
- drmgh6 (step 8, todo): LUIVIEW1 sprint closeout
- v9apte (step 1, todo): LUIVIEW1 sprint planning
- cd4gxo (step 2b, todo): onboarding note — fresh pnpm install required after apps workspace glob

The reviewer flagged 3 non-blocking items, grouped into 3 cards below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: Ensure step-6 OutputRenderer replaces the OutputSlot placeholder for ALL persisted output types
Sprint: LUIVIEW1
Files touched: apps/studio/src/blocks/OutputSlot.tsx (the placeholder seam) — and the EXISTING step-6 card k61ziu (capstone)
Items:
- L1 (placeholder-fidelity-gap): `OutputSlot` currently renders every non-`stream` persisted output (`execute_result` / `display_data` / `error`) as an empty `data-output-pending` div — content is silently dropped until step 6's real `OutputRenderer` lands. The seam is intended, but the gap is invisible to a user (an `error` output would show as blank). This is NOT new work to schedule on its own — it is a requirement to strengthen the EXISTING step-6 card (k61ziu): confirm/extend k61ziu's capstone so it exercises a NON-stream output (at minimum an `error` output, ideally `execute_result`/`display_data` too) end-to-end through the real `OutputRenderer`, proving the `data-output-pending` placeholder is fully replaced for all output types — not just `stream`. Prefer folding this into k61ziu's acceptance criteria/capstone rather than creating a standalone card, if dedup against k61ziu supports it.

### Card 2: Deterministic code highlighting via a project/kernel language tag (replace highlightAuto)
Sprint: LUIVIEW1
Files touched: apps/studio/src/blocks/CodeRenderer.tsx
BLOCKED — reason: genuine dependency on data that does not exist yet. `CodeRenderer` uses `hljs.highlightAuto` over the `common` language subset because no per-block (or project/kernel) language tag is currently persisted or surfaced to the SPA. Auto-detection can mis-highlight short/ambiguous snippets. Switching to deterministic `hljs.highlight(source, { language })` is only possible once a project/kernel-level language signal becomes available to the SPA — that source-of-truth does not exist in the current data model, so this cannot be executed in this cycle. Acceptable as-is for a read-only viewer.
Items:
- L2 (highlight-language-detection): `CodeRenderer` relies on `hljs.highlightAuto`; if a project/kernel-level language becomes available to the SPA later, pass it to `hljs.highlight(source, { language })` for deterministic highlighting. Out of scope here; revisit when a language signal exists in the SPA's data.

### Card 3: Consolidate colocated block-test fixture factories toward one typed factory
Sprint: LUIVIEW1
Files touched: apps/studio/src/blocks (testBlocks.ts `makeBlock`), apps/studio/src/__fixtures__ (shared block factory)
Items:
- L3 (fixture-duplication): `testBlocks.ts` (`makeBlock`) duplicates the shape of the shared `__fixtures__` block factory with an `as BlockVM` cast. Only two factories exist today so DRY isn't yet breached and the colocation is justified — but as steps 7A–7D (cards 83gnbp / 4svfd0 / mxxsr6 / wye1xt) each potentially add a third/fourth colocated block factory, consolidate toward ONE typed factory so "a valid persisted block" doesn't drift across test suites. NOTE FOR DEDUP: this overlaps the prior-cycle BLOCKED follow-up "Tighten per-block fixture typing / remove `as BlockVM` casts" (LUIVIEW1-5mz1md-planner-1.md Card 2, re `__fixtures__/sampleProject.ts`). Both concern `as BlockVM` casts in test fixtures and both are gated on the renderer registry (steps 5–7D) defining concrete per-type contracts. Dedup/merge these into a single fixture-typing-consolidation card rather than creating a duplicate.
