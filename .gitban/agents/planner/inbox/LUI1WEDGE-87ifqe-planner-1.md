Sprint closeout card ID: od8esg
Sprint card list:
- wzrodp (step 1, todo): step-1-lui1wedge-sprint-planning — sprint planning (handle CAMERON)
- 87ifqe (step 2, in_progress): step-2-server-package-scaffold-runtime-server — scaffold @deepnote/runtime-server package + Node-free api-types contract (THIS card, being closed out)
- x71bcm (step 3, todo): step-3-project-open-list-api-get-api-project — project open/list API + GET /api/project
- hlai4c (step 4a, todo): step-4a-execute-stream-ws-run-serialization-queue — execute/stream over ws + run serialization queue (this is where `ws` gets imported for /api/stream)
- e6e3lt (step 4b, todo): step-4b-save-api-semantic-round-trip-idempotence — save API semantic round-trip / idempotence
- wd2nil (step 5, todo): step-5-server-integration-tests-parity-with-deepnote-run — server integration tests, parity with `deepnote run`
- zq7q0g (step 6, todo): step-6-serve-command-deepnote-serve — `deepnote serve` command
- sqm7ox (step 7a, todo): step-7a-browser-launch-alias-deepnote-ui — browser launch alias `deepnote ui`
- yzd78n (step 7b, todo): step-7b-sql-integration-parity-with-run — SQL integration parity with `run`
- dx99dj (step 8, todo): step-8-contrib-diff-cut-clean-slice-off-upstream-main — cut clean contrib diff off upstream/main
- k65hcx (step 9, todo): step-9-fork-showcase-post-dry-run-thread — fork showcase post / dry-run thread
- od8esg (step 10, todo): step-10-lui1wedge-sprint-closeout — sprint closeout card

The reviewer flagged 2 non-blocking items, grouped into 2 cards below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

Context: the reviewer APPROVED card 87ifqe (the `@deepnote/runtime-server` scaffold). Both follow-ups below are forward-looking scoping notes that the reviewer explicitly said require "no action on this card." Each one names a specific downstream card as its natural owner — please dedup against those existing cards before creating anything new. If an item is already fully covered by an existing card's scope, fold it into that card (append a note to its acceptance criteria) rather than creating a duplicate card.

### Card 1: slice-integrity grep — tighten to import-form / word-boundary matching
Sprint: LUI1WEDGE
Files touched: the canonical slice-integrity CI grep script (not yet created — owned by the slice-integrity / boundary-gate card; in this sprint the closest existing owner is step-8 contrib-diff-cut `dx99dj`, which slices the clean diff and would run a boundary check). No code in `packages/runtime-server` changes.
Items:
- L1 (slice-integrity-grep-precision): The card's literal acceptance-criteria grep `git grep -iE 'react|vite|apps/' -- packages/runtime-server` is word-boundary-free and FALSE-POSITIVES on benign substrings: `reactivity` (the legitimate `@deepnote/reactivity` dep + the `reactivity:'python'|'disabled'` capability enum) and `vitest` (the test runner). There is ZERO real frontend coupling — the precise import-form grep confirms it, and the executor flagged this honestly rather than silently rewriting the AC. The risk is forward-looking: when the *canonical* slice-integrity CI script ships the literal broad regex, it will false-positive on EVERY package that depends on `@deepnote/reactivity` or uses `vitest`, turning a green boundary gate un-passable (or getting it disabled). The owning card must tighten to import-form / word-boundary matching, e.g. `from ['"](react|react-dom|vite)['"]`, `\breact\b`, `@vitejs`, `from ['"]\.\./apps`, so it tests the AC's actual intent (no React/Vite framework, no `apps/` import edge) without colliding with `reactivity`/`vitest`. If the canonical slice-integrity / boundary-gate card does not yet exist anywhere in the board, create this card in LUI1WEDGE; if it already exists, append this precision requirement to its acceptance criteria instead of duplicating.

### Card 2: wire `ws` in step-4a to close the declared-unused-dep gap
Sprint: LUI1WEDGE
Files touched: `packages/runtime-server` (step-4a execute-stream-ws work) — `package.json` already declares `ws`/`@types/ws`.
Items:
- L2 (declared-unused-dep): `ws` is a declared `dependencies` entry but is not imported anywhere in `packages/runtime-server` yet (the scaffold's `createServer` stub uses only `node:http`); `@types/ws` is a devDependency for the same not-yet-used surface. This is intentional and documented (ADR-007 §1 mandates `ws` as the server-side WS lib; the scaffold fixes the dep set up front), so it is NOT a blocker on card 87ifqe. The forward-looking risk: if a lint rule like `depcheck`/`knip` lands before step-4a wires `ws`, it will flag `ws`/`@types/ws` as unused. The reviewer states the step-4a (execute-stream-ws) card — `hlai4c` in this sprint — "should be the one that closes this by actually importing `ws` for the `/api/stream` fan-out." This almost certainly DEDUPES into existing card `hlai4c`, whose scope already requires importing `ws` for the WS stream. Please verify `hlai4c`'s acceptance criteria explicitly assert that `ws` is imported/used (so the declared-unused-dep gap is provably closed there); if that assertion is present, fold this in / mark as already-covered with no new card. Only create a standalone card if `hlai4c` does not already cover importing `ws`.
