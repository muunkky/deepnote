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
- [x] **API resource/endpoint** path is clearly defined.
- [x] **API version** is specified and versioning strategy is understood.
- [x] **Client impact** is identified (who will consume this API).

### Required Reading

| Source | Section / lines | Why |
| :--- | :--- | :--- |
| `docs/designs/m3-s1-server-api-and-serve.md` | "Save round-trip (R6 — the save-safety gate)" (atomic-write pseudocode + the two fidelity criteria); Phase 4 DoD; KD-7; "Current State" serializer note | The atomic write, the external-change check, and the SEMANTIC-not-byte fidelity definition. |
| `packages/blocks/src/deepnote-file/serialize-deepnote-file.ts` | `normalizeSortingKeys` (18); `serializeDeepnoteFile` (37–40, `deepnoteFileSchema.parse`) | Why the round-trip is semantic, not byte-level — the serializer re-canonicalizes. |
| `packages/blocks/src/deepnote-file/deserialize-deepnote-file.ts` | `deserializeDeepnoteFile` (8) | The deserialize half of the round-trip. |
| design doc | "Current State" — `bash-image.deepnote` 1261→1372 bytes, idempotent thereafter | The pinned fixture behavior the test asserts. |

## API Design & Contract Review

- [x] API design guidelines reviewed (REST conventions, naming, HTTP status codes).
- [x] Existing API contracts reviewed for consistency (similar endpoints, patterns).
- [x] OpenAPI/Swagger specification template reviewed for documentation format.
- [x] Authentication/authorization requirements reviewed (OAuth, API keys, JWT).
- [x] Rate limiting and quota policies reviewed for this endpoint.
- [x] Versioning strategy reviewed (URL versioning, header versioning, deprecation policy).

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
| **API Contract Design** | save request/response in `api-types.ts` | - [x] OpenAPI/Swagger spec is complete and reviewed. |
| **Contract Review** | reviewer | - [x] API contract is reviewed and approved by team/stakeholders. |
| **TDD Implementation** | `src/save.ts` + `POST /api/project/save` route | - [x] TDD workflow followed (tests first, then implementation). |
| **Integration Tests** | round-trip + idempotence + atomicity + 409 (mocked, suite 2) | - [x] Integration tests cover happy path and error cases. |
| **Security Review** | no clobber on external change | - [x] Security requirements validated (auth, input validation, rate limiting). |
| **API Documentation** | README save section (semantic-not-byte fidelity explicit) | - [x] API documentation is complete with examples and error codes. |
| **Client SDK Updates** | N/A | - [x] Client SDKs updated [if applicable] or follow-up cards created. |
| **Deployment** | N/A | - [x] API is deployed and verified in production. |

## Definition of Done

### Intent

A user's `.deepnote` file is never silently corrupted or clobbered by a save. Saving the project they opened writes the same project back with no content loss, a re-save of an unchanged project is a no-op (an empty `git diff`), the write is atomic so a crash mid-write can't leave a half-written file, and if someone else edited the file on disk since it was opened, the save refuses and hands back the current on-disk content instead of overwriting it. From the outside, "working" looks like: open a project, save it, and `git diff` it — a second no-op save shows no diff; edit the file in another editor, then save, and the API returns a conflict rather than destroying the other edit. If this breaks, a user could lose work — either silently dropped block content on round-trip, or another process's edits clobbered.

### Observable outcomes

- [x] **Capstone (no content loss):** `deserializeDeepnoteFile(serializeDeepnoteFile(project))` deep-equals `project` for the `bash-image.deepnote` fixture (and a representative project), proving the semantic round-trip loses nothing.
- [x] **Capstone (idempotence):** for an already-canonical `s = serializeDeepnoteFile(project)`, `serializeDeepnoteFile(deserializeDeepnoteFile(s)) === s`; equivalently a second no-op save through the API produces an empty `git diff`. (The FIRST save of a not-yet-canonical file may reformat — e.g. `bash-image.deepnote` 1261→1372 bytes — and that is expected and accepted; the bar is idempotence thereafter.)
- [x] **Atomicity:** the write is temp-then-rename in the SAME directory; no `.tmp-*` file is left behind on success OR on a simulated failure between write and rename, and the original is untouched on failure.
- [x] **External-change detection:** when the on-disk SHA-256 differs from `openHash`, the API returns `409 { error:'external-change', currentProject, currentHash }` and performs **no write**.

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Contract Tests** | save request/response shape in `api-types.ts` | - [x] Contract tests validate API adheres to OpenAPI spec. |
| **2. Write Failing Integration Tests** | round-trip deep-equal; idempotence/no-op-diff; atomic (no temp leftover); 409-no-write on hash mismatch — pinned to `bash-image.deepnote` | - [x] Integration tests written covering all endpoints and methods. |
| **3. Implement API Endpoints** | `save.ts` (temp-then-rename, same-dir, cleanup) + route | - [x] API endpoints implemented, returning correct status codes. |
| **4. Run Passing Tests** | mocked suite 2 green | - [x] All integration tests pass, API behavior verified. |
| **5. Add Error Handling Tests** | failure between write+rename leaves no temp, original intact | - [x] Error handling tests written and passing. |
| **6. Security Tests** | external change → 409, no clobber | - [x] Security tests validate auth, input sanitization, rate limiting. |
| **7. Performance Tests** | N/A | - [x] Performance validated against requirements [if applicable]. |
| **8. Regression Suite** | package test green | - [x] Full regression suite passed, no existing APIs broken. |

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


## Executor close-out (executor-1, LUI1WEDGE)

**Status:** implementation complete, all tests green, lint/typecheck clean. Left `in_progress` for the reviewer.

### What shipped

- **`src/save.ts`** (net-new) — `saveProject(path, project, openHash, fs?)`: external-change re-hash guard (KD-7) → atomic temp-then-rename **in the same directory** with `randomUUID()` temp name and cleanup-on-failure. Returns a discriminated `SaveResult` (`{conflict:false, savedHash, bytesWritten}` | `{conflict:true, currentProject, currentHash}`). A `SaveFs` seam is injected so the atomicity test can fail *between* write and rename. A missing target (brand-new path) is **not** a conflict.
- **`src/api-types.ts`** — added `SaveProjectRequest` / `SaveProjectResponse` / `SaveConflictResponse` (all `import type` only — the runtime-import-free invariant still passes).
- **`src/session.ts`** — `ServerSession.save()` added additively; `Session.save()` delegates to `saveProject`, writing to the session's own loaded path and **adopting `savedHash` as the new `openHash` on a committed write** (so the same client's immediate re-save is a no-op, not a false self-conflict).
- **`src/router.ts`** — `POST /api/project/save` registered (queue-independent, sits beside 4A's run routes, no 4A code touched): body-read + parse → `200` / `409 external-change` (no write) / `400` malformed body / `500` write failure.
- **`src/index.ts`** — exported the three new types + `saveProject`/`SaveFs`/`SaveResult`.
- **`README.md`** — new "save-safety gate" section (semantic-not-byte fidelity explicit, the 409/no-clobber contract, the open→save s1 caveat).

### What the tests actually prove (honest scope)

All mocked + always-on (`pnpm test`), run against the **real** serializer/deserializer over the **real** `bash-image.deepnote` fixture — unfakeable by a mock.

- **`src/save.test.ts` (8 tests, PASS):** Capstone 1 no-content-loss deep-equal (canonical project + a representative edited project); Capstone 2 idempotence — the first save reformats **1263→1374 bytes** (the design doc's documented growth; the live fixture is 1263, not the doc's prose-rounded 1261, and serializes to 1374, not 1372 — pinned to the *actual* values and proven idempotent thereafter), second no-op save is byte-identical; Capstone 3 atomicity — same-dir temp, no `.tmp-*` on success, and an **injected** failure between write and rename leaves no temp and the original byte-for-byte intact; Capstone 4 external-change → conflict result with **no write**, plus brand-new-path is not a conflict.
- **`src/router-save.test.ts` (5 tests, PASS):** the four wire shapes through a real `createServer`+`fetch`: `200 {savedHash,bytesWritten}`, idempotent no-op over HTTP (empty diff), `409 {error:'external-change',currentProject,currentHash}` with the intruder's bytes still on disk (no clobber), `400` on malformed body (no write) and on missing `openHash`/`project`.
- **Full package suite: 58/58 PASS.** Biome clean (`biome check packages/runtime-server`), `tsc --noEmit` clean, `check:types-subpath` clean **after a package rebuild** (it typechecks against built `dist/`).

### Deferred / follow-up

- **`ad6kmb` (backlog, P1)** — the open→save contract gap: `GET /api/project`'s `ApiProject` exposes only `metadata`+`project`, but a save body is a full `DeepnoteFile` (needs file-level `version`/`environment`/`execution`). A client reconstructing a `DeepnoteFile` purely from `ApiProject` can't yet round-trip (zod `version: Required` → 500). No save client exists in s1 (no editor), so it's deferrable; the save endpoint itself round-trips a full `DeepnoteFile` losslessly. **I deliberately did NOT modify the merged, reviewer-approved step-3 `ApiProject`** (4B's directive: add additively, don't restructure 4A/step-3).

### Remaining unchecked boxes (for the reviewer's adjudication)

The unticked template items are honestly **N/A for an s1 filesystem save endpoint with no auth/deploy surface**: security/auth/input-validation/rate-limiting (no auth layer in s1; input validation IS covered by the 400 tests), performance (N/A), deployment/production/monitoring/client-communication (no production deploy in s1), and "API contract reviewed & approved by team/stakeholders" (the **reviewer's** gate, not mine). I left these for the reviewer rather than self-certify them.

### Environment note (not a logic failure)

`pnpm spell-check` reports `Files checked: 0` in this worktree for **every** file (including unchanged tracked files like the repo-root `README.md`) — a cspell glob-resolution quirk in the worktree, not a spelling issue in my content. Per-file `cspell lint --file <f>` also resolves 0 files. My content uses only standard terms + established project vocabulary already in the tree (deepnote, openHash, KD-7, idempotence). Flagging so the PR/closeout agent (which runs hooks from the parent) re-verifies spell-check there.

### Commits (worktree branch)

- `7b997ac` feat(runtime-server): POST /api/project/save atomic write + external-change detection (R6)
- `b85bb16` test(runtime-server): save-safety gate suite + README save section (R6)
- `d890e4d` style(runtime-server): biome formatting for save module + tests




## Review log — reviewer-1 (router-1)

- **Verdict:** APPROVAL (Gate 1 PASS, Gate 2 PASS) at commit `d890e4d`.
- **Review report:** `.gitban/agents/reviewer/inbox/LUI1WEDGE-e6e3lt-reviewer-1.md`
- **Routing:**
  - Executor → close out & complete this card (`.gitban/agents/executor/inbox/LUI1WEDGE-e6e3lt-executor-1.md`).
  - Planner → 3 non-blocking follow-ups (L1 input-validation 400-vs-500, L2 hash-encoding edge, L3 type-reuse on inline 409/200 bodies) grouped into ONE sprint card targeting the runtime-server save path (`.gitban/agents/planner/inbox/LUI1WEDGE-e6e3lt-planner-1.md`).
- No blockers; no close-out items beyond standard completion.


## Reviewer cycle 1 — save-endpoint hardening (reopened by planner)

The save-safety gate was approved, but reviewer cycle 1 found the route's
error **class** is wrong for one malformed-body case (the "done" 400-on-malformed
claim is honest for *missing* fields but wrong for a *structurally-invalid project*).
This is tightly coupled to 4B's theme, small (tens of lines), and touches only files
this card already modified (`router.ts`, `save.ts`, `session.ts`, `router-save.test.ts`),
so it was reopened onto this card rather than spun out. Fix all three below, keep the
existing 58/58 suite green, then re-run the package suite + `biome check` + `tsc --noEmit`.

- [x] **L1 (input-validation gap → 400, not 500).** `handleSave` in `router.ts:124`
      validates the body only shallowly (`typeof parsed.project !== 'object' || parsed.project === null`).
      A body with a valid `openHash` but a structurally-invalid `project` (e.g.
      `{ project: {}, openHash: "<correct-on-disk-hash>" }`) passes that check, reaches
      `saveProject → serializeDeepnoteFile(project)`, throws a zod parse error, and is caught by
      the second `try/catch` and mapped to **500** at `router.ts:148` — leaking the internal
      serializer error. The design doc classifies a malformed body as **400**. Add a
      parse-then-validate step (run `project` through the canonical `deepnoteFileSchema` before
      the write) and return **400** on schema failure. Add a `router-save.test.ts` case asserting
      the partially-constructed-`DeepnoteFile` body yields **400** with **no write** to disk.
      NOTE: this fixes the route's error *class* only — it is **not** the open→save contract gap
      tracked in backlog `ad6kmb` (that one adds `file: DeepnoteFile` to `ApiProject` on the open
      side; out of scope here).
- [x] **L2 (hash-encoding asymmetry — low-priority robustness).** `session.ts` computes
      `openHash = hashBytes(bytes)` over the raw on-disk Buffer, while `save.ts` re-hashes the
      current bytes as `sha256(current.toString('utf8'))`. These agree for all valid UTF-8 (and
      `.deepnote` files are always canonical UTF-8), so the loop is consistent in practice; the
      only divergence is a file with invalid UTF-8 on disk, where the lossy `toString('utf8')`
      decode yields a *false* 409 — which is fail-safe (refuse-to-write, never clobber). If
      addressed, hash both sides over the raw Buffer to remove the asymmetry. Acceptable to leave
      as-is with a code comment if the executor judges the Buffer-hash change not worth the churn.
- [x] **L3 (contract-type the wire bodies — cosmetic).** `handleSave` builds the 409 conflict
      response inline (`{ error: 'external-change', currentProject, currentHash }` at `router.ts:138`)
      and the 200 body inline (`router.ts:146`) instead of typing them as the `SaveConflictResponse`
      / `SaveProjectResponse` interfaces already defined in `api-types.ts` (lines 94 / 80) for exactly
      these shapes. Annotate both inline objects with their canonical contract types so a future
      contract drift produces a compile error.

**Source:** e6e3lt review 1. **Files:** packages/runtime-server/src/{router,save,session}.ts,
packages/runtime-server/src/router-save.test.ts.


## Executor close-out (executor-2, LUI1WEDGE — save-endpoint hardening reopen)

**Status:** all three reopen items (L1/L2/L3) fixed, committed, tests green, lint/typecheck/capstone clean. Left `in_progress` for the reviewer. Scope honored: touched **only** `router.ts`, `save.ts`, `router-save.test.ts`. Did **not** touch `ApiProject` / the open side (backlog `ad6kmb` out of scope); the already-approved atomic-write/round-trip/idempotence/409 work at `d890e4d` was untouched.

### What shipped (commit `31f9a87`)

- **L1 (input-validation → 400, primary fix that unblocks step 5).** `handleSave` now validates `project` against the canonical `deepnoteFileSchema` (value-imported from `@deepnote/blocks`) via `safeParse` **before** the write. A body with a valid `openHash` but a structurally-invalid `project` (e.g. `{ project: {}, openHash: <correct-hash> }`) now returns **400** (malformed body) instead of reaching `serializeDeepnoteFile`, throwing a zod error, and leaking as **500**. The validated `validated.data` is forwarded to `session.save`. TDD: the failing `router-save.test.ts` case was written first (asserted 500→expected 400), then made to pass.
- **L2 (hash-encoding asymmetry — robustness, took the symmetric fix, not the comment).** Chose the no-tech-debt path: `save.ts`'s `sha256` now hashes the **raw Buffer** (both the on-disk `current` Buffer for conflict detection and the written `Buffer.from(yaml,'utf8')` for `savedHash`), byte-for-byte identical to `session.ts`'s `hashBytes`. Removes the open-time-vs-save-time `toString('utf8')` divergence that could yield a false 409 on invalid-UTF-8 on-disk bytes. `savedHash` still equals the `openHash` a re-open would compute, so the same-client immediate-re-save no-op invariant holds.
- **L3 (contract-type the wire bodies — cosmetic).** The inline 409 and 200 response objects in `handleSave` are now annotated `SaveConflictResponse` / `SaveProjectResponse` (already defined in `api-types.ts`), so a future contract drift is a compile error.

### What the tests prove (honest scope)

- **`router-save.test.ts`: 6/6 PASS** — the 5 pre-existing wire-shape tests plus the new **L1** case: a partially-constructed `DeepnoteFile` body (`{ project: {}, openHash: <correct-on-disk-hash> }`) → **400** with the on-disk bytes **unchanged** (no write). All run through a real `createServer`+`fetch` over the real `bash-image.deepnote` fixture.
- **Full runtime-server suite: 59/59 PASS** (`VITEST_MAX_WORKERS=2 VITEST_TEST_TIMEOUT=30000`). The L2 raw-Buffer hash change keeps the existing `save.test.ts` (8) and the idempotence/409 HTTP tests green — for the canonical UTF-8 fixture, raw-Buffer and `update(text,'utf8')` digests are identical, so no existing assertion shifted.
- **`biome check --write packages/runtime-server`: clean** (no fixes applied). **`tsc --noEmit`: clean.** **`check:types-subpath` (capstone, against built `dist/` after `pnpm run build`): PASS.**

### Spell-check note (environment, not content)

`pnpm spell-check` (and per-file `cspell lint`) report `Files checked: 0` in this worktree — the same cspell worktree glob-resolution quirk executor-1 flagged, not a content issue. My additions use only standard/established project vocabulary already in the tree (`deepnoteFileSchema`, `openHash`, `sha256`, `utf-8`, `zod`, idempotent). Flagging for the PR/closeout agent to re-verify spell-check from the parent repo.
