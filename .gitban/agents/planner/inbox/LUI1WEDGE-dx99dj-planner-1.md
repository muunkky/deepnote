Sprint closeout card ID: od8esg
Sprint card list:
- e6e3lt (step 4b, done): step-4b-save-api-semantic-round-trip-idempotence — save API round-trip/idempotence
- hlai4c (step 4a, done): step-4a-execute-stream-ws-run-serialization-queue — execute/stream WS run serialization queue
- 87ifqe (step 2, done): step-2-server-package-scaffold-runtime-server — @deepnote/runtime-server package scaffold (owns api-types/no-cli-import AST tests)
- dx99dj (step 8, in_progress): step-8-contrib-diff-cut-clean-slice-off-upstream-main — clean contrib slice + slice-integrity CI gate (THIS card)
- gwblh2 (step 7c, done): step-7c-decouple-cli-suite-6-runaction-fixture-from-process-cwd — decouple cli suite-6 runAction fixture from process.cwd
- k65hcx (step 9, todo): step-9-fork-showcase-post-dry-run-thread — fork showcase post / dry-run thread
- od8esg (step 10, todo): step-10-lui1wedge-sprint-closeout — LUI1WEDGE sprint closeout
- sqm7ox (step 7a, done): step-7a-browser-launch-alias-deepnote-ui — deepnote ui browser-launch alias
- wd2nil (step 5, done): step-5-server-integration-tests-parity-with-deepnote-run — server integration tests parity with deepnote run
- wzrodp (step 1, todo): step-1-lui1wedge-sprint-planning — sprint planning (CAMERON)
- x71bcm (step 3, done): step-3-project-open-list-api-get-api-project — GET /api/project open + list API
- yzd78n (step 7b, done): step-7b-sql-integration-parity-with-run — SQL integration parity with run
- zq7q0g (step 6, done): step-6-serve-command-deepnote-serve — deepnote serve command

The reviewer flagged 3 non-blocking items. L1 is being handled as an executor close-out (comment-only fix), so it is NOT routed here. The remaining 2 items are grouped into 2 cards below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: Widen slice-integrity boundary enforcement to the full contrib closure (runtime-core + blocks)
Sprint: LUI1WEDGE
Files touched: packages/runtime-server/src/slice-integrity.test.ts (or a new boundary test/gate), potentially a madge/dependency-cruiser config under packages/
Items:
- L2 (ci-gate-scope-gap): The always-on slice-integrity gate currently scans only `runtime-server/src` plus the three CLI serve-delta files (`commands/serve.ts`, `cli.ts`, `package.json`). But the buildable contrib closure also pulls in `runtime-core` + `blocks`. A frontend/`apps/` import planted in `runtime-core` or `blocks` would NOT be caught by this gate — it would only be caught by the existing one-way-dependency convention, which is review-asserted, not enforced (ADR-007 Validation bullet 3, the M1 madge/depcruise check that "has not landed"). Decide and implement: either widen the standing CI gate to scan the whole slice closure (runtime-server/src + runtime-core + blocks + cli serve delta) for the framework/`apps/` edge, OR land the deferred madge/dependency-cruiser boundary check (already noted as a recurring-issue follow-up on card dx99dj) as the enforced home for the `packages/ → apps/` no-edge invariant. This is the ADR-007 §6 / M2 boundary becoming a real CI gate rather than a review-asserted convention. Reviewer note: non-blocking because the serve-delta files are where a leak is most plausible and the current gate covers them — but the boundary should be enforced across the whole closure to be load-bearing.

### Card 2: Harden cli diff/dag/lint test suites against process.exit-mock / timeout isolation flakes
Sprint: LUI1WEDGE
Files touched: packages/cli/src/commands/diff.test.ts, packages/cli/src/commands/dag.test.ts, packages/cli/src/commands/lint.test.ts
Items:
- L3 (pre-existing-flake debt): The cli `diff.test.ts`, `dag.test.ts`, and `lint.test.ts` suites flake on constrained machines due to a `process.exit`-mock / test-isolation + 5s-timeout artifact (the same failures reproduce on the milestone worktree under isolated `vitest run <file>`; the full suite of 2476 passes). These flakes are independent of the serve slice (the three files are byte-identical between upstream/main and contrib/m3-serve) but they are real and recurring — they forced the `--no-verify` push workaround during dx99dj because the full hook suite could not run cleanly. Harden the three suites against the isolation/timeout artifact (e.g. fix the process.exit mock leakage / per-test isolation, and/or raise/justify the timeout) so future contrib-slice pushes can run the full hook suite without OOM/flake noise. Note: these are pre-existing upstream-shaped flakes, not introduced by this sprint — the planner should decide whether this belongs in-sprint or is a backlog card per its own classification (the reviewer suggested a backlog card).
