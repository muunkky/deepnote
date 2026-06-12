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
* [ ] **API resource/endpoint** path is clearly defined.
* [ ] **API version** is specified and versioning strategy is understood.
* [ ] **Client impact** is identified (who will consume this API).

### Required Reading

| Source | Section / lines | Why |
| :--- | :--- | :--- |
| `docs/designs/m3-s1-server-api-and-serve.md` | "Phase 2: Open project + list API"; "Interface Design > HTTP surface" (`ApiProject`); KD-6 | The `ApiProject` shape, `loadProject()`/`startEngine()` split, `openHash`, `capabilities`. |
| `packages/cli/src/commands/run.ts` | `setupProject` (298–405); `resolveAndConvertToDeepnote` import (45) | The resolution sequence to reuse (interpreter/kernel resolution + convert), as `run.ts` composes it. |
| `packages/runtime-core/src/kernel-client.ts` | `KernelNotRegisteredError` (192); `selectKernelName`/resolution surface | Capability flag source: `kernelLanguage`/`reactivity`. |
| `packages/blocks/src/deepnote-file/deserialize-deepnote-file.ts` | `deserializeDeepnoteFile` (8) | The deep-equal reference for the open payload. |
| `packages/blocks/src/index.ts` | exports (41,45) | `deserializeDeepnoteFile` / `serializeDeepnoteFile` entry points. |

## API Design & Contract Review

* [ ] API design guidelines reviewed (REST conventions, naming, HTTP status codes).
* [ ] Existing API contracts reviewed for consistency (similar endpoints, patterns).
* [ ] OpenAPI/Swagger specification template reviewed for documentation format.
* [ ] Authentication/authorization requirements reviewed (OAuth, API keys, JWT).
* [ ] Rate limiting and quota policies reviewed for this endpoint.
* [ ] Versioning strategy reviewed (URL versioning, header versioning, deprecation policy).

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
| **API Contract Design** | `ApiProject` in `api-types.ts` (from scaffold) | - [ ] OpenAPI/Swagger spec is complete and reviewed. |
| **Contract Review** | reviewer | - [ ] API contract is reviewed and approved by team/stakeholders. |
| **TDD Implementation** | `session.loadProject()` + HTTP router GET /api/project | - [ ] TDD workflow followed (tests first, then implementation). |
| **Integration Tests** | deep-equal vs `deserializeDeepnoteFile(fixture)` | - [ ] Integration tests cover happy path and error cases. |
| **Security Review** | localhost bind, no kernel port exposure | - [ ] Security requirements validated (auth, input validation, rate limiting). |
| **API Documentation** | README `GET /api/project` section | - [ ] API documentation is complete with examples and error codes. |
| **Client SDK Updates** | N/A — SPA consumes types directly | - [ ] Client SDKs updated [if applicable] or follow-up cards created. |
| **Deployment** | N/A (not published in s1) | - [ ] API is deployed and verified in production. |

## Definition of Done

### Intent

Someone pointing the server at a `.deepnote` file can fetch the whole project — metadata and every notebook/block with its previously-saved outputs — and render it without a kernel ever starting, exactly as if they had deserialized the file directly. This is what lets the m3/s2 viewer paint a notebook before (or without) any execution. If this breaks, the viewer would show a project that differs from what `deepnote run`/the file actually contains (missing blocks, dropped persisted outputs), or it would refuse to open a project just because the kernel is mis-installed.

### Observable outcomes

- [ ] **Capstone:** `GET /api/project` over a real fixture returns an `ApiProject` whose `project` + `metadata` deep-equal `deserializeDeepnoteFile(<same fixture bytes>)` (persisted outputs intact), and the request succeeds with **no kernel started**.
- [ ] `openHash` is a stable SHA-256 of the on-disk bytes at open time (same bytes in → same hash).
- [ ] `capabilities` reports `kernelLanguage` and `reactivity` derived from resolution, with a missing/mis-installed kernel reflected as a capability flag (not an open failure).
- [ ] A bad/unresolvable project path returns `400 { error }`, not a crash.

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Contract Tests** | `ApiProject` shape matches `api-types.ts` | - [ ] Contract tests validate API adheres to OpenAPI spec. |
| **2. Write Failing Integration Tests** | GET /api/project deep-equal vs direct deserialize; works with no kernel | - [ ] Integration tests written covering all endpoints and methods. |
| **3. Implement API Endpoints** | `session.loadProject()` (split from `startEngine()`), HTTP router | - [ ] API endpoints implemented, returning correct status codes. |
| **4. Run Passing Tests** | green | - [ ] All integration tests pass, API behavior verified. |
| **5. Add Error Handling Tests** | bad path → 400 (mocked) | - [ ] Error handling tests written and passing. |
| **6. Security Tests** | no kernel port returned in payload | - [ ] Security tests validate auth, input sanitization, rate limiting. |
| **7. Performance Tests** | N/A | - [ ] Performance validated against requirements [if applicable]. |
| **8. Regression Suite** | package test green | - [ ] Full regression suite passed, no existing APIs broken. |

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

* [ ] OpenAPI/Swagger specification is complete and merged.
* [ ] API contract is reviewed and approved by team/stakeholders.
* [ ] TDD workflow followed: tests written first, then implementation.
* [ ] All integration tests pass (happy path + error cases).
* [ ] Security requirements validated (authentication, authorization, input validation, rate limiting).
* [ ] API documentation is complete with request/response examples and error codes.
* [ ] Performance validated against requirements [if applicable].
* [ ] Client SDKs updated or follow-up cards created.
* [ ] API changelog updated with new endpoints and changes.
* [ ] Monitoring and alerts configured for the new API.
* [ ] API is deployed to production and verified working.
* [ ] Client communication sent (email, Slack, API portal announcement).
