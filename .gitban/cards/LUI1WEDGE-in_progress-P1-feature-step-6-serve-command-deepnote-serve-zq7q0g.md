# step 6: serve-command — `deepnote serve`

> **Sprint**: LUI1WEDGE | **Step**: 6 | **Roadmap**: m3/s1/cli-serve/serve-command
> **Depends on**: step 2 (server-package-scaffold, `87ifqe`) for the package; behaviorally steps 3/4A/4B for a useful server. **Unblocks**: step 7A (browser-launch-alias), step 7B (sql-integration-parity).

## Feature Overview & Context

* **Associated Ticket/Epic:** m3/s1 wedge; design doc Phase 6; ADR-007 §2.
* **Feature Area/Component:** `packages/cli/src/commands/serve.ts` (`createServeAction`) + `cli.ts` registration.
* **Target Release/Milestone:** m3/s1.

**Required Checks:**
* [ ] **Associated Ticket/Epic** link is included above.
* [ ] **Feature Area/Component** is identified.
* [ ] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

* [ ] `README.md` or project documentation reviewed.
* [ ] Existing architecture documentation or ADRs reviewed.
* [ ] Related feature implementations or similar code reviewed.
* [ ] API documentation or interface specs reviewed [if applicable].

### Required Reading

| Source | Section / lines | Why |
| :--- | :--- | :--- |
| `docs/designs/m3-s1-server-api-and-serve.md` | "Phase 6: `deepnote serve` command"; "Port selection (M1)"; Architecture (`createServeAction` is thin) | The command shape, the port-pair caveat, SIGINT shutdown. |
| `docs/adr/ADR-007-server-spa-package-layout.md` | Decision §2; Implementation Notes (CLI wiring); Validation (1)(c) the no-`apps/` grep | `serve` lives in cli, adds one dep, defaults headless, `--static-dir` defaults unset, NO `apps/` token. |
| `packages/cli/src/commands/run.ts` | `createRunAction` shape; `setupProject` (298) | The `createXAction` factory pattern and resolution to mirror. |
| `packages/cli/src/cli.ts` | command registration site | Where to register `serve` next to `run`. |
| `packages/runtime-core/src/server-starter.ts` | `findConsecutiveAvailablePorts` (129 — returns FIRST of a consecutive PAIR, steps `attempt*2`) | M1: serve needs ONE port; either use the first + discard the second, or add a single-port helper — stated explicitly. |

| Document Type | Link / Location | Key Findings / Action Required |
| :--- | :--- | :--- |
| **Architecture Docs** | ADR-007 §2 | thin command; `--static-dir` defaults unset; never `apps/studio/dist`. |
| **Similar Features** | `run.ts` `createRunAction` | factory + commander registration pattern. |
| **API Specs** | `@deepnote/runtime-server` `createServer` | the server the command boots. |
| **ADR (New)** | N/A | ADR-007 governs. |

## Design & Planning

### Initial Design Thoughts & Requirements

* Requirement: `createServeAction` is thin — resolve file path, pick a port, `createServer({...}).listen(port)`, log the URL, optionally open browser, wire `SIGINT` → `server.close()` → `session.close()` (`engine.stop()`).
* Requirement: `--port` and `--no-open` flags; binds `localhost`, never `0.0.0.0`; clear startup/ready/stop logging.
* Requirement: `--static-dir <path>` option EXISTS but defaults UNSET and is NEVER hard-coded to `apps/studio/dist` (ADR-007 §2). The sliced `serve.ts` carries no `apps/` token.
* Requirement: adds exactly one dep to `packages/cli`: `@deepnote/runtime-server` (`workspace:*`).
* Port decision (M1): state explicitly whether serve uses the first of the pair from `findConsecutiveAvailablePorts` (discarding the second, documenting the adjacent port is left free) OR adds a single-port helper — do not silently inherit pair semantics.

### Acceptance Criteria

* [ ] `deepnote serve project.deepnote --no-open` starts and serves `GET /api/project`.
* [ ] Port-in-use falls back to the next free port and reports the chosen URL.
* [ ] Binds `localhost`, never `0.0.0.0`.
* [ ] Ctrl-C stops the toolkit server (`engine.stop()`); no orphaned process.
* [ ] The sliced `serve.ts` carries no `apps/` token (no default static-dir string).

## Definition of Done

### Intent

A user with a `.deepnote` file on their laptop runs one command and gets a running local server they can point a browser or an API client at — and when they hit Ctrl-C, the kernel and toolkit server shut down cleanly with no leftover process. From the outside, "working" looks like: `deepnote serve myproject.deepnote --no-open` prints a clear "ready at http://localhost:PORT" line, `GET /api/project` returns the tree, and Ctrl-C leaves no orphaned Python/toolkit process. If this breaks, a user would see the command hang on a busy port, bind to a non-local address (a security regression), or leak a kernel process after exit.

### Observable outcomes

- [ ] **Capstone:** `deepnote serve project.deepnote --no-open` boots a server that answers `GET /api/project` with the project tree, prints the chosen localhost URL, and on `SIGINT` calls `engine.stop()` and exits with no orphaned process.
- [ ] A port-in-use condition falls back to the next free port and the reported URL reflects the actually-bound port.
- [ ] The server binds `localhost` (asserted), never `0.0.0.0`.
- [ ] `git grep -iE 'apps/' -- packages/cli/src/commands/serve.ts` returns nothing (no default static-dir string).

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | ADR-007 §2 + design doc Phase 6 | - [ ] Design Complete |
| **Test Plan Creation** | suite 6 (mocked) | - [ ] Test Plan Approved |
| **TDD Implementation** | `serve.ts` `createServeAction` + cli.ts registration + dep line | - [ ] Implementation Complete |
| **Integration Testing** | serve smoke lives in step 5 | - [ ] Integration Tests Pass |
| **Documentation** | CLI `--help`; user docs page (localhost-trust note) | - [ ] Documentation Complete |
| **Code Review** | reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | N/A | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | port fallback on conflict; `--no-open` headless; `localhost` bind not `0.0.0.0`; Ctrl-C → `engine.stop()` | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | `createServeAction`, registration, dep | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | suite 6 green | - [ ] Originally failing tests now pass |
| **4. Refactor** | keep the command thin | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | cli tests green | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A | - [ ] Performance requirements are met |

### Implementation Notes

**Test Strategy (behavior + failure modes, mocked):** the capstone exercises the assembled command — boot, serve, SIGINT-shutdown — against a stubbed/real-enough server. Failure-mode tests: port-in-use → fallback (assert the reported URL matches the bound port), bind address is `localhost` not `0.0.0.0`, SIGINT triggers `engine.stop()` (assert via spy). The no-`apps/`-token check is a grep on `serve.ts` (also enforced repo-wide by the slice-integrity card).

**Key Implementation Decisions:** state the M1 port choice in code/docs; the command stays thin (boot+port+open) with all server logic in `@deepnote/runtime-server`.

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | reviewer |
| **QA Verification** | suite 6 + step-5 serve smoke |
| **Staging Deployment** | N/A |
| **Production Deployment** | N/A |
| **Monitoring Setup** | startup/ready/stop logging |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No — `serve`/`ui` final naming is a P6 PRD open question, not debt. |
| **Future Enhancements** | `--static-dir` consumed by the fork launcher (out of upstream slice). |

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
