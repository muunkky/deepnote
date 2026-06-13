Sprint closeout card ID: od8esg
Sprint card list:
- e6e3lt (step 4B, done): step-4b-save-api-semantic-round-trip-idempotence — save API round-trip/idempotence
- hlai4c (step 4A, done): step-4a-execute-stream-ws-run-serialization-queue — execute-stream WS + run serialization queue
- 87ifqe (step 2, done): step-2-server-package-scaffold-runtime-server — runtime-server package scaffold
- x71bcm (step 3, done): step-3-project-open-list-api-get-api-project — GET /api/project open+list API
- zq7q0g (step 6, done): step-6-serve-command-deepnote-serve — `deepnote serve` command (loopback bind)
- wd2nil (step 5, in_progress): step-5-server-integration-tests-parity-with-deepnote-run — real-kernel parity integration suite
- wzrodp (step 1, todo, CAMERON): step-1-lui1wedge-sprint-planning — sprint planning
- dx99dj (step 8, todo): step-8-contrib-diff-cut-clean-slice-off-upstream-main — clean contrib-diff cut off upstream/main
- k65hcx (step 9, todo): step-9-fork-showcase-post-dry-run-thread — fork showcase / dry-run thread post
- od8esg (step 10, todo): step-10-lui1wedge-sprint-closeout — sprint closeout card
- sqm7ox (step 7A, todo): step-7a-browser-launch-alias-deepnote-ui — `deepnote ui` browser-launch alias
- yzd78n (step 7B, todo): step-7b-sql-integration-parity-with-run — SQL integration parity with `run`

The reviewer flagged 2 non-blocking items, grouped into 1 card below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: Harden the dead-kernel disconnect rejection guard (re-entrancy + drain-tuning robustness)
Sprint: LUI1WEDGE
Files touched: packages/runtime-core/src/kernel-client.ts (the `disconnect()` / `#withDeadKernelRejectionGuard` teardown path), packages/runtime-core/src/kernel-client.test.ts
Items:
- L1 (teardown-listener-reentrancy, code-quality, low-risk): `#withDeadKernelRejectionGuard` mutates the process-global `unhandledRejection` listener set (removeAllListeners → install guard → restore). It is safe in the wedge today (single `#engine` per `Session`, runs serialized, `close()` runs once on SIGINT — two `disconnect()` calls never overlap). But the guard is NOT re-entrant: if a future caller ever invokes `disconnect()` concurrently with another (multi-session server, or a test racing two teardowns), the second call's `priorListeners` snapshot would capture the first call's guard, and restore ordering could leak a guard or double-restore (failure mode: a stuck/duplicated `unhandledRejection` handler after concurrent teardown). Add a re-entrancy guard (ref-count or "already-armed" flag) so nested/overlapping calls share one armed window. Currently unreachable in this card's single-engine design but required before the server grows to multiple concurrent sessions.
- L2 (drain-tuning-fragility, test-robustness, low-risk): the teardown drain is a fixed 2 passes × (5 microtask flushes + 1 real macrotask), empirically sufficient (5/5 + 10/10 clean real-venv exits) but tied to the current `@jupyterlab/services` internal reconnect layering. A library upgrade that adds another async hop could let the rejection escape after the guard tears down, resurfacing the Scenario-4 flake — and the existing unit test (single-hop leak model) would NOT catch it. Add a regression gate: on the next `@jupyterlab/services` bump, re-run the 5–10× real-venv determinism check (full `server-run-parity.integration.test.ts`, capturing exit codes + grepping for `Unhandled Rejection`). Consider hardening the drain to be self-tuning (loop until a quiescent tick with no escaped rejection) rather than a fixed magic count, if cheaply achievable, so it is resilient to added async hops.

Dedup note: these are review-3 FOLLOW-UP items on commit `1c97429`, distinct from the review-1/review-2 follow-ups (L1 fixture/union-of-keys, L2 coverage-wording, L3 ci-budget-watch) already routed to the planner in planner-1/planner-2 — do not re-create those here. The review-3 items are specifically about the `#withDeadKernelRejectionGuard` teardown machinery introduced in the review-2→3 flake fix, which did not exist when the earlier follow-ups were written.
