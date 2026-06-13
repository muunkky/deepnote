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

The reviewer flagged 3 non-blocking items, 2 of which route to you (L1, L3), grouped into 2 cards below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Dedup note — READ FIRST (important):
These same L1 (fixture-fragility) and L3 (ci-budget-watch) items were grouped into two sprint
cards by the **review-1** planner directive (`.gitban/agents/planner/inbox/LUI1WEDGE-wd2nil-planner-1.md`),
but those cards were **never actually created** — they do not appear in the sprint card list above,
and they are **not** in the closeout (`od8esg`) Sprint Retrospective section. So this is NOT
duplicate debt to skip: the items are currently **orphaned and untracked**. Please actually create
them this cycle (or append to the closeout retrospective per your taxonomy). If you find any
pre-existing card I missed, dedupe into it rather than creating a second.

### L2 (teardown-symmetry) is NOT routed to you — it is handled by the executor:
The review-2 L2 (`teardown-symmetry`) is a paranoid note that the B1 fix must live in
`disconnect()` (in `kernel-client.ts`), not in the integration test harness, so the dead-kernel
teardown leak resolves for every scenario (1–4) and any future kernel-killing test. The B1 executor
directive (`.gitban/agents/executor/inbox/LUI1WEDGE-wd2nil-executor-3.md`) already mandates exactly
that. L2 resolves with B1 and needs no separate card — recorded here only so you don't re-file it.

### Card 1: Harden the server↔`run` parity suite against future no-output blocks and tighten the coverage-claim wording
Sprint: LUI1WEDGE
Files touched:
- packages/runtime-server/test-integration/server-run-parity.integration.test.ts
- packages/runtime-server/test-integration/fixtures/server-run-parity.deepnote
- the card/closeout wording for wd2nil's "100% of executable block types" claim
Items:
- L1 (fixture-fragility, carried from review-1 L1, still open): Scenario 1 asserts
  `[...serverByBlock.keys()].sort()` equals `[...cliByBlock.keys()].sort()`. `cliByBlock` is built
  from ALL CLI blocks; `serverByBlock` only contains blocks that emitted an `output` event. Today
  every executable block in `server-run-parity.deepnote` produces ≥1 output so the sets match — but
  adding a no-output code block (e.g. a bare `x = 1`) to extend "100% of block types" makes the key
  sets diverge and Scenario 1 reds for a reason unrelated to parity. The executor consciously
  declined to weaken this in review-2 (a union-of-keys normalise could mask a real future
  divergence, and the fixture currently has no zero-output executable block) — that trade-off is
  defensible and correctly NOT a blocker, but the failure mode is real. Harden: compare on the
  UNION of keys and deep-equal `serverByBlock.get(id) ?? []` against `cliByBlock.get(id) ?? []`, so
  a both-empty block reads as parity rather than a key mismatch. (Hardening card per review-1.)
- L2-wording (coverage-claim-vs-fixture, from review-1 L2): The card claims "100% of executable
  block types," but the fixture's executable blocks are all `type: code`. Tighten the README +
  card/closeout wording to "all output-bearing IOutput shapes runnable on a bare Python kernel"
  (stream stdout/stderr, execute_result, display_data, multi-write), and note SQL/integration/input
  blocks are out of scope — step-7B `yzd78n` already owns the SQL/integration parity lift, so this
  item is only the fixture/wording clarification, not the SQL work. (Dedup against yzd78n: do not
  duplicate the SQL parity scope here.) NOTE: the review-2 executor already reworded the README +
  test comment for this; verify whether it still needs action or is satisfied, and dedupe/close
  accordingly rather than re-doing it.

### Card 2: Watch the integration-kernels CI wall-clock budget as per-test-server suites accrue
Sprint: LUI1WEDGE
Files touched:
- vitest.integration.config.ts
- the integration-kernels CI job definition (GitHub Actions workflow)
Items:
- L3 (ci-budget-watch, carried from review-1 L3): a single real-kernel parity run is ~55s;
  `integration-kernels` has `timeout-minutes: 15`. The new parity suite boots a fresh server + real
  kernel per test (4 tests, each waiting for kernel idle) on top of the existing integration files.
  Comfortable today, but as more per-test-server integration suites land the job's wall-clock will
  creep toward the cap. Add instrumentation or a budget note so the trend is visible before it hits
  the timeout (e.g. record per-suite wall-clock, or document a per-test-server budget convention).
