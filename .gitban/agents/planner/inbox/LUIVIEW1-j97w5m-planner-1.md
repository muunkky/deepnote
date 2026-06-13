Sprint closeout card ID: drmgh6
Sprint card list:
- v9apte (step 1, todo): LUIVIEW1 sprint planning — chore
- j97w5m (step 2, in_progress): spa-foundation framework + bundler setup (apps/studio, isolated) — THIS card (being approved/closed)
- 5mz1md (step 3, todo): spa-foundation app shell + routing
- 4p6tbf (step 4, todo): spa-foundation project load over s1 API state
- zy7tn8 (step 5, todo): block-renderers code/markdown/text + BlockRenderer registry
- k61ziu (step 6, todo): block-renderers Jupyter ioutput/MIME renderer
- 83gnbp (step 7a, todo): block-renderers SQL renderer
- 4svfd0 (step 7b, todo): block-renderers visualization/big-number/image renderers
- mxxsr6 (step 7c, todo): block-renderers input/button/separator renderers
- wye1xt (step 7d, todo): block-renderers unknown-type fallback
- drmgh6 (step 8, todo): LUIVIEW1 sprint closeout — chore (closeout card)

The reviewer flagged 3 non-blocking items, grouped into 2 cards below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

Note on L2: it is NOT a standalone card. The reviewer scoped L2 (the real timed HMR-edit-loop assertion) to step 3's e2e/Playwright work, which is already an existing sprint card (5mz1md, step 3: spa-foundation app shell + routing — the natural home for Playwright). Please fold L2 into card 5mz1md (append an acceptance note / follow-up line to that card) rather than creating a new card. Dedup against whatever HMR/e2e acceptance criteria 5mz1md already carries.

### Card 1: Onboarding/CI note — fresh `pnpm install` required after the `apps/*` workspace glob
Sprint: LUIVIEW1
Files touched: onboarding/CI docs (e.g. `apps/studio/README.md`, `CONTRIBUTING.md`, and/or the relevant CI workflow comment) — exact file is the planner/executor's call
Items:
- L1: Adding the `apps/*` workspace glob means `pnpm test` will not collect the `studio` vitest project until a fresh `pnpm install` has resolved `apps/studio`'s deps (e.g. `@vitejs/plugin-react`). A cold checkout that skips install hits a confusing "project setup failed" rather than a test failure. Add a one-line note to onboarding/CI docs so this is discoverable. (Routed as a card, not a close-out item, because the router contract forbids new-documentation work as a close-out item.)

### Card 2: Graph-level backend↛apps boundary CI gate (madge/dependency-cruiser)
Sprint: LUIVIEW1
Files touched: CI config / new boundary-gate config (madge or dependency-cruiser), root tooling; supersedes the per-app grep check in `test-helpers/apps-studio-isolation.test.ts` as the enforcement point
Items:
- L3: ADR-007 §M1 / Validation calls for a `madge`/`dependency-cruiser` CI gate asserting `packages/* ↛ apps/*` and "no frontend import in the backend." j97w5m asserts this via a bespoke grep/manifest test (`apps-studio-isolation.test.ts`) which is real but per-app and grep-based, not the graph-level gate the ADR names as the point where the invariant becomes *enforced* vs. *convention*. Stand up the graph-level dependency gate. Note: the existing R2 grep walks only `apps/studio/src`; once step 3+ add more source (or other `apps/*` dirs), a grep-based walk root would need widening — the graph gate removes that maintenance trap. The ADR explicitly defers this to a design-doc/card, so this is the card that lands it. Dedup against any existing boundary/dependency-gate card before creating.
