Sprint closeout card ID: od8esg
Sprint card list:
- e6e3lt (step 4B, done): step-4b-save-api-semantic-round-trip-idempotence — save-api semantic round-trip / idempotence
- hlai4c (step 4A, done): step-4a-execute-stream-ws-run-serialization-queue — execute-stream WS + run serialization queue
- 87ifqe (step 2, done): step-2-server-package-scaffold-runtime-server — runtime-server package scaffold
- x71bcm (step 3, done): step-3-project-open-list-api-get-api-project — GET /api/project open + list API
- zq7q0g (step 6, done): step-6-serve-command-deepnote-serve — deepnote serve command (loopback bind guard)
- wd2nil (step 5, blocked): step-5-server-integration-tests-parity-with-deepnote-run — real-kernel integration parity suite (this card)
- sqm7ox (step 7A, todo): step-7a-browser-launch-alias-deepnote-ui — browser launch alias deepnote ui
- yzd78n (step 7B, todo): step-7b-sql-integration-parity-with-run — SQL integration parity with run
- dx99dj (step 8, todo): step-8-contrib-diff-cut-clean-slice-off-upstream-main — contrib-diff cut (clean slice off upstream/main)
- k65hcx (step 9, todo): step-9-fork-showcase-post-dry-run-thread — fork showcase post / dry-run thread
- od8esg (step 10, todo): step-10-lui1wedge-sprint-closeout — LUI1WEDGE sprint closeout (CLOSEOUT CARD)
- wzrodp (step 1, todo): step-1-lui1wedge-sprint-planning — LUI1WEDGE sprint planning (CAMERON)

The reviewer flagged 3 non-blocking items, grouped into 2 cards below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

Context: the reviewer found the parity test code correct and all API assumptions verified;
the only blocker (B1) is a Gate 1 checkbox-integrity issue handled by the executor. The
items below are robustness/clarity follow-ups, not defects in the shipped test.

### Card 1: Harden the server↔`run` parity suite against future no-output blocks and tighten the coverage-claim wording
Sprint: LUI1WEDGE
Files touched:
- packages/runtime-server/test-integration/server-run-parity.integration.test.ts
- packages/runtime-server/test-integration/fixtures/server-run-parity.deepnote
- the card/closeout wording for wd2nil's "100% of executable block types" claim
Items:
- L1 (fixture-fragility): Scenario 1 asserts `serverByBlock.keys()` equals `cliByBlock.keys()`. `cliByBlock` is built from ALL CLI `blocks` (including any with `outputs: []`), while `serverByBlock` only contains blocks that emitted an `output` event. Today every executable block in `server-run-parity.deepnote` produces ≥1 output so the sets match — but adding a no-output code block (e.g. a bare `x = 1` assignment) to extend "100% of block types" makes the key sets diverge and Scenario 1 fails for a reason unrelated to parity. Harden: compare on the UNION of keys and deep-equal `serverByBlock.get(id) ?? []` against `cliByBlock.get(id)`, so a both-empty block reads as parity, not a key mismatch.
- L2 (coverage-claim-vs-fixture): The card claims "100% of executable block types," but the fixture's executable blocks are all `type: code` (the closeout correctly scopes this to types runnable against a bare Python kernel, deferring SQL/integration to design-doc Phase 8 / step-7B yzd78n). A reader taking "100% of executable block types" literally expects more than one block type. Either broaden the fixture when Phase 8 lands or tighten the wording to "all output-bearing IOutput shapes runnable on a bare Python kernel." (Note for dedup: step-7B `yzd78n` already owns SQL/integration parity — this item is the fixture/wording clarification, not the SQL lift.)

### Card 2: Watch the integration-kernels CI wall-clock budget as per-test-server suites accrue
Sprint: LUI1WEDGE
Files touched:
- vitest.integration.config.ts
- the integration-kernels CI job definition (GitHub Actions workflow)
Items:
- L3 (ci-budget-watch): `integration-kernels` has `timeout-minutes: 15` and the new parity suite boots a fresh server + real kernel per test (4 tests, each waiting for kernel idle) on top of the existing integration files. Comfortable today, but as more per-test-server integration suites land the job's wall-clock will creep toward the cap. Add instrumentation or a budget note so the trend is visible before it hits the timeout (e.g. record per-suite wall-clock, or document a per-test-server budget convention).
