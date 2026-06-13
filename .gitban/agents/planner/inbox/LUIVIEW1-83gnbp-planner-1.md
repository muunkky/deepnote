Sprint closeout card ID: drmgh6
Sprint card list:
- j97w5m (step 2, done): SPA foundation framework/bundler setup (apps/studio isolated)
- 5mz1md (step 3, done): SPA foundation app shell routing
- 4p6tbf (step 4, done): SPA foundation project load over s1 API state
- zy7tn8 (step 5, done): block-renderers code/markdown/text + BlockRenderer registry
- k61ziu (step 6, done): block-renderers Jupyter IOutput MIME renderer (OutputRenderer)
- 83gnbp (step 7A, in_progress): block-renderers SQL renderer
- 4svfd0 (step 7B, in_progress): block-renderers visualization/big-number/image renderers
- mxxsr6 (step 7C, in_progress): block-renderers input/button/separator renderers
- wye1xt (step 7D, todo): block-renderers unknown-type fallback
- drmgh6 (step 8, todo): LUIVIEW1 sprint closeout
- v9apte (step 1, todo): LUIVIEW1 sprint planning
- cd4gxo (step 2b, todo): onboarding note — fresh pnpm install required after apps workspace glob

The reviewer flagged 1 non-blocking item, grouped into 1 card below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: Extract shared HighlightedSourceBlock scaffold for highlighted-source renderers
Sprint: LUIVIEW1
Status: BLOCKED
Blocker reason: True future-dependency — the abstraction is only warranted when a THIRD highlighted-source renderer lands (a 7x or later renderer). Today there are exactly two occurrences (CodeRenderer + SqlRenderer); the reviewer explicitly states this is "not a DRY blocker" at two call sites and that the shared scaffold "should be extracted" only "if a third highlighted-source renderer lands." Extracting now would be premature abstraction over two sites, and the triggering renderer does not exist yet. Capture it so the dedup is done when (and only when) the third renderer is added.
Files touched: apps/studio/src/blocks/SqlRenderer.tsx, apps/studio/src/blocks/CodeRenderer.tsx (+ a new shared HighlightedSourceBlock wrapper if/when extracted)
Items:
- [renderer-scaffold-dedup]: SqlRenderer and CodeRenderer share near-identical scaffolding — the defensive `('outputs' in block && Array.isArray(...) ? ... : []) as IOutput[]` narrowing, the `<pre><code className='hljs' dangerouslySetInnerHTML>` shape, and the trailing `<OutputRenderer>`. The only intentional divergence is the highlight call (CodeRenderer's `highlightAuto` vs. SqlRenderer's explicit `sql` grammar with a `highlightAuto` fallback). When a third highlighted-source renderer lands, extract a shared `HighlightedSourceBlock` wrapper taking a `highlight(source) => string` callback. Failure mode if left after a third occurrence: the `'outputs' in block` narrowing and the `biome-ignore` security justification get copy-pasted again and can drift out of sync across renderers.
