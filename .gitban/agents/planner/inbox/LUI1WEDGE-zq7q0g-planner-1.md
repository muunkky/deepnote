Sprint closeout card ID: od8esg
Sprint card list:
- e6e3lt (step 4b, done): step-4b-save-api-semantic-round-trip-idempotence — save API round-trip/idempotence.
- hlai4c (step 4a, done): step-4a-execute-stream-ws-run-serialization-queue — execute stream WS + run serialization queue.
- 87ifqe (step 2, done): step-2-server-package-scaffold-runtime-server — @deepnote/runtime-server package scaffold.
- x71bcm (step 3, done): step-3-project-open-list-api-get-api-project — GET /api/project open + list API.
- zq7q0g (step 6, blocked): step-6-serve-command-deepnote-serve — `deepnote serve` CLI command (this card; under rework for B1).
- wd2nil (step 5, todo): step-5-server-integration-tests-parity-with-deepnote-run — real-socket serve integration/smoke tests.
- sqm7ox (step 7a, todo): step-7a-browser-launch-alias-deepnote-ui — `deepnote ui` browser-launch alias.
- yzd78n (step 7b, todo): step-7b-sql-integration-parity-with-run — SQL integration parity with run.
- dx99dj (step 8, todo): step-8-contrib-diff-cut-clean-slice-off-upstream-main — clean contrib diff slice.
- k65hcx (step 9, todo): step-9-fork-showcase-post-dry-run-thread — fork showcase post / dry-run thread.
- od8esg (step 10, todo): step-10-lui1wedge-sprint-closeout — sprint closeout card.
- wzrodp (step 1, todo): step-1-lui1wedge-sprint-planning — sprint planning (CAMERON).

The reviewer flagged 2 non-blocking items, grouped into 2 cards below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

Source review: `.gitban/agents/reviewer/inbox/LUI1WEDGE-zq7q0g-reviewer-1.md`.

### Card 1: Pin the omitted-host `listen` lifecycle path to its bound interface in runtime-server
Sprint: LUI1WEDGE
Files touched: `packages/runtime-server/src/server.test.ts` (and any `server.ts` accessor added by the B1 fix)
Items:
- L1 (test-depth-gap, runtime-server lifecycle test): The pre-existing `listen(0)` lifecycle test
  inherits the same `canConnect`-over-loopback limitation as the B1-rejected test — it proves the port
  is reachable and released, but not the bind interface. Once B1 is fixed by exposing the server-side
  bound address, the omitted-host `listen` overload should be pinned too: assert it binds the
  unspecified address (`0.0.0.0` / `::`) so both `listen` overloads (with-host loopback and
  without-host all-interfaces) are characterised. Small. This is naturally folded into the same
  server-side-address accessor the B1 rework introduces; if the executor's B1 fix already adds the
  negative leg for the omitted-host case, dedupe this card against that work and close it as already
  covered rather than duplicating.

### Card 2: Confirm step-5 serve integration smoke (`wd2nil`) asserts loopback bind / off-host unreachability
Sprint: LUI1WEDGE
Files touched: step-5 integration card `wd2nil` (its serve smoke test scope — e.g. a real-socket
`deepnote serve fixture.deepnote --no-open` test under `packages/cli` or `packages/runtime-server`)
Items:
- L2 (integration-coverage handoff): Card zq7q0g legitimately defers the real-socket capstone (live
  `GET /api/project` over a real bind) to step 5 (`wd2nil`). Step 5's smoke must actually assert the
  served process is bound to loopback and not reachable off-host. If B1 is fixed only at the unit layer
  and step 5 also skips the interface check, the security boundary has no real-socket guard anywhere.
  Ensure `wd2nil`'s acceptance criteria/DoD explicitly carry a real-socket loopback-bind /
  off-host-unreachable assertion. Prefer amending the existing `wd2nil` card's scope (it is still todo)
  over creating a separate card if the planner judges that cleaner; otherwise create this as a sprint
  card that gates on or pairs with `wd2nil`.
