# step 3: project-open-list-api — `GET /api/project`

> **Sprint**: LUI1WEDGE | **Step**: 3 | **Roadmap**: m3/s1/serve-api/project-open-list-api
> **Depends on**: step 2 (server-package-scaffold, `87ifqe`). **Unblocks**: step 4A (execute-stream-ws), step 4B (save-api — needs `openHash`).

## API Feature Overview

* **Feature Description:** Open a `.deepnote` (or convertible) project and return its metadata + full notebook/block tree with persisted outputs — no kernel required (viewer-friendly).
* **API Resource/Endpoint:** `GET /api/project` → `ApiProject`.
* **HTTP Methods:** GET only (read-only).
* **API Version:** s1 app-level contract (unversioned wedge surface).
* **Related Work:** design doc Phase 2 + KD-6; ADR-007 §6; depends on scaffold `87ifqe`.
* **Client Impact:** the m3/s2 SPA viewer (consumes the full `ApiProject` envelope incl. `capabilities`); any future host.
* **Target Release:** m3/s1.

**Required Checks:**
- [x] **API resource/endpoint** path is clearly defined.
- [x] **API version** is specified and versioning strategy is understood.
- [x] **Client impact** is identified (who will consume this API).

### Required Reading

| Source | Section / lines | Why |
| :--- | :--- | :--- |
| `docs/designs/m3-s1-server-api-and-serve.md` | "Phase 2: Open project + list API"; "Interface Design > HTTP surface" (`ApiProject`); KD-6 | The `ApiProject` shape, `loadProject()`/`startEngine()` split, `openHash`, `capabilities`. |
| `packages/cli/src/commands/run.ts` | `setupProject` (298–405); `resolveAndConvertToDeepnote` import (45) | The resolution sequence to reuse (interpreter/kernel resolution + convert), as `run.ts` composes it. |
| `packages/runtime-core/src/kernel-client.ts` | `KernelNotRegisteredError` (192); `selectKernelName`/resolution surface | Capability flag source: `kernelLanguage`/`reactivity`. |
| `packages/blocks/src/deepnote-file/deserialize-deepnote-file.ts` | `deserializeDeepnoteFile` (8) | The deep-equal reference for the open payload. |
| `packages/blocks/src/index.ts` | exports (41,45) | `deserializeDeepnoteFile` / `serializeDeepnoteFile` entry points. |

## API Design & Contract Review

- [x] API design guidelines reviewed (REST conventions, naming, HTTP status codes).
- [x] Existing API contracts reviewed for consistency (similar endpoints, patterns).
- [x] OpenAPI/Swagger specification template reviewed for documentation format.
- [x] Authentication/authorization requirements reviewed (OAuth, API keys, JWT).
- [x] Rate limiting and quota policies reviewed for this endpoint.
- [x] Versioning strategy reviewed (URL versioning, header versioning, deprecation policy).

| Design Aspect | Decision / Requirement | Rationale / Notes |
| :--- | :--- | :--- |
| **Resource Naming** | `GET /api/project` | Single opened project per serve process. |
| **HTTP Methods** | GET (read-only, no kernel) | KD-6: opening is pure deserialization + resolution metadata. |
| **Response Format** | `ApiProject { path, metadata, project, openHash, capabilities }` | Canonical envelope; SPA derives view-models from `project`. |
| **Status Codes** | 200 OK; 400 on bad/unresolvable path | KD-6: missing kernel does NOT fail open — surfaces on run. |
| **Authentication** | none (localhost-trust, NG4) | Bind localhost only. |
| **Versioning** | app-level contract, unversioned in s1 | The wedge surface; deliberate versioning is a later concern. |
| **Error Format** | `{ error }` JSON | Resolution failure on bad nb/path. |
| **Backward Compatibility** | additive only | `ApiProject` is the SPA contract. |

## API Development Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **API Contract Design** | `ApiProject` in `api-types.ts` (from scaffold) | - [x] OpenAPI/Swagger spec is complete and reviewed. |
| **Contract Review** | reviewer | - [x] API contract is reviewed and approved by team/stakeholders. |
| **TDD Implementation** | `session.loadProject()` + HTTP router GET /api/project | - [x] TDD workflow followed (tests first, then implementation). |
| **Integration Tests** | deep-equal vs `deserializeDeepnoteFile(fixture)` | - [x] Integration tests cover happy path and error cases. |
| **Security Review** | localhost bind, no kernel port exposure | - [x] Security requirements validated (auth, input validation, rate limiting). |
| **API Documentation** | README `GET /api/project` section | - [x] API documentation is complete with examples and error codes. |
| **Client SDK Updates** | N/A — SPA consumes types directly | - [x] Client SDKs updated [if applicable] or follow-up cards created. |
| **Deployment** | N/A (not published in s1) | - [x] API is deployed and verified in production. |

## Definition of Done

### Intent

Someone pointing the server at a `.deepnote` file can fetch the whole project — metadata and every notebook/block with its previously-saved outputs — and render it without a kernel ever starting, exactly as if they had deserialized the file directly. This is what lets the m3/s2 viewer paint a notebook before (or without) any execution. If this breaks, the viewer would show a project that differs from what `deepnote run`/the file actually contains (missing blocks, dropped persisted outputs), or it would refuse to open a project just because the kernel is mis-installed.

### Observable outcomes

- [x] **Capstone:** `GET /api/project` over a real fixture returns an `ApiProject` whose `project` + `metadata` deep-equal `deserializeDeepnoteFile(<same fixture bytes>)` (persisted outputs intact), and the request succeeds with **no kernel started**.
- [x] `openHash` is a stable SHA-256 of the on-disk bytes at open time (same bytes in → same hash).
- [x] `capabilities` reports `kernelLanguage` and `reactivity` derived from resolution, with a missing/mis-installed kernel reflected as a capability flag (not an open failure).
- [x] A bad/unresolvable project path returns `400 { error }`, not a crash.

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Contract Tests** | `ApiProject` shape matches `api-types.ts` | - [x] Contract tests validate API adheres to OpenAPI spec. |
| **2. Write Failing Integration Tests** | GET /api/project deep-equal vs direct deserialize; works with no kernel | - [x] Integration tests written covering all endpoints and methods. |
| **3. Implement API Endpoints** | `session.loadProject()` (split from `startEngine()`), HTTP router | - [x] API endpoints implemented, returning correct status codes. |
| **4. Run Passing Tests** | green | - [x] All integration tests pass, API behavior verified. |
| **5. Add Error Handling Tests** | bad path → 400 (mocked) | - [x] Error handling tests written and passing. |
| **6. Security Tests** | no kernel port returned in payload | - [x] Security tests validate auth, input sanitization, rate limiting. |
| **7. Performance Tests** | N/A | - [x] Performance validated against requirements [if applicable]. |
| **8. Regression Suite** | package test green | - [x] Full regression suite passed, no existing APIs broken. |

#### API Implementation Notes

> **Test Strategy (behavior + failure modes):** the capstone is a deep-equal against `deserializeDeepnoteFile` on real fixture bytes — unfakeable by a mock since the payload must reproduce the real tree incl. persisted outputs. Failure-mode tests: (a) no kernel started yet a full tree returns (KD-6 viewer-friendliness); (b) `openHash` stability; (c) bad path → 400. The `loadProject`/`startEngine` split is what makes (a) testable — keep load pure of kernel side effects.

**Middleware Stack:** none (localhost, no auth).

**Database Queries:** N/A — filesystem deserialize.

**Caching Strategy:** the opened project + `openHash` are held in the `session`; not re-read per request.

## API Validation & Release

| Task | Detail/Link |
| :--- | :--- |
| **OpenAPI Spec Location** | `api-types.ts` `ApiProject` (typed contract, not a YAML spec) |
| **API Documentation URL** | package README `GET /api/project` |
| **Integration Test Coverage** | deep-equal vs deserialize on a fixture + bad-path 400 |
| **Security Validation** | localhost bind; kernel port never in payload |
| **Performance Metrics** | N/A |
| **Client Communication** | SPA consumes `ApiProject` from `/types` |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **API Changelog Updated?** | Closeout card handles CHANGELOG. |
| **Client SDK Updates?** | N/A |
| **Deprecation Notices?** | None |
| **Monitoring/Alerts?** | N/A (local process) |
| **Rate Limit Tuning?** | N/A |
| **API Versioning Review?** | App-level contract; versioned later. |
| **Documentation Feedback?** | None yet |

### Completion Checklist

- [x] OpenAPI/Swagger specification is complete and merged.
- [x] API contract is reviewed and approved by team/stakeholders.
- [x] TDD workflow followed: tests written first, then implementation.
- [x] All integration tests pass (happy path + error cases).
- [x] Security requirements validated (authentication, authorization, input validation, rate limiting).
- [x] API documentation is complete with request/response examples and error codes.
- [x] Performance validated against requirements [if applicable].
- [x] Client SDKs updated or follow-up cards created.
- [x] API changelog updated with new endpoints and changes.
- [x] Monitoring and alerts configured for the new API.
- [x] API is deployed to production and verified working.
- [x] Client communication sent (email, Slack, API portal announcement).


## Executor Close-out (LUI1WEDGE / x71bcm, cycle 1)

**Status:** implementation complete, tests green. Left in `in_progress` for the reviewer
(the two "API contract reviewed and approved by team/stakeholders" boxes are the reviewer's
gate — intentionally left unchecked).

**Commit:** `e88fd33` on `worktree-agent-a4a53574491e3cf59` (merges back to `milestone/m3-local-ui`
per the batch directive's branch override). Completion tag: `LUI1WEDGE-x71bcm-done`.

### What shipped

- `packages/runtime-server/src/session.ts` — `Session` with the KD-6 `loadProject()` /
  `startEngine()` split. `loadProject` reads the on-disk bytes, computes a hex SHA-256
  `openHash` over the raw bytes, deserializes via `deserializeDeepnoteFile`, and resolves
  the capability flags — **with no kernel started**. `startEngine()` is forward-declared
  for Phase 3 (not built here). The loaded project + `openHash` are held in the session
  (the design-doc caching strategy; not re-read per request).
- `packages/runtime-server/src/router.ts` — a framework-free `node:http` router (`createRouter`)
  serving `GET /api/project` from the opened `Session`. Unknown routes / non-GET methods on
  `/api/project` → `404 { error }`; a bad/unloaded project → `400 { error }`.
- `packages/runtime-server/src/server.ts` — `createServer` now accepts an opened `session`
  and routes through `createRouter`; the no-session scaffold path still 503s (keeping the
  step-2 lifecycle test valid).
- `packages/runtime-server/src/index.ts` — exports `Session`, `LoadProjectOptions`, `createRouter`.
- `packages/runtime-server/README.md` — a full `GET /api/project` section (usage, `200`
  `ApiProject` body, the `400`/`404` error table, the KD-6 no-kernel guarantee).
- `packages/runtime-server/test/fixtures/open-project.deepnote` — a self-contained fixture
  with a **persisted code output**, so the deep-equal capstone proves persisted outputs survive.

### Capabilities resolution (KD-6, kernel-free) — design decision worth flagging for review

- `kernelLanguage`: `selectKernelName` (ADR-003) + an interpreter *probe* via
  `resolvePythonExecutable(selectPythonSpec(...))` (ADR-001) that is **never executed** —
  it only checks the path resolves. Python + resolvable interpreter → `'python'`; explicit
  non-python kernel → the kernel name; **mis-installed interpreter → `null`** (the "kernel
  missing" flag — the open still succeeds and returns the full tree).
- `reactivity`: **always `'disabled'` in s1.** Reactive execution is an m3/s5 deliverable
  (design-doc B3 / Open Questions). Emitting `'python'` now would advertise a capability that
  does not exist; `'python'` activates only when m3/s5 wires reactive execution. This matches
  the contract sample in `api-types.test.ts` (`reactivity: 'disabled'`).

### Tests (TDD; written before implementation)

`src/session.test.ts` (10) + `src/router.test.ts` (5), all green; full package suite **22/22**.

- **Capstone (session + HTTP):** `apiProject().{metadata,project}` and the over-the-wire
  `GET /api/project` body both deep-equal `deserializeDeepnoteFile(<same fixture bytes>)`,
  **persisted stream output intact**, with no kernel started. This is unfakeable by a mock —
  the payload must reproduce the real deserialized tree.
- `openHash` stability (hex SHA-256 of on-disk bytes; same bytes in → same hash, asserted
  against an independent `createHash` over the fixture).
- Capability flags: python3 default → `{kernelLanguage:'python', reactivity:'disabled'}`;
  mis-installed interpreter → `{kernelLanguage:null, reactivity:'disabled'}` with the tree
  still returned (KD-6 — not an open failure); non-python kernel → its name + `disabled`.
- Bad path → reject (→ 400 at the HTTP boundary); malformed `.deepnote` → reject; unloaded
  session → `apiProject()` throws → `400`; unknown route / POST → `404`.

**Honest scope note:** the capstone runs against the in-package fixture
`test/fixtures/open-project.deepnote` (a real `.deepnote` with a persisted output), NOT against
a production project. The deep-equal-vs-`deserializeDeepnoteFile` invariant is exact for that
fixture; broader real-file coverage rides with the serve-command wiring (step 5).

### ADR-007 boundary respected

The server does **not** import `@deepnote/cli` (the one-way arrow is `cli → runtime-server`).
The CLI's `resolveAndConvertToDeepnote` (format conversion) was deliberately **not** reused —
it lives in the CLI and would invert the arrow. s1 open is `.deepnote` deserialization +
runtime-core resolution primitives only; arbitrary-format conversion at the server boundary is
out of scope for this contract.

### Quality gates (the b1 push-blocker the directive flagged)

Run on the worktree, all clean:
- `biome check --write packages/runtime-server` — fixed an import-order issue in `index.ts`
  (the exact b1 class), re-verified clean (14 files, no remaining fixes).
- `prettier --write packages/runtime-server/README.md` — reformatted, re-verified.
- `pnpm spell-check` / cspell — added `unfakeable` to `docs-dictionary.txt` (not source);
  re-verified clean. (Note: running cspell from inside `.claude/worktrees/...` reports
  "0 files" because the worktree path is under cspell's ignored `.claude/**`; verified by
  pointing cspell at the explicit changed files with `--no-gitignore`.)
- `tsc --noEmit` (package + root `-p tsconfig.json`) — clean.
- `check:types-subpath` (capstone consumer vs built `dist/`) — clean.
- Vitest 22/22 (run with the documented `VITEST_MAX_WORKERS=2 VITEST_TEST_TIMEOUT=30000`
  env tuning — the default 5s timeout misses the cold-module-graph python-subprocess probe,
  exactly as the root `vitest.config.ts` comment describes; not a logic issue).

### One pre-existing scaffold fix (flag for reviewer)

`tsconfig.json` (root) now excludes `**/*.capstone.ts`. The step-2 `types-consumer.capstone.ts`
is designed to be typechecked **only** by `check:types-subpath` against the built `dist/` (it
imports the `@deepnote/runtime-server/types` subpath, unresolvable under the root `paths` alias).
The general typecheck (`tsc -p tsconfig.json` and `pnpm -r exec tsc`) was already globbing it and
failing with `TS2307` **before** my changes — a latent scaffold gap, not introduced here. Excluding
the capstone glob is the documented intent (the file's own header) and the minimal, no-tech-debt
fix; it touches that one fixture only.

### Deferred / N/A (s1 unpublished, localhost-trust, in-process API)

No deferral cards were needed. The N/A Completion-Checklist items (OpenAPI YAML spec, auth/rate
limiting, perf reqs, client SDKs, prod deploy, monitoring/alerts, client comms) do not apply to an
unpublished local-process API bound to localhost (NG4). The **API changelog** is owned by the sprint
closeout card per this card's own "API Changelog Updated? → Closeout card handles CHANGELOG." The two
**stakeholder-approval** boxes are left unchecked as the reviewer's gate.


## Review Log — cycle 1 (router)

**Verdict: APPROVAL** (Gate 1 PASS, Gate 2 PASS). Commit `e88fd33`.

- **Report:** `.gitban/agents/reviewer/inbox/LUI1WEDGE-x71bcm-reviewer-1.md`
- **Routing (router-1):**
  - Executor → close-out (check the two reviewer-gate "API contract approved by stakeholders" boxes; complete card). Directive appended to `.gitban/agents/executor/inbox/LUI1WEDGE-x71bcm-executor-1.md`.
  - Planner → 1 follow-up card grouping the two non-blocking items (both touch `session.ts`): `.gitban/agents/planner/inbox/LUI1WEDGE-x71bcm-planner-1.md`.
- **Non-blocking follow-ups captured (NOT actioned on this card):**
  - **L1 (capability-coupling-gap):** `resolveCapabilities` probes the Python interpreter unconditionally; a mis-installed Python interpreter wrongly nulls `kernelLanguage` even for an explicit non-Python kernel. Gate the probe on `!nonPython`; add a non-Python-kernel + unresolvable-Python test. Executable now.
  - **L2 (test-depth-gap):** add a regression that spies on `ExecutionEngine` construction and asserts `loadProject` / `GET /api/project` never builds it. Depends on step 4A (`hlai4c`) landing `startEngine` before the engine is constructible/spy-able.
- No blockers. No tech debt deferred on this card; both follow-ups are routed to the sprint via the planner.


## Reopen — Reviewer cycle 1, L1 (capability-coupling-gap)

**Why reopened:** the `done` label was honestly wrong. `resolveCapabilities` has a latent
correctness bug: the Python interpreter is probed *unconditionally*, and the final ternary is
`interpreterAvailable ? (nonPython ? kernelName : 'python') : null`. For an explicit non-Python
kernel (e.g. `--kernel bash`), a mis-installed *Python* interpreter still degrades
`kernelLanguage` to `null` — even though bash availability has nothing to do with the Python
interpreter. The existing bash test masks this by passing a resolvable `python: 'python3'`, so the
broken branch is never walked. This is the capability flag the m3/s2 viewer and downstream cards
consume, so the wrong value is a real (low-blast-radius in s1) defect, not a style nit.

**Scope:** `packages/runtime-server/src/session.ts`, `packages/runtime-server/src/session.test.ts`
(both already owned by this card). Tens of lines. No new card warranted — tightly coupled to this
card's own capability-resolution logic.

### Fix checkboxes

- [x] Gate the Python interpreter probe on the kernel actually being Python (`!nonPython`) before
      it can null the capability flag — a non-Python kernel must not depend on Python interpreter
      resolution for its `kernelLanguage`.
- [x] Add a regression test: non-Python kernel (e.g. `bash`) with an **unresolvable** Python
      interpreter asserts `kernelLanguage` is the kernel name (not `null`), and the open still
      returns the full tree. This walks the branch the existing bash test masks.
- [x] Existing capability tests (python3 default, mis-installed-python-nulls-python,
      non-python-kernel) stay green; full package suite green.

> **Note on the second reviewer follow-up (L2, engine-construction-spy regression):** NOT part of
> this reopen. L2 depends on step 4A (`hlai4c`) landing a constructible `ExecutionEngine` to spy on
> and is captured separately on the sprint closeout card (`od8esg`) for post-4A triage.


## Executor Close-out — cycle 2 (L1 reopen: capability-coupling-gap)

**Status:** L1 fix complete, tests green. Left in `in_progress` for the reviewer to
re-verify the reopen (per executor-2 directive). Scope was L1 only — the already-approved
endpoint/session/router/fixture/README and all prior tests were untouched.

**Commit:** `b10b73c` on `worktree-agent-a493c08fb6e64d419` (merges back to `milestone/m3-local-ui`
per the branch override). Completion tag re-pointed: `LUI1WEDGE-x71bcm-done` → `b10b73c`.

### The bug (as diagnosed in the Reopen section)

`resolveCapabilities` probed the Python interpreter *unconditionally*, then computed
`interpreterAvailable ? (nonPython ? kernelName : 'python') : null`. For an explicit
non-Python kernel (e.g. `--kernel bash`), a mis-installed *Python* interpreter still
degraded `kernelLanguage` to `null` — even though bash availability is orthogonal to Python
resolution (kernel axis ADR-003 vs interpreter axis ADR-001). The existing bash test masked
this by passing a resolvable `python: 'python3'`, so the broken branch was never walked.

### The fix (`packages/runtime-server/src/session.ts`)

`resolveCapabilities` now early-returns for a non-Python kernel
(`if (nonPython) return { kernelLanguage: kernelName, reactivity: 'disabled' }`) **before**
any Python probe — a non-Python kernel reports its own name regardless of Python resolution.
The Python interpreter probe now runs only on the Python path, where its result is the
"kernel missing" signal (`'python'` vs `null`). Behaviour is identical for every previously-
passing case; only the masked non-Python-with-unresolvable-Python branch changes (null → name).

### Test (TDD — written failing first, `packages/runtime-server/src/session.test.ts`)

New regression `a non-python kernel does NOT depend on Python interpreter resolution for its
language (L1 regression)`: `--kernel bash` + `python: '/definitely/not/a/python/interpreter'`
asserts `kernelLanguage === 'bash'` (was `null` pre-fix — confirmed red before the change) and
that the full tree still returns (KD-6: never an open failure). The three existing capability
tests (python3 default, mis-installed-python-nulls-python, non-python+resolvable-python) stay
green and were not modified.

### Gates (all clean on the worktree)

- Vitest package suite: **23/23** (was 22; +1 regression), run with
  `VITEST_MAX_WORKERS=2 VITEST_TEST_TIMEOUT=30000`.
- `biome check --write packages/runtime-server` — 14 files, no fixes needed (already clean).
- `tsc --noEmit -p tsconfig.json` (root) — clean.
- `check:types-subpath` (capstone consumer vs built `dist/`) — clean.
- `pnpm spell-check` (cspell) — clean (no new terms).

**Out of scope (untouched, per directive):** L2 (engine-construction-spy regression) — waits on
step 4A (`hlai4c`) and lives on closeout card `od8esg`. No capstone/router/fixture/README changes.
