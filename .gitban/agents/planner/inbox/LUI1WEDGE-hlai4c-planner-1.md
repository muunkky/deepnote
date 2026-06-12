Sprint closeout card ID: od8esg
Sprint card list:
- wzrodp (step 1, todo): step-1-lui1wedge-sprint-planning — sprint planning (handle CAMERON)
- 87ifqe (step 2, done): step-2-server-package-scaffold-runtime-server — runtime-server package scaffold
- x71bcm (step 3, done): step-3-project-open-list-api-get-api-project — GET /api/project open + list API
- hlai4c (step 4A, in_progress): step-4a-execute-stream-ws-run-serialization-queue — run-serialization FIFO queue + WS event fan-out (this review's card)
- e6e3lt (step 4B, todo): step-4b-save-api-semantic-round-trip-idempotence — save API round-trip/idempotence (runs after 4A merge)
- wd2nil (step 5, todo): step-5-server-integration-tests-parity-with-deepnote-run — real-kernel integration/parity suite
- zq7q0g (step 6, todo): step-6-serve-command-deepnote-serve — `deepnote serve` command
- sqm7ox (step 7A, todo): step-7a-browser-launch-alias-deepnote-ui — browser-launch alias `deepnote ui`
- yzd78n (step 7B, todo): step-7b-sql-integration-parity-with-run — SQL integration parity with run
- dx99dj (step 8, todo): step-8-contrib-diff-cut-clean-slice-off-upstream-main — clean contrib-diff slice
- k65hcx (step 9, todo): step-9-fork-showcase-post-dry-run-thread — fork showcase dry-run thread
- od8esg (step 10, todo): step-10-lui1wedge-sprint-closeout — sprint closeout card

The reviewer flagged 3 non-blocking items, grouped into 3 cards below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

Context: card hlai4c (step 4A, the run-serialization queue) was APPROVED at commit 955c41d. All three
items are post-approval polish on the same package, `packages/runtime-server`. None blocks downstream
work — step 5's integration suite (wd2nil) exercises real-kernel parity and would benefit from L1/L2
being resolved first, but does not strictly depend on them. Each item touches a distinct file/concern,
so they are three separate cards.

### Card 1: Fix `run-start.totalBlocks` contract lie
Sprint: LUI1WEDGE
Files touched: packages/runtime-server/src/run-queue.ts, packages/runtime-server/src/api-types.ts, packages/runtime-server/README.md, packages/runtime-server/src/run-queue.test.ts
Items:
- L1 (docs-vs-code): `run-queue.ts:231` always emits `{ type: 'run-start', runId, totalBlocks: 0 }`,
  and `run-queue.test.ts:78` codifies `totalBlocks: 0` as correct — but the contract type advertises the
  field (`api-types.ts:109`) and the README documents it as a meaningful value, with the worked example
  showing `"totalBlocks": 3`. A consumer that branches on `run-start.totalBlocks` to size a progress UI
  gets `0` for every run, contradicting the documented `3`. The real per-run count IS carried correctly
  on every `block-start.total`, and the count is genuinely unknowable before `engine.runProject` is
  invoked. Resolution options: (a) drop `totalBlocks` from the `run-start` shape and update the
  README/contract, deferring count to `block-start`; or (b) plumb the executable-block count out of the
  engine and emit it for real. Either way the README example must stop showing a value the code never
  produces. Failure mode: a downstream progress/percent indicator computed from `run-start.totalBlocks`
  is permanently stuck at 0% or divides by zero.

### Card 2: Reset dead engine after mid-run kernel death (session lifecycle)
Sprint: LUI1WEDGE
Files touched: packages/runtime-server/src/session.ts, packages/runtime-server/src/run-queue.ts (terminal-failure path), session/run-queue tests
Items:
- L2 (lifecycle-gap): after a `KernelDiedError`, `#runTask` emits the terminal `run-failed` and `#drain`
  continues, but `session.#engine` is never set back to `null` (`session.ts:255` sets it; only `close()`
  at `:285` clears it). `startEngine()` is idempotent and returns early on a non-null engine, so the
  *next* enqueued run calls `runProject` on a dead engine. The design doc flags this as a "discrete
  deliverable in P3" with an explicit "or": the session marks itself needing re-`start()`, or the server
  surfaces a fatal state. Decide between auto-resetting the engine (re-`start()` on next run) vs.
  transitioning the session to an explicit fatal state, and test the second-run-after-death path. The
  terminal-event guarantee (the DoD) still holds today — a subsequent run rejects again and produces
  another terminal `run-failed`, so it degrades to repeated kernel-died terminals rather than a hang.
  Failure mode today: every run after the first kernel death silently re-fails with `kernel-died`
  instead of attempting a fresh kernel.

### Card 3: Thread `wsLowWaterMark`/`drainPollMs` through `createServer`
Sprint: LUI1WEDGE
Files touched: packages/runtime-server/src/server.ts, packages/runtime-server/src/run-queue.ts (RunQueueOptions surface), server-run.test.ts
Items:
- L3 (config-surface-gap): `RunQueueOptions` exposes both `wsLowWaterMark` and `drainPollMs`, but
  `createServer` only threads `runQueueDepth` and `wsHighWaterMark` into the `RunQueue`
  (`server.ts:111-114`). The cross-block drain low-water mark and poll interval are hardcoded to defaults
  (0 / 5ms) in any real server. Thread both options through `createServer` so the drain behavior is
  tunable. Failure mode: an operator wanting to drain to a non-zero low-water mark (e.g. to avoid
  thrashing on a chatty socket) has no config path short of constructing the queue by hand.
