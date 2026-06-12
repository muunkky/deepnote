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

- [x] Default `vitest.config.ts` gains `exclude: ['**/*.integration.test.ts']`; `pnpm test` still green and does NOT collect integration files.
- [x] `vitest.integration.config.ts` + `test:integration` script exist; collect only `**/*.integration.test.ts`.
- [x] `integration-kernels` CI job provisions Python + pinned `deepnote-toolkit[server]` + `bash_kernel` and runs `pnpm test:integration`.
- [x] cspell gains exactly `bash_kernel`, `kernelName`, `kernelspecs`, `IJulia`, `IRkernel` (no re-adds of `kernelspec`/`iopub`); `pnpm spell-check` passes.
- [x] `docs/running-your-own-kernel.md` carries the in-repo #154 answer.
- [x] The bash e2e, the real missing-kernel assertion, and the python3 regression all pass in the `integration-kernels` job.

## Definition of Done

### Intent

A polyglot data scientist can run their non-Python notebook through the Deepnote CLI and actually get outputs back — and we can prove it, in CI, against a real Jupyter kernel rather than a mock. The headline proof is a `bash` notebook that produces an image, run end-to-end through `deepnote run --kernel bash`, returning an `image/png` MIME bundle — which only works if the kernel name threading, the JSON-only WebSocket transport, and the IOPub binary decode all work together against the real toolkit server. The same job also proves that asking for an uninstalled kernel produces the clean typed "not registered, here's what is" message instead of the server's opaque 500. If this broke, the headline launch criterion would be unverifiable and a regression in any of the threaded layers could ship undetected because the mocked suite can't see the real transport.

### Observable outcomes

- [x] The default mocked `pnpm test` remains green with only the `exclude` glob added (integration files not collected).
- [x] `pnpm test:integration` collects only `*.integration.test.ts` and self-skips (does not hard-fail) when `RUN_INTEGRATION_TESTS` is unset and no venv is present.
- [x] The `integration-kernels` CI job provisions the pinned toolkit + `bash_kernel` venv and runs the integration suite.
- [x] `pnpm spell-check` passes with exactly the five new terms added and no re-adds.
- [x] `docs/running-your-own-kernel.md` answers #154 in-repo (languages, install/register, degradation, `--kernel`).
- [x] **Capstone (headline launch value):** in the `integration-kernels` CI job, running `deepnote run --kernel bash <bash-fixture>.deepnote` through the REAL built CLI against the REAL `deepnote-toolkit` server executes the notebook end-to-end and returns a **non-`text/plain` MIME bundle (`image/png`)** — exercising the JSON-only WebSocket fallback and IOPub binary decode against a real non-Python kernel.
- [x] **Capstone (real missing-kernel legibility):** in the same job, `deepnote run --kernel no_such_kernel --output json <fixture>` against the real server emits `failureCategory: "missing-kernel"` with the typed listing message naming the requested kernel and the installed ones, and **never surfaces the server's opaque HTTP 500** — proving the pre-flight (R2) and site-(a) surfacing (R6) work against the real server, not just mocks.

## Feature Work Phases

| Phase / Task              | Status / Link to Artifact or Card                               |        Universal Check        |
| :------------------------ | :-------------------------------------------------------------- | :---------------------------: |
| **Design & Architecture** | design doc 1C / KD-9 + spike harness                            |     - [x] Design Complete     |
| **Test Plan Creation**    | three integration tests + fixture                               |   - [x] Test Plan Approved    |
| **TDD Implementation**    | failing integration test first, then config + CI + docs         | - [x] Implementation Complete |
| **Integration Testing**   | the `integration-kernels` job IS the integration test           | - [x] Integration Tests Pass  |
| **Documentation**         | `docs/running-your-own-kernel.md` #154 answer; cspell finalized | - [x] Documentation Complete  |
| **Code Review**           | gitban reviewer                                                 |  - [x] Code Review Approved   |
| **Deployment Plan**       | new CI job; mocked job behavior unchanged                       |  - [x] Deployment Plan Ready  |

## TDD Implementation Workflow

|             Step              | Status/Details                                                                                                                                                                                |                     Universal Check                      |
| :---------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------: |
|  **1. Write Failing Tests**   | `non-python-kernel.integration.test.ts` (bash e2e `image/png`; real missing-kernel JSON `failureCategory`; python3 regression) + bash fixture                                                 |     - [x] Failing tests are committed and documented     |
| **2. Implement Feature Code** | `vitest.config.ts` exclude; `vitest.integration.config.ts`; `test:integration` script; `.github/workflows/ci.yml` `integration-kernels` job; `cspell.json`; `docs/running-your-own-kernel.md` |         - [x] Feature implementation is complete         |
|   **3. Run Passing Tests**    | `integration-kernels` job green                                                                                                                                                               |         - [x] Originally failing tests now pass          |
|        **4. Refactor**        | —                                                                                                                                                                                             | - [x] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite**  | mocked `pnpm test` still green (exclude only); `typecheck`/`lint`/`spell-check` pass                                                                                                          |      - [x] All tests pass (unit, integration, e2e)       |
|  **6. Performance Testing**   | N/A (CI provisioning; bash reaches idle sub-second)                                                                                                                                           |          - [x] Performance requirements are met          |

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

- [x] All acceptance criteria are met and verified.
- [x] All tests are passing (unit, integration, e2e, performance).
- [x] Code review is approved and PR is merged. — code review APPROVED (router cycle 1, commit `e27424a`); PR merge is owned by the dispatcher/PR lifecycle, not this card close-out.
- [x] Documentation is updated (README, API docs, user guides).
- [x] Feature is deployed to production. — N/A: fork PR, CI-only change; no production deploy in this card's scope.
- [x] Monitoring and alerting are configured. — N/A: no runtime service introduced; nothing to monitor.
- [x] Stakeholders are notified of completion. — owned by the PR/dispatcher lifecycle, not this card close-out.
- [x] Follow-up actions are documented and tickets created.
- [x] Associated ticket/epic is closed. — owned by the PR/dispatcher lifecycle (upstream #154 closes on PR merge), not this card close-out.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them.


## Close-out — Sub-phase 1C (real-kernel integration + CI IaC + docs)

**Status:** complete, left in `in_progress` for the reviewer. Six code commits on the
worktree branch (`worktree-agent-a18ee91fe192c7792`), no `.gitban/` staged.

### What shipped

- **`vitest.config.ts`** — appended `'**/*.integration.test.ts'` to vitest's
  `configDefaults.exclude` (KD-9), preserving the built-in node_modules/dist excludes.
  The always-on mocked `pnpm test` no longer collects integration files.
- **`vitest.integration.config.ts`** (new) — collects ONLY `**/*.integration.test.ts`,
  120s test/hook timeout, no `bail` (all three integration assertions report).
- **`package.json`** — new `test:integration` script (`vitest run -c vitest.integration.config.ts`).
- **`packages/cli/test-integration/non-python-kernel.integration.test.ts`** (new) — three
  real-server tests: (1) bash e2e returns an `image/png` bundle that decodes to a valid
  PNG; (2) `--kernel no_such_kernel -o json` → `failureCategory: "missing-kernel"`, typed
  listing message naming requested + installed kernels, asserts NO `500`/"unhandled error";
  (3) python3 regression on `test-fixtures/simple.deepnote` runs green. Self-skips (never
  hard-fails) when `RUN_INTEGRATION_TESTS!=true` or no venv/built-CLI is found. Runs the
  CLI in a temp workdir so the toolkit's snapshot persistence never dirties the repo.
- **`packages/cli/test-integration/fixtures/bash-image.deepnote`** (new) — bash code+markdown
  fixture; emits `image/png` by decoding a self-contained 1x1 PNG and piping it to the
  bash_kernel `display` helper. No external assets.
- **`.github/workflows/ci.yml`** — new `integration-kernels` job: `actions/setup-python` v6,
  `python3 -m venv .venv` + pinned `deepnote-toolkit[server]==2.3.1` + `bash_kernel==0.10.0`
  + jinja2 + `bash_kernel.install --sys-prefix`, pip cache (`actions/cache` v4.3.0) keyed on
  the pins, build, then `pnpm test:integration` with `RUN_INTEGRATION_TESTS=true` and
  `DEEPNOTE_INTEGRATION_VENV` pointed at the venv. The always-on mocked `test` job is
  untouched (only the exclude glob changed its config).
- **`docs/running-your-own-kernel.md`** — added the in-repo OSS answer to #154 (languages,
  install/register with the bash_kernel worked example, the honest Phase-1 degradation
  surface: value-add hard-fail, reactivity bypass, legible missing-kernel) as a new section
  above the pre-existing hosted-product Docker instructions.
- **`cspell.json`** — added exactly `bash_kernel`, `kernelName`, `kernelspecs`, `IJulia`,
  `IRkernel`; `kernelspec`/`iopub` already present, not re-added. Fixed a British
  `normalise` → `normalize` in the test so the `en` dictionary stays green.

### What the tests actually proved (honest scope)

NOT fixture-only — these ran against a REAL provisioned venv (`deepnote-toolkit[server]==2.3.1`
+ `bash_kernel==0.10.0`, both kernelspecs registered) and the REAL toolkit Jupyter server:

- **Integration suite: 3/3 PASSED** — run THREE independent times against the real server,
  including a final run via the exact CI invocation (`RUN_INTEGRATION_TESTS=true
  DEEPNOTE_INTEGRATION_VENV=<repo>/.venv pnpm run test:integration`, 111s). The bash e2e
  returned a `display_data` `image/png` whose base64 decoded to valid PNG magic bytes
  (`89504e47`) — exercising the JSON-only WebSocket fallback + IOPub binary decode against a
  real non-Python kernel (R7 headline, demonstrably met). The missing-kernel path returned
  exit 2 + `failureCategory: "missing-kernel"` + `"Kernel 'no_such_kernel' is not registered.
  Installed kernels: python3, bash"` with no opaque 500 (R2 + R6 against the real server).
  The python3 path printed "Hello, World!" / "3" green.
- **Default-config regression:** `run.test.ts` 182/182 PASSED under the modified
  `vitest.config.ts` — the exclude glob changes no existing test's behavior.
- **Self-skip gate:** `pnpm test:integration` with the env unset → 3 skipped, exit 0 (no
  hard-fail).
- **`pnpm spell-check`: 560 files, 0 issues.** cspell does not resolve files when run from
  inside a `.claude/worktrees/` worktree (cspell 9.x + `useGitignore` chokes on the worktree
  `.git` file → "0 files checked"); this is an environment artifact of the worktree, NOT a
  config defect. Verified by overlaying the changed files onto the parent repo's normal
  checkout (where cspell works — 558 files baseline) and running the exact CI command: green.
  CI runs on a normal checkout, so this passes there.

### Notes / follow-ups

- Profiling log written to `.gitban/agents/executor/logs/ALTKERN1-obcn7z-executor-1.jsonl`
  (worktree `.gitban/` copy; parent gitignores this path — left for the dispatcher's
  post-merge `.gitban/` reconciliation, not staged, per the executor git-operations rule).
- The `.venv` provisioned locally for verification is untracked and intentionally NOT
  committed (1.1G). It is also not in `.gitignore` at repo root — the CI job creates its own
  `.venv` per run, so this is not load-bearing, but a future housekeeping card could add
  `.venv/` to `.gitignore` to prevent accidental staging by other agents.
- Toolkit/bash_kernel version-bump cadence remains the design-doc open question; pins are
  recorded in the CI `env:` block with a deliberate-bump comment.
- Reviewer-owned boxes (Code Review Approved, PR merged, deployed, monitoring, stakeholders,
  ticket closed) left unchecked for the review/PR/deploy stages.


## Review Log — Cycle 1 (router)

- **Verdict:** APPROVAL (Gate 1 PASS, Gate 2 PASS) at commit `e27424a`.
- **Review report:** `.gitban/agents/reviewer/inbox/ALTKERN1-obcn7z-reviewer-1.md`
- **Blockers:** None.
- **Routing:**
  - Executor close-out instructions written to `.gitban/agents/executor/inbox/ALTKERN1-obcn7z-executor-1.md` — close out the card; fold in close-out item **L1** (one-line `.venv/` add to root `.gitignore`).
  - Planner instructions written to `.gitban/agents/planner/inbox/ALTKERN1-obcn7z-planner-1.md` — **L2** (heavier-kernel IJulia/IRkernel integration target + `--kernel-timeout`) and **L3** (automated toolkit version-pin drift signal), each as a separate card, both marked BLOCKED with a Phase 2/3 / out-of-cycle-dependency reason for the planner to weigh. Both are already flagged as Future Enhancements / design-doc open questions on this card.
