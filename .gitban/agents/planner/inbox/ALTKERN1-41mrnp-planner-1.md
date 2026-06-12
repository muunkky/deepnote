Sprint closeout card ID: dn929q
Sprint card list:
- 41mrnp (step 3A, in_progress): step-3a-sub-phase-1b-value-add-block-hard-fail-on-non-python-kernel — VALUE_ADD_BLOCK_TYPES set + UnsupportedBlockOnKernelError + engine dispatch guard (this card, now approved)
- 5wqw1l (step 2, done): step-2-sub-phase-1a-thread-kernelname-selectkernelname-kernel-flag-pre-flight-typed-errors — isNonPythonKernel, kernelName threading, stored kernelLanguage
- ngjse2 (step 3B, in_progress): step-3b-sub-phase-1b-reactivity-bypass-on-non-python-both-analyzer-sites — reactivity bypass in run.ts analyzer functions
- qajbsg (step 4, todo): step-4-sub-phase-1b-failurecategory-discriminant-for-the-4-failure-classes — FailureCategory discriminant for the 4 failure classes
- obcn7z (step 5, todo): step-5-sub-phase-1c-real-kernel-integration-test-ci-iac-job-docs — real (live) non-Python kernel integration test, CI/IaC job, docs (R7)
- dn929q (step 6, todo): step-6-altkern1-sprint-closeout — sprint closeout card

The reviewer flagged 2 non-blocking items, grouped into 2 cards below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: Add dedicated engine test for agent-block hard-fail on non-Python kernel
Sprint: ALTKERN1
Files touched: packages/runtime-core/src/execution-engine.test.ts
Items:
- L1 (test-coverage-gap, low): The engine guard is type-agnostic and the KD-4 drift guard proves `agent` ∈ `VALUE_ADD_BLOCK_TYPES`, but there is no dedicated engine test asserting an `agent` block hard-fails on a non-Python kernel *before* the `OPENAI_API_KEY` check / `executeAgentBlock`. Behavior is covered by construction (same guard, same per-block loop), so this is defensive only. Closing it is a single test that fixtures an agent block on a bash (non-Python) kernel and asserts the run aborts with `UnsupportedBlockOnKernelError(blockType='agent', kernelName='bash')` before any agent codegen / API-key check runs. Belongs in this sprint — same module (`execution-engine.test.ts`) as card 41mrnp's existing engine tests.

### Card 2: Confirm/clean guarded `_dntk` DataFrame preamble on plain code under a live non-Python kernel
Sprint: ALTKERN1
Files touched: real-kernel integration test (step 5 / obcn7z scope) — likely packages/runtime-core integration test + packages/blocks/src/blocks/data-frame.ts / code-blocks.ts
Items:
- L2 (cross-card-invariant, informational): Plain `code` blocks routed through `createPythonCode` on a non-Python kernel still carry the guarded `if '_dntk' in globals(): _dntk.dataframe_utils.configure_dataframe_formatter(...)` DataFrame-formatter preamble (`packages/blocks/src/blocks/data-frame.ts:11-12`, prepended via `createPythonCodeForCodeBlock` in `code-blocks.ts:6-14`). It is inert by construction in this mocked card (the guard short-circuits because `_dntk` is never injected on a non-Python kernel), so it is NOT a blocker here. The real-kernel integration step (step 5 / R7, card obcn7z) is the right home: (a) confirm a live non-Python kernel tolerates the guarded preamble (it should, since `if '_dntk' in globals()` short-circuits to a no-op), and (b) decide whether to omit the preamble entirely on non-Python kernels for cleanliness. The reviewer explicitly asked that this be routed to the real-kernel card rather than lost. Prefer folding this into existing card obcn7z (step 5) if dedup makes sense, rather than creating a standalone card. Not BLOCKED — obcn7z already exists in this sprint and owns the live-kernel work.
