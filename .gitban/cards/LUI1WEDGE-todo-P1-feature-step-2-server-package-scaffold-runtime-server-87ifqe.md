# step 2: server-package-scaffold — `@deepnote/runtime-server`

> **Sprint**: LUI1WEDGE | **Step**: 2 | **Roadmap**: m3/s1/serve-api/server-package-scaffold
> **Depends on**: none (foundation). **Unblocks**: every other serve-api/cli-serve card.

## Feature Overview & Context

* **Associated Ticket/Epic:** m3/s1 upstream wedge (PRD-003); design doc Phase 1.
* **Feature Area/Component:** `packages/runtime-server` (`@deepnote/runtime-server`).
* **Target Release/Milestone:** m3/s1.

**Required Checks:**
* [ ] **Associated Ticket/Epic** link is included above.
* [ ] **Feature Area/Component** is identified.
* [ ] **Target Release/Milestone** is confirmed.

### Required Reading

| Source | Section / lines | Why |
| :--- | :--- | :--- |
| `docs/designs/m3-s1-server-api-and-serve.md` | "Phase 1: Server package scaffold"; "Interface Design > Package entries (ADR-007 §6)"; "Architecture" | The package skeleton, `exports` map, `./types` subpath, Node-free `api-types.ts`. |
| `docs/adr/ADR-007-server-spa-package-layout.md` | Decision §1, §6; "Implementation Notes" (new package skeleton) | Mirrors `@deepnote/mcp`; the Node-import-free types entry is decided now, not deferred. |
| `packages/mcp/package.json` | whole file | The in-repo precedent: `"type":"module"`, `tsdown` build, `vitest`, `workspace:*` deps, `exports` map, `publishConfig.access:"public"`. |
| `packages/mcp/tsdown.config.ts` | whole file | tsdown build config to mirror. |
| root `tsconfig.json` | `paths: {"@deepnote/*": ["packages/*/src/index.ts"]}` | Why `api-types.ts` must be a real separate entry — an importer resolves package *source* `index.ts`. |

## Documentation & Prior Art Review

* [ ] `README.md` or project documentation reviewed.
* [ ] Existing architecture documentation or ADRs reviewed.
* [ ] Related feature implementations or similar code reviewed.
* [ ] API documentation or interface specs reviewed [if applicable].

| Document Type | Link / Location | Key Findings / Action Required |
| :--- | :--- | :--- |
| **Architecture Docs** | ADR-007 §1, §6 | Server is a published `@deepnote/*` lib; types module must be Node-import-free. |
| **Similar Features** | `packages/mcp/` | Exact precedent for a runtime-composing published package. |
| **API Specs** | design doc Interface Design | `ApiProject` / `WsClientMessage` / `WsServerEvent` are the canonical contract identifiers. |
| **ADR (New)** | N/A | No new ADR; ADR-007 governs. |

## Design & Planning

### Initial Design Thoughts & Requirements

* Requirement: `packages/runtime-server` builds with `tsdown`, tests with `vitest`, deps = `@deepnote/runtime-core`, `@deepnote/blocks`, `@deepnote/reactivity` (`workspace:*`) + `ws@^8`, with ZERO frontend dependency.
* Requirement: `src/api-types.ts` contains ONLY `type`/`interface` — no Node/HTTP/WS runtime import. It exports the full canonical contract: `ApiProject`, `WsClientMessage`, `WsServerEvent` (plus the helper types they reference: `FailureEvent`/`RunId`/the `KernelFailureCategory` re-export as appropriate). The `./types` subpath export resolves to it.
* Requirement: `src/index.ts` re-exports `api-types` + a placeholder `createServer(opts): { listen, close }` (Node entry). `packages/cli` will consume the root.
* Constraint: a `madge`/lint check asserts `api-types.ts` has no runtime import — wired in this card and reused by the slice-integrity card.
* Design thought: `createServer` is a *stub* here — real HTTP/WS routing lands in later phases. This card establishes the package boundary and the contract module only.

### Acceptance Criteria

* [ ] `pnpm --filter @deepnote/runtime-server build` and `test` and `exec tsc --noEmit` all pass.
* [ ] `git grep -iE 'react|vite|apps/' -- packages/runtime-server` returns nothing.
* [ ] `api-types.ts` exports `ApiProject`, `WsClientMessage`, `WsServerEvent` with zero runtime import (madge-asserted).
* [ ] `@deepnote/runtime-server/types` is importable without pulling Node into the type graph.

## Definition of Done

### Intent

A future contributor (and the m3/s2 SPA) can install `@deepnote/runtime-server`, import its API contract types from a dedicated Node-free entry, and build a Node host against its `createServer` factory — all without dragging a browser toolchain into the backend or Node's HTTP/WS stack into a type-only consumer. From the outside, "working" looks like: the package builds and tests green on its own, and a type-only consumer of `/types` compiles without Node in its type graph. If this breaks, a downstream consumer's typecheck would suddenly start pulling Node `http`/`ws` types (or fail to resolve the contract identifiers), and the slice-integrity grep would trip on a frontend token.

### Observable outcomes

- [ ] `pnpm --filter @deepnote/runtime-server build && pnpm --filter @deepnote/runtime-server test && pnpm --filter @deepnote/runtime-server exec tsc --noEmit` all pass.
- [ ] `git grep -iE 'react|vite|apps/' -- packages/runtime-server` returns nothing.
- [ ] The package `dependencies` are exactly `@deepnote/runtime-core`, `@deepnote/blocks`, `@deepnote/reactivity` (`workspace:*`) and `ws` — no frontend dep.
- [ ] **Capstone:** a throwaway type-only module that does `import type { ApiProject, WsClientMessage, WsServerEvent } from '@deepnote/runtime-server/types'` typechecks, AND a `madge`/dependency check on `api-types.ts` reports zero runtime imports — proving the contract is reachable from a Node-free graph and the types entry stays honest.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | ADR-007 §6 + design doc Interface Design | - [ ] Design Complete |
| **Test Plan Creation** | see TDD Implementation Workflow | - [ ] Test Plan Approved |
| **TDD Implementation** | scaffold + api-types + index stub | - [ ] Implementation Complete |
| **Integration Testing** | n/a (scaffold) | - [ ] Integration Tests Pass |
| **Documentation** | package `README.md` stub | - [ ] Documentation Complete |
| **Code Review** | reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | n/a (not published in s1) | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | `createServer().listen(0)` binds + `close()` cleanly; the madge/no-runtime-import check on `api-types.ts`; a type-only import of `/types` compiles | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | package.json, tsdown.config.ts, vitest, src/api-types.ts, src/index.ts (stub createServer), README | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | filter build/test/tsc green | - [ ] Originally failing tests now pass |
| **4. Refactor** | tidy exports map | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm -r` build/typecheck unaffected | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | n/a | - [ ] Performance requirements are met |

### Implementation Notes

**Test Strategy (behavior, not structure):** the load-bearing test is the Node-free-graph capstone — a type-only `/types` import that compiles plus a madge/dependency-cruiser assertion that `api-types.ts` imports nothing at runtime. These assert the ADR-007 §6 invariant *behaviorally* (the wrong import would break the consumer or trip madge), not by string-presence. The `listen(0)`/`close()` test proves the factory shape exists and is lifecycle-clean. No capstone-by-mock is possible: the type-only import must resolve the real exported identifiers.

**Key Implementation Decisions:** mirror `@deepnote/mcp` exactly for build/test wiring; `exports` map per design doc (`.` → index, `./types` → api-types). `createServer` is a stub returning `{ listen, close }` — real routing is steps 3/4A/4B.

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | reviewer |
| **QA Verification** | filter build/test/tsc |
| **Staging Deployment** | n/a |
| **Production Deployment** | n/a (not published in s1) |
| **Monitoring Setup** | n/a |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No |
| **Future Enhancements** | Real routing in steps 3/4A/4B. |

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
