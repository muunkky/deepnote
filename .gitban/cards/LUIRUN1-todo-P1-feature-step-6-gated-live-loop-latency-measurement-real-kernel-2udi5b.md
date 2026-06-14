# step 6: gated < 2 s live-loop measurement (real kernel capstone)

> **Design Phase 4 (the measurement)** (`docs/designs/m3-s3-live-execution.md`). Sprint **LUIRUN1** step 6 — the STORY CAPSTONE. The live loop is measured end-to-end against a REAL kernel: boot a real `deepnote serve`, drive a single-block run over the live HTTP+WS path, assert the streamed output renders, and record the edit→output latency under the **< 2 s** bar (ADR-005's load-bearing criterion). Gated out of the always-on suite (it needs a real toolkit server + kernel), exactly like the s2 HMR e2e.

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s3 → project `live-execution`; sprint LUIRUN1 step 6
* **Feature Area/Component:** `apps/studio/e2e/live-loop.e2e.test.ts` (gated, real-kernel) + `apps/studio` `test:live` script + vitest config
* **Target Release/Milestone:** m3 (fork-only showcase)

**Required Checks:**
* [ ] **Associated Ticket/Epic** link is included above.
* [ ] **Feature Area/Component** is identified.
* [ ] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

* [ ] `README.md` or project documentation reviewed.
* [ ] Existing architecture documentation or ADRs reviewed.
* [ ] Related feature implementations or similar code reviewed.
* [ ] API documentation or interface specs reviewed [if applicable].

| Document Type | Link / Location | Key Findings / Action Required |
| :--- | :--- | :--- |
| **Design Doc** | `docs/designs/m3-s3-live-execution.md` Phase 4 (measurement) + R1 | the < 2 s bar, reference workload, the revisit signal (> ~500 ms) |
| **ADR** | ADR-005 §Validation (the < 2 s bar measured early, not asserted; spike ≈ 62 ms) | this card is the ADR's live validation |
| **Prior art** | `apps/studio/e2e/hmr.e2e.test.ts` + `vitest.hmr.config.ts` + `test:hmr` script | the gated-out-of-suite real-resource e2e pattern to mirror |
| **Backend serve** | `packages/cli/src/commands/serve.ts`; `packages/runtime-server` | how to boot a real `deepnote serve` for the test |

### Required Reading

| Source | Location | Why |
| :--- | :--- | :--- |
| Design Phase 4 measurement + R1 | `docs/designs/m3-s3-live-execution.md` | the measurement contract + the < 2 s bar + revisit signal |
| s2 gated e2e pattern | `apps/studio/e2e/hmr.e2e.test.ts`, `apps/studio/vitest.hmr.config.ts`, `apps/studio` `package.json` `test:hmr` | mirror the gated config + script (a separate vitest config, out of `pnpm test`) |
| ExecutionClient + useExecution | `apps/studio/src/execution/` (steps 2–4) | the live path the measurement drives |
| Real kernel | repo-root `.venv` (`deepnote-toolkit[server]==2.3.1` + `bash_kernel`); `scripts/venv-python` | the actual interpreter the serve server runs against |

## Design & Planning

### Initial Design Thoughts & Requirements

* Deliverable: `apps/studio/e2e/live-loop.e2e.test.ts` — boots a real `deepnote serve` against a fixture `.deepnote` project (warm kernel), drives a single-block run through the REAL ExecutionClient (HTTP trigger → WS stream), asserts the streamed output appears, and records the edit→output latency.
* Deliverable: a dedicated gated config (`apps/studio/vitest.live.config.ts`) + a `pnpm --filter @deepnote/studio test:live` script — NOT part of `pnpm test` (it needs a real toolkit server + kernel), mirroring the s2 `test:hmr` pattern.
* Constraint (R1): measured edit→output latency on the reference workload (warm kernel; a stdout line + a small `df.head()` HTML table) is **< 2 s**; the measured number is reported; > ~500 ms repeatedly is the ADR-005 revisit signal.
* Constraint: the gated e2e must NOT pollute the always-on studio suite (it stays out of `pnpm test`); the always-on suite + isolation invariant stay green.

### Acceptance Criteria

* [ ] A gated `test:live` boots a real `deepnote serve` + kernel, drives a single-block run over the real HTTP+WS path, and the streamed output renders.
* [ ] The measured edit→output latency is recorded and is < 2 s on the reference workload.
* [ ] The measurement is gated out of `pnpm test`; the always-on studio suite + isolation invariant stay green.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :--- |
| **Design & Architecture** | Design Phase 4 (measurement) | - [ ] Design Complete |
| **Test Plan Creation** | gated live-loop e2e harness | - [ ] Test Plan Approved |
| **TDD Implementation** | live-loop.e2e.test.ts + gated config + test:live | - [ ] Implementation Complete |
| **Integration Testing** | real serve + real kernel | - [ ] Integration Tests Pass |
| **Documentation** | README "Live loop measurement" (how to run; the number) | - [ ] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | the gated e2e: boot serve, run a block over the live path, assert the streamed output renders + capture latency (constrained-box env vars; may need sandbox-disabled like the HMR e2e) | - [ ] Failing tests committed |
| **2. Implement Feature Code** | harness + gated config + test:live script | - [ ] Feature implementation complete |
| **3. Run Passing Tests** | the gated e2e passes against the real .venv kernel; latency recorded | - [ ] Originally failing tests pass |
| **4. Refactor** | Tidy the harness | - [ ] Code refactored |
| **5. Full Regression Suite** | `pnpm test` (gated e2e EXCLUDED) + `pnpm typecheck` + isolation green | - [ ] All tests pass |
| **6. Performance Testing** | THE measurement — record + report the < 2 s number | - [ ] Performance requirement met |

### Implementation Notes

**Test Strategy:** mirror the s2 HMR e2e exactly — a dedicated `vitest.live.config.ts` + `test:live` script, gated out of `pnpm test`. Boot a real `deepnote serve` (against the repo-root `.venv`), drive a single-block run through the real `ExecutionClient` (HTTP trigger → WS stream), assert the streamed output renders, and record the edit→output latency. Report the measured number honestly (this IS ADR-005's validation). The constrained box may require the sandbox-disabled execution the HMR e2e used to launch a real process.

**Key Implementation Decisions:** gated (real kernel, out of the always-on suite); the headline end-to-end capstone for the whole story; honest reported latency over a fixed reference workload (ADR-005 scopes large-figure output out).

## Definition of Done

**Intent (plain English):** The whole point of the local UI is that running a cell *feels instant* — Cloud-like. This card proves it with a number: against a real local kernel, edit→run→see-output happens in under two seconds on the reference workload. If this breaks (the loop is sluggish), the product's core promise fails and ADR-005's transport choice would need re-measuring.

**Observable outcomes (unfakeable):**

* [ ] **Capstone (the story capstone):** the gated `test:live` boots a REAL `deepnote serve` against a fixture project, drives a single-block run through the real `ExecutionClient` (HTTP `POST …/run` → live `WS /api/stream`), asserts the streamed `IOutput` renders in place, and records the **measured** edit→output latency — which is **< 2 s** on the reference workload. The number is reported in the test output / README (not asserted-away). This exercises the entire assembled loop (steps 2–5) against a real kernel — the one capstone that cannot pass with mocks.
* [ ] The measurement is gated out of `pnpm test`; the always-on studio suite + isolation invariant stay green (0 `apps/` files in root tsc).
* [ ] The measured latency is recorded; if > ~500 ms repeatedly, the ADR-005 revisit signal is noted.

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban-reviewer approval |
| **QA Verification** | Live loop measured < 2 s against a real kernel; number reported |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | Only if > ~500 ms (ADR-005 revisit) |
| **Technical Debt Created?** | No |
| **Future Enhancements** | s4 edit/save; s5 reactive re-run reuse this loop |

### Completion Checklist

* [ ] All acceptance criteria are met and verified.
* [ ] All tests are passing (unit, integration, e2e, performance).
* [ ] Code review is approved and PR is merged.
* [ ] Documentation is updated (README, API docs, user guides).
* [ ] Feature is deployed to production.
* [ ] Monitoring and alerting are configured.
* [ ] Stakeholders are notified of completion.
* [ ] Follow-up actions are documented and tickets created.
* [ ] Associated ticket/epic is closed.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.
