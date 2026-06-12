Sprint closeout card ID: dn929q
Sprint card list:
- a1xa1u (step 1, done): step-1-altkern1-sprint-planning — sprint planning chore
- 5wqw1l (step 2, done): step-2-sub-phase-1a-thread-kernelname-selectkernelname-kernel-flag-pre-flight-typed-errors — thread kernelName / selectKernelName / --kernel flag, pre-flight typed errors
- 41mrnp (step 3a, done): step-3a-sub-phase-1b-value-add-block-hard-fail-on-non-python-kernel — value-add-block hard-fail on non-python kernel
- ngjse2 (step 3b, done): step-3b-sub-phase-1b-reactivity-bypass-on-non-python-both-analyzer-sites — reactivity bypass on non-python, both analyzer sites
- qajbsg (step 4, done): step-4-sub-phase-1b-failurecategory-discriminant-for-the-4-failure-classes — failureCategory discriminant for the 4 failure classes
- 321p72 (step 4b, in_progress): step-4b-anchor-run-test-ts-fixture-path-to-a-module-relative-base — anchor run.test.ts fixture paths to module-relative base (this card, approved)
- obcn7z (step 5, in_progress): step-5-sub-phase-1c-real-kernel-integration-test-ci-iac-job-docs — real-kernel integration test, CI/IaC job, docs
- dn929q (step 6, todo): step-6-altkern1-sprint-closeout — sprint closeout chore

The reviewer flagged 1 non-blocking item, grouped into 1 card below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: Harden run.test.ts module-load fixture guard to enumerate individual fixture files
Sprint: ALTKERN1
Files touched: packages/cli/src/commands/run.test.ts
Items:
- L1 (guard-granularity, low): The module-load guard added in 321p72 checks only the two fixture *base directories* (`EXAMPLES_DIR`, `TEST_FIXTURES_FORMATS_DIR`) for existence, not each individual fixture *file*. This covers the dominant failure mode (a wrong `REPO_ROOT` walk depth or a relocated/renamed base dir — the Scenario-3 "someone moves `examples/`" case), which now fails loudly with the offending absolute path. But a single fixture file going missing while its directory survives (e.g. `1_hello_world.deepnote` deleted, `examples/` intact) still falls through to the older opaque `FileResolutionError`/read-error path rather than the precise guard message. The card's own belt-and-suspenders text recommended per-*file* `fs.existsSync`. Hardening: enumerate the actual fixture files (`HELLO_WORLD_FILE`, `BLOCKS_FILE`, `INTEGRATIONS_FILE`, `JUPYTER_FILE`, `PERCENT_FILE`, `QUARTO_FILE`) in the guard loop so any single-fixture deletion/rename also fails loudly with the precise absolute-path message instead of reverting to the imprecise-error behavior the guard was meant to eliminate. Strictly-better-than-current state; primary risk (base-dir relocation) is already fully covered.
