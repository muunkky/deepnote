Sprint closeout card ID: 74r41t
Sprint card list:
- pa82wc (step 1, todo): step-1-luirun1-sprint-planning — sprint planning chore
- 6iba9v (step 2, in_progress/approved): step-2-executionclient-http-trigger-ws-subscribe-stream — SPA transport seam (HTTP trigger + WS subscribe-only stream)
- 9xfks2 (step 3, todo): step-3-runstore-reducer-useexecution-hook — runStore reducer + useExecution hook (owns runId→blockId correlation + reconnect state)
- 3p2kbm (step 4, todo): step-4-run-affordances-live-output-rendering — Run affordances + live output rendering
- e6usnq (step 5, todo): step-5-failure-banners-in-place-tracebacks — failure banners + in-place tracebacks
- 2udi5b (step 6, todo): step-6-gated-live-loop-latency-measurement-real-kernel — gated real-kernel <2s latency measurement
- 74r41t (step 7, todo): step-7-luirun1-sprint-closeout — sprint closeout chore

The reviewer flagged 2 non-blocking items, grouped into 1 card below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

IMPORTANT — these are NOT new cards. Both items are explicit forward-guidance for the ALREADY-PLANNED step-3 card (9xfks2, todo, not yet executed). The reviewer's recommendation is to strengthen step 3's capstone and test plan, not to create standalone follow-up work. Fold these into 9xfks2's content (capstone + test plan / acceptance criteria) so the step-3 executor is bound to them when that card is dispatched. Do NOT create a duplicate standalone card and do NOT append to the closeout card — the natural home is the existing step-3 card, which has not started.

### Card 1 (FOLD INTO EXISTING CARD 9xfks2 — step 3 runStore): strengthen step-3 capstone + reconnect test for trigger→stream correlation
Sprint: LUIRUN1
Files touched: apps/studio runStore/useExecution (step-3 deliverable, not yet written); card 9xfks2 content
Items:
- L1 (capstone-walk-granularity): The step-2 DoD capstone is one end-to-end walk (runBlock resolves runId → a subsequent frame for THAT runId reaches subscribe), but step 2 proves the two halves in separate tests with different clients and different hardcoded runIds (trigger resolves 7; stream delivers frames tagged 3). This is correct at the ExecutionClient layer because it is deliberately subscribe-only and does not own the runId→blockId map — correlation is the runStore's job (design Phase 2 / step 3, doc lines 59/72). Step 3's capstone MUST assert the explicit binding: a run is triggered, the store binds the HTTP-returned runId to the originating block, and a subsequent WS frame carrying that SAME runId updates that block's state. One test, same runId across HTTP and WS.
- L2 (reconnect-replay-gap): The broadcast WS has no per-client replay; ExecutionClient's handleClose relies on "the owning store resets in-flight blocks to idle on reconnect" — a reset asserted nowhere yet (correctly step-3 state). Step 3 MUST have a test that a terminal event missed across a reconnect does not leave a block pending forever (i.e. the store resets in-flight blocks on reconnect), since the client intentionally provides no replay.
