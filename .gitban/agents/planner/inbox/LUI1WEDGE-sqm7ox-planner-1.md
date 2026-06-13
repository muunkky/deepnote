Sprint closeout card ID: od8esg
Sprint card list:
- e6e3lt (step 4B, done): step-4b-save-api-semantic-round-trip-idempotence — save API semantic round-trip idempotence
- hlai4c (step 4A, done): step-4a-execute-stream-ws-run-serialization-queue — execute-stream WS run serialization queue
- 87ifqe (step 2, done): step-2-server-package-scaffold-runtime-server — runtime-server package scaffold
- dx99dj (step 8, todo): step-8-contrib-diff-cut-clean-slice-off-upstream-main — contrib diff clean slice off upstream/main
- k65hcx (step 9, todo): step-9-fork-showcase-post-dry-run-thread — fork showcase dry-run thread post
- od8esg (step 10, todo): step-10-lui1wedge-sprint-closeout — LUI1WEDGE sprint closeout
- sqm7ox (step 7A, in_progress): step-7a-browser-launch-alias-deepnote-ui — `deepnote ui` browser-launch alias (THIS card, approved)
- wd2nil (step 5, done): step-5-server-integration-tests-parity-with-deepnote-run — server integration tests parity with `deepnote run`
- wzrodp (step 1, todo): step-1-lui1wedge-sprint-planning — LUI1WEDGE sprint planning
- x71bcm (step 3, done): step-3-project-open-list-api-get-api-project — GET /api/project open + list API
- yzd78n (step 7B, in_progress): step-7b-sql-integration-parity-with-run — SQL integration parity with `run`
- zq7q0g (step 6, done): step-6-serve-command-deepnote-serve — `deepnote serve` command

The reviewer flagged 1 non-blocking item, grouped into 1 card below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: Decouple CLI suite-6 runAction fixture resolution from process.cwd()
Sprint: LUI1WEDGE
Files touched: packages/cli/src/commands/serve.test.ts (suite 6 `runAction` tests)
Items:
- L1 (test-env-coupling): Suite 6's `runAction` tests resolve a real fixture (`examples/1_hello_world.deepnote`) via `process.cwd()`, so they silently fail when vitest is invoked from any cwd other than the repo root. Failure mode: a developer running `pnpm vitest` from inside `packages/cli` (or a future CI step that does) gets an opaque "SIGINT handler was never registered" rather than a clear "fixture not found". Pre-existing (not introduced by card sqm7ox), but sqm7ox adds four more `runAction`-based tests that inherit the coupling. Suggested fix: resolve the fixture relative to the test file (`fileURLToPath(import.meta.url)`) — the negative-capstone test in the sqm7ox commit already uses that pattern for `serve.ts` — instead of `process.cwd()`. Verification requires re-running the affected suite from a non-root cwd to confirm the failure is gone (which is why this is a card, not a close-out item).
