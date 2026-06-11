# step 2: Sub-phase 1A — thread kernelName + selectKernelName + --kernel flag + pre-flight + typed errors

> Foundational. Maps to design-doc **Sub-phase 1A**. All mocked — runs in the existing Node CI. Precedes the degradation cards (3A/3B) and the failure-category card (4). Depends on: step 1 (planning).
> Implements PRD-002 Phase 1 / ADR-002 (R1, R2, KD-2, KD-3, KD-7, KD-8) + ADR-003 (R3, KD-1).

## Feature Overview & Context

- **Associated Ticket/Epic:** PRD-002 Phase 1; roadmap `m2/s5/alternative-kernels/phase1-implementation`; upstream epic #162 / issue #154
- **Feature Area/Component:** `@deepnote/runtime-core` (kernel client, config, selectors, typed errors) + `@deepnote/cli` (`--kernel` flag)
- **Target Release/Milestone:** ALTKERN1 sub-phase 1A

**Required Checks:**

- [x] **Associated Ticket/Epic** link is included above.
- [x] **Feature Area/Component** is identified.
- [x] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

- [x] Design doc reviewed — Sub-phase 1A deliverables + test strategy.
- [x] ADR-002 (launch model), ADR-003 (selection) reviewed.
- [x] Existing `selectPythonSpec` pattern reviewed — the isomorphic shape to mirror.
- [x] `kernel-client.ts` connect/idle seams reviewed.

### Required Reading

| Document Type             | Link / Location                                                                                      | Key Findings / Action Required                                                                                                                                          |
| :------------------------ | :--------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Design doc 1A**         | `docs/designs/phase1-alternative-language-kernels.md` (Sub-phase 1A; Interface Design; KD-1/2/3/7/8) | The binary DoD for this card.                                                                                                                                           |
| **ADR-002**               | `docs/adr/ADR-002-non-python-kernel-launch-model.md`                                                 | Thread name, skip pre-flight for literal `python3`, GET-failure falls back to readiness, configurable/kernel-aware timeout.                                             |
| **ADR-003**               | `docs/adr/ADR-003-kernel-name-selection.md`                                                          | `explicit ?? declared ?? 'python3'`; pure selector; no env read; `DEEPNOTE_KERNEL` deferred (documented, not built).                                                    |
| **RuntimeConfig**         | `packages/runtime-core/src/types.ts:3-12`                                                            | Add `kernelName?: string` (default `'python3'`) and `kernelStartupTimeoutMs?: number` (default 30000).                                                                  |
| **KernelClient.connect**  | `packages/runtime-core/src/kernel-client.ts:55,74-79`                                                | Hardcoded `kernel: { name: 'python3' }` at `:78`; `connect(serverUrl)` takes no kernel. Add `connect(serverUrl, kernelName = 'python3'): Promise<string \| undefined>`. |
| **waitForKernelIdle**     | `packages/runtime-core/src/kernel-client.ts:97,110`                                                  | `timeoutMs = 30000` hardcoded; `'Kernel is dead'` bare error at `:110`.                                                                                                 |
| **JSON-WS factory**       | `packages/runtime-core/src/kernel-client.ts:18-41`                                                   | Unchanged; the transport reused for any kernel.                                                                                                                         |
| **ExecutionEngine.start** | `packages/runtime-core/src/execution-engine.ts:113-127`                                              | `startServer(...)` then `new KernelClient()` + `kernel.connect(this.server.url)`; forward `config.kernelName`; store returned language on a private field.              |
| **selectPythonSpec**      | `packages/runtime-core/src/python-env.ts:160-162`                                                    | Pure precedence shape `selectKernelName` mirrors.                                                                                                                       |
| **CLI run options**       | `packages/cli/src/cli.ts:274`; `packages/cli/src/commands/run.ts:79-95`                              | `--python` defined at `cli.ts:274`; `RunOptions:79-95` has no kernel field. Add `--kernel <name>` and `kernel?: string`.                                                |
| **Engine instantiation**  | `packages/cli/src/commands/run.ts` (RuntimeConfig built with `{ pythonEnv, workingDirectory }`)      | Add `kernelName` from `selectKernelName({ explicit: options.kernel })`; echo resolved kernel in human output.                                                           |
| **Test mocks**            | `kernel-client.test.ts`, `execution-engine.test.ts` (mock `@jupyterlab/services`, `startServer`)     | Extend; add a mocked `fetch` for `/api/kernelspecs`.                                                                                                                    |

## Design & Planning

### Initial Design Thoughts & Requirements

- New file `packages/runtime-core/src/kernel-name.ts`: `DEFAULT_KERNEL_NAME = 'python3'`, pure `selectKernelName({ explicit, declared }): string` (whitespace-trim → absent; `explicit ?? declared ?? DEFAULT_KERNEL_NAME`), and `isNonPythonKernel(kernelName, language?): boolean` (name-based Phase-1 path; `language` optional refinement). Exported from `index.ts`. Doc comment records the deferred `DEEPNOTE_KERNEL` tier (ADR-003) — documented, not built.
- New file `packages/runtime-core/src/kernel-errors.ts`: `KernelspecSummary`, and the typed family each with a literal `category` discriminant — `KernelNotRegisteredError` (`category='missing-kernel'`, carries `requested` + `available: KernelspecSummary[]`, listing message), `KernelLaunchError` (`category='kernel-launch'`, wraps cause), `KernelDiedError` (`category='kernel-died'`, thrown in **both** death paths: by `waitForKernelIdle` in place of the bare `'Kernel is dead'` at `:110` (startup/idle-wait death) **and** by the `execute`/IOPub path when the kernel transitions to `dead` mid-execution — so a mid-run death surfaces as a typed `KernelDiedError` _instance_ on `BlockExecutionResult.error`, which card `qajbsg` (step 4) relies on to distinguish `kernel-died` from `in-block`). Export `KernelFailureCategory` union. Exported from `index.ts`.
- `KernelClient.connect(serverUrl, kernelName = 'python3'): Promise<string | undefined>`: for non-`python3` names, `preflightKernelspec` issues `GET {serverUrl}/api/kernelspecs`; absent name → throw `KernelNotRegisteredError` **before** `startNew`/POST; GET itself failing → return `undefined` and fall through to existing readiness; registered name → return `spec.spec.language`. Pass `kernel: { name: kernelName }` to `startNew` (replaces literal at `:78`); wrap `startNew` rejection in `KernelLaunchError`. `waitForKernelIdle(this.config.kernelStartupTimeoutMs ?? 30000)` — configurable (KD-7). `python3` default skips the GET entirely (KD-2) and returns `undefined`.
- `ExecutionEngine` forwards `config.kernelName` to `connect` and stores the returned language on a private `kernelLanguage` field (consumed by the per-block guard in step 3A).
- **KD-7 deferral:** the user-facing `--kernel-timeout` CLI flag is NOT built in Phase 1; `kernelStartupTimeoutMs` is config-only. A unit test still asserts a non-default value threads into `waitForKernelIdle`.

### Acceptance Criteria

- [x] `RuntimeConfig.kernelName?: string` (JSDoc: default `'python3'`, sibling of `pythonEnv`) and `kernelStartupTimeoutMs?: number` (default 30000) added.
- [x] `selectKernelName` is pure (no I/O, no env read) and `isNonPythonKernel` honors the `python3` fast-path + optional `language` refinement.
- [x] `KernelClient.connect(serverUrl, kernelName?)` passes `{ name: kernelName }` to `startNew` and returns the resolved kernelspec language (or `undefined` for the `python3`/failed-GET path).
- [x] Pre-flight throws `KernelNotRegisteredError` before any POST for an unregistered explicit name; skipped for `python3`; GET failure falls back to readiness.
- [x] `KernelClient`'s `execute`/IOPub path throws `KernelDiedError` (not a bare `Error`) on mid-execution kernel death, so the typed instance reaches `BlockExecutionResult.error` — the live contract card `qajbsg` (step 4) needs to keep `kernel-died` distinct from `in-block` in production, not just against mocks.
- [x] `--kernel <name>` option on `run`; `selectKernelName({ explicit: options.kernel })` feeds `RuntimeConfig.kernelName`; resolved kernel echoed in human output.
- [x] Existing Python-path mocked suites pass unchanged; default resolves to `python3` and skips the GET.

## Definition of Done

### Intent

A user (or programmatic caller) can tell the runtime which Jupyter kernel to launch instead of always getting Python. When they pass `--kernel bash`, the CLI echoes the resolved kernel and the runtime starts a `bash` session against the same toolkit server; when they pass nothing, everything behaves exactly as today (`python3`, no extra network round-trip). If they ask for a kernel that isn't installed, they get a clear typed error naming the kernel and listing what is installed — never the server's opaque 500. If this broke, a developer would notice either that `--kernel` is silently ignored (still runs Python) or that the Python default suddenly does an extra `/api/kernelspecs` GET it never did before.

### Observable outcomes

- [x] `selectKernelName({ explicit: 'foo' })` returns `'foo'`; `selectKernelName({})` returns `'python3'`; whitespace-only `explicit` falls through to `'python3'`.
- [x] Setting `process.env.DEEPNOTE_PYTHON` does not change `selectKernelName`'s result (proves no env read).
- [x] `isNonPythonKernel('python3')` is `false`; `isNonPythonKernel('bash')` is `true`; `isNonPythonKernel('xeus', 'python')` is `false` (language refinement wins).
- [x] With mocked `@jupyterlab/services`, `connect(url, 'python3')` does NOT call the `/api/kernelspecs` fetch (assert fetch not called) and resolves `undefined`.
- [x] `connect(url, 'bash')` against a mocked kernelspecs map containing `bash` calls `startNew` with `kernel: { name: 'bash' }` and resolves the kernelspec language; against a map WITHOUT `bash`, it throws `KernelNotRegisteredError` and `startNew` is NOT called.
- [x] `connect(url, 'bash')` when the kernelspecs GET rejects falls through (no `KernelNotRegisteredError`) and resolves `undefined`; a `startNew` rejection surfaces as `KernelLaunchError`.
- [x] When the kernel transitions to `dead` during a pending `execute()` (mid-run death, mocked via the IOPub/status path), the failure is a `KernelDiedError` _instance_ (not a bare `Error`) — proving the real mid-run path emits the typed class card `qajbsg` reads, so its `kernel-died`-vs-`in-block` capstone holds against the live transport and not only a hand-constructed mock.
- [x] A non-default `kernelStartupTimeoutMs` on `RuntimeConfig` is forwarded into `waitForKernelIdle` (asserted via mock).
- [x] **Capstone:** with `@jupyterlab/services` and the kernelspecs `fetch` mocked, invoking the CLI run path with `--kernel bash` resolves `kernelName='bash'`, echoes "Resolved kernel: bash" in human output, and drives `SessionManager.startNew` with `kernel: { name: 'bash' }` (not `'python3'`) — while the same path with no `--kernel` resolves `'python3'`, performs no kernelspecs GET, and starts a `python3` session byte-identically to today.
- [x] No capstone applicable to the pure `kernel-name.ts` functions in isolation: they are covered by the truth-table observables above; the composed thread is covered by the capstone.

## Feature Work Phases

| Phase / Task              | Status / Link to Artifact or Card                |        Universal Check        |
| :------------------------ | :----------------------------------------------- | :---------------------------: |
| **Design & Architecture** | ADR-002/003 + design doc 1A                      |     - [x] Design Complete     |
| **Test Plan Creation**    | unit suites listed in Implementation Notes       |   - [x] Test Plan Approved    |
| **TDD Implementation**    | runtime-core + cli changes                       | - [x] Implementation Complete |
| **Integration Testing**   | N/A here (mocked); real kernel is step 5         | - [ ] Integration Tests Pass  |
| **Documentation**         | JSDoc + selector doc comment (deferred env tier) | - [x] Documentation Complete  |
| **Code Review**           | gitban reviewer                                  |  - [ ] Code Review Approved   |
| **Deployment Plan**       | additive; default `python3` byte-stable          |  - [x] Deployment Plan Ready  |

## TDD Implementation Workflow

|             Step              | Status/Details                                                                                                              |                     Universal Check                      |
| :---------------------------: | :-------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------: |
|  **1. Write Failing Tests**   | `kernel-name.test.ts`; extend `kernel-client.test.ts` (mock fetch for `/api/kernelspecs`) + `execution-engine.test.ts`      |     - [x] Failing tests are committed and documented     |
| **2. Implement Feature Code** | `types.ts`, `kernel-name.ts`, `kernel-errors.ts`, `kernel-client.ts`, `execution-engine.ts`, `index.ts`, `cli.ts`, `run.ts` |         - [x] Feature implementation is complete         |
|   **3. Run Passing Tests**    | new unit tests green                                                                                                        |         - [x] Originally failing tests now pass          |
|        **4. Refactor**        | —                                                                                                                           | - [x] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite**  | `pnpm test` (mocked Python suites unchanged)                                                                                |      - [ ] All tests pass (unit, integration, e2e)       |
|  **6. Performance Testing**   | N/A (one cheap GET only on explicit non-python3)                                                                            |          - [x] Performance requirements are met          |

### Implementation Notes

**Test Strategy:** All mocked (existing CI). `kernel-name.test.ts` covers the selector + `isNonPythonKernel` truth table including the `DEEPNOTE_PYTHON`-no-effect assertion. `kernel-client.test.ts` extends the `@jupyterlab/services` mock and adds a mocked `fetch` for `/api/kernelspecs` to cover: python3 skips GET; registered name → startNew + language returned; absent name → `KernelNotRegisteredError` before POST; GET-reject → fall-through `undefined`; startNew-reject → `KernelLaunchError`; timeout forwarding. `execution-engine.test.ts` asserts `kernelName` forwarded to mock `connect`, returned language stored, default still `python3`.

**Key Implementation Decisions:** `selectKernelName` is a separate pure resolver (KD-1), not an overload of `selectPythonSpec`. Phase-1 guard predicate is name-based; `language` is captured-but-forward-looking (KD-3). Pre-flight skipped for literal `python3` (KD-2).

```ts
async connect(serverUrl: string, kernelName: string = 'python3'): Promise<string | undefined>
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

| Topic                       | Status / Action Required                                                          |
| :-------------------------- | :-------------------------------------------------------------------------------- |
| **Postmortem Required?**    | No                                                                                |
| **Further Investigation?**  | No                                                                                |
| **Technical Debt Created?** | No — `--kernel-timeout` flag deferred per KD-7 (documented, not debt)             |
| **Future Enhancements**     | Phase 2 declared-language tier; Phase 3 `--list-kernels`; `--kernel-timeout` flag |

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


## Close-out (executor cycle 1)

**Status:** Implementation complete; left `in_progress` for the gitban reviewer. All Sub-phase 1A deliverables shipped, all unit suites green, typecheck/biome/prettier clean.

### What shipped (commits `0fdf19e`, `80a2bf8`)

- **`packages/runtime-core/src/types.ts`** — `RuntimeConfig.kernelName?: string` (JSDoc default `'python3'`, sibling of `pythonEnv`) + `kernelStartupTimeoutMs?: number` (default 30000) (R1).
- **`packages/runtime-core/src/kernel-name.ts`** (new) — `DEFAULT_KERNEL_NAME`, pure `selectKernelName({explicit, declared})` (`explicit ?? declared ?? python3`, whitespace-trim→absent, no env read; deferred `DEEPNOTE_KERNEL` tier documented per ADR-003), `isNonPythonKernel(name, language?)` (python3 fast-path + optional language refinement). Exported from `index.ts` (R3/KD-1/KD-3).
- **`packages/runtime-core/src/kernel-errors.ts`** (new) — `KernelspecSummary`, `KernelFailureCategory` union, and `KernelNotRegisteredError`/`KernelLaunchError`/`KernelDiedError`, each with a literal `category` discriminant (R2/R6/KD-8). Exported from `index.ts`.
- **`packages/runtime-core/src/kernel-client.ts`** — `connect(serverUrl, kernelName='python3'): Promise<string | undefined>`; `preflightKernelspec` issues `GET {serverUrl}/api/kernelspecs` for non-`python3` names (skipped for `python3`, KD-2), throws `KernelNotRegisteredError` **before** `startNew` for an absent name, returns `undefined` (fall-through) when the GET rejects or returns non-ok; `startNew` rejection wrapped in `KernelLaunchError`; `waitForKernelIdle` now uses the configurable `kernelStartupTimeoutMs` (KD-7) and throws typed `KernelDiedError`. `execute()` subscribes to `kernel.statusChanged` and rejects with a typed `KernelDiedError` on mid-run death (and on a future rejection while the kernel is `dead`) — the live-transport contract card `qajbsg` depends on.
- **`packages/runtime-core/src/execution-engine.ts`** — passes `kernelStartupTimeoutMs` into `new KernelClient(...)`, forwards `config.kernelName` to `connect`, stores the returned language on a private field exposed via `get kernelLanguageName()` (the seam card 3A's guard reads — KD-3).
- **`packages/cli/src/cli.ts`** — `--kernel <name>` option on `run`, beside `--python`.
- **`packages/cli/src/commands/run.ts`** — `RunOptions.kernel?: string`; `selectKernelName({ explicit: options.kernel })` resolves `kernelName` in `setupProject`, echoes `Resolved kernel: <name>` in human output (suppressed in machine mode), threads `kernelName` into the `ExecutionEngine` `RuntimeConfig`.
- **`cspell.json`** — added code terms `ECONNREFUSED`, `lumino`, `preflight`, `xeus` (`kernelspecs`/`kernelspec`/`iopub` already present).

### What the tests actually proved (all mocked — runs in the existing Node CI)

- `kernel-name.test.ts` (14 tests): selector truth table incl. whitespace fall-through, explicit-beats-declared, and the **`DEEPNOTE_PYTHON`-set-no-effect** assertion (proves no env read); `isNonPythonKernel` python3 fast-path + language refinement (`xeus`+`python` → false).
- `kernel-client.test.ts` (33 tests): `python3` skips the kernelspecs GET (**asserts `fetch` not called**) and resolves `undefined`; registered `bash` → `startNew({kernel:{name:'bash'}})` + resolves language; absent name → `KernelNotRegisteredError` with **`startNew` NOT called**; GET-reject and non-ok → fall-through `undefined`; `startNew` rejection → `KernelLaunchError`; non-default `kernelStartupTimeoutMs` forwarded into `waitForKernelIdle` (asserts `within 5000ms`); startup death → typed `KernelDiedError`; **mid-run death during a pending `execute()` → `KernelDiedError` instance** + subscription torn down; future-reject-while-dead → `KernelDiedError`, future-reject-while-alive → underlying error.
- `execution-engine.test.ts` (86 tests, incl. new): `connect` called with `(url, undefined)` for the default and `(url, 'bash')` when `kernelName` set; returned language stored (`kernelLanguageName === 'bash'`), `undefined` for python3; `kernelStartupTimeoutMs` forwarded to `KernelClient`.
- `run.test.ts` (168 tests, incl. new "kernel selection" describe): the **CLI capstone** — `--kernel bash` resolves `kernelName='bash'` into the engine config and echoes `Resolved kernel: bash`; no flag → `python3` echo; whitespace `--kernel` → python3; machine mode suppresses the echo; `DEEPNOTE_PYTHON` does not affect kernel selection. The runtime-core suite separately proves `connect` → `SessionManager.startNew({kernel:{name}})`, so the composed thread (CLI→config→engine→connect→startNew) is covered across the two layers.

**Honest scope:** All assertions are against mocks (`@jupyterlab/services`, `startServer`, mocked `fetch`, mocked `ExecutionEngine` at the CLI layer) — the existing CI reality. The real-kernel end-to-end (R7: bash kernel returns an `image/png` via the live transport) is **out of scope for this card** and owned by **Sub-phase 1C** (the dedicated Python-provisioning CI job). The `ExecutionEngine` mock at the CLI layer cannot reach `SessionManager.startNew`; the `startNew` assertion is proven in the runtime-core layer instead.

### Verification

`pnpm vitest run` on the 4 affected suites: **301 passed, 0 failed.** `pnpm typecheck` exit 0. `pnpm biome:check` / `pnpm lintAndFormat` exit 0 (2 pre-existing warnings in unrelated agent MCP code). `pnpm prettier:check` clean. `pnpm spell-check` cannot collect files inside the worktree (`.claude/**` is in cspell `ignorePaths`); the four added cspell terms make the source files clean once merged back to `sprint/ALTKERN1` outside `.claude/`.

### Deferred / not mine to check (left unticked)

- **Feature Work Phases → Integration Tests Pass**: N/A for this mocked card; real kernel is Sub-phase 1C.
- **Feature Work Phases → Code Review Approved** and **Completion Checklist → Code review approved and PR is merged**: owned by the gitban reviewer / PR step.
- **TDD → All tests pass (unit, integration, e2e)**: unit scope is green; integration/e2e is Sub-phase 1C's scope.
- **Completion Checklist → deployed to production / monitoring / stakeholders notified / epic closed**: N/A (library; fork PR) or downstream of review.

No follow-up cards created — no deferred in-scope work and no tech debt introduced (the `--kernel-timeout` CLI flag is a documented KD-7 deferral, not debt).
