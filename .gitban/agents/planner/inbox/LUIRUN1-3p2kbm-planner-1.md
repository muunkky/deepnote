Sprint closeout card ID: 74r41t
Sprint card list:
- pa82wc (step 1, todo): step-1-luirun1-sprint-planning — sprint planning chore
- 6iba9v (step 2, done): step-2-executionclient-http-trigger-ws-subscribe-stream — ExecutionClient transport
- 9xfks2 (step 3, done): step-3-runstore-reducer-useexecution-hook — run store reducer + useExecution hook
- 3p2kbm (step 4, blocked): step-4-run-affordances-live-output-rendering — Run/Run-all affordances + live output rendering (this card, under review)
- e6usnq (step 5, todo): step-5-failure-banners-in-place-tracebacks — failure banners + in-place tracebacks
- 2udi5b (step 6, todo): step-6-gated-live-loop-latency-measurement-real-kernel — real-kernel latency measurement
- 74r41t (step 7, todo): step-7-luirun1-sprint-closeout — sprint closeout chore

The reviewer flagged 3 non-blocking items, grouped into 2 cards below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: De-duplicate the runnable-renderer run/output plumbing + add the SqlRenderer run-prop unit coverage it currently lacks
Sprint: LUIRUN1
Files touched: apps/studio/src/blocks/CodeRenderer.tsx, apps/studio/src/blocks/SqlRenderer.tsx, apps/studio/src/blocks/SqlRenderer.test.tsx (and any new shared helper module under apps/studio/src/blocks/ or apps/studio/src/execution/)
Items:
- L2 (dry-duplication): the live-vs-persisted selection block and the `run`-toolbar JSX are now duplicated verbatim across `CodeRenderer.tsx` and `SqlRenderer.tsx` (`const persisted = ...; const outputs = run !== undefined && hasSessionRun(run) ? run.outputs : persisted;` plus the `{run !== undefined ? <toolbar><RunControl/></toolbar> : null}` wrapper). Two copies today, and the executable-renderer set may grow. Failure mode: a fix to the selection logic (e.g. a future KD-3 refinement) applied to one renderer and missed in the other. Extract a small shared `useBlockOutputs(block, run)` helper or a shared `<RunToolbar run={run}/>` so the live/persisted selection + run-toolbar lives in one place.
- L1 (test-coverage-gap): `SqlRenderer`'s `run`-prop branch (Run control + live-vs-persisted selection) has no direct unit test. `CodeRenderer.run.test.tsx` covers the code path thoroughly; `SqlRenderer.test.tsx` only exercises the s2 (no-`run`) posture. The assembled `readOnlyInvariant`/`Shell.run` tests render the sql block with a `run` descriptor so the control *appearing* on sql is indirectly covered — but the live-replaces-persisted selection for sql specifically is not asserted. Add a sql analogue of the CodeRenderer live/persisted/replace tests (this naturally rides the de-duplication above, since the extracted helper is exactly the seam to test on the sql side).

### Card 2: Inline or drop the misleading `withKernel` identity no-op in Shell.run.test.tsx
Sprint: LUIRUN1
Files touched: apps/studio/src/shell/Shell.run.test.tsx
Items:
- L3 (test-clarity): `Shell.run.test.tsx` defines `withKernel(project) => project`, an identity no-op whose name implies it mutates capabilities. It is harmless but misleading — the kernel state is actually driven by the separate `kernelLanguage` prop. Inline it or drop it.
