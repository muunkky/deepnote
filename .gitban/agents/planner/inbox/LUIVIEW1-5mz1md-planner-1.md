Sprint closeout card ID: drmgh6
Sprint card list:
- j97w5m (step 2, done): spa-foundation framework + bundler setup (apps/studio isolated)
- 5mz1md (step 3, in_progress→approved): spa-foundation app shell + routing
- 4p6tbf (step 4, todo): spa-foundation project load over s1 API state (replaces in-memory fixture with real GET /api/project)
- zy7tn8 (step 5, todo): block-renderers — code/markdown/text + BlockRenderer registry
- k61ziu (step 6, todo): block-renderers — jupyter ioutput MIME renderer
- 83gnbp (step 7a, todo): block-renderers — SQL renderer
- 4svfd0 (step 7b, todo): block-renderers — visualization / big-number / image renderers
- mxxsr6 (step 7c, todo): block-renderers — input / button / separator renderers
- wye1xt (step 7d, todo): block-renderers — unknown-type fallback
- drmgh6 (step 8, todo): LUIVIEW1 sprint closeout
- v9apte (step 1, todo): LUIVIEW1 sprint planning
- cd4gxo (step 2b, todo): onboarding note — fresh pnpm install required after apps workspace glob

The reviewer flagged 2 non-blocking items, grouped into 2 cards below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: Harden HMR e2e Chromium binary discovery (reconcile "no Playwright" framing)
Sprint: LUIVIEW1
Files touched: apps/studio/e2e/cdp.ts (module header comment + `findChromeBinary()`)
Items:
- L1: `cdp.ts` `findChromeBinary()` defaults to the Playwright-cached Chromium path (`~/.cache/ms-playwright/chromium-1223/...`) with the revision hard-coded, while the module header states "no Playwright/Puppeteer dependency." The runtime driver genuinely has no Playwright dep, but the browser binary still comes from `playwright install chromium`, and pinning `chromium-1223` means a future `playwright install` browser-cache bump silently breaks the default lookup (opaque "DevTools endpoint did not come up" on a fresh checkout) until someone sets `HMR_CHROME_BIN`. Fix: either reconcile the header wording to be accurate about the binary's origin, OR discover the cached Chromium revision dynamically (glob the cache dir / resolve latest) instead of pinning `chromium-1223`. Non-blocking: an `HMR_CHROME_BIN` override exists and the e2e test is gated out of the always-on `pnpm test`.

### Card 2: Tighten per-block fixture typing when the real renderer registry lands (remove `as BlockVM` casts)
Sprint: LUIVIEW1
Files touched: apps/studio/src/__fixtures__/sampleProject.ts (per-block construction)
BLOCKED — reason: genuine dependency on work that does not exist yet. The reviewer explicitly scoped this to "when the real renderer registry lands in steps 5–7D" (cards zy7tn8 / k61ziu / 83gnbp / 4svfd0 / mxxsr6 / wye1xt). The fixture's per-block `{ ... } as BlockVM` casts locally widen past the discriminated union; the envelope-level `: ApiProject` annotation still provides the structural drift-catch the card targeted, so it is acceptable as-is today. Tightening per-block typing only becomes meaningful (and only has a discriminated-union shape to conform to) once the renderer registry defines the concrete per-type block contracts. Until those renderer cards land there is no stable target to type against, so this cannot be executed in isolation now.
Items:
- L2: `__fixtures__/sampleProject.ts` constructs each block via `{ ... } as BlockVM`, matching the upstream `blocks` package test convention (`... as DeepnoteBlock`). The per-block cast widens past the discriminated union — if a future block-type field becomes required, the cast would suppress that at the block level (the envelope `: ApiProject` annotation would still catch structural envelope drift). Acceptable as-is; revisit when the renderer registry (steps 5–7D) defines the concrete per-type contracts so the casts can be replaced with precisely-typed block literals.
