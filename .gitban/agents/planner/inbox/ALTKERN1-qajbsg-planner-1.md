Sprint closeout card ID: dn929q
Sprint card list:
- 41mrnp (step 3A, done): step-3a-sub-phase-1b-value-add-block-hard-fail-on-non-python-kernel — VALUE_ADD_BLOCK_TYPES set + UnsupportedBlockOnKernelError + engine dispatch guard
- 5wqw1l (step 2, done): step-2-sub-phase-1a-thread-kernelname-selectkernelname-kernel-flag-pre-flight-typed-errors — isNonPythonKernel, kernelName threading, stored kernelLanguage
- ngjse2 (step 3B, done): step-3b-sub-phase-1b-reactivity-bypass-on-non-python-both-analyzer-sites — reactivity bypass in run.ts analyzer functions
- qajbsg (step 4, in_progress): step-4-sub-phase-1b-failurecategory-discriminant-for-the-4-failure-classes — failureCategory discriminant for the 4 failure classes (this card, now approved)
- obcn7z (step 5, todo): step-5-sub-phase-1c-real-kernel-integration-test-ci-iac-job-docs — real (live) non-Python kernel integration test, CI/IaC job, docs (R7)
- a1xa1u (step 1, done): step-1-altkern1-sprint-planning — sprint planning chore
- dn929q (step 6, todo): step-6-altkern1-sprint-closeout — sprint closeout card

The reviewer flagged 1 non-blocking item, grouped into 1 card below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: Anchor run.test.ts fixture path to a module-relative base
Sprint: ALTKERN1
Files touched: packages/cli/src/commands/run.test.ts
Items:
- L1 (fixture-path-fragility, low): `run.test.ts` resolves fixtures via the process-relative path `join('examples', '1_hello_world.deepnote')`, which only works when vitest's CWD is the repo root. Running the file from `packages/cli` (or any other CWD) silently routes every `action(HELLO_WORLD_FILE, …)` test through `FileResolutionError` instead of the path under test, masking real assertions — e.g. the new site-(a) `failureCategory` tests would read `failureCategory: undefined` rather than the kernel category, turning a green run red (or worse, masking a regression) for reasons unrelated to the change. Anchor the fixture path to a module-relative base (resolve relative to the test module's own directory) or assert the fixture exists in a `beforeAll`, so the file passes regardless of CWD. Pre-existing, not introduced by qajbsg. Belongs in this sprint — same file (`run.test.ts`) the failureCategory tests live in, and step 5 (obcn7z) adds live-kernel integration tests in the same `cli` package that would benefit from a CWD-robust fixture base.
