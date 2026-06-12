# step 7B: sql-integration-parity — integration env wiring parity with `run`

> **Sprint**: LUI1WEDGE | **Step**: 7B (parallel with 7A browser-launch-alias) | **Roadmap**: m3/s1/cli-serve/sql-integration-parity
> **Depends on**: step 6 (serve-command, `zq7q0g`). **Parallel-safe with** step 7A (`sqm7ox`) — disjoint surfaces (the integrations env lift vs the `ui` alias).

## Feature Overview & Context

* **Associated Ticket/Epic:** m3/s1 wedge; design doc Phase 8 + KD-3 (the long-route helper lift).
* **Feature Area/Component:** integration env wiring reused by `@deepnote/runtime-server`; the KD-3 lift of cli-private integration helpers to a shared home.
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
| `docs/designs/m3-s1-server-api-and-serve.md` | "Phase 8: SQL / integration parity"; KD-3 (reuse runtime-core primitives, NOT import `run.ts`; the long-route lift) | The integration env wiring to reuse; the local-first opt-in-fetch-off-by-default rule. |
| `docs/adr/ADR-007-server-spa-package-layout.md` | Decision §1/§4 one-way arrow (server must NOT import cli) | Why the helpers must be LIFTED to a shared home, not cross-imported from cli. |
| `packages/cli/src/integrations/parse-integrations.ts` | `parseIntegrationsFile`, `getDefaultIntegrationsFilePath` | cli-private helpers needed by both — candidates for the lift. |
| `packages/cli/src/integrations/collect-integrations.ts` | `collectRequiredIntegrationIds` | same. |
| `packages/cli/src/integrations/inject-integration-env-vars.ts` | `injectIntegrationEnvVars` | same. |
| `packages/cli/src/commands/run.ts` | integration wiring call sites (369, 391, 405); imports (35,37,38) | how `run.ts` wires integration env — the parity reference. |

| Document Type | Link / Location | Key Findings / Action Required |
| :--- | :--- | :--- |
| **Architecture Docs** | ADR-007 §4 | server → cli is FORBIDDEN; lift shared helpers to runtime-core/blocks. |
| **Similar Features** | `run.ts` integration wiring | parity target. |
| **API Specs** | N/A | env wiring, not an API. |
| **ADR (New)** | N/A | ADR-007 governs the lift direction. |

## Design & Planning

### Initial Design Thoughts & Requirements

* Requirement: a SQL block runs through the server with the SAME integration env wiring `deepnote run` uses (`parseIntegrationsFile` → `collectRequiredIntegrationIds` → `injectIntegrationEnvVars`).
* Requirement (KD-3 long-route lift): if those helpers are currently cli-private and needed by both `cli` and `runtime-server`, LIFT them into a place both can depend on (e.g. `runtime-core` or `blocks`) — do NOT cross-import `@deepnote/cli` (that inverts the ADR-007 arrow). Verified: they live under `packages/cli/src/integrations/`.
* Requirement (local-first): any opt-in API-backed integration fetch is OFF by default and visibly optional — no outbound request unless a token is explicitly provided.
* Constraint: no `runtime-core` behavior change beyond a pure helper relocation; the wedge's "no runtime-core change" invariant means the lift is a move/re-home, not a semantics change.

### Acceptance Criteria

* [ ] A SQL block runs through the server with the same integration env wiring as `deepnote run`.
* [ ] No outbound request is made for integrations unless a token is explicitly provided (local-first).
* [ ] Lifted helpers are imported by both `cli` and `runtime-server` with no `runtime-server → cli` edge (dependency-cruiser clean).

## Definition of Done

### Intent

A user who runs a SQL (or otherwise integration-dependent) block through the local server gets the same connection/credentials behavior they get from `deepnote run` — their local integrations file is parsed and the right env vars are injected — and the server never silently phones home: no credential or integration fetch leaves the machine unless the user explicitly hands over a token. From the outside, "working" looks like: a SQL block that runs under `deepnote run` runs identically under the server with the same env, and a network monitor shows zero outbound integration calls by default. If this breaks, either SQL blocks would behave differently than the CLI (broken parity) or the server would make an unexpected network call (a local-first violation), or the helper lift would re-introduce a server→cli dependency (an ADR-007 boundary break).

### Observable outcomes

- [ ] **Capstone:** a SQL block executed through the server resolves its integration env to the exact same values `deepnote run` injects for the same project + integrations file (the wiring is shared, not re-implemented).
- [ ] By default, **no** outbound network request is made for integrations; a request happens only when a token is explicitly provided (assert the fetch is gated and off by default).
- [ ] The integration helpers used by `runtime-server` are imported from a shared home (not `@deepnote/cli`); a dependency-cruiser/madge check shows no `packages/runtime-server → packages/cli` edge.
- [ ] `deepnote run`'s integration behavior is unchanged after the lift (regression: existing cli integration tests still pass).

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | KD-3 lift target chosen (runtime-core or blocks) | - [ ] Design Complete |
| **Test Plan Creation** | mocked: SQL env parity; fetch off by default; no server→cli edge | - [ ] Test Plan Approved |
| **TDD Implementation** | lift helpers; wire server integration env; gate opt-in fetch | - [ ] Implementation Complete |
| **Integration Testing** | SQL parity is exercised in the step-5 parity fixture if it includes a SQL block | - [ ] Integration Tests Pass |
| **Documentation** | README integrations-parity + local-first note | - [ ] Documentation Complete |
| **Code Review** | reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | N/A | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | SQL block env parity vs run; opt-in fetch off by default; no server→cli edge; cli regression | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | lift helpers to shared home; wire into session/run path; gate fetch | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | green | - [ ] Originally failing tests now pass |
| **4. Refactor** | dedupe with run.ts via the shared helpers | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | cli + server tests green; dependency-cruiser clean | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A | - [ ] Performance requirements are met |

### Implementation Notes

**Test Strategy (parity + the local-first failure mode, mocked):** the capstone asserts a SQL block's resolved integration env matches what `run` injects — proving the wiring is shared, not re-derived. The load-bearing failure-mode test is local-first: assert that by default NO outbound request fires and one only fires when a token is explicitly passed. The boundary test (dependency-cruiser: no `runtime-server → cli` edge) guards the ADR-007 arrow against the lift accidentally cross-importing cli. Keep the lift a pure relocation so `deepnote run`'s existing integration tests stay green.

**Key Implementation Decisions:** lift `parse/collect/inject` integration helpers to a shared package (runtime-core or blocks) per KD-3's long-route; reuse runtime-core primitives, never import `run.ts`.

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | reviewer |
| **QA Verification** | SQL env parity + fetch-off-by-default + boundary check |
| **Staging Deployment** | N/A |
| **Production Deployment** | N/A |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | The helper lift is the long-route fix — it REMOVES debt (cli-private duplication), not adds it. |
| **Future Enhancements** | broader integration support tracked in later stories. |

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
