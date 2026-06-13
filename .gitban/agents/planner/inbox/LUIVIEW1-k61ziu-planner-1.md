Sprint closeout card ID: drmgh6
Sprint card list:
- j97w5m (step-2, done): SPA foundation framework/bundler setup (apps/studio isolated)
- 5mz1md (step-3, done): SPA foundation app shell + routing
- 4p6tbf (step-4, done): SPA foundation project-load over s1 API state
- zy7tn8 (step-5, done): block-renderers code/markdown/text BlockRenderer registry
- k61ziu (step-6, in_progress): block-renderers Jupyter IOutput MIME renderer (this card — approved)
- 83gnbp (step-7a, todo): block-renderers SQL renderer
- 4svfd0 (step-7b, todo): block-renderers visualization/big-number/image renderers
- mxxsr6 (step-7c, todo): block-renderers input/button/separator renderers
- wye1xt (step-7d, todo): block-renderers unknown-type fallback
- v9apte (step-1, todo): LUIVIEW1 sprint planning
- cd4gxo (step-2b, todo): onboarding note — fresh pnpm install required after apps workspace glob
- drmgh6 (step-8, todo): LUIVIEW1 sprint closeout

The reviewer flagged 3 non-blocking items, grouped into 2 cards below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: Harden the IOutput MIME renderer slice — multiline-string coercion test + bind the styling hooks
Sprint: LUIVIEW1
Files touched: apps/studio/src/outputs/mime/registry.ts (or wherever `coerceMultilineString` lives), apps/studio/src/outputs/ (test files), apps/studio/src/outputs/ stylesheet/CSS layer (new or existing)
Items:
- L1 (coverage-gap): `coerceMultilineString` returns `undefined` for the array form only when *every* element is a string; a mixed `(string | object)[]` MIME value would coerce to `undefined` and render nothing (silent drop). Currently only the scalar-string paths are exercised through the renderers — there is no direct unit test for the `string[]` join path of `coerceMultilineString` itself, nor for the mixed-array `undefined` path. Add a direct unit test for the `string[]` join behavior and the mixed-array `undefined` path to lock the contract the inline comment describes.
- L2 (styling-gap): Every renderer emits semantic class names (`output-stream--stderr`, `output-error`, `output-mime--html`, etc.) and `data-*` hooks, but no stylesheet in this slice binds them — stderr is "visually distinguished" only by an unstyled modifier class. The DOM contract is correct and test-asserted; the actual visual distinction (stderr color, error red, etc.) is dormant. Bind these styling hooks in a stylesheet so the visual distinction is real (stderr color, error red). NOTE: if a later step (7A–7D) or a dedicated theming card is the natural home for the output CSS layer, the planner may fold L2 into that card instead of a standalone item — but it must not be dropped; the styling hooks cannot sit dormant.

### Card 2: Validate persisted block.outputs shape at the project-load boundary (honest narrowing for the IOutput cast)
Sprint: LUIVIEW1
Files touched: apps/studio/src/ CodeRenderer (the `block.outputs` consumer), the project-load boundary/seam where `ApiProject` is materialized
Items:
- L3 (consumer-narrowing): `CodeRenderer` casts `block.outputs` to `IOutput[]` (the schema types it `any[]`). The cast is reasonable and commented, but nothing validates the persisted shape at the seam — a malformed persisted output (missing `output_type`) falls through `renderOne` to `null` (safe) but silently. Add a schema-validation pass at the project-load boundary so the narrowing is honest (validated) rather than asserted (cast). This is a different concern/module from the renderer slice (the load seam, not the outputs renderers) — kept as its own card.
