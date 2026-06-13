Sprint closeout card ID: od8esg
Sprint card list:
- wzrodp (step 1, todo): step-1-lui1wedge-sprint-planning — sprint planning card
- 87ifqe (step 2, done): step-2-server-package-scaffold-runtime-server — runtime-server package scaffold
- x71bcm (step 3, in_progress→done): step-3-project-open-list-api-get-api-project — GET /api/project open + list API (KD-6, kernel-free) [this review's card]
- hlai4c (step 4a, todo): step-4a-execute-stream-ws-run-serialization-queue — execute/stream WS; lands `startEngine` (engine becomes constructible)
- e6e3lt (step 4b, todo): step-4b-save-api-semantic-round-trip-idempotence — save API; consumes `openHash`
- wd2nil (step 5, todo): step-5-server-integration-tests-parity-with-deepnote-run — server integration tests vs `deepnote run`
- zq7q0g (step 6, todo): step-6-serve-command-deepnote-serve — `deepnote serve` command
- sqm7ox (step 7a, todo): step-7a-browser-launch-alias-deepnote-ui — browser launch alias
- yzd78n (step 7b, todo): step-7b-sql-integration-parity-with-run — SQL integration parity with run
- dx99dj (step 8, todo): step-8-contrib-diff-cut-clean-slice-off-upstream-main — clean contrib diff slice
- k65hcx (step 9, todo): step-9-fork-showcase-post-dry-run-thread — fork showcase post
- od8esg (step 10, todo): step-10-lui1wedge-sprint-closeout — sprint closeout

The reviewer flagged 2 non-blocking items, grouped into 1 card below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: Harden kernel-free capability resolution in runtime-server Session (gate Python probe, add no-engine regression)
Sprint: LUI1WEDGE
Files touched: packages/runtime-server/src/session.ts, packages/runtime-server/src/session.test.ts
Items:
- L1 (capability-coupling-gap): In `resolveCapabilities`, the Python interpreter is probed unconditionally and the final ternary is `interpreterAvailable ? (nonPython ? kernelName : 'python') : null`. For an explicit non-Python kernel (e.g. `--kernel bash`), a mis-installed *Python* interpreter still degrades `kernelLanguage` to `null`, even though bash availability has nothing to do with the Python interpreter. The existing bash test masks this by passing a resolvable `python: 'python3'`, so the broken branch is never walked. Fix: gate the Python probe on the kernel actually being Python (`!nonPython`) before it can null the capability flag, and add a test for a non-Python kernel with an UNresolvable Python interpreter that asserts `kernelLanguage` is the kernel name (not `null`). Low blast radius in s1 (python-default-centric), surfaces when a machine has bash but no Python.
- L2 (test-depth-gap): The "opens with NO kernel started" test asserts the positive signal (a fully-populated payload) but cannot yet assert the negative (no `ExecutionEngine` constructed) because no engine exists to spy on in this phase. DEPENDENCY: this requires `startEngine` to be landed and an `ExecutionEngine` to be constructible — that arrives with step 4A (hlai4c, execute-stream-ws). Once 4A lands, add a regression that spies on engine construction and asserts `loadProject` / `GET /api/project` never triggers it, so the kernel-free guarantee stays enforced after the engine becomes constructible. Note for the planner: L1 can be executed now and is independent; L2 cannot be executed until hlai4c lands `startEngine`. If splitting is warranted on that dependency basis, L2 may sequence after hlai4c — but per the group-by-files rule both touch session.ts/session.test.ts, so I am passing them as one group and leaving the in-sprint sequencing/BLOCKED-vs-now classification to your judgment.
