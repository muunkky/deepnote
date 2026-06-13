# step 2: spa-foundation framework + bundler setup (apps/studio, isolated)

> **Design Phase 1** (`docs/designs/m3-s2-viewer.md` ~lines 434–477). Foundational card for sprint **LUIVIEW1**. Stands up `apps/studio` as a React 19 + Vite 7 app that is **isolated by construction** — the backend's repo-wide typecheck/build/lint/spell gate stays green despite the new JSX. This is the load-bearing isolation invariant the rest of the sprint depends on.

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s2 → project `spa-foundation` / feature `framework-bundler-setup`; sprint LUIVIEW1 step 2
* **Feature Area/Component:** `apps/studio` (new top-level `apps/` tier — the monorepo's first frontend)
* **Target Release/Milestone:** m3 (fork-only showcase, branch `milestone/m3-local-ui`, per #162)

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
| **README.md** | `apps/studio/README.md` (new) | Must document dev-run + isolation rationale + "fork-only, never sliced upstream" note |
| **Architecture Docs** | `docs/adr/ADR-006-spa-framework-and-bundler.md` | React 19 + Vite 7; root tsconfig `include` names zero `apps/`; no `packages/*` frontend dep |
| **Architecture Docs** | `docs/adr/ADR-007-server-spa-package-layout.md` §3 | The backend→apps one-way boundary; `apps/studio` is `private`, fork-only |
| **Design Doc** | `docs/designs/m3-s2-viewer.md` Phase 1 (~434–477), Interface Design (~390–422) | The isolation mechanism: root `include`, own `jsx: react-jsx` tsconfig, `apps/*` workspace glob |
| **ADR (New)** | **N/A** | No new ADR required — ADR-006/007 already accepted |

### Required Reading

| Source | Location | Why |
| :--- | :--- | :--- |
| Design Phase 1 | `docs/designs/m3-s2-viewer.md` ~434–477 | Goal / Deliverables / Test strategy / DoD lifted into this card |
| Interface Design (toolchain) | `docs/designs/m3-s2-viewer.md` ~390–422 | Root `tsconfig` `include`, `apps/studio/tsconfig.json`, `pnpm-workspace.yaml` glob, verification invariant |
| ADR-006 | `docs/adr/ADR-006-spa-framework-and-bundler.md` | React 19 + Vite 7; `tsc --listFiles \| grep -c apps/ == 0`; no `packages/*` frontend dep |
| ADR-007 §3 | `docs/adr/ADR-007-server-spa-package-layout.md` | backend→apps one-way boundary |

## Design & Planning

### Initial Design Thoughts & Requirements

* Deliverable: `apps/studio/` with `package.json` (`@deepnote/studio`, `"private": true`; deps `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`), `vite.config.ts`, own `tsconfig.json` (`jsx: "react-jsx"`), `index.html`, `src/main.tsx` rendering a trivial root.
* Deliverable: `pnpm-workspace.yaml` gains the `apps/*` glob (rides the process diff only, never upstream).
* Deliverable: root `tsconfig.json` gains an `"include"` that names **no** `apps/` path (the isolation fix). This must land **with** the `apps/*` glob or the backend typecheck goes red on the SPA's JSX.
* Deliverable: `cspell.json` / `docs-dictionary.txt` gain React/Vite/JSX terms; Biome `a11y`/`noExplicitAny` now apply to `.tsx` (satisfied, not relaxed).
* Deliverable: a DOM-env vitest **project** scoped to `apps/studio` (jsdom/happy-dom + `@testing-library/react`), distinct from the node-env backend suite. This becomes the default SPA test runner for all later steps.
* Constraint (R1): no `packages/*/package.json` gains a frontend dependency.
* Constraint (R2): `apps/studio` imports no Node module / no server runtime value.
* Does **not** require s1 to be merged to scaffold (the load phase, step 4, does).

### Acceptance Criteria

* [ ] `apps/studio` builds with `vite build` and dev-runs with `vite` (HMR reflects an edit < 1 s).
* [ ] `tsc --noEmit -p tsconfig.json --listFiles` names **zero** `apps/` files; backend typecheck stays green.
* [ ] No `packages/*/package.json` has a frontend dependency; the boundary check passes.
* [ ] `pnpm lintAndFormat` and `pnpm spell-check` pass with the new `.tsx` + added vocabulary.
* [ ] The DOM-env vitest project runs and the smoke React render under jsdom passes.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 1; ADR-006/007 | - [ ] Design Complete |
| **Test Plan Creation** | Isolation test + boundary test + smoke test (below) | - [ ] Test Plan Approved |
| **TDD Implementation** | `apps/studio` scaffold + root `include` + workspace glob | - [ ] Implementation Complete |
| **Integration Testing** | Backend typecheck/lint/spell gate green with new JSX | - [ ] Integration Tests Pass |
| **Documentation** | `apps/studio/README.md` | - [ ] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy (process-diff config) | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | Isolation assertion (`tsc --listFiles \| grep -c apps/ == 0`) written before the `apps/*` glob; boundary check; smoke test | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | Scaffold `apps/studio`, add root `include`, add `apps/*` glob, add vocab | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | DOM-env vitest smoke render passes; isolation + boundary checks pass | - [ ] Originally failing tests now pass |
| **4. Refactor** | Tidy config; confirm Biome a11y applies to `.tsx` | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test`, `pnpm typecheck`, `pnpm lintAndFormat`, `pnpm spell-check` | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | HMR reflects an edit < 1 s (dev-run smoke) | - [ ] Performance requirements are met |

### Implementation Notes

**Test Strategy:** Default SPA test runner is the **DOM-env vitest project** (jsdom + `@testing-library/react`), NOT the node-env backend suite. Tests are written first (TDD). The isolation test is the load-bearing one and is written before the `apps/*` glob is added, proving the root `include` already excludes the SPA.

**Key Implementation Decisions:** Root `tsconfig.json` `"include": ["packages/*/src", "test-helpers", "*.config.ts"]` (was un-keyed, globbing the repo). `apps/studio/tsconfig.json` is never referenced by the root (no `references`, not in root `include`).

```ts
// apps/studio/src/main.tsx — trivial root (smoke target)
import { createRoot } from "react-dom/client";
createRoot(document.getElementById("root")!).render(<h1>Deepnote Studio</h1>);
```

## Definition of Done

**Intent (plain English):** A developer can clone the fork dev branch, run the SPA dev server, and see a trivial React page — and the existing backend CI gate (typecheck, lint, spell) is completely unaffected by the new frontend code. The frontend is walled off so thoroughly that the backend's TypeScript compiler never even *sees* the `apps/studio` files, and no backend package can accidentally pull in React. This isolation is provable by a one-line file-list check, not by convention.

**Observable outcomes (unfakeable):**

* [ ] **Capstone — isolation invariant:** `tsc --noEmit -p tsconfig.json --listFiles` emits **zero** lines under `apps/` (assert `grep -c apps/ == 0` against the real compiler output), and the backend typecheck is green.
* [ ] **Capstone — smoke render under jsdom:** the trivial React root renders under the new DOM-env vitest project (real `@testing-library/react` render asserting the heading text in the DOM), proving the React+Vite+jsdom+RTL pipeline works end-to-end.
* [ ] No `packages/*/package.json` declares a frontend dependency (boundary check over real package manifests).
* [ ] `apps/studio` imports no Node module and no server runtime value (dependency/grep boundary check).
* [ ] `pnpm lintAndFormat` and `pnpm spell-check` are green with the new `.tsx` and added vocabulary.

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban-reviewer approval |
| **QA Verification** | Smoke render + isolation invariant verified |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No — config-as-code, reviewed up front |
| **Future Enhancements** | Shell + routing (step 3) build on this scaffold |

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
