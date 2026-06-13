Sprint closeout card ID: drmgh6
Sprint card list:
- j97w5m (step 2, done): SPA foundation framework/bundler setup (apps/studio isolated)
- 5mz1md (step 3, done): SPA foundation app shell / routing
- 4p6tbf (step 4, done): SPA foundation project-load over s1 API state
- zy7tn8 (step 5, done): block-renderers code/markdown/text BlockRenderer registry
- k61ziu (step 6, done): block-renderers Jupyter IOutput MIME renderer
- 83gnbp (step 7A, in_progress): block-renderers SQL renderer
- 4svfd0 (step 7B, in_progress): block-renderers visualization / big-number / image renderers
- mxxsr6 (step 7C, in_progress): block-renderers input/button/separator renderers
- wye1xt (step 7D, todo): block-renderers unknown-type fallback
- v9apte (step 1, todo): LUIVIEW1 sprint planning
- drmgh6 (step 8, todo): LUIVIEW1 sprint closeout
- cd4gxo (step 2b, todo): onboarding note — fresh pnpm install required after apps workspace glob

The reviewer flagged 1 non-blocking item, grouped into 1 card below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: Extract shared sanitizeHtml() util for HTML injection sites — BLOCKED
Sprint: LUIVIEW1
Files touched: apps/studio/src/blocks/HtmlMime (sanitize call site), apps/studio/src/blocks/SvgMime (sanitize call site), apps/studio/src/blocks/ImageRenderer.tsx, the markdown render seam (DOMPurify call site)
Items:
- shared-sanitizer-extraction: `DOMPurify.sanitize` is now inlined at 3+ injection sites (HtmlMime, SvgMime, ImageRenderer, the markdown seam). All are correct today and consistent with the package's pre-existing inline convention — there is no behaviour risk and no DRY violation under the current policy. A single shared `sanitizeHtml()` util would only become valuable once a future card needs to harden the sanitizer config (e.g. a custom `ALLOWED_URI_REGEXP` or `FORBID_ATTR` policy) so that policy lives in one place instead of being edited at every site.

BLOCKED reason: This is a pre-emptive refactor with no current trigger. The reviewer explicitly scoped it as "deferred-refactor, sprint-wide … capture for the renderer-hardening backlog, not this card" and adjacent to 7B's scope rather than introduced by it. Extracting the util now changes no behaviour and the consolidated policy it would enable does not yet exist — the work has a true forward dependency on a future sanitizer-hardening requirement that has not been made. It should be picked up alongside (or by) the first card that actually needs to change the sanitizer config policy, not executed speculatively in this cycle.
