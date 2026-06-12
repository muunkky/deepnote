Sprint closeout card ID: dn929q
Sprint card list:
- a1xa1u (step 1, done): ALTKERN1 sprint planning — chore.
- 5wqw1l (step 2, in_progress→approved): Sub-phase 1A — thread kernelName + selectKernelName + --kernel flag + pre-flight + typed errors (runtime-core + cli, all mocked). THIS card.
- 41mrnp (step 3a, todo): Sub-phase 1B — value-add block hard-fail on non-python kernel.
- ngjse2 (step 3b, todo): Sub-phase 1B — reactivity bypass on non-python (both analyzer sites).
- qajbsg (step 4, todo): Sub-phase 1B — FailureCategory discriminant for the 4 failure classes. Relies on the typed KernelDiedError instance 5wqw1l ships.
- obcn7z (step 5, todo): Sub-phase 1C — real-kernel integration test, CI/IaC job, docs. Owns the real-kernel e2e (bash image/png, unregistered-kernel missing-kernel JSON against the live server).
- dn929q (step 6, todo): ALTKERN1 sprint closeout — chore.

The reviewer flagged 3 non-blocking items, grouped into 2 cards below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

Routing context (read before classifying): all three items are non-blocking follow-ups on an APPROVED card. The reviewer was explicit that L1 and L3 are tracking/confirmation notes ("No new card needed if 1C already covers it; this is a tracking note, not a defect" / "No action — recording... so the planner does not mistake the gap for an oversight"), not new work. L2 is the only item with a potential adjacent change. Two of these three (L1, L3) are strong candidates for the closeout-card follow-up tracker (dn929q) rather than standalone cards — they are de-dup/confirmation against work already planned. Classify each group on its merits.

### Card 1: Confirm Sub-phase 1C covers the live-kernel e2e + record the documented timeout-flag deferral (tracking)
Sprint: ALTKERN1
Files touched: none (tracking/confirmation against existing card obcn7z and KD-7); no source changes
Items:
- L1 (live-artifact-gap): Every assertion in card 5wqw1l is against mocks (`@jupyterlab/services`, `startServer`, mocked `fetch`, a mocked `ExecutionEngine` at the CLI layer). The capstone's `startNew({name:'bash'})` is proven only at the runtime-core layer against a mock; the CLI→engine→connect→startNew thread is never walked end-to-end in one test because the CLI test stubs the engine. The typed-error contract that card qajbsg (step 4) depends on (`kernel-died` vs `in-block`) is currently proven only against a hand-built status-signal mock, never a live kernel. Action: CONFIRM that existing card obcn7z (step 5, Sub-phase 1C) already covers the real-kernel e2e (bash `image/png` + unregistered-kernel `missing-kernel` JSON against the real toolkit server) and is sequenced after the 1B cards. If obcn7z already owns this, NO new card is needed — dedupe into the closeout tracker (dn929q) as a confirmation note. Only create/extend a card if obcn7z's scope does NOT in fact cover the live-transport proof of the typed-error contract.
- L3 (config-only-flag): `kernelStartupTimeoutMs` is config-only with no CLI surface; the `--kernel-timeout` flag is deferred per KD-7 (documented as not-debt; a unit test asserts the non-default value threads into `waitForKernelIdle`). NO action required — this is a documented Phase-future deliverable, not an oversight or tech debt. Record so the deferral is tracked (closeout tracker dn929q) and not later mistaken for a gap.

### Card 2: Set explicit "token-less local toolkit server" expectation for the raw-fetch kernelspecs pre-flight (transport/docs)
Sprint: ALTKERN1
Files touched: packages/runtime-core/src/kernel-client.ts (the `preflightKernelspec` raw-`fetch` GET against `{serverUrl}/api/kernelspecs`); and/or the #154 / Sub-phase 1C docs (whichever the planner judges the right home)
Items:
- L2 (transport-decode-gap): The `preflightKernelspec` GET uses the global `fetch` directly against `{serverUrl}/api/kernelspecs`, bypassing the `ServerConnection.makeSettings` / `@jupyterlab/services` request layer (and its WebSocket factory workaround) that the rest of the client uses. For a token-less local toolkit server this is fine and matches the spike's direct REST probing. But if a future deployment puts the toolkit server behind auth or a non-trivial base path, the raw `fetch` would not carry the server settings the session layer does. Action: make the "token-less local server" assumption explicit — either as a documented constraint (a code comment at the `preflightKernelspec` call site + a note in the #154 docs / Sub-phase 1C docs) or, if the planner judges it substantive enough, a card to route the pre-flight GET through `ServerConnection.makeSettings`. This is an adjacent observation, not a defect — scope it accordingly.
