Sprint closeout card ID: od8esg
Sprint card list:
- wzrodp (step 1, todo): step-1-lui1wedge-sprint-planning — sprint planning (CAMERON)
- 87ifqe (step 2, done): step-2-server-package-scaffold-runtime-server — runtime-server package scaffold
- x71bcm (step 3, done): step-3-project-open-list-api-get-api-project — GET /api/project open + list
- hlai4c (step 4A, done): step-4a-execute-stream-ws-run-serialization-queue — WS execute/stream + run queue
- e6e3lt (step 4B, in_progress→done): step-4b-save-api-semantic-round-trip-idempotence — POST /api/project/save (this card, approved)
- wd2nil (step 5, todo): step-5-server-integration-tests-parity-with-deepnote-run — server integration tests
- zq7q0g (step 6, todo): step-6-serve-command-deepnote-serve — `deepnote serve` command
- sqm7ox (step 7a, todo): step-7a-browser-launch-alias-deepnote-ui — browser launch alias
- yzd78n (step 7b, todo): step-7b-sql-integration-parity-with-run — SQL integration parity
- dx99dj (step 8, todo): step-8-contrib-diff-cut-clean-slice-off-upstream-main — clean contrib diff cut
- k65hcx (step 9, todo): step-9-fork-showcase-post-dry-run-thread — fork showcase dry-run post
- od8esg (step 10, todo): step-10-lui1wedge-sprint-closeout — sprint closeout card

The reviewer flagged 3 non-blocking items, grouped into 1 card below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: runtime-server save endpoint hardening (400-validation, hash-encoding symmetry, contract-typed wire bodies)
Sprint: LUI1WEDGE
Files touched: packages/runtime-server/src/router.ts, packages/runtime-server/src/save.ts, packages/runtime-server/src/session.ts, packages/runtime-server/src/router-save.test.ts
Items:
- L1 (input-validation-gap): `handleSave` in `router.ts` validates the body only shallowly (`openHash` is a string, `project` is a non-null object). A request with a valid `openHash` but a structurally-invalid `project` (e.g. `{ project: {}, openHash: "<correct-on-disk-hash>" }`) passes that check, reaches `saveProject → serializeDeepnoteFile(project)`, throws a zod parse error, and is mapped by the outer try/catch to **500** — but the design doc classifies a malformed body as **400**, and the 500 leaks the internal serializer error. Add a parse-then-validate step (run the project through the deepnote-file schema before the write) and return **400** on failure. Add a router-save test asserting the partially-constructed-`DeepnoteFile` body yields 400 with no write. Note the relationship to backlog `ad6kmb` (the open→save `DeepnoteFile` reconstruction gap) — this card fixes the route's error *class*, not the open→save contract itself.
- L2 (hash-encoding-edge): `session.ts` computes `openHash = hashBytes(bytes)` over the raw on-disk Buffer, while `save.ts` re-hashes the current bytes as `sha256(current.toString('utf8'))`. These agree for all valid UTF-8 (and `.deepnote` files are always canonical UTF-8), so the loop is consistent in practice; the only divergence is a file containing invalid UTF-8 on disk, where the lossy `toString('utf8')` decode produces a *false* 409. That is fail-safe (refuse-to-write, never clobber), so this is a low-priority robustness note. If addressed, hash both sides over the raw Buffer to remove the asymmetry.
- L3 (type-reuse): `handleSave` constructs the conflict response inline (`{ error: 'external-change', currentProject, currentHash }`) rather than typing it as the `SaveConflictResponse` interface added to `api-types.ts` for exactly this shape; likewise the 200 body is not typed as `SaveProjectResponse`. Annotate both inline objects with their canonical contract types so a future contract drift produces a compile error. Cosmetic; same file as L1.
