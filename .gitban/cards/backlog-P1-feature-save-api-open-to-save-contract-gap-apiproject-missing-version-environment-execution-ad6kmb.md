# save-api: close the open→save contract gap (ApiProject → DeepnoteFile)

> **Origin**: surfaced during LUI1WEDGE/e6e3lt (step 4B, save-safety gate). The save endpoint
> `POST /api/project/save` accepts a full `DeepnoteFile`, but `GET /api/project`'s `ApiProject`
> envelope only exposes `metadata` + `project` — it drops the file-level `version`, `environment`,
> and `execution` fields that `deepnoteFileSchema` requires. A save client reconstructing a
> `DeepnoteFile` purely from `ApiProject` therefore cannot satisfy the schema (a zod
> `version: Required` error → 500), and would silently lose `environment`/`execution` even if it could.

## API Feature Overview

* **Feature Description:** Make the open→save loop lossless end-to-end by carrying the **complete** opened `DeepnoteFile` in the `GET /api/project` response so an editing client can post it back unchanged-except-for-edits.
* **API Resource/Endpoint:** `GET /api/project` (envelope), `POST /api/project/save` (consumer).
* **HTTP Methods:** GET, POST.
* **API Version:** s1 app-level contract.
* **Related Work:** LUI1WEDGE/e6e3lt (4B save gate); design doc `docs/designs/m3-s1-server-api-and-serve.md` lines 368-372 (`ApiProject`) + 388 (save body); step 3 `x71bcm` (`ApiProject` origin).
* **Client Impact:** the m3/s2 SPA editor (first real save client). No consumer exists in s1 yet — this is why the gap is deferrable, not blocking.
* **Target Release:** m3/s2 (when an editor first needs to round-trip open→save).

**Required Checks:**
* [ ] **API resource/endpoint** path is clearly defined.
* [ ] **API version** is specified and versioning strategy is understood.
* [ ] **Client impact** is identified (who will consume this API).

## API Design & Contract Review

* [ ] API design guidelines reviewed (REST conventions, naming, HTTP status codes).
* [ ] Existing API contracts reviewed for consistency (similar endpoints, patterns).
* [ ] OpenAPI/Swagger specification template reviewed for documentation format.
* [ ] Authentication/authorization requirements reviewed (OAuth, API keys, JWT).
* [ ] Rate limiting and quota policies reviewed for this endpoint.
* [ ] Versioning strategy reviewed (URL versioning, header versioning, deprecation policy).

| Design Aspect | Decision / Requirement | Rationale / Notes |
| :--- | :--- | :--- |
| **Resource Naming** | `ApiProject.file: DeepnoteFile` (additive field) | Carry the whole opened file, not a `metadata`+`project` subset. |
| **Backward Compatibility** | additive — keep `metadata`/`project`/`openHash`/`capabilities` | The s2 viewer already derives view-models from `ApiProject['project']`; `file` is net-new. |
| **Alternative** | a dedicated `GET /api/project/file` raw-file route | Heavier; the envelope is the natural home. Decide in design review. |

## API Development Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **API Contract Design** | add `file: DeepnoteFile` to `ApiProject` in `api-types.ts` | - [ ] OpenAPI/Swagger spec is complete and reviewed. |
| **Contract Review** | reviewer | - [ ] API contract is reviewed and approved by team/stakeholders. |
| **TDD Implementation** | `session.apiProject()` returns the full file; README open+save example | - [ ] TDD workflow followed (tests first, then implementation). |
| **Integration Tests** | open→edit→save round-trips losslessly through the HTTP layer | - [ ] Integration tests cover happy path and error cases. |
| **Security Review** | N/A | - [ ] Security requirements validated (auth, input validation, rate limiting). |
| **API Documentation** | README: a save client posts `apiProject.file` (with edits) back | - [ ] API documentation is complete with examples and error codes. |
| **Client SDK Updates** | N/A (no SDK in s1) | - [ ] Client SDKs updated [if applicable] or follow-up cards created. |
| **Deployment** | N/A | - [ ] API is deployed and verified in production. |

## Definition of Done

### Intent

An editing client can open a project, edit it, and save it back with **zero** loss of any persisted field — including the file-level `version`, `environment`, and `execution` that `ApiProject` currently omits. "Working" looks like: `GET /api/project`, apply an edit to the returned `file`, `POST /api/project/save` with that `file`, and the round-trip preserves every field the on-disk file had.

### Observable outcomes

- [ ] `GET /api/project` returns the **complete** opened `DeepnoteFile` (a `file` field, or an equivalent decision from design review), so a save client never has to invent `version`/`environment`/`execution`.
- [ ] An HTTP-level test opens, edits one block, saves, re-reads, and asserts the persisted file deep-equals the opened file with only the intended edit applied (no dropped top-level fields).
- [ ] README documents the open→save loop using the new field.

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Contract Tests** | `ApiProject.file` is a full `DeepnoteFile` (type + runtime) | - [ ] Contract tests validate API adheres to OpenAPI spec. |
| **2. Write Failing Integration Tests** | open→edit→save lossless round-trip over HTTP | - [ ] Integration tests written covering all endpoints and methods. |
| **3. Implement API Endpoints** | thread the full file through `session.apiProject()` | - [ ] API endpoints implemented, returning correct status codes. |
| **4. Run Passing Tests** | suite green | - [ ] All integration tests pass, API behavior verified. |
| **5. Add Error Handling Tests** | N/A (additive read field) | - [ ] Error handling tests written and passing. |
| **6. Security Tests** | N/A | - [ ] Security tests validate auth, input sanitization, rate limiting. |
| **7. Performance Tests** | N/A | - [ ] Performance validated against requirements [if applicable]. |
| **8. Regression Suite** | package test green | - [ ] Full regression suite passed, no existing APIs broken. |

#### API Implementation Notes

> The save endpoint already round-trips a full `DeepnoteFile` losslessly (proven in `save.test.ts`). This card only closes the **open-side** gap so a real editor can supply that full file from what `GET /api/project` hands it, rather than reconstructing it from disk. Until then, the only save clients are tests that build a full `DeepnoteFile` directly.

**Middleware Stack:** none.

**Database Queries:** N/A — filesystem.

**Caching Strategy:** the session already holds the full opened `DeepnoteFile`; expose it.

## API Validation & Release

| Task | Detail/Link |
| :--- | :--- |
| **OpenAPI Spec Location** | `api-types.ts` `ApiProject` |
| **API Documentation URL** | package README open+save section |
| **Integration Test Coverage** | open→edit→save lossless round-trip |
| **Security Validation** | N/A |
| **Performance Metrics** | N/A |
| **Client Communication** | m3/s2 SPA editor consumes the new field |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **API Changelog Updated?** | On implementation. |
| **Client SDK Updates?** | N/A |
| **Deprecation Notices?** | None |
| **Monitoring/Alerts?** | N/A |
| **Rate Limit Tuning?** | N/A |
| **API Versioning Review?** | App-level contract; additive. |
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
