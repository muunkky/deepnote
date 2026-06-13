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

- **Pre-dispatch push REJECTED** (cspell: 5 issues / 4 files) — step-4 SPA terms (`unparseable`, `subclassing`, `normalises`) slipped past the executor (cspell `useGitignore` worktree quirk reports 0 files). Fixed at gate: added 3 terms to cspell.json (`46936a5`), re-pushed green. Validates the L1 cspell follow-up's root cause.
- **Executor-1** (`a00c6288a61d`): HEAD `0ef87a5` (+ build commit `00ef45a` adding marked/highlight.js/dompurify/@deepnote/blocks). BlockRenderer registry `Partial<Record<BlockVM['type'],FC>> & {default}` (additive seam for 7A-D), Code/Markdown/Text renderers, centralized DOMPurify `renderMarkdownToSafeHtml` seam (XSS-stripped: script/onerror/javascript:). **64 studio tests** (was 29), isolation 0 apps/ files. Executor proactively added renderer vocab to cspell.json.
- Merge: fast-forward (2 commits). Reconciled at `9f7a8e5`. **Proactive post-merge cspell caught 1 more** (`recognised`) → fixed `1613b1e` BEFORE next push (avoided a second rejection).
- Reviewer-1 (`a4bba9e67939`): **APPROVAL** — both gates PASS, additive seam confirmed, security seam verified, suite 64/64. 3 follow-ups.
- Router-1 (`abaeb8109692`): **APPROVAL**.
- Close-out (`aa3dd520eb9f`): zy7tn8 → **done** (37/37, clean).
- Planner-1 (`aa6af6a327fb`): L1 → folded into **k61ziu** capstone (non-stream output e2e — strengthens step 6); L2 → blocked backlog `jyapgp` (needs language signal); L3 → merged into `e23yj2` (dedup).
- **Batch 4 DONE.** Sprint 4/11 done. Pending in-sprint: cd4gxo (step 2b doc).
- Next: batch 5 → step 6 `k61ziu` (Jupyter IOutput MIME renderer — now with strengthened non-stream capstone).

## Batch 5: step 6 — k61ziu (Jupyter IOutput MIME renderer)

- **Executor-1** (`a736a406a6f9`): commit `7adf27b`. Real `OutputRenderer` (browser counterpart to terminal output-renderer.ts) — Stream/Data/Error renderers, **rich-first MIME registry** inverting terminal text/plain-first (HTML→image→svg→md→text/plain), DOMPurify-sanitized HTML/SVG, ANSI stripping, type-only `IOutput` re-export in api-types.ts (boundary green). **90 studio tests** (was 64). Strengthened capstone proves all 4 output types render + `data-output-pending` fully absent (closes zy7tn8 L1 error-blank gap).
- Merge: fast-forward (1 commit). Reconciled at `157c90a`.
- **Proactive post-merge cspell caught 12 issues / 8 files** — fixed BEFORE push: added colour/colours/reprs + **excluded cspell.json from its own scan** (`16a10b9`). Root cause: biome ASCII-escapes accented dict entries (chàracters→chàracters) → cspell flags the \u00XX fragments when self-scanning. The ignorePaths exclusion is the durable fix (prevents recurrence for all accented entries).
- Reviewer-1 (`a6dd0442578a`): **APPROVAL** — both gates PASS, parity honest, sanitization verified at every live-markup path, boundary 2/2, suite 90/90. 3 follow-ups + pre-existing vitest-CWD note.
- Router-1 (`abcb00cf68c4`): **APPROVAL**.
- Close-out (`a18120824d20`): k61ziu → **done** (38/38, clean).
- Planner-1 (`ac7ba1cdc0b3`): L1/L2/L3 all → **closeout-append** drmgh6 retro Items 2/3/4 (coverage gap / output styling CSS layer / load-seam schema validation — none block downstream, all actionable later).
- **Batch 5 DONE — SERIAL SPINE COMPLETE (steps 2–6 done).** Sprint 5/11 done. Pending in-sprint: cd4gxo (step 2b doc).
- Next: **parallel batch 6 → 7A (83gnbp) ‖ 7B (4svfd0) ‖ 7C (mxxsr6)**. SHARED-FILE NOTE: all three add a key to the `BLOCK_RENDERERS` literal in BlockRenderer.tsx — additive/keep-both by design (sprint-architect + reviewer approved); resolve any registry merge conflict keep-both. Then 7D (wye1xt), then cd4gxo + closeout.

## Batch 6 (parallel): 7A 83gnbp ‖ 7B 4svfd0 ‖ 7C mxxsr6

- **Pre-dispatch push failed twice** (transient flaky gate, then deterministic): isolated to a biome `organizeImports` error in `packages/runtime-server/src/api-types.ts` — k61ziu's type-only IOutput re-export wrote two consecutive `export type … from '@deepnote/runtime-core'`; biome merges them. This was k61ziu code that hadn't hit the pre-push gate (prior push predated its merge); reviewer checked studio app + boundary test, not repo-wide biome. Fixed `1a603ad`, pushed green. (Dispatcher-as-merge-gate caught it.)
- **Executors (one-per-message, concurrent execution):**
  - 7A `83gnbp` (`ae65874cf2c0`): commit `e761ad1` — SqlRenderer (highlighted query + persisted result via OutputRenderer), `sql` key. 42/42 block tests.
  - 7B `4svfd0` (`ae82755fc1a8`): commit `4edb127` — viz/big-number/image renderers (persisted-first, DOMPurify image sanitization, no native vega/plotly added), `visualization`/`big-number`/`image` keys + README. 105/105.
  - 7C `mxxsr6` (`a1b632e9da6b`): commit `56da693` — input-* ×8 / button / separator (inert read-only, `assertNoMutatingControl` helper), 10 keys + repointed unknown-fallback test off `separator`→`future-block`. 57 block tests.
- **Merge:** 7A ff; 7B clean (git auto-merged additive registry); 7C conflicted on BLOCK_RENDERERS literal — **resolved keep-both** (union of all imports + all keys), biome-clean, merge commit `4f2bfa4`. The additive design held: only one 3-way textual conflict, trivially keep-both.
- **Integration check:** merged studio suite **134 tests / 23 files green** — all renderers coexist, fallback repoint works.
- **Proactive post-merge cspell** caught base64 test-fixture blobs (AAAABBBB/AAAANS image payloads) → added `base64,…` + PNG-signature (`iVBORw0KGgo…`) ignore regexes (`a61525b`) rather than dictionary-polluting gibberish.
- Reviewers (parallel): 7A **APPROVAL** (+scaffold-dedup), 7B **APPROVAL** (+doc-count-drift, sanitizer-extraction), 7C **APPROVAL** (clean). Routers all **APPROVAL**.
- Close-outs: 7A/7B/7C all → **done** (7B doc-count corrected 22→15). Planners: scaffold-dedup → blocked backlog `cbina3`; sanitizer-extraction → blocked backlog `fgfnyy`.
- **Batch 6 DONE.** Sprint 8/11 done. Pending in-sprint: cd4gxo (step 2b doc), wye1xt (7D), drmgh6 (closeout) + v9apte (planning, closeout-coupled).
- Next: **batch 7 → 7D `wye1xt`** (unknown-type fallback — now that 7A-C registered all sibling keys, its full-coverage capstone is meaningful).

## Batch 7: 7D — wye1xt (unknown-type fallback)

- **Executor-1** (`a23925d65123`): commit `0949539`. Real `UnknownBlockRenderer` (own file) replacing the step-5 placeholder — renders "Unsupported block type: <type>" + raw persisted content as an **escaped React text node** in `<pre>` (no dangerouslySetInnerHTML → XSS-inert by construction; never throws). Owns the shared `default` branch. Full-coverage capstone driven off LIVE `BLOCK_RENDERERS` keys (23 non-default) with a ≥20-key vacuous-pass guard + README coverage matrix. 88/88 block tests.
- Merge: fast-forward (solo, ran after 7A-C). Reconciled at `8d5c045`. Proactive cspell clean (0 issues).
- Reviewer-1 (`a3fb6a9c0fff`): **APPROVAL** — both gates PASS, capstone genuine + non-circular, fallback safe by construction, isolation 3/3. No follow-ups.
- Router-1 (`a8bd32c2c9e9`): **APPROVAL**, no planner.
- Close-out (`a3bb12f8b552`): wye1xt → **done** (37/37, clean).
- **Batch 7 DONE.** Sprint 9/11 done (all feature/renderer cards complete). Remaining: cd4gxo (step 2b doc), drmgh6 (closeout) + v9apte (planning, closeout-coupled).
- Next: batch 8 → cd4gxo (step 2b doc), then closeout phase.

## Batch 8: step 2b — cd4gxo (onboarding doc)
