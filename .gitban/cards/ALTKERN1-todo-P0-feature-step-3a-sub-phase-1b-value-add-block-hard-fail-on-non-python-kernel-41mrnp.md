# step 3A: Sub-phase 1B — value-add block hard-fail on non-Python kernel

> Maps to design-doc **Sub-phase 1B** (value-add hard-fail behavior; one of the three user-visible behaviors split out of 1B per the packed-card rule). All mocked. Parallel with step 3B (no file collision — this card touches `packages/blocks` + `execution-engine.ts`; 3B touches `run.ts` analyzer functions). Depends on: step 2 (1A — `isNonPythonKernel`, `kernelName` threading, stored `kernelLanguage`).
> Implements ADR-004 Decision point 1 (R4, KD-4).

## Feature Overview & Context

- **Associated Ticket/Epic:** PRD-002 Phase 1; roadmap `m2/s5/alternative-kernels/phase1-implementation`; ADR-004
- **Feature Area/Component:** `@deepnote/blocks` (value-add classification set + typed error) + `@deepnote/runtime-core` (engine dispatch guard)
- **Target Release/Milestone:** ALTKERN1 sub-phase 1B (value-add)

**Required Checks:**

- [x] **Associated Ticket/Epic** link is included above.
- [x] **Feature Area/Component** is identified.
- [x] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

- [x] `README.md` or project documentation reviewed.
- [x] Existing architecture documentation or ADRs reviewed.
- [x] Related feature implementations or similar code reviewed.
- [x] API documentation or interface specs reviewed [if applicable].

| Document Type                                 | Link / Location                                                                                              | Key Findings / Action Required                                                                                                                                                                     |
| :-------------------------------------------- | :----------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Design doc 1B**                             | `docs/designs/phase1-alternative-language-kernels.md` (Sub-phase 1B; KD-4)                                   | Binary DoD for the value-add behavior.                                                                                                                                                             |
| **ADR-004**                                   | `docs/adr/ADR-004-non-python-degradation-behavior.md`                                                        | Hard-fail with a typed, entity-naming error; never emit `_dntk` RPC; guard at the dispatch seam + agent branch.                                                                                    |
| **executable-blocks**                         | `packages/blocks/src/blocks/executable-blocks.ts:7-16,18-27`                                                 | `INPUT_BLOCK_TYPES` + the private `executableBlockTypes` Set; add `VALUE_ADD_BLOCK_TYPES` = `executableBlockTypes` minus `'code'`, beside the canonical set (NOT the runtime-core re-export shim). |
| **python-code dispatcher**                    | `packages/blocks/src/python-code.ts:29-91`                                                                   | Single dispatcher; throws `UnsupportedBlockTypeError` at `:90`. `VALUE_ADD_BLOCK_TYPES` coverage cross-checked against it.                                                                         |
| **DeepnoteError / UnsupportedBlockTypeError** | `packages/blocks/src/errors.ts:53`                                                                           | `UnsupportedBlockTypeError extends DeepnoteError` — pattern to mirror for `UnsupportedBlockOnKernelError`.                                                                                         |
| **engine dispatch seam**                      | `packages/runtime-core/src/execution-engine.ts:236,374-378`                                                  | Agent branch opens at `:236` (`if (isAgentBlock(block))`); dispatcher `createPythonCode(block)` ~`:375`. Guard fires before either when `isNonPythonKernel` is true.                               |
| **isNonPythonKernel / stored language**       | `packages/runtime-core/src/kernel-name.ts` (step 2); `execution-engine.ts` private `kernelLanguage` (step 2) | Guard keyed on `isNonPythonKernel(this.config.kernelName, this.kernelLanguage)`.                                                                                                                   |

## Design & Planning

### Initial Design Thoughts & Requirements

- Add `VALUE_ADD_BLOCK_TYPES` to `packages/blocks/src/blocks/executable-blocks.ts`, defined as `executableBlockTypes` minus `'code'` — i.e. `sql`, `visualization`, `big-number`, `button`, `notebook-function`, the `INPUT_BLOCK_TYPES`, and `agent`. Export a membership predicate.
- Add `UnsupportedBlockOnKernelError extends DeepnoteError` to `packages/blocks/src/errors.ts` beside `UnsupportedBlockTypeError` (`:53`), carrying `blockType` and `kernelName` fields and a message naming both (e.g. "sql blocks require the Python kernel; this notebook is running on 'bash'.").
- In `ExecutionEngine`, at the dispatch seam (before the agent branch at `:236` and before `createPythonCode` at `~:375`): when `isNonPythonKernel(this.config.kernelName, this.kernelLanguage)` is true AND the block type is in `VALUE_ADD_BLOCK_TYPES`, throw `UnsupportedBlockOnKernelError` — **before** any `createPythonCode`/agent codegen, so no `_dntk` string is ever generated, let alone dispatched. Plain `code` + markdown run normally on the selected kernel.
- A unit test cross-checks `VALUE_ADD_BLOCK_TYPES` coverage against the `python-code.ts:29-91` dispatcher so a new value-add type cannot silently slip through (KD-4 drift guard).

### Acceptance Criteria

- [ ] `VALUE_ADD_BLOCK_TYPES` defined beside the canonical `executableBlockTypes` (not the shim) and equals `executableBlockTypes` minus `'code'`.
- [ ] `UnsupportedBlockOnKernelError extends DeepnoteError` carries `blockType` + `kernelName` and names both in its message.
- [ ] Engine guard throws on a value-add block when the kernel is non-Python, before any codegen; `kernel.execute` is never called with a `_dntk` string for that block.
- [ ] Plain code + markdown on a non-Python kernel run to completion (mocked outputs).
- [ ] `python3` + value-add executes exactly as today (zero regression).

## Definition of Done

### Intent

A user who runs a notebook on a non-Python kernel and hits a Deepnote value-add block (SQL, visualization, DataFrame-formatting, input, or agent) gets a clear, immediate failure that names the block type and the kernel — instead of the kernel choking on alien Python RPC with an opaque parser error, or worse, silently producing a wrong result. The runtime refuses to send `_dntk` Python to a non-Python kernel. Plain code and markdown still run. If this broke, a CI author would notice either an opaque kernel-native syntax error from a SQL block on R/bash, or (the dangerous case) a green run where a value-add block was silently skipped.

### Observable outcomes

- [ ] On a non-Python kernel, a notebook whose first value-add block is SQL aborts at that block with `UnsupportedBlockOnKernelError` naming `sql` and the kernel.
- [ ] In that abort path the mocked `kernel.execute` is **never** called with a string containing `_dntk` (assert the invariant directly).
- [ ] A non-Python notebook of plain code + markdown only runs to completion against the mocked kernel (no spurious hard-fail).
- [ ] On the `python3` default, a value-add (e.g. SQL) block executes via `createPythonCode` exactly as today — the guard does not fire.
- [ ] A coverage test asserts every block type the `python-code.ts` dispatcher emits `_dntk`/Python-literal codegen for (i.e. every executable type except `code`) is a member of `VALUE_ADD_BLOCK_TYPES` — so a newly added value-add type fails the test until classified.
- [ ] **Capstone:** given a mocked non-Python kernel and a notebook `[markdown, code, sql, code]`, the run executes the markdown and the first code block, then aborts at the `sql` block with `UnsupportedBlockOnKernelError(blockType='sql', kernelName=<non-python>)`, the second code block never runs, and across the whole run no `_dntk.*` string is ever passed to `kernel.execute`; the identical notebook on `python3` runs all four blocks with the SQL block dispatched normally.

## Feature Work Phases

| Phase / Task              | Status / Link to Artifact or Card            |        Universal Check        |
| :------------------------ | :------------------------------------------- | :---------------------------: |
| **Design & Architecture** | ADR-004 + design doc KD-4                    |     - [ ] Design Complete     |
| **Test Plan Creation**    | engine + blocks unit tests                   |   - [ ] Test Plan Approved    |
| **TDD Implementation**    | blocks set/error + engine guard              | - [ ] Implementation Complete |
| **Integration Testing**   | N/A here (mocked); real kernel is step 5     | - [ ] Integration Tests Pass  |
| **Documentation**         | inline comments cite ADR-004 guard placement | - [ ] Documentation Complete  |
| **Code Review**           | gitban reviewer                              |  - [ ] Code Review Approved   |
| **Deployment Plan**       | additive; guard never fires on `python3`     |  - [ ] Deployment Plan Ready  |

## TDD Implementation Workflow

|             Step              | Status/Details                                                                                                                                                      |                     Universal Check                      |
| :---------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------: |
|  **1. Write Failing Tests**   | `execution-engine.test.ts` (non-Python + SQL → error, no `_dntk`; plain code+md → completes; python3 + value-add → as today); `VALUE_ADD_BLOCK_TYPES` coverage test |     - [ ] Failing tests are committed and documented     |
| **2. Implement Feature Code** | `executable-blocks.ts`, `errors.ts`, `execution-engine.ts`                                                                                                          |         - [ ] Feature implementation is complete         |
|   **3. Run Passing Tests**    | new tests green                                                                                                                                                     |         - [ ] Originally failing tests now pass          |
|        **4. Refactor**        | —                                                                                                                                                                   | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite**  | `pnpm test` (Python suites unchanged)                                                                                                                               |      - [ ] All tests pass (unit, integration, e2e)       |
|  **6. Performance Testing**   | N/A                                                                                                                                                                 |          - [ ] Performance requirements are met          |

### Implementation Notes

**Test Strategy:** Mocked engine + kernel. The no-`_dntk`-dispatched assertion is the load-bearing invariant — inspect the strings passed to the mocked `kernel.execute`. The coverage cross-check defends against future dispatcher drift (KD-4).

**Key Implementation Decisions:** The set is derived from existing `.type` literals (`executableBlockTypes` minus `code`) rather than a new schema field — no schema change (KD-4). Guard lives at the dispatch seam so the error is raised _before_ codegen.

```ts
export class UnsupportedBlockOnKernelError extends DeepnoteError {
  constructor(
    readonly blockType: string,
    readonly kernelName: string,
  ) {
    /* ... */
  }
}
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

| Topic                       | Status / Action Required                                                             |
| :-------------------------- | :----------------------------------------------------------------------------------- |
| **Postmortem Required?**    | No                                                                                   |
| **Further Investigation?**  | No                                                                                   |
| **Technical Debt Created?** | No                                                                                   |
| **Future Enhancements**     | Deferred opt-in `--skip-unsupported` mode (ADR-004); per-language value-add bridging |

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
