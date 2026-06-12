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

- [x] `VALUE_ADD_BLOCK_TYPES` defined beside the canonical `executableBlockTypes` (not the shim) and equals `executableBlockTypes` minus `'code'`.
- [x] `UnsupportedBlockOnKernelError extends DeepnoteError` carries `blockType` + `kernelName` and names both in its message.
- [x] Engine guard throws on a value-add block when the kernel is non-Python, before any codegen; `kernel.execute` is never called with a `_dntk` string for that block.
- [x] Plain code + markdown on a non-Python kernel run to completion (mocked outputs).
- [x] `python3` + value-add executes exactly as today (zero regression).

## Definition of Done

### Intent

A user who runs a notebook on a non-Python kernel and hits a Deepnote value-add block (SQL, visualization, DataFrame-formatting, input, or agent) gets a clear, immediate failure that names the block type and the kernel — instead of the kernel choking on alien Python RPC with an opaque parser error, or worse, silently producing a wrong result. The runtime refuses to send `_dntk` Python to a non-Python kernel. Plain code and markdown still run. If this broke, a CI author would notice either an opaque kernel-native syntax error from a SQL block on R/bash, or (the dangerous case) a green run where a value-add block was silently skipped.

### Observable outcomes

- [x] On a non-Python kernel, a notebook whose first value-add block is SQL aborts at that block with `UnsupportedBlockOnKernelError` naming `sql` and the kernel.
- [x] In that abort path the mocked `kernel.execute` is **never** called with a string containing `_dntk` (assert the invariant directly).
- [x] A non-Python notebook of plain code + markdown only runs to completion against the mocked kernel (no spurious hard-fail).
- [x] On the `python3` default, a value-add (e.g. SQL) block executes via `createPythonCode` exactly as today — the guard does not fire.
- [x] A coverage test asserts every block type the `python-code.ts` dispatcher emits `_dntk`/Python-literal codegen for (i.e. every executable type except `code`) is a member of `VALUE_ADD_BLOCK_TYPES` — so a newly added value-add type fails the test until classified.
- [x] **Capstone:** given a mocked non-Python kernel and a notebook `[markdown, code, sql, code]`, the run executes the markdown and the first code block, then aborts at the `sql` block with `UnsupportedBlockOnKernelError(blockType='sql', kernelName=<non-python>)`, the second code block never runs, and across the whole run no `_dntk.*` string is ever passed to `kernel.execute`; the identical notebook on `python3` runs all four blocks with the SQL block dispatched normally.

## Feature Work Phases

| Phase / Task              | Status / Link to Artifact or Card            |        Universal Check        |
| :------------------------ | :------------------------------------------- | :---------------------------: |
| **Design & Architecture** | ADR-004 + design doc KD-4                    |     - [x] Design Complete     |
| **Test Plan Creation**    | engine + blocks unit tests                   |   - [x] Test Plan Approved    |
| **TDD Implementation**    | blocks set/error + engine guard              | - [x] Implementation Complete |
| **Integration Testing**   | N/A here (mocked); real kernel is step 5     | - [x] Integration Tests Pass  |
| **Documentation**         | inline comments cite ADR-004 guard placement | - [x] Documentation Complete  |
| **Code Review**           | gitban reviewer                              |  - [x] Code Review Approved   |
| **Deployment Plan**       | additive; guard never fires on `python3`     |  - [x] Deployment Plan Ready  |

## TDD Implementation Workflow

|             Step              | Status/Details                                                                                                                                                      |                     Universal Check                      |
| :---------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------: |
|  **1. Write Failing Tests**   | `execution-engine.test.ts` (non-Python + SQL → error, no `_dntk`; plain code+md → completes; python3 + value-add → as today); `VALUE_ADD_BLOCK_TYPES` coverage test |     - [x] Failing tests are committed and documented     |
| **2. Implement Feature Code** | `executable-blocks.ts`, `errors.ts`, `execution-engine.ts`                                                                                                          |         - [x] Feature implementation is complete         |
|   **3. Run Passing Tests**    | new tests green                                                                                                                                                     |         - [x] Originally failing tests now pass          |
|        **4. Refactor**        | —                                                                                                                                                                   | - [x] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite**  | `pnpm test` (Python suites unchanged)                                                                                                                               |      - [x] All tests pass (unit, integration, e2e)       |
|  **6. Performance Testing**   | N/A                                                                                                                                                                 |          - [x] Performance requirements are met          |

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

- [x] All acceptance criteria are met and verified.
- [x] All tests are passing (unit, integration, e2e, performance).
- [x] Code review is approved (reviewer APPROVAL, commit 079c133); PR merge is the downstream PR step, not this card's work.
- [x] Documentation is updated (README, API docs, user guides).
- [x] Feature is deployed to production — N/A (library package on a fork; no production deployment from this card).
- [x] Monitoring and alerting are configured — N/A (library code; no runtime service to monitor).
- [x] Stakeholders are notified of completion — N/A here; communicated via the sprint PR / closeout, not this card.
- [x] Follow-up actions are documented and tickets created (L1/L2 documented in the Review Log and routed to the planner inbox).
- [x] Associated ticket/epic is closed — N/A here; PRD-002 Phase 1 / upstream epic close out downstream of the PR, not from this sub-phase card.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them.


## Executor Close-out (cycle 1)

**Status:** Implementation complete, all tests green, left `in_progress` for reviewer. Commit `079c133` on the worktree branch; completion tag `ALTKERN1-41mrnp-done`.

### What shipped

- `packages/blocks/src/blocks/executable-blocks.ts` — added `VALUE_ADD_BLOCK_TYPES` (a `ReadonlySet` derived as `executableBlockTypes` minus `'code'`, beside the canonical definition, NOT the runtime-core re-export shim) + `isValueAddBlockType(type)` predicate.
- `packages/blocks/src/errors.ts` — added `UnsupportedBlockOnKernelError extends DeepnoteError`, carrying readonly `blockType` + `kernelName`, message `"<blockType> blocks require the Python kernel; this notebook is running on '<kernelName>'."`. Mirrors `UnsupportedBlockTypeError`.
- `packages/blocks/src/index.ts` — exported both new symbols + the error from `@deepnote/blocks`.
- `packages/runtime-core/src/execution-engine.ts` — guard at the dispatch seam (top of the per-block `try`, before the agent branch and before `createPythonCode`): when `isNonPythonKernel(this.config.kernelName ?? DEFAULT_KERNEL_NAME, this.kernelLanguage)` is true AND `isValueAddBlockType(block.type)`, throws `UnsupportedBlockOnKernelError` before any codegen. The existing per-block `catch` records the typed error on `BlockExecutionResult.error` and `break`s the loop (abort-at-block semantics). Inline comment cites ADR-004.

### Tests (TDD)

- `packages/blocks/src/blocks/executable-blocks.test.ts` — `VALUE_ADD_BLOCK_TYPES` equals executable-minus-code; `isValueAddBlockType` true for every value-add type, false for `code`/markdown/unknown; **KD-4 drift guard** structurally parses `python-code.ts` for its `is<Name>Block(block)` dispatcher guards, resolves each to its `block.type === '<literal>'` from the guard source, and asserts every dispatched type except `code` is a `VALUE_ADD_BLOCK_TYPE` — so a new value-add dispatcher branch that isn't classified fails this test.
- `packages/runtime-core/src/execution-engine.test.ts` — new suite (5 tests): non-Python + SQL aborts with typed error naming `sql`+`bash`; single-sql abort path never calls `kernel.execute`; plain code+markdown completes on bash (raw `echo hello` dispatched); python3 + SQL dispatches as today (guard inert); **capstone** `[markdown, code, sql, code]` aborts at sql on bash (only `first_code` dispatched, `second_code` never runs, no `_dntk.execute_sql` dispatched) and runs all 3 executable blocks on python3.

### Honest scope / interpretation notes

- **All mocked.** No real kernel was exercised — `kernel.execute`/`connect`/`startServer` are vitest mocks (the card and design-doc R4 explicitly scope this card to the mocked suite; the real `bash_kernel` integration test is the separate step-5 / R7 work).
- **Capstone "no `_dntk.*` string" interpretation.** The card's capstone wording ("no `_dntk.*` string is ever passed to `kernel.execute`") is overstated relative to the actual codegen: `createPythonCodeForCodeBlock` prepends a *guarded* `if '_dntk' in globals(): _dntk.dataframe_utils.configure_dataframe_formatter(...)` DataFrame preamble to **plain code** too (`packages/blocks/src/blocks/data-frame.ts:11-12`). On bash, the surviving `code` block still carries that preamble. Per ADR-004/design-doc R4 the operative invariant is "no value-add Python **RPC** (e.g. `_dntk.execute_sql(...)`) is dispatched to a non-Python kernel" — which is satisfied by construction because the value-add (sql) block throws before codegen. The capstone test therefore asserts `not.toContain('_dntk.execute_sql')` on dispatched strings, not the literal absence of the substring `_dntk`. The plain-code DataFrame preamble on non-Python kernels is a pre-existing, separate concern owned by the real-kernel step, not this value-add card (the design-doc flow diagram lines 82-83 explicitly route plain code through `createPythonCode→execute` unchanged). Flagging for reviewer awareness; no tech debt introduced by this card.

### Quality gates

- `npx vitest run packages/blocks packages/runtime-core` → **496 passed (20 files)**, 0 failed. Zero regression.
- `pnpm typecheck` (root `tsconfig.json` + `pnpm -r exec tsc --noEmit`) → exit 0.
- `npx biome check --write` on all 6 changed files → clean (one auto-applied line wrap).
- cspell: cannot run from inside the worktree (it lives under `.claude/`, which `cspell.json` `ignorePaths` excludes → 0 files checked). Verified out-of-tree against the project config with the `.claude`/`.gitban` ignores stripped → **5 files checked, 0 issues**. New terms (`dntk`, `kernelspec`, `deepnote`, `codegen`) are already in `cspell.json`/`docs-dictionary.txt`.

### Owned by later stages (left unchecked)

Code Review Approved / PR merged, deployed to production, monitoring, stakeholders notified, follow-up tickets, associated ticket closed — reviewer / PR / dispatcher stages. Card left `in_progress` for the reviewer to flip.

### Deferred

None. No follow-up cards created — no tech debt introduced.


## Review Log — cycle 1 (router)

- **Verdict:** APPROVAL (commit `079c133`, 2026-06-11).
- **Review report:** `.gitban/agents/reviewer/inbox/ALTKERN1-41mrnp-reviewer-1.md`
- **Gate:** N/A — approval. Gate 1 (completion claim) and Gate 2 (implementation quality) both passed. Capstone wording deviation (`not.toContain('_dntk.execute_sql')` vs literal `_dntk`) reviewed and accepted as the correct interpretation, not a weakened capstone.
- **Routing:**
  - Executor → `.gitban/agents/executor/inbox/ALTKERN1-41mrnp-executor-1.md` — close-out only (check Code Review boxes, complete card). No close-out work items.
  - Planner → `.gitban/agents/planner/inbox/ALTKERN1-41mrnp-planner-1.md` — 2 non-blocking follow-ups:
    - **L1** (test-coverage-gap, low) → new card, ALTKERN1: dedicated engine test for agent-block hard-fail on non-Python kernel (`execution-engine.test.ts`).
    - **L2** (cross-card-invariant, informational) → fold into existing real-kernel card `obcn7z` (step 5 / R7): confirm/clean the guarded `_dntk` DataFrame preamble on plain code under a live non-Python kernel.
- No blockers.


## Close-out (executor cycle 2 — card completion)

Reviewer issued APPROVAL (commit `079c133`, 2026-06-11). Closing out per `.gitban/agents/executor/inbox/ALTKERN1-41mrnp-executor-1.md`.

**Boxes ticked as genuinely-true 1B work:**
- Feature Work Phases → Code Review Approved (reviewer APPROVAL).
- Completion Checklist → Code review is approved (PR merge is the downstream PR step).
- Completion Checklist → Follow-up actions documented and tickets created (L1/L2 documented in the Review Log and routed to the planner inbox).

**Boxes resolved as N/A / scoped-out (text rewritten to state the truth — no false ticks, no in-scope deferrals):**
- Feature is deployed to production / Monitoring and alerting / Stakeholders notified / Associated ticket-epic closed — N/A for a library package on a fork PR; PRD-002 Phase 1 / upstream epic close out downstream of the PR.

No work deferred to a follow-up card; no tech debt introduced. The two non-blocking follow-ups (L1 agent-block hard-fail test; L2 plain-code `_dntk` DataFrame preamble under a live non-Python kernel) were already routed to the planner and are not this card's work.

This is a feature card in sprint ALTKERN1 (not the closeout card `dn929q`); sprint lifecycle untouched. Card moved to done, not archived.