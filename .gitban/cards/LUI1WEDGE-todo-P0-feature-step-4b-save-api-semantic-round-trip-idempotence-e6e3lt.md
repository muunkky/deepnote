# step 4B: save-api — semantic round-trip + idempotence (the save-safety gate)

> **Sprint**: LUI1WEDGE | **Step**: 4B (parallel with 4A execute-stream-ws) | **Roadmap**: m3/s1/serve-api/save-api
> **Depends on**: step 3 (project-open-list-api, `x71bcm` — needs `openHash`). **Parallel-safe with** step 4A (`hlai4c`) — disjoint files (`save.ts` vs `run-queue.ts`/`session` engine path). **Unblocks**: step 5 (server-integration-tests).
> **The save-safety gate: ships before any editing UI exists.** Proves save can never silently corrupt the user's file.

## API Feature Overview

* **Feature Description:** `POST /api/project/save` writes the `.deepnote` file atomically (temp-then-rename) with semantic round-trip + serialization idempotence and external-change detection (refuse to clobber).
* **API Resource/Endpoint:** `POST /api/project/save`.
* **HTTP Methods:** POST.
* **API Version:** s1 app-level contract.
* **Related Work:** design doc Phase 4 + "Save round-trip (R6)" + KD-7; PRD-003 (save is the most data-loss-prone operation).
* **Client Impact:** any editing client (m3/s2+); in s1 there is no editor yet — this is the safety gate that lands first.
* **Target Release:** m3/s1.

**Required Checks:**
* [ ] **API resource/endpoint** path is clearly defined.
* [ ] **API version** is specified and versioning strategy is understood.
* [ ] **Client impact** is identified (who will consume this API).

### Required Reading

| Source | Section / lines | Why |
| :--- | :--- | :--- |
| `docs/designs/m3-s1-server-api-and-serve.md` | "Save round-trip (R6 — the save-safety gate)" (atomic-write pseudocode + the two fidelity criteria); Phase 4 DoD; KD-7; "Current State" serializer note | The atomic write, the external-change check, and the SEMANTIC-not-byte fidelity definition. |
| `packages/blocks/src/deepnote-file/serialize-deepnote-file.ts` | `normalizeSortingKeys` (18); `serializeDeepnoteFile` (37–40, `deepnoteFileSchema.parse`) | Why the round-trip is semantic, not byte-level — the serializer re-canonicalizes. |
| `packages/blocks/src/deepnote-file/deserialize-deepnote-file.ts` | `deserializeDeepnoteFile` (8) | The deserialize half of the round-trip. |
| design doc | "Current State" — `bash-image.deepnote` 1261→1372 bytes, idempotent thereafter | The pinned fixture behavior the test asserts. |

## API Design & Contract Review

* [ ] API design guidelines reviewed (REST conventions, naming, HTTP status codes).
* [ ] Existing API contracts reviewed for consistency (similar endpoints, patterns).
* [ ] OpenAPI/Swagger specification template reviewed for documentation format.
* [ ] Authentication/authorization requirements reviewed (OAuth, API keys, JWT).
* [ ] Rate limiting and quota policies reviewed for this endpoint.
* [ ] Versioning strategy reviewed (URL versioning, header versioning, deprecation policy).

| Design Aspect | Decision / Requirement | Rationale / Notes |
| :--- | :--- | :--- |
| **Resource Naming** | `POST /api/project/save` | Single opened project. |
| **Request Format** | `{ project: DeepnoteFile, openHash: string }` | `openHash` echoed from open (step 3). |
| **Response Format** | `200 { savedHash, bytesWritten }` | success. |
| **Conflict** | `409 { error:'external-change', currentProject, currentHash }` — **no write** | KD-7: detect external change via SHA-256(on-disk) vs `openHash`. |
| **Atomicity** | write `path + '.tmp-<uuid>'` in same dir → `fs.rename` | atomic same-volume; cleanup temp on any failure; original untouched. |
| **Fidelity** | SEMANTIC: `deserialize(serialize(p))` deep-equals `p` AND idempotent | NOT byte-equality (serializer re-canonicalizes). |
| **Status Codes** | 200 / 409 | no other write path. |
| **Backward Compatibility** | additive | save contract for future editors. |

## API Development Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **API Contract Design** | save request/response in `api-types.ts` | - [ ] OpenAPI/Swagger spec is complete and reviewed. |
| **Contract Review** | reviewer | - [ ] API contract is reviewed and approved by team/stakeholders. |
| **TDD Implementation** | `src/save.ts` + `POST /api/project/save` route | - [ ] TDD workflow followed (tests first, then implementation). |
| **Integration Tests** | round-trip + idempotence + atomicity + 409 (mocked, suite 2) | - [ ] Integration tests cover happy path and error cases. |
| **Security Review** | no clobber on external change | - [ ] Security requirements validated (auth, input validation, rate limiting). |
| **API Documentation** | README save section (semantic-not-byte fidelity explicit) | - [ ] API documentation is complete with examples and error codes. |
| **Client SDK Updates** | N/A | - [ ] Client SDKs updated [if applicable] or follow-up cards created. |
| **Deployment** | N/A | - [ ] API is deployed and verified in production. |

## Definition of Done

### Intent

A user's `.deepnote` file is never silently corrupted or clobbered by a save. Saving the project they opened writes the same project back with no content loss, a re-save of an unchanged project is a no-op (an empty `git diff`), the write is atomic so a crash mid-write can't leave a half-written file, and if someone else edited the file on disk since it was opened, the save refuses and hands back the current on-disk content instead of overwriting it. From the outside, "working" looks like: open a project, save it, and `git diff` it — a second no-op save shows no diff; edit the file in another editor, then save, and the API returns a conflict rather than destroying the other edit. If this breaks, a user could lose work — either silently dropped block content on round-trip, or another process's edits clobbered.

### Observable outcomes

- [ ] **Capstone (no content loss):** `deserializeDeepnoteFile(serializeDeepnoteFile(project))` deep-equals `project` for the `bash-image.deepnote` fixture (and a representative project), proving the semantic round-trip loses nothing.
- [ ] **Capstone (idempotence):** for an already-canonical `s = serializeDeepnoteFile(project)`, `serializeDeepnoteFile(deserializeDeepnoteFile(s)) === s`; equivalently a second no-op save through the API produces an empty `git diff`. (The FIRST save of a not-yet-canonical file may reformat — e.g. `bash-image.deepnote` 1261→1372 bytes — and that is expected and accepted; the bar is idempotence thereafter.)
- [ ] **Atomicity:** the write is temp-then-rename in the SAME directory; no `.tmp-*` file is left behind on success OR on a simulated failure between write and rename, and the original is untouched on failure.
- [ ] **External-change detection:** when the on-disk SHA-256 differs from `openHash`, the API returns `409 { error:'external-change', currentProject, currentHash }` and performs **no write**.

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Contract Tests** | save request/response shape in `api-types.ts` | - [ ] Contract tests validate API adheres to OpenAPI spec. |
| **2. Write Failing Integration Tests** | round-trip deep-equal; idempotence/no-op-diff; atomic (no temp leftover); 409-no-write on hash mismatch — pinned to `bash-image.deepnote` | - [ ] Integration tests written covering all endpoints and methods. |
| **3. Implement API Endpoints** | `save.ts` (temp-then-rename, same-dir, cleanup) + route | - [ ] API endpoints implemented, returning correct status codes. |
| **4. Run Passing Tests** | mocked suite 2 green | - [ ] All integration tests pass, API behavior verified. |
| **5. Add Error Handling Tests** | failure between write+rename leaves no temp, original intact | - [ ] Error handling tests written and passing. |
| **6. Security Tests** | external change → 409, no clobber | - [ ] Security tests validate auth, input sanitization, rate limiting. |
| **7. Performance Tests** | N/A | - [ ] Performance validated against requirements [if applicable]. |
| **8. Regression Suite** | package test green | - [ ] Full regression suite passed, no existing APIs broken. |

#### API Implementation Notes

> **Test Strategy (failure modes first; mocked, always-on):** the two capstones are deep-equal round-trip and string-equal idempotence — unfakeable by mocks because they run the real serializer/deserializer over a real fixture. The atomicity test injects a failure between write and rename and asserts (a) no `.tmp-*` survives and (b) the original bytes are unchanged. The 409 test mutates the on-disk file after open and asserts the API refuses to write. Pin `bash-image.deepnote`'s documented 1261→1372 first-save growth as expected-and-idempotent so a future serializer change that breaks idempotence reds the suite.

**Middleware Stack:** none.

**Database Queries:** N/A — filesystem.

**Caching Strategy:** N/A; `openHash` carried from session/open.

## API Validation & Release

| Task | Detail/Link |
| :--- | :--- |
| **OpenAPI Spec Location** | `api-types.ts` save request/response |
| **API Documentation URL** | package README save section |
| **Integration Test Coverage** | suite 2 (round-trip, idempotence, atomicity, 409) |
| **Security Validation** | no clobber; atomic write |
| **Performance Metrics** | N/A |
| **Client Communication** | future editor consumes save contract |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **API Changelog Updated?** | Closeout card. |
| **Client SDK Updates?** | N/A |
| **Deprecation Notices?** | None |
| **Monitoring/Alerts?** | N/A |
| **Rate Limit Tuning?** | N/A |
| **API Versioning Review?** | App-level contract. |
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
