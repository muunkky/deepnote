# step 5: Sub-phase 1C — real-kernel integration test + CI IaC job + docs (headline)

> Maps to design-doc **Sub-phase 1C** — the headline. TDD: write the failing integration test first. This card ships the sprint's headline value (a real non-Python kernel running end-to-end through the CLI) plus the provisioning IaC that makes it runnable. Depends on: step 2 (1A) + step 3A + step 3B + step 4 (the full thread + degradation + failure categories must exist for the e2e and the real missing-kernel assertion to pass).
> Implements PRD-002 headline launch criterion / R7 + R8 (KD-9) + R2/R6 against the real server.

## Feature Overview & Context

- **Associated Ticket/Epic:** PRD-002 Phase 1 headline; roadmap `m2/s5/alternative-kernels/phase1-implementation`; upstream issue #154
- **Feature Area/Component:** `@deepnote/cli` integration test + root vitest config + `.github/workflows/ci.yml` (new `integration-kernels` job) + `cspell.json` + `docs/running-your-own-kernel.md`
- **Target Release/Milestone:** ALTKERN1 sub-phase 1C

**Required Checks:**

- [x] **Associated Ticket/Epic** link is included above.
- [x] **Feature Area/Component** is identified.
- [x] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

- [x] `README.md` or project documentation reviewed.
- [x] Existing architecture documentation or ADRs reviewed.
- [x] Related feature implementations or similar code reviewed.
- [x] API documentation or interface specs reviewed [if applicable].

| Document Type                | Link / Location                                                                                      | Key Findings / Action Required                                                                                                                                                                            |
| :--------------------------- | :--------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Design doc 1C**            | `docs/designs/phase1-alternative-language-kernels.md` (Sub-phase 1C; KD-9; R7/R8)                    | Binary DoD; the headline; the separate vitest project + `exclude` glob; the CI IaC recipe.                                                                                                                |
| **ADR-002 validation**       | `docs/adr/ADR-002-non-python-kernel-launch-model.md` (Validation; spike)                             | bash kernelspec hosts/launches via the toolkit server; unknown kernel → opaque 500 the pre-flight must beat; binary-MIME confirms the JSON-only fallback.                                                 |
| **Spike harness**            | `docs/spikes/nom-002/` (`probe.py`, `SPIKE-FINDINGS.md`, `RESULTS.md`)                               | Reuse the venv recipe: `python3 -m venv; pip install "deepnote-toolkit[server]" bash_kernel jinja2; python -m bash_kernel.install --sys-prefix`.                                                          |
| **JSON-WS fallback / IOPub** | `packages/runtime-core/src/kernel-client.ts:18-41`                                                   | The e2e exercises this against a binary-output (`image/png`) kernel.                                                                                                                                      |
| **Default vitest config**    | root `vitest.config.ts` (`include: ['**/*.test.ts']`, `bail: 1`, no `exclude`)                       | Add `exclude: ['**/*.integration.test.ts']` so `pnpm test` does NOT collect integration files (KD-9 — config DOES change).                                                                                |
| **CI workflow**              | `.github/workflows/ci.yml` (Node-only today; `cli-e2e` at `:198-228` runs only `--version`/`--help`) | Add a new `integration-kernels` job with `actions/setup-python`, venv provisioning, pip cache keyed on the toolkit pin, `RUN_INTEGRATION_TESTS=true`, `--python` → `.venv`, then `pnpm test:integration`. |
| **cspell**                   | `cspell.json` (`kernelspec` at `:75`, `iopub` at `:66` already present)                              | Add ONLY the genuinely-missing terms: `bash_kernel`, `kernelName`, `kernelspecs`, `IJulia`, `IRkernel`. Do NOT re-add `kernelspec`/`iopub`.                                                               |
| **#154 answer doc**          | `docs/running-your-own-kernel.md`                                                                    | Add the in-repo OSS answer: which languages run, install/register step, value-add hard-fail + reactivity-bypass behavior, the `--kernel` Phase-1 surface.                                                 |

## Design & Planning

### Initial Design Thoughts & Requirements

**IaC (Infrastructure as Code) — explicit, because CI does this nowhere today:**

- New `integration-kernels` job in `.github/workflows/ci.yml`: `actions/setup-python`; `python3 -m venv .venv && .venv/bin/pip install "deepnote-toolkit[server]==2.3.1" "bash_kernel==0.10.0" jinja2 && .venv/bin/python -m bash_kernel.install --sys-prefix`; the pin is the **NOM-002 spike-validated** version (`deepnote-toolkit[server]==2.3.1`, `bash_kernel==0.10.0` — recorded in `docs/spikes/nom-002/RESULTS.md`); record any future bump in the closeout/CHANGELOG; cache pip via `actions/cache` keyed on the pin; set `RUN_INTEGRATION_TESTS=true`; point `--python` at `.venv`; run `pnpm test:integration`. This is the ONLY place real-kernel execution runs; the always-on mocked `test` job is untouched except for the `exclude` glob.
- New `vitest.integration.config.ts` including only `**/*.integration.test.ts`; new `test:integration` script (`vitest run -c vitest.integration.config.ts`). The default `vitest.config.ts` gains `exclude: ['**/*.integration.test.ts']` (KD-9). `RUN_INTEGRATION_TESTS=true` is a defense-in-depth runtime gate (so a contributor without Python self-skips), NOT the collection-exclusion mechanism.

**Integration tests (TDD — write the failing test first):**

- `packages/cli/test-integration/non-python-kernel.integration.test.ts`: builds the CLI, provisions/locates the `bash_kernel` venv, runs the **real** `deepnote run --kernel bash <fixture>.deepnote` against the **real** `deepnote-toolkit` server, and asserts a non-`text/plain` MIME bundle (`image/png`) comes back.
- A `bash` fixture notebook (code + markdown) that emits an `image/png` `display_data`.
- Second integration test: `--kernel no_such_kernel --output json` produces `failureCategory: "missing-kernel"` with `KernelNotRegisteredError`'s typed listing message and **never an opaque 500** (R2 + R6 site (a) against the real server).
- Third integration test: the `python3` path still runs the existing example fixture green (regression, real server).

### Acceptance Criteria

- [ ] Default `vitest.config.ts` gains `exclude: ['**/*.integration.test.ts']`; `pnpm test` still green and does NOT collect integration files.
- [ ] `vitest.integration.config.ts` + `test:integration` script exist; collect only `**/*.integration.test.ts`.
- [ ] `integration-kernels` CI job provisions Python + pinned `deepnote-toolkit[server]` + `bash_kernel` and runs `pnpm test:integration`.
- [ ] cspell gains exactly `bash_kernel`, `kernelName`, `kernelspecs`, `IJulia`, `IRkernel` (no re-adds of `kernelspec`/`iopub`); `pnpm spell-check` passes.
- [ ] `docs/running-your-own-kernel.md` carries the in-repo #154 answer.
- [ ] The bash e2e, the real missing-kernel assertion, and the python3 regression all pass in the `integration-kernels` job.

## Definition of Done

### Intent

A polyglot data scientist can run their non-Python notebook through the Deepnote CLI and actually get outputs back — and we can prove it, in CI, against a real Jupyter kernel rather than a mock. The headline proof is a `bash` notebook that produces an image, run end-to-end through `deepnote run --kernel bash`, returning an `image/png` MIME bundle — which only works if the kernel name threading, the JSON-only WebSocket transport, and the IOPub binary decode all work together against the real toolkit server. The same job also proves that asking for an uninstalled kernel produces the clean typed "not registered, here's what is" message instead of the server's opaque 500. If this broke, the headline launch criterion would be unverifiable and a regression in any of the threaded layers could ship undetected because the mocked suite can't see the real transport.

### Observable outcomes

- [ ] The default mocked `pnpm test` remains green with only the `exclude` glob added (integration files not collected).
- [ ] `pnpm test:integration` collects only `*.integration.test.ts` and self-skips (does not hard-fail) when `RUN_INTEGRATION_TESTS` is unset and no venv is present.
- [ ] The `integration-kernels` CI job provisions the pinned toolkit + `bash_kernel` venv and runs the integration suite.
- [ ] `pnpm spell-check` passes with exactly the five new terms added and no re-adds.
- [ ] `docs/running-your-own-kernel.md` answers #154 in-repo (languages, install/register, degradation, `--kernel`).
- [ ] **Capstone (headline launch value):** in the `integration-kernels` CI job, running `deepnote run --kernel bash <bash-fixture>.deepnote` through the REAL built CLI against the REAL `deepnote-toolkit` server executes the notebook end-to-end and returns a **non-`text/plain` MIME bundle (`image/png`)** — exercising the JSON-only WebSocket fallback and IOPub binary decode against a real non-Python kernel.
- [ ] **Capstone (real missing-kernel legibility):** in the same job, `deepnote run --kernel no_such_kernel --output json <fixture>` against the real server emits `failureCategory: "missing-kernel"` with the typed listing message naming the requested kernel and the installed ones, and **never surfaces the server's opaque HTTP 500** — proving the pre-flight (R2) and site-(a) surfacing (R6) work against the real server, not just mocks.

## Feature Work Phases

| Phase / Task              | Status / Link to Artifact or Card                               |        Universal Check        |
| :------------------------ | :-------------------------------------------------------------- | :---------------------------: |
| **Design & Architecture** | design doc 1C / KD-9 + spike harness                            |     - [ ] Design Complete     |
| **Test Plan Creation**    | three integration tests + fixture                               |   - [ ] Test Plan Approved    |
| **TDD Implementation**    | failing integration test first, then config + CI + docs         | - [ ] Implementation Complete |
| **Integration Testing**   | the `integration-kernels` job IS the integration test           | - [ ] Integration Tests Pass  |
| **Documentation**         | `docs/running-your-own-kernel.md` #154 answer; cspell finalized | - [ ] Documentation Complete  |
| **Code Review**           | gitban reviewer                                                 |  - [ ] Code Review Approved   |
| **Deployment Plan**       | new CI job; mocked job behavior unchanged                       |  - [ ] Deployment Plan Ready  |

## TDD Implementation Workflow

|             Step              | Status/Details                                                                                                                                                                                |                     Universal Check                      |
| :---------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------: |
|  **1. Write Failing Tests**   | `non-python-kernel.integration.test.ts` (bash e2e `image/png`; real missing-kernel JSON `failureCategory`; python3 regression) + bash fixture                                                 |     - [ ] Failing tests are committed and documented     |
| **2. Implement Feature Code** | `vitest.config.ts` exclude; `vitest.integration.config.ts`; `test:integration` script; `.github/workflows/ci.yml` `integration-kernels` job; `cspell.json`; `docs/running-your-own-kernel.md` |         - [ ] Feature implementation is complete         |
|   **3. Run Passing Tests**    | `integration-kernels` job green                                                                                                                                                               |         - [ ] Originally failing tests now pass          |
|        **4. Refactor**        | —                                                                                                                                                                                             | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite**  | mocked `pnpm test` still green (exclude only); `typecheck`/`lint`/`spell-check` pass                                                                                                          |      - [ ] All tests pass (unit, integration, e2e)       |
|  **6. Performance Testing**   | N/A (CI provisioning; bash reaches idle sub-second)                                                                                                                                           |          - [ ] Performance requirements are met          |

### Implementation Notes

**Test Strategy:** TDD — the failing integration test is written first. The headline assertion is generate-and-assert-MIME-type (the bash fixture emits an `image/png` `display_data` at run time) to keep R7 honest about the live transport. `RUN_INTEGRATION_TESTS=true` is defense-in-depth; the `exclude` glob is the actual collection mechanism (KD-9). Pin the toolkit version in both the CI step and the pip cache key for determinism.

**Key Implementation Decisions:** Reuse `docs/spikes/nom-002/` venv recipe verbatim. The default config change is limited to the `exclude` glob — no existing test's behavior changes. The always-on mocked job stays the every-commit gate; the real-kernel job is the only place provisioning runs.

```yaml
# .github/workflows/ci.yml (sketch)
integration-kernels:
  steps:
    - uses: actions/setup-python
    - run: python3 -m venv .venv && .venv/bin/pip install "deepnote-toolkit[server]==2.3.1" "bash_kernel==0.10.0" jinja2 && .venv/bin/python -m bash_kernel.install --sys-prefix
    - run: RUN_INTEGRATION_TESTS=true pnpm test:integration
```

## Validation & Closeout

| Task                      | Detail/Link                  |
| :------------------------ | :--------------------------- |
| **Code Review**           | gitban reviewer              |
| **QA Verification**       | `integration-kernels` CI job |
| **Staging Deployment**    | N/A (CI only)                |
| **Production Deployment** | N/A (fork PR)                |
| **Monitoring Setup**      | N/A                          |

### Follow-up & Lessons Learned

| Topic                       | Status / Action Required                                                              |
| :-------------------------- | :------------------------------------------------------------------------------------ |
| **Postmortem Required?**    | No                                                                                    |
| **Further Investigation?**  | Toolkit version pin bump cadence (design-doc open question)                           |
| **Technical Debt Created?** | No                                                                                    |
| **Future Enhancements**     | Heavier-kernel integration target (Julia/R) to exercise `--kernel-timeout`; Phase 2/3 |

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
