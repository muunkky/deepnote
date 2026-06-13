# LUI2VIEW step 2 framework-bundler-setup — scaffold apps/studio + root-tsconfig isolation

> **Sprint**: LUI2VIEW | **Step**: 2 | **Roadmap**: `m3/s2/spa-foundation/framework-bundler-setup` | **Depends on**: step 1 (planning `2q78wv`); ADR-006 + ADR-007 (accepted). Does NOT need s1 to scaffold.

## UI Feature Overview

* **Feature Description:** Introduce the monorepo's first-ever UI framework + browser bundler — scaffold `apps/studio` (React 19 + Vite 7), and land the load-bearing toolchain-isolation mechanism so the backend's repo-wide typecheck/build/lint/spell gate stays green on the fork dev branch despite the new JSX.
* **UI Components:** A trivial `src/main.tsx` React root only (real components arrive in later steps); the deliverable is the package + toolchain wiring, not a UI.
* **User Story:** As a fork developer, I can `pnpm --filter @deepnote/studio dev` to run a browser SPA with HMR and `vite build` it, while the backend's `tsc -p tsconfig.json` never sees the SPA's JSX.
* **Design Reference:** `docs/designs/m3-s2-viewer.md` Phase 1; `docs/adr/ADR-006-spa-framework-and-bundler.md` §3-4 + Implementation Notes; `docs/adr/ADR-007-server-spa-package-layout.md` §3, §6, Implementation Notes.
* **Target Platforms:** Web (localhost dev-server + production rollup build), fork dev branch only.
* **Related Work:** ADR-006, ADR-007 (the two accepted ADRs this card implements); `packages/mcp/` (the workspace-package precedent ADR-007 cites).
* **Target Release:** LUI2VIEW.

**Required Checks:**
* [ ] **UI components** to be built are clearly identified.
* [ ] **Design reference** (Figma, mockup, spec) is linked and accessible.
* [ ] **User story** explains the feature from user perspective.

### Required Reading

| Source | Where | Why |
| :--- | :--- | :--- |
| Design doc Phase 1 | `docs/designs/m3-s2-viewer.md` (Phase 1, lines ~434-477) | Deliverables, isolation test, boundary test, smoke test, DoD. |
| ADR-006 §4 + Impl Notes | `docs/adr/ADR-006-spa-framework-and-bundler.md` (lines ~136-148, ~408-444) | The concrete isolation mechanism: root `include`, own `jsx:"react-jsx"` tsconfig, Biome/cspell scope. |
| ADR-007 §3, §6 + Impl Notes | `docs/adr/ADR-007-server-spa-package-layout.md` (lines ~107-113, ~133-156, ~436-449) | `apps/studio` `private` home, `apps/*` glob, Node-free `api-types` import boundary. |
| Current root tsconfig | `tsconfig.json` (no `include` key; only `exclude`; `strict`, `moduleResolution: bundler`, no `jsx`) | The before-state; add `include` naming NO `apps/` path. |
| Current workspace | `pnpm-workspace.yaml` (`packages/*` only) | Add the `apps/*` glob. |
| Package precedent | `packages/mcp/package.json` | The `@deepnote/*` workspace-package shape to mirror (private here). |

## Design & UX Review

This card scaffolds toolchain only; no end-user UI. The "design" being reviewed is the isolation config (config-as-code, reviewed up front per ADR-006 Implementation Notes).

| Design Aspect | Decision / Requirement | Rationale / Notes |
| :--- | :--- | :--- |
| **Component Architecture** | `apps/studio/src/main.tsx` renders a trivial React root into `#root` from `index.html`. | Proves the React+Vite+jsdom+RTL pipeline end-to-end before real components exist. |
| **Layout Strategy** | n/a this card | Shell layout lands in step 3. |
| **Accessibility** | Biome `a11y` block + `noExplicitAny: error` now apply to `.tsx` — satisfied, not relaxed. | ADR-006 Impl Notes: a11y from day one is desirable, not a workaround. |
| **Browser Support** | Modern evergreen (localhost showcase; no SEO/cold-start budget). | ADR-006 Key Factor 1 / NG3-4. |
| **Loading States** | n/a this card | Load UI lands in step 4. |
| **Error States** | n/a this card | Error UI lands in step 4. |
| **Build/Toolchain** | All frontend deps in `apps/studio/package.json` ONLY; root `tsconfig` `include` excludes `apps/`; `apps/*` glob added; DOM-env vitest project scoped to `apps/studio`. | The two files outside `apps/` (root `tsconfig`, `pnpm-workspace.yaml`) ride the process diff only; never sliced upstream. |

## UI Development Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design Review** | ADR-006/007 accepted | - [ ] Isolation mechanism understood from ADRs. |
| **Component Planning** | trivial root only | - [ ] `main.tsx`/`index.html` entry identified. |
| **Accessibility Plan** | Biome a11y on `.tsx` | - [ ] a11y rules satisfied on the scaffold. |
| **Component Development** | `apps/studio/**` scaffold | - [ ] Package + Vite/tsconfig/index.html/main.tsx created. |
| **Component Testing** | DOM-env vitest project | - [ ] Isolation + boundary + smoke tests pass. |
| **Accessibility Testing** | Biome/cspell green | - [ ] `pnpm lintAndFormat` + `pnpm spell-check` pass with new `.tsx` + vocab. |
| **Responsive Testing** | n/a this card | - [ ] Deferred to renderer steps. |
| **Browser Testing** | `vite build` + `vite` dev | - [ ] Builds and dev-runs with HMR. |
| **UX Review** | n/a this card | - [ ] Toolchain-only. |
| **Deployment** | fork dev branch | - [ ] Backend repo-wide gate green with `apps/studio` present. |

## Component Implementation Workflow

TDD: write the isolation/boundary/smoke tests first, then satisfy them.

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Setup Component Structure** | `apps/studio/{package.json,vite.config.ts,tsconfig.json,index.html,src/main.tsx}` | - [ ] Files created following ADR-007 layout. |
| **2. Write Component Tests** | isolation test (`tsc --listFiles \| grep -c apps/ == 0`), boundary test, smoke test | - [ ] Tests written BEFORE the glob/scaffold satisfy them. |
| **3. Implement Component** | `apps/*` glob + root `include` + `jsx:"react-jsx"` config + trivial root | - [ ] Scaffold + isolation config implemented. |
| **4. Style Component** | minimal | - [ ] No styling work this card. |
| **5. Add Accessibility** | satisfy Biome a11y on `.tsx` | - [ ] a11y rules pass. |
| **6. Visual Regression Tests** | n/a | - [ ] Deferred to renderer steps. |
| **7. Manual Testing** | `pnpm --filter @deepnote/studio dev` → HMR edit reflects < 1 s | - [ ] HMR verified by hand. |
| **8. Design QA** | n/a | - [ ] Toolchain-only. |

#### Implementation Notes

**Isolation ordering (load-bearing):** the root `tsconfig.json` `"include"` must land WITH the `apps/*` glob — if the glob is added without the `include`, `tsc -p tsconfig.json` globs `apps/studio/**/*.tsx` and fails on JSX (ADR-006 §4, design Migration). Use `"include": ["packages/*/src", "test-helpers", "*.config.ts"]` (or an equivalent that provably names no `apps/` path).

## Definition of Done

### Intent

A fork developer can run the new `apps/studio` React app in a browser with sub-second HMR and produce a production bundle, while the backend's existing CI gate (the same typecheck/build/lint/spell jobs the upstream wedge relies on) keeps passing on the fork dev branch even though `apps/studio/**/*.tsx` now exists in the tree. If this breaks, a contributor would notice the backend's PR-gating `tsc` job suddenly failing on JSX it should never compile, or `apps/studio` not dev-running at all. No frontend dependency may appear in any `packages/*` package, and `apps/studio` must not import any Node module or server runtime value.

### Observable outcomes

- [ ] `apps/studio/package.json` exists with `"name": "@deepnote/studio"`, `"private": true`, and deps `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`; no `packages/*/package.json` gains any of these.
- [ ] `pnpm-workspace.yaml` includes the `apps/*` glob and root `tsconfig.json` has an `"include"` that names no `apps/` path.
- [ ] `vite build` produces a bundle and `vite` dev-runs the trivial root with HMR reflecting an edit in under ~1 s.
- [ ] **Isolation test (capstone):** on the fork dev branch with `apps/studio/**/*.tsx` present, `tsc --noEmit -p tsconfig.json --listFiles` names ZERO files under `apps/` AND the backend typecheck exits green — run it and read the output, do not assert on a string.
- [ ] **Boundary test (capstone):** a grep / `madge` / `dependency-cruiser` check proves no `packages/*` source imports `apps/`, and no module under `apps/studio` imports a Node builtin or a server-runtime value (only type-only `@deepnote/*` imports are allowed).
- [ ] **Smoke test (capstone):** the trivial React root renders under the new DOM-env (jsdom/happy-dom + `@testing-library/react`) vitest project scoped to `apps/studio`, proving React+Vite+jsdom+RTL works end-to-end.
- [ ] `pnpm lintAndFormat` and `pnpm spell-check` pass with the new `.tsx` and the React/Vite/JSX terms added to `cspell.json`/`docs-dictionary.txt`.
- [ ] `apps/studio/README.md` documents dev-run, the isolation rationale (pointer to ADR-006/007), and the "fork-only, never sliced upstream" note.

## Acceptance Criteria

- [ ] `apps/studio` is `"private": true` and carries every frontend dependency; `packages/*` carry none.
- [ ] The root `include` + `apps/*` glob land together; backend typecheck stays green with `apps/studio` in the tree.
- [ ] Isolation, boundary, and smoke tests all pass in the new DOM-env vitest project.

## UI Validation & Release

| Task | Detail/Link |
| :--- | :--- |
| **Component Location** | `apps/studio/src/main.tsx` (trivial root) |
| **Storybook Stories** | n/a (not adopted for this fork showcase) |
| **Visual Regression Coverage** | n/a this card |
| **Accessibility Report** | Biome `a11y` passes on `.tsx` |
| **Browser Test Matrix** | `vite build` + `vite` dev verified on a dev laptop |
| **Responsive Testing** | n/a this card |
| **Performance Metrics** | HMR edit-to-reflect < 1 s |
| **Design Sign-off** | ADR-006/007 (accepted) |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Component Documentation?** | Yes — `apps/studio/README.md` created. |
| **Design System Updates?** | No — no design system on this fork showcase. |
| **Accessibility Improvements?** | a11y enforced from day one on `.tsx`. |
| **Performance Issues?** | None expected; HMR target is the metric. |
| **Browser Compatibility Issues?** | Localhost evergreen only. |
| **User Feedback?** | n/a (fork showcase). |
| **Analytics Tracking?** | n/a. |

### Completion Checklist

* [ ] Design is reviewed and approved by designer/UX team. (ADR-006/007 stand in.)
* [ ] Component structure follows project architecture and design system. (ADR-007 layout.)
* [ ] All components implemented matching design specifications. (trivial root.)
* [ ] Component tests pass (unit, integration, visual regression). (isolation + boundary + smoke.)
* [ ] Accessibility validated (WCAG 2.1 AA minimum, automated + manual testing). (Biome a11y.)
* [ ] Responsive design verified across all target breakpoints and devices. (n/a this card.)
* [ ] Cross-browser compatibility verified (all supported browsers tested). (localhost evergreen.)
* [ ] Performance metrics meet requirements [if applicable]. (HMR < 1 s.)
* [ ] Designer/UX team reviewed and approved final implementation. (ADR sign-off.)
* [ ] Component documentation updated (Storybook, component library). (README.)
* [ ] Analytics tracking implemented [if applicable]. (n/a.)
* [ ] UI is deployed to production and verified working. (dev-runs on fork branch.)

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.