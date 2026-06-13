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
