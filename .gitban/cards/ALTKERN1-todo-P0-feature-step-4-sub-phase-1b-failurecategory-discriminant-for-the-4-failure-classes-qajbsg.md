# step 4: Sub-phase 1B — failureCategory discriminant for the 4 failure classes

> Maps to design-doc **Sub-phase 1B** (the machine-readable failure-category behavior; the third user-visible behavior split out of 1B per the packed-card rule). All mocked. Sequenced **after step 3B** because both edit `run.ts` (non-overlapping regions: 3B edits the analyzer functions; this card edits the result/error-surfacing types + `onBlockDone` + `buildMachineRunResult` + the outer catch). Depends on: step 2 (1A — `KernelDiedError`/`KernelFailureCategory` + the typed `category` discriminant on each kernel error).
> Implements PRD-002 CI criterion / R6 (KD-6, KD-8).

## Feature Overview & Context

- **Associated Ticket/Epic:** PRD-002 Phase 1; roadmap `m2/s5/alternative-kernels/phase1-implementation`; PRD-002 "failure classes distinguishable for CI"
- **Feature Area/Component:** `@deepnote/cli` (`run.ts` — `BlockResult`/`RunResult` types, `onBlockDone`, `buildMachineRunResult`, outer catch)
- **Target Release/Milestone:** ALTKERN1 sub-phase 1B (failure categories)

**Required Checks:**

- [x] **Associated Ticket/Epic** link is included above.
- [x] **Feature Area/Component** is identified.
- [x] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

- [x] `README.md` or project documentation reviewed.
- [x] Existing architecture documentation or ADRs reviewed.
- [x] Related feature implementations or similar code reviewed.
- [x] API documentation or interface specs reviewed [if applicable].

| Document Type                      | Link / Location                                                                                           | Key Findings / Action Required                                                                                                                                                                |
| :--------------------------------- | :-------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Design doc 1B / KD-6**           | `docs/designs/phase1-alternative-language-kernels.md` (Sub-phase 1B; KD-6; "two failure-surfacing sites") | Binary DoD; two surfacing sites; the string-flattening trap.                                                                                                                                  |
| **PRD-002 success criterion**      | `docs/prds/PRD-002-alternative-language-kernels.md` ("Failure classes distinguishable for CI")            | 4 classes each on a stable machine-readable field in `--output json`; no two collapse; exit codes NOT subdivided.                                                                             |
| **BlockResult / RunResult**        | `packages/cli/src/commands/run.ts:97-106,156-164`                                                         | `BlockResult.error: string \| undefined` at `:105`; `RunResult extends ExecutionSummary` with only boolean `success`. Add `failureCategory?: KernelFailureCategory` to BOTH.                  |
| **RunExecutionState.blockResults** | `packages/cli/src/commands/run.ts:193-194`                                                                | `BlockResult[]` — carries the new field automatically.                                                                                                                                        |
| **onBlockDone**                    | `packages/cli/src/commands/run.ts:1048-1059`                                                              | `error: result.error?.message` at `:1058` flattens the typed instance to a string. Capture the discriminant HERE while `result.error` is still typed.                                         |
| **buildMachineRunResult**          | `packages/cli/src/commands/run.ts:1212-1234`                                                              | Success-path only (reached via the run-summary return). Read `blockResults.find(b => !b.success)?.failureCategory ?? 'in-block'` — NO `instanceof` on a string.                               |
| **outer catch**                    | `packages/cli/src/commands/run.ts:522-543`                                                                | `outputJson({ success:false, error })` at `:534`; exit-code mapping at `:526-531`. Add `failureCategory` from the caught error's `category`; map `KernelNotRegisteredError` → `InvalidUsage`. |
| **kernel-errors / categories**     | `packages/runtime-core/src/kernel-errors.ts` (step 2)                                                     | `KernelFailureCategory` union + each error's literal `category`; `KernelDiedError` thrown on mid-run death.                                                                                   |

## Design & Planning

### Initial Design Thoughts & Requirements

- Import `KernelDiedError` and `KernelFailureCategory` into `run.ts` from runtime-core.
- Add `failureCategory?: KernelFailureCategory` to `BlockResult` (`:97-106`) and `RunResult` (`:156-164`). `RunExecutionState.blockResults` (`:193-194`) carries it automatically.
- **Site (b) — `onBlockDone` (`:1058`):** when `!result.success`, compute `result.error instanceof KernelDiedError ? 'kernel-died' : 'in-block'` from the **still-typed** `result.error` (BEFORE it is flattened to `.message`) and push it as `BlockResult.failureCategory` (successful blocks leave it `undefined`). Then in `buildMachineRunResult`, when `summary.failedBlocks > 0`, read `blockResults.find(b => !b.success)?.failureCategory ?? 'in-block'` into `RunResult.failureCategory` — no `instanceof` on a string.
- **Site (a) — outer catch (`:522-543`):** map the caught error's `category` discriminant onto `failureCategory` (`KernelNotRegisteredError`→`missing-kernel`, `KernelLaunchError`→`kernel-launch`, `KernelDiedError`→`kernel-died`) and emit it in the `outputJson`/`outputToon` error payloads. Add `KernelNotRegisteredError` to the `InvalidUsage` branch of the exit-code mapping (`:526-531`); the rest map to `Error`. (This requires `KernelClient.execute`/IOPub to throw `KernelDiedError` on mid-run death — landed in step 2's `kernel-errors.ts`; this card relies on that class.)
- Exit codes are NOT subdivided (KD-6): the four classes are distinguished only on `failureCategory`.

### Acceptance Criteria

- [ ] `failureCategory?: KernelFailureCategory` added to both `BlockResult` and `RunResult`.
- [ ] `onBlockDone` computes the discriminant from the still-typed `result.error` before string-flattening.
- [ ] `buildMachineRunResult` reads the field (no `instanceof` on a string) for the success-path failures.
- [ ] Outer catch emits `failureCategory` in the JSON/toon payloads for the pre-summary kernel errors; `missing-kernel` maps to `InvalidUsage`.
- [ ] All four classes carry distinct `failureCategory` values; `kernel-died` does NOT collapse into `in-block`.

## Definition of Done

### Intent

A CI/CD author running a non-Python notebook headlessly with `--output json` can tell _why_ a run failed from a single stable field — was the kernel missing, did it fail to launch, did it die mid-run, or did the user's own code raise inside a block — without parsing free-text error messages. Crucially, "kernel died mid-run" and "user code errored in a block" are reported as different categories, even though both flow through the per-block error path where the typed error class is otherwise flattened to a string. If this broke, a pipeline distinguishing an environment failure from a code failure would see them collapse to one value (the classic trap: `kernel-died` silently becoming `in-block`), or `missing-kernel`/`kernel-launch` would have no `failureCategory` at all because they are thrown before the success-path builder.

### Observable outcomes

- [ ] `KernelDiedError` and `KernelFailureCategory` are imported into `run.ts`; `failureCategory` is present on both `BlockResult` and `RunResult`.
- [ ] A `KernelNotRegisteredError` caught in the outer catch yields `--output json` `{ success:false, failureCategory: 'missing-kernel', ... }` and exit code `InvalidUsage`.
- [ ] A `KernelLaunchError` caught in the outer catch yields `failureCategory: 'kernel-launch'` in the JSON payload and exit code `Error`.
- [ ] A plain in-block user error (mocked failing `BlockExecutionResult` whose `error` is NOT a `KernelDiedError`) yields `RunResult.failureCategory === 'in-block'`.
- [ ] A mid-run `KernelDiedError` (mocked failing `BlockExecutionResult` whose `error` IS a `KernelDiedError`) yields `RunResult.failureCategory === 'kernel-died'` — proving the discriminant survives the `run.ts:1058` string-flattening boundary.
- [ ] **Capstone (4-class distinguishability):** across four mocked failure scenarios — (1) pre-flight `KernelNotRegisteredError`, (2) `startNew`-rejection `KernelLaunchError`, (3) a mid-run `KernelDiedError` surfaced through `onBlockDone`, (4) an ordinary in-block user error — the `--output json` payload carries `failureCategory` values `'missing-kernel'`, `'kernel-launch'`, `'kernel-died'`, and `'in-block'` respectively, all four distinct, with `'kernel-died'` and `'in-block'` NOT collapsed to the same value despite both passing through the per-block string-flattening at `run.ts:1058`.

## Feature Work Phases

| Phase / Task              | Status / Link to Artifact or Card                                             |        Universal Check        |
| :------------------------ | :---------------------------------------------------------------------------- | :---------------------------: |
| **Design & Architecture** | KD-6 / KD-8 + PRD-002 criterion                                               |     - [ ] Design Complete     |
| **Test Plan Creation**    | `run.test.ts` 4-class assertions incl. outer-catch JSON shape                 |   - [ ] Test Plan Approved    |
| **TDD Implementation**    | two surfacing sites + types                                                   | - [ ] Implementation Complete |
| **Integration Testing**   | N/A here (mocked); real missing-kernel is step 5                              | - [ ] Integration Tests Pass  |
| **Documentation**         | inline comments cite KD-6 sites (a)/(b)                                       | - [ ] Documentation Complete  |
| **Code Review**           | gitban reviewer                                                               |  - [ ] Code Review Approved   |
| **Deployment Plan**       | additive; no exit-code contract change beyond `missing-kernel`→`InvalidUsage` |  - [ ] Deployment Plan Ready  |

## TDD Implementation Workflow

|             Step              | Status/Details                                                                                                                                                         |                     Universal Check                      |
| :---------------------------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------: |
|  **1. Write Failing Tests**   | `run.test.ts`: outer-catch JSON shape for `missing-kernel`/`kernel-launch`; mid-run `KernelDiedError` → `'kernel-died'`; in-block → `'in-block'`; the 4-class capstone |     - [ ] Failing tests are committed and documented     |
| **2. Implement Feature Code** | `run.ts` (BlockResult/RunResult types, `onBlockDone`, `buildMachineRunResult`, outer catch, imports)                                                                   |         - [ ] Feature implementation is complete         |
|   **3. Run Passing Tests**    | new tests green                                                                                                                                                        |         - [ ] Originally failing tests now pass          |
|        **4. Refactor**        | —                                                                                                                                                                      | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite**  | `pnpm test` (Python paths unchanged)                                                                                                                                   |      - [ ] All tests pass (unit, integration, e2e)       |
|  **6. Performance Testing**   | N/A                                                                                                                                                                    |          - [ ] Performance requirements are met          |

### Implementation Notes

**Test Strategy:** Mock the engine to emit failing `BlockExecutionResult`s carrying a typed `KernelDiedError` instance (site b) and to throw kernel errors out of `engine.start()` (site a). Assert the `--output json` shape at the outer catch directly — not only the success path — so the structurally-distinct surfacing of `missing-kernel`/`kernel-launch` is covered. The mid-run `KernelDiedError` test is the load-bearing one (the prior `instanceof`-in-`buildMachineRunResult` design silently failed here).

**Key Implementation Decisions:** The discriminant is captured at the only point the typed instance is live (`onBlockDone`, `:1058`) and threaded as an explicit field; `buildMachineRunResult` consumes the field. Exit codes are not subdivided (KD-6).

```ts
failureCategory: result.success
  ? undefined
  : result.error instanceof KernelDiedError
    ? "kernel-died"
    : "in-block";
```

## Validation & Closeout

| Task                      | Detail/Link        |
| :------------------------ | :----------------- |
| **Code Review**           | gitban reviewer    |
| **QA Verification**       | mocked unit suites |
| **Staging Deployment**    | N/A (library)      |
| **Production Deployment** | N/A (fork PR)      |
| **Monitoring Setup**      | N/A                |

### Follow-up & Lessons Learned

| Topic                       | Status / Action Required                                      |
| :-------------------------- | :------------------------------------------------------------ |
| **Postmortem Required?**    | No                                                            |
| **Further Investigation?**  | No                                                            |
| **Technical Debt Created?** | No                                                            |
| **Future Enhancements**     | Optional exit-code subdivision (explicitly deferred per KD-6) |

### Completion Checklist

- [ ] All acceptance criteria are met and verified.
- [ ] All tests are passing (unit, integration, e2e, performance).
- [ ] Code review is approved and PR is merged.
- [ ] Documentation is updated (README, API docs, user guides).
- [ ] Feature is deployed to production.
- [ ] Monitoring and alerting are configured.
- [ ] Stakeholders are notified of completion.
- [ ] Follow-up actions are documented and tickets created.
- [ ] Associated ticket/epic is closed.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them.
