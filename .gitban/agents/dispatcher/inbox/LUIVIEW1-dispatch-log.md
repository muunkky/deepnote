# LUIVIEW1 Dispatch Log

Sprint: **LUIVIEW1** — roadmap **m3/s2** "Open & view a notebook locally" (read-only viewer SPA, `apps/studio`).
Working branch: **milestone/m3-local-ui** (BRANCH OVERRIDE — fork-only SPA per #162; no `sprint/LUIVIEW1` branch).
Closeout card: **drmgh6**. Planning card: **v9apte**.
Design doc: `docs/designs/m3-s2-viewer.md`. ADR-006 (React+Vite isolated apps), ADR-007 (backend→apps one-way boundary).

## Card inventory (11)

| Step | Card | Title | Batch |
| :--- | :--- | :--- | :--- |
| 1 | v9apte | sprint planning | closeout-coupled |
| 2 | j97w5m | spa-foundation framework + bundler (P0, isolated) | b1 |
| 3 | 5mz1md | spa-foundation app shell + routing | b2 |
| 4 | 4p6tbf | project load over s1 API + state | b3 |
| 5 | zy7tn8 | code/markdown/text + BlockRenderer registry | b4 |
| 6 | k61ziu | Jupyter IOutput MIME renderer | b5 |
| 7A | 83gnbp | SQL renderer | b6 ‖ |
| 7B | 4svfd0 | visualization / big-number / image renderers | b6 ‖ |
| 7C | mxxsr6 | input / button / separator renderers | b6 ‖ |
| 7D | wye1xt | unknown-type fallback (after 7A–7C) | b7 |
| 8 | drmgh6 | sprint closeout | b8 |

## Execution plan

Serial spine 2→3→4→5→6, then parallel 7A‖7B‖7C, then 7D, then closeout.
7D sequenced after 7A–7C per sprint-reviewer (wires shared `default` branch; coverage capstone needs siblings present).

## Pre-dispatch

- Phase 0 migration preflight: PASS (no pending migrations; gitban 2.0.0a1 healthy).
- Closeout card drmgh6 verified present.
- WorktreeCreate hook: active (settings + executable script). Forks from current HEAD (milestone/m3-local-ui).
- Branch at 997ad86 (clean) → 1d9a4df after v9apte 7D-reclassify edit.
- Standing push: milestone/m3-local-ui (constrained-box env vars on push).

---

## Batch 1: step 2 — j97w5m (spa-foundation framework + bundler)

- **Executor-1** (`a18be8761a61`): commit `eef8296`, tag `LUIVIEW1-j97w5m-done`. Stood up `apps/studio` React 19 + Vite 7 isolated SPA (15 files, +870). Isolation invariant: `tsc -p tsconfig.json --listFilesOnly` = 0 apps/ files. In-worktree verification: `pnpm test` 149 files/2481 tests ✓, `pnpm typecheck` ✓, `vite build` ✓, `pnpm lintAndFormat` ✓.
- Merge: fast-forward `3307025..eef8296` (serial single-card, no integration delta — merged tree byte-identical to executor's verified HEAD).
- Surfaced (pre-existing, not this card): cspell 9.2.2 `useGitignore` reports "0 files" inside a worktree when `.git` is a file. Candidate planner follow-up.
- Reviewer-1 (`a4091d8858b8`): **APPROVAL** — both gates PASS, all claims live-verified (zero-apps isolation invariant, jsdom smoke, scoped root include, vitest projects restructure, Biome strictness). 3 non-blocking follow-ups L1/L2/L3.
- Router-1 (`a773e6d8fee9`): **APPROVAL**. Wrote executor close-out + planner inbox.
- Close-out (`a86492323e89`): j97w5m → **done** (commit eef8296). Flagged gitban tooling edge: `complete_card` auto-block injection loop (stripped, completed clean).
- Planner-1 (`a40c0922f73a`): L1 → new card `cd4gxo` (step 2b, P2 doc, todo — cold pnpm-install onboarding note); L2 → folded into `5mz1md` (Playwright HMR-timing criterion); L3 → skipped, dup of backlog `vlql29` (madge/dependency-cruiser boundary gate).
- **Batch 1 DONE.** Sprint now 1/11 done (+ planning v9apte deferred to closeout). cd4gxo (step 2b) added to remaining plan — P2 doc, parallel-safe, will run in the 7-batch or just before closeout.

## Batch 2: step 3 — 5mz1md (spa-foundation app shell + routing)

- **Executor-1** (`ab7493d60453`): commit `85f5b3c`, tag `LUIVIEW1-5mz1md-done`. Built shell (App/NotebookList/NotebookView/BlockRenderer stub), hashRoute (`#/notebook/<id>` bidirectional), derived view-models (type-only `@deepnote/runtime-server/types`, fixture `: ApiProject`). Folded-in **L2 HMR e2e**: real Vite dev server + headless Chromium over CDP (no Playwright dep), measured ~656ms Fast-Refresh hot-update, gated under `test:hmr` (sandbox-disabled). In-worktree: 14/14 jsdom, 3/3 isolation, 1/1 HMR e2e, typecheck/biome/prettier/cspell clean.
- Merge: fast-forward `89e252d..85f5b3c` (24 files, +850). Reconciled at `6ed7584`.
- Reviewer-1 (`aebab729283b`): **APPROVAL** — both gates PASS, all live-verified. 2 non-blocking follow-ups (L1 cdp.ts hardcoded `chromium-1223`; L2 fixture `as BlockVM` cast).
- Router-1 (`ac62ef849c23`): **APPROVAL**.
- Close-out (`a492659fb29e`): 5mz1md → **done** (38/38 boxes, clean first try, no BLOCKED-loop).
- Planner-1 (`a6c72b5d4ddd`): L1 → closeout-append `drmgh6` retro Item 1 (fixable now); L2 → **blocked backlog card `e23yj2`** (P2 refactor, depends on renderer registry steps 5–7D — NOT in sprint).
- **Batch 2 DONE.** Sprint 2/11 done. Pending in-sprint: cd4gxo (step 2b doc, parallel-safe).
- Next: batch 3 → step 4 `4p6tbf` (project load over s1 API).

## Batch 3: step 4 — 4p6tbf (project load over s1 API + state)

- **Executor-1** (`a099d92d36dd`): commit `17c2cf2`. `fetchProject.ts` (read-only GET, typed `ProjectLoadError`, type-only `ApiProject`), discriminated `projectStore`, App-as-fetch-container (spinner/Shell/error-banner), Shell extracted. Compile-time drift-catch **proven** (drifted return type → tsc failed → restored). 29/29 studio tests, isolation 3/3, R7 split-a mean 33.6ms/p50 18.6ms. Capstone vs test-double loader (DoD-permitted).
- Merge: fast-forward (6 files). Reconciled at `a5fae2f`.
- Reviewer-1 (`af2be9300ef8`): **APPROVAL** — both gates PASS, no blockers, no follow-ups. Verified live: 29/29, tsc 0, isolation 3/3.
- Router-1 (`a85aac839f00`): **APPROVAL**, no planner needed.
- Close-out (`a918368392e4`): 4p6tbf → **done** (38/38, clean first try).
- **Batch 3 DONE.** Sprint 3/11 done. Pending in-sprint: cd4gxo (step 2b doc).
- Next: batch 4 → step 5 `zy7tn8` (code/markdown/text + BlockRenderer registry).

## Batch 4: step 5 — zy7tn8 (code/markdown/text + BlockRenderer registry)
