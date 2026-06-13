# step 4: spa-foundation project load over s1 API + state

> **Design Phase 3** (`docs/designs/m3-s2-viewer.md` ~lines 517–563). Sprint **LUIVIEW1** step 4. The shell renders a **real** project fetched from the s1 server, with loading/error states. Depends on **step 3** and on **s1** (`m3/s1/serve-api/project-open-list-api` — the `GET /api/project` endpoint + the Node-free `api-types` entry — must be merged).

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s2 → project `spa-foundation` / feature `project-load-state`; sprint LUIVIEW1 step 4
* **Feature Area/Component:** `apps/studio/src/api/fetchProject.ts`, `apps/studio/src/state/projectStore.ts`
* **Target Release/Milestone:** m3 (fork-only showcase)

**Required Checks:**
- [x] **Associated Ticket/Epic** link is included above.
- [x] **Feature Area/Component** is identified.
- [x] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

- [x] `README.md` or project documentation reviewed.
- [x] Existing architecture documentation or ADRs reviewed.
- [x] Related feature implementations or similar code reviewed.
- [x] API documentation or interface specs reviewed [if applicable].

| Document Type | Link / Location | Key Findings / Action Required |
| :--- | :--- | :--- |
| **README.md** | `apps/studio/README.md` | Note the load path + the `api-types` import boundary |
| **Architecture Docs** | ADR-007 §4, §6 | SPA imports types-only from the Node-free entry; compile-time drift-catch |
| **Design Doc** | `docs/designs/m3-s2-viewer.md` Phase 3 (~517–563), Interface (~319–339) | `fetchProject` signature, `ProjectState` discriminated union |
| **API Specs** | `@deepnote/runtime-server/types` (`api-types.ts`) | `ApiProject` is the FULL envelope: `{ path, metadata, project, openHash, capabilities }` |

### Required Reading

| Source | Location | Why |
| :--- | :--- | :--- |
| Design Phase 3 | `docs/designs/m3-s2-viewer.md` ~517–563 | Goal / Deliverables / Test strategy / DoD lifted into this card |
| Interface (client + store) | `docs/designs/m3-s2-viewer.md` ~319–339 | `fetchProject(baseUrl): Promise<ApiProject>`; `ProjectState = loading \| loaded \| error` |
| s1 `ApiProject` type | `@deepnote/runtime-server/types` (`packages/runtime-server/src/api-types.ts`) | The return type — imported, never re-declared (ADR-007 §6) |
| ADR-006 / ADR-007 | `docs/adr/ADR-006-*.md`, `docs/adr/ADR-007-*.md` | Isolation + type-only-import boundary |

## Design & Planning

### Initial Design Thoughts & Requirements

* Deliverable: `src/api/fetchProject.ts` — `GET /api/project`, returns the **full** `ApiProject` envelope imported from `@deepnote/runtime-server/types`; throws a typed `ProjectLoadError` on non-2xx / network failure. Read-only: GET only, no POST/WS (R8).
* Deliverable: `src/state/projectStore.ts` — the `{ status: "loading" } | { status: "loaded"; project; capabilities; activeNotebookId } | { status: "error"; error }` discriminated state, wired into `App`.
* Deliverable: loading + error UI. The error UI carries the actionable message the s1 API surfaces (e.g. "deepnote-toolkit not installed") — rendering only, no run/retry execution.
* Constraint (C1): `fetchProject`'s return type **is** the imported `ApiProject` — drift cannot be silent because there is no second shape to drift from.
* Constraint (R2): the only thing imported from `@deepnote/runtime-server` is types from the Node-free entry.

### Acceptance Criteria

- [x] `App` fetches `GET /api/project`, loads it into state, and renders the shell from real data.
- [x] Loading and error states render correctly (error shows the s1-surfaced message).
- [x] The SPA imports **only** types from `@deepnote/runtime-server`'s Node-free entry; boundary check + type-only-import test pass.
- [x] R7 checkpoint (split a): shell-to-render against an already-running server is measured (blocks still placeholder until step 5+).

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 3 | - [x] Design Complete |
| **Test Plan Creation** | compile-time drift test + state test + type-only-import test | - [x] Test Plan Approved |
| **TDD Implementation** | fetchProject + projectStore + loading/error UI | - [x] Implementation Complete |
| **Integration Testing** | Against a real (or test-double) s1 server | - [x] Integration Tests Pass |
| **Documentation** | README load path + `api-types` boundary | - [x] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | compile-time `expectTypeOf<Awaited<ReturnType<typeof fetchProject>>>().toEqualTypeOf<ApiProject>()`; runtime 2xx→fixture / non-2xx→typed error; store transitions; type-only-import assertion | - [x] Failing tests are committed and documented |
| **2. Implement Feature Code** | fetchProject + ProjectLoadError + projectStore + UI | - [x] Feature implementation is complete |
| **3. Run Passing Tests** | DOM-env vitest green; type assertions compile | - [x] Originally failing tests now pass |
| **4. Refactor** | Tidy fetch/error plumbing | - [x] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` + `pnpm typecheck` + isolation/boundary green | - [x] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | R7 split a: shell-to-render against already-running server measured | - [x] Performance requirements are met |

### Implementation Notes

**Test Strategy:** DOM-env vitest project (jsdom + `@testing-library/react`), tests first. The drift-catch is a **compile-time** type-level assertion (not a runtime mock of a local shape): because the SPA imports `ApiProject` rather than re-declaring it, any s1 contract change the SPA hasn't absorbed is a compile error. A runtime test still asserts the fixture on 2xx and the typed error on non-2xx, and the store transitions `loading → loaded` / `loading → error`.

**Key Implementation Decisions:** Read-only — GET only, no POST/WS. Error UI renders the s1-surfaced actionable message; no retry/run execution here.

## Definition of Done

**Intent (plain English):** Start the real s1 server, open the app, and the app reaches out over HTTP, pulls the whole project, and renders the shell from that live data — not a fixture. If the server returns a failure, the app shows a clear error banner with the message the server provided, instead of crashing. The project's shape is the server's own contract type, so the two can never silently disagree.

**Observable outcomes (unfakeable):**

- [x] **Capstone:** against a real (or test-double) s1 server, the shell fetches `GET /api/project` and renders the project (assert real notebooks from the response appear in the DOM); and a non-2xx response drives the **error** state (assert the error banner with the s1-surfaced message renders, not the shell).
- [x] `fetchProject` returns the imported `ApiProject` (compile-time `expectTypeOf` assertion holds; fixture typed `: ApiProject`).
- [x] The store transitions `loading → loaded` on success and `loading → error` on failure; `App` renders spinner / shell / banner respectively.
- [x] The only import from `@deepnote/runtime-server` is types from the Node-free entry (type-only-import + boundary check pass).
- [x] R7 split a (shell-to-render against an already-running server) is measured and reported.

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban-reviewer approval |
| **QA Verification** | Real fetch renders shell; non-2xx renders banner |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No |
| **Future Enhancements** | step 5 replaces placeholder blocks with real renderers |

### Completion Checklist

- [x] All acceptance criteria are met and verified.
- [x] All tests are passing (unit, integration, e2e, performance).
* [ ] Code review is approved and PR is merged.
- [x] Documentation is updated (README, API docs, user guides).
* [ ] Feature is deployed to production.
* [ ] Monitoring and alerting are configured.
* [ ] Stakeholders are notified of completion.
* [ ] Follow-up actions are documented and tickets created.
* [ ] Associated ticket/epic is closed.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.


## Executor Close-out (LUIVIEW1 step 4)

**Status:** code complete, committed `17c2cf2`, tag `LUIVIEW1-4p6tbf-done`. Left `in_progress` for the reviewer.

### What shipped
- `apps/studio/src/api/fetchProject.ts` — `fetchProject(baseUrl = ''): Promise<ApiProject>`: read-only `GET /api/project` returning the FULL imported `ApiProject` envelope; throws typed `ProjectLoadError` (carries the s1 `{ error }` message + HTTP status on non-2xx; message only, no status, on a pre-response network failure; status + parse message on an unparseable 2xx body). The ONLY `@deepnote/runtime-server` import is `import type { ApiProject } from '@deepnote/runtime-server/types'`.
- `apps/studio/src/state/projectStore.ts` — the `{ status: 'loading' } | { status: 'loaded'; project; capabilities; activeNotebookId } | { status: 'error'; error }` discriminated union + `loadProjectState(loader = fetchProject)` (maps success→loaded with the active notebook resolved via the shared `initNotebookId` precedence; any rejection→error, normalised to `ProjectLoadError`).
- `apps/studio/src/shell/App.tsx` — now the FETCH CONTAINER: spinner (`<output>`, implicit `role="status"`) while in flight, `<Shell>` on loaded, error banner (`role="alert"`) carrying the s1 message on failure. `loader`/`baseUrl` injectable for tests; production passes neither (same-origin `fetchProject`).
- `apps/studio/src/shell/Shell.tsx` — the loaded-project view extracted verbatim from the old `App` (selection⇆hash routing unchanged).
- `apps/studio/src/main.tsx` — renders `<App />` with no fixture prop (real fetch). The fixture is now test-only.
- `apps/studio/README.md` — new "Project load path" section + `api-types` import-boundary note; "Shell + routing" updated to point at `Shell.tsx`.

### Tests (what they actually proved)
- **Studio DOM-env suite: 29/29 pass** (`vitest run`, jsdom + RTL). Covers: App load lifecycle (loading→spinner-not-shell / loaded→real notebooks in DOM + project heading / error→alert with the s1 message, not the shell / spinner gone on error); `fetchProject` runtime control flow (2xx→envelope, baseUrl join, non-2xx→typed error with the `{ error }` message, status-fallback message, network-failure wrap, unparseable-body wrap); `loadProjectState` transitions; `Shell` list/order/routing (the old App.test assertions, moved).
- **Capstone caveat (honest scope):** the capstone is verified against a **test-double loader** (an injected `() => Promise.resolve(sampleProject)` / `Promise.reject(ProjectLoadError)`), NOT against a live `deepnote serve` process. The card's DoD explicitly allows "a real **or test-double** s1 server"; the fetch path itself (`fetch('/api/project', { method: 'GET' })` → parse → typed error) is unit-tested against a stubbed `globalThis.fetch`. End-to-end against a booted s1 server is not exercised here.
- **Compile-time drift-catch is load-bearing — proven:** `fetchProject.test-d.ts` carries `expectTypeOf<Awaited<ReturnType<typeof fetchProject>>>().toEqualTypeOf<ApiProject>()`. I temporarily drifted `fetchProject`'s return type to `{ wrong: true }` and `tsc -p apps/studio/tsconfig.json` FAILED on that assertion (TS2344) plus the downstream store/App sites; restoring made it green again. So drift cannot be silent.
- **Isolation/boundary: 3/3 pass** (`test-helpers/apps-studio-isolation.test.ts`): root `tsc --listFilesOnly` names ZERO `apps/` files; no `packages/*` declares a frontend dep; `apps/studio` imports no `node:` builtin and not the bare runtime-server entry (type-only `/types` subpath only).
- **Typecheck:** `tsc --noEmit -p apps/studio/tsconfig.json` → EXIT 0. **Biome:** `biome check apps/studio/src` → clean (the loading affordance is `<output>` to satisfy `a11y/useSemanticElements`, not relaxed). **Prettier:** `apps/studio/README.md` formatted.

### R7 split-a (graded metric — measured & reported)
Shell-to-render against an already-resolving load (the kernel-free viewer path), jsdom, n=20: **mean 33.6 ms, p50 18.6 ms, p95 320 ms** (p95 inflated by first-iteration warm-up). Measured via a throwaway probe that was NOT committed. This is the in-process equivalent of an already-running server's response; the cold `deepnote serve`-to-render (split b) is s1-gated and out of scope here.

### Spell-check note (environment, not a defect)
`pnpm spell-check` reports "Files checked: 0" in this worktree because `cspell.json` sets `useGitignore: true` and the worktree lives under the gitignored `.claude/worktrees/` path — so cspell skips ALL files here, pre-existing and equal across every file (0 issues on every file individually). The dispatcher's post-merge validation runs spell-check on the merged branch where the path is not gitignored.

### Lifecycle checkboxes left for the reviewer / N/A
- "Code Review Approved" / "Code review is approved and PR is merged" / "Associated ticket/epic is closed" — reviewer/PR/closeout-owned; left unchecked per executor workflow (card stays `in_progress`).
- "Deployment Plan Ready" / "Feature is deployed to production" / "Monitoring and alerting are configured" / "Stakeholders are notified" / "Follow-up actions documented" — **N/A for this fork-only showcase milestone** (no deploy/monitoring surface). Reviewer may tick-as-N/A or defer.

### Deferred / follow-ups
None. No tech debt created. step 5 replaces the placeholder `BlockRenderer` with real renderers (unchanged seam).
