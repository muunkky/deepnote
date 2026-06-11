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

- [ ] `RuntimeConfig.kernelName?: string` (JSDoc: default `'python3'`, sibling of `pythonEnv`) and `kernelStartupTimeoutMs?: number` (default 30000) added.
- [ ] `selectKernelName` is pure (no I/O, no env read) and `isNonPythonKernel` honors the `python3` fast-path + optional `language` refinement.
- [ ] `KernelClient.connect(serverUrl, kernelName?)` passes `{ name: kernelName }` to `startNew` and returns the resolved kernelspec language (or `undefined` for the `python3`/failed-GET path).
- [ ] Pre-flight throws `KernelNotRegisteredError` before any POST for an unregistered explicit name; skipped for `python3`; GET failure falls back to readiness.
- [ ] `KernelClient`'s `execute`/IOPub path throws `KernelDiedError` (not a bare `Error`) on mid-execution kernel death, so the typed instance reaches `BlockExecutionResult.error` — the live contract card `qajbsg` (step 4) needs to keep `kernel-died` distinct from `in-block` in production, not just against mocks.
- [ ] `--kernel <name>` option on `run`; `selectKernelName({ explicit: options.kernel })` feeds `RuntimeConfig.kernelName`; resolved kernel echoed in human output.
- [ ] Existing Python-path mocked suites pass unchanged; default resolves to `python3` and skips the GET.

## Definition of Done

### Intent

A user (or programmatic caller) can tell the runtime which Jupyter kernel to launch instead of always getting Python. When they pass `--kernel bash`, the CLI echoes the resolved kernel and the runtime starts a `bash` session against the same toolkit server; when they pass nothing, everything behaves exactly as today (`python3`, no extra network round-trip). If they ask for a kernel that isn't installed, they get a clear typed error naming the kernel and listing what is installed — never the server's opaque 500. If this broke, a developer would notice either that `--kernel` is silently ignored (still runs Python) or that the Python default suddenly does an extra `/api/kernelspecs` GET it never did before.

### Observable outcomes

- [ ] `selectKernelName({ explicit: 'foo' })` returns `'foo'`; `selectKernelName({})` returns `'python3'`; whitespace-only `explicit` falls through to `'python3'`.
- [ ] Setting `process.env.DEEPNOTE_PYTHON` does not change `selectKernelName`'s result (proves no env read).
- [ ] `isNonPythonKernel('python3')` is `false`; `isNonPythonKernel('bash')` is `true`; `isNonPythonKernel('xeus', 'python')` is `false` (language refinement wins).
- [ ] With mocked `@jupyterlab/services`, `connect(url, 'python3')` does NOT call the `/api/kernelspecs` fetch (assert fetch not called) and resolves `undefined`.
- [ ] `connect(url, 'bash')` against a mocked kernelspecs map containing `bash` calls `startNew` with `kernel: { name: 'bash' }` and resolves the kernelspec language; against a map WITHOUT `bash`, it throws `KernelNotRegisteredError` and `startNew` is NOT called.
- [ ] `connect(url, 'bash')` when the kernelspecs GET rejects falls through (no `KernelNotRegisteredError`) and resolves `undefined`; a `startNew` rejection surfaces as `KernelLaunchError`.
- [ ] When the kernel transitions to `dead` during a pending `execute()` (mid-run death, mocked via the IOPub/status path), the failure is a `KernelDiedError` _instance_ (not a bare `Error`) — proving the real mid-run path emits the typed class card `qajbsg` reads, so its `kernel-died`-vs-`in-block` capstone holds against the live transport and not only a hand-constructed mock.
- [ ] A non-default `kernelStartupTimeoutMs` on `RuntimeConfig` is forwarded into `waitForKernelIdle` (asserted via mock).
- [ ] **Capstone:** with `@jupyterlab/services` and the kernelspecs `fetch` mocked, invoking the CLI run path with `--kernel bash` resolves `kernelName='bash'`, echoes "Resolved kernel: bash" in human output, and drives `SessionManager.startNew` with `kernel: { name: 'bash' }` (not `'python3'`) — while the same path with no `--kernel` resolves `'python3'`, performs no kernelspecs GET, and starts a `python3` session byte-identically to today.
- [ ] No capstone applicable to the pure `kernel-name.ts` functions in isolation: they are covered by the truth-table observables above; the composed thread is covered by the capstone.

## Feature Work Phases

| Phase / Task              | Status / Link to Artifact or Card                |        Universal Check        |
| :------------------------ | :----------------------------------------------- | :---------------------------: |
| **Design & Architecture** | ADR-002/003 + design doc 1A                      |     - [ ] Design Complete     |
| **Test Plan Creation**    | unit suites listed in Implementation Notes       |   - [ ] Test Plan Approved    |
| **TDD Implementation**    | runtime-core + cli changes                       | - [ ] Implementation Complete |
| **Integration Testing**   | N/A here (mocked); real kernel is step 5         | - [ ] Integration Tests Pass  |
| **Documentation**         | JSDoc + selector doc comment (deferred env tier) | - [ ] Documentation Complete  |
| **Code Review**           | gitban reviewer                                  |  - [ ] Code Review Approved   |
| **Deployment Plan**       | additive; default `python3` byte-stable          |  - [ ] Deployment Plan Ready  |

## TDD Implementation Workflow

|             Step              | Status/Details                                                                                                              |                     Universal Check                      |
| :---------------------------: | :-------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------: |
|  **1. Write Failing Tests**   | `kernel-name.test.ts`; extend `kernel-client.test.ts` (mock fetch for `/api/kernelspecs`) + `execution-engine.test.ts`      |     - [ ] Failing tests are committed and documented     |
| **2. Implement Feature Code** | `types.ts`, `kernel-name.ts`, `kernel-errors.ts`, `kernel-client.ts`, `execution-engine.ts`, `index.ts`, `cli.ts`, `run.ts` |         - [ ] Feature implementation is complete         |
|   **3. Run Passing Tests**    | new unit tests green                                                                                                        |         - [ ] Originally failing tests now pass          |
|        **4. Refactor**        | —                                                                                                                           | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite**  | `pnpm test` (mocked Python suites unchanged)                                                                                |      - [ ] All tests pass (unit, integration, e2e)       |
|  **6. Performance Testing**   | N/A (one cheap GET only on explicit non-python3)                                                                            |          - [ ] Performance requirements are met          |

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
