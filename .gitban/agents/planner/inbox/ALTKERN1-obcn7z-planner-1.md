Sprint closeout card ID: dn929q
Sprint card list:
- a1xa1u (step 1, done): ALTKERN1 sprint planning — chore
- 5wqw1l (step 2, done): Sub-phase 1A — thread kernelName/selectKernelName, --kernel flag, pre-flight typed errors
- 41mrnp (step 3a, done): Sub-phase 1B — value-add block hard-fail on non-Python kernel
- ngjse2 (step 3b, done): Sub-phase 1B — reactivity bypass on non-Python (both analyzer sites)
- qajbsg (step 4, done): Sub-phase 1B — failureCategory discriminant for the 4 failure classes
- 321p72 (step 4b, done): anchor run.test.ts fixture path to a module-relative base — test
- obcn7z (step 5, in_progress): Sub-phase 1C — real-kernel integration test + CI IaC job + docs (headline, this card)
- dn929q (step 6, todo): ALTKERN1 sprint closeout — chore

The reviewer flagged 3 non-blocking items. L1 (one-line .gitignore add) is being handled now as a close-out item by the executor and is NOT routed here. The remaining 2 items are grouped into 2 cards below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: Heavier-kernel integration target (IJulia/IRkernel) exercising --kernel-timeout + a second non-Python transport
Sprint: ALTKERN1
Status: BLOCKED
Blocker reason: This is explicitly Phase 2/3 scope. The ALTKERN1 sprint (PRD-002 Phase 1) ships the pure-pip `bash_kernel` path as its headline; the card's own "Future Enhancements" row and the design doc (`docs/designs/phase1-alternative-language-kernels.md`, Phase 2/3 note) both defer heavier-kernel coverage to a later milestone. Adding an IJulia/IRkernel integration target requires new CI provisioning for a non-pip toolchain (Julia/R runtimes) and the `--kernel-timeout` startup-timeout path that Phase 1 does not implement against a heavy kernel — work that depends on future-milestone scope not present in this cycle. Planner to confirm the classification and route to the Phase 2/3 backlog with this reason if it agrees.
Files touched: `.github/workflows/ci.yml` (new/extended integration provisioning), `packages/cli/test-integration/` (new heavier-kernel integration test + fixture)
Items:
- L2: The integration suite proves only the pure-pip `bash_kernel` path. `--kernel-timeout` / heavier-kernel behavior (IJulia/IRkernel) is never exercised. A future heavier-kernel integration target would cover startup-timeout and a second non-Python transport. (Aligns with the design-doc Phase 2/3 note; the card already flags it under Future Enhancements.)

### Card 2: Automated upstream deepnote-toolkit version-pin drift signal (bump-and-rerun cadence)
Sprint: ALTKERN1
Status: BLOCKED
Blocker reason: This depends on establishing a recurring ops cadence / scheduled-automation mechanism that does not exist in the repo today, and is called out as an open question in the design doc (`docs/designs/phase1-alternative-language-kernels.md`) rather than in-scope Phase 1 work. The Phase 1 deliverable correctly records the pins (`deepnote-toolkit[server]==2.3.1`, `bash_kernel==0.10.0`) in the CI `env:` block with a deliberate-bump comment; building automated drift detection (e.g., a scheduled workflow that bumps the pin and reruns the real-execution gate) is a separate ops/CI initiative beyond this sprint's headline scope. Planner to confirm and route to backlog with this reason if it agrees.
Files touched: `.github/workflows/` (new scheduled bump-and-rerun workflow), CI env-block pins reference
Items:
- L3: The toolkit/bash_kernel pins are recorded in the CI `env:` block with a deliberate-bump comment, but there is no automated signal when upstream `deepnote-toolkit` releases a version that changes the real-server contract the assertions depend on. A periodic bump-and-rerun cadence (design-doc open question) would catch contract drift before it silently rots the only real-execution gate.
