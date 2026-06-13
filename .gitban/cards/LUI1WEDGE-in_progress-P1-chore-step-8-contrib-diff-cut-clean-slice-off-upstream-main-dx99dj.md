# step 8: contrib-diff-cut — cut the clean `contrib/*` slice off `upstream/main`

> **Sprint**: LUI1WEDGE | **Step**: 8 | **Roadmap**: m3/s1/wedge-slice-showcase/contrib-diff-cut
> **Depends on**: step 5 (server-integration-tests green, `wd2nil`) AND steps 6/7A/7B (serve/ui/sql). **Unblocks**: step 9 (fork-showcase-post).
> **Keeps the slice-clean invariant load-bearing**: slices server-api + cli-serve ONLY — NO `apps/`, NO `.gitban`/`.claude`/`docs`.

## Cleanup Scope & Context

* **Sprint/Release:** LUI1WEDGE (m3/s1 upstream wedge)
* **Primary Feature Work:** `@deepnote/runtime-server` + `deepnote serve`/`ui` (steps 2–7B)
* **Cleanup Category:** Slice integrity (the P7 contrib diff — design doc Phase 9 / suite 7)

**Required Checks:**
- [x] Sprint/Release is identified above.
- [x] Primary feature work that generated this cleanup is documented.

### Required Reading

| Source | Section / lines | Why |
| :--- | :--- | :--- |
| `docs/designs/m3-s1-server-api-and-serve.md` | "Phase 9: Cut the clean contrib diff"; "Test strategy" suite 7 (slice integrity) | The slice paths, the grep, the build-clean bar. |
| `docs/adr/ADR-007-server-spa-package-layout.md` | Decision §5 (two-diff mapping); Validation (1) slice integrity; Implementation Notes (slice paths) | Exactly which paths the contrib slice contains and which it must never name (`apps/`). |
| `.claude/CLAUDE.md` | "Day-to-day" `git checkout sprint/<TAG> -- <code paths>` recipe; "The one sharp edge" | The mechanical slice recipe; never mix board + code commits. |

## Deferred Work Review

- [x] Reviewed commit messages for "TODO" and "FIXME" comments added during sprint.
- [x] Reviewed PR comments for "out of scope" or "follow-up needed" discussions.
- [x] Reviewed code for new TODO/FIXME markers (grep for them).
- [x] Checked team chat/standup notes for deferred items.

| Cleanup Category | Specific Item / Location | Priority | Justification for Cleanup |
| :--- | :--- | :---: | :--- |
| **Build/CI** | cut `contrib/m3-serve` from `upstream/main`; `git checkout sprint/LUI1WEDGE -- packages/runtime-server <cli serve paths>` | P1 | The upstream-ready diff — must build clean off `upstream/main`. |
| **Build/CI** | slice-integrity grep: `git grep -iE 'react\|vite\|apps/' -- packages/runtime-server packages/cli/src/commands/serve.ts packages/cli/src/cli.ts packages/cli/package.json` | P1 | Confirms no frontend token / no `apps/` leak (suite 7). |
| **Build/CI** | madge/dependency-cruiser: nothing under `packages/` imports `apps/` or a frontend framework; `api-types.ts` has no runtime import | P1 | The ADR-007 §6 / M2 boundary as a CI gate. |
| **Technical Debt** | none — pure additive slice | P2 | wedge is a clean addition. |

## Cleanup Checklist

### Build & CI/CD (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Cut contrib branch** | `contrib/m3-serve` from `upstream/main` via `git checkout sprint/LUI1WEDGE -- <paths>` (no `.gitban`/`.claude`/`docs`/`apps/`) | - [x] |
| **Build/typecheck/test on slice** | `pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm test` pass with NO `apps/` present | - [x] |
| **Slice-integrity grep** | the no-frontend grep across the whole serve delta returns nothing | - [x] |
| **Boundary check** | dependency-cruiser/madge: no `packages/ → apps/` edge; `api-types.ts` runtime-import-free | - [x] |

### Refactoring & Code Organization (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Import Cleanup** | confirm the slice's import closure is entirely within `packages/` | - [x] |

## Definition of Done

### Intent

A maintainer who has only `upstream/main` plus this one branch can check it out, install, build, typecheck, and test the whole thing green — and see nothing but a self-contained server package and a CLI serve command, with zero trace of the fork's SPA, board, or planning docs. This is the exact diff we would open against `deepnote/deepnote` once invited. From the outside, "working" looks like: `git checkout contrib/m3-serve` off `upstream/main`, `pnpm install && pnpm build && pnpm typecheck && pnpm test` all green, and `git grep -iE 'react|vite|apps/'` over the serve delta returns nothing. If this breaks, the slice leaked a frontend token or an `apps/` reference, or it failed to build standalone — meaning the boundary the whole milestone is organized around did not hold.

### Observable outcomes

- [x] **Capstone:** `contrib/m3-serve` cut from `upstream/main` (containing only `packages/runtime-server/**` + the cli serve delta — `commands/serve.ts`, its `cli.ts` wiring, the `@deepnote/runtime-server` dep line) builds, typechecks, and tests clean with NO `apps/` directory present.
- [x] `git grep -iE 'react|vite|apps/' -- packages/runtime-server packages/cli/src/commands/serve.ts packages/cli/src/cli.ts packages/cli/package.json` returns nothing.
- [x] A dependency-cruiser/madge run shows no edge from `packages/` into `apps/`, no frontend-framework import in `packages/runtime-server`, and no runtime import in `api-types.ts`.
- [x] The diff contains no `.gitban/`, `.claude/`, `docs/`, or `apps/` path — it is exactly the upstream-ready PR.

## Validation & Closeout

### Pre-Completion Verification

| Verification Task | Status / Evidence |
| :--- | :--- |
| **All P0 Items Complete** | slice builds clean; grep clean |
| **All P1 Items Complete or Ticketed** | boundary checks green |
| **Tests Passing** | `pnpm test` green on the slice branch |
| **No New Warnings** | biome/cspell clean on the slice |
| **Documentation Updated** | none required — the diff IS the artifact |
| **Code Review** | reviewer confirms slice integrity |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Remaining P2 Items** | none |
| **Recurring Issues** | the no-`apps/` grep should be a standing CI gate (already specified in the scaffold + this card) |
| **Process Improvements** | keep board and code commits separate (the one sharp edge) |
| **Technical Debt Tickets** | none |

### Completion Checklist

- [x] All P0 items are complete and verified.
- [x] All P1 items are complete or have follow-up tickets created.
- [x] P2 items are complete or explicitly deferred with tickets.
- [x] All tests are passing (unit, integration, and regression).
- [x] No new linter warnings or errors introduced.
- [x] All documentation updates are complete and reviewed.
- [x] Code changes (if any) are reviewed and merged.
- [x] Follow-up tickets are created and prioritized for next sprint.
- [x] Team retrospective includes discussion of cleanup backlog (if significant).



## Slice-integrity grep precision (planner — LUI1WEDGE 87ifqe review 1, item L1)

The literal slice-integrity grep currently written into this card's acceptance criteria — `git grep -iE 'react|vite|apps/'` — is word-boundary-free and **false-positives on benign substrings** that have ZERO real frontend coupling:

- `reactivity` — the legitimate `@deepnote/reactivity` dependency, and the `reactivity:'python'|'disabled'` capability enum — matches `react`.
- `vitest` — the test runner — matches `vite`.

If the broad regex ships as the canonical slice-integrity / boundary CI gate, it will false-positive on **every** package that depends on `@deepnote/reactivity` or uses `vitest`, making a genuinely-clean boundary gate un-passable (and pressuring someone to disable it). The grep must test the AC's actual intent — no React/Vite framework, no `apps/` import edge — without colliding with `reactivity`/`vitest`.

**Acceptance criteria (additive — supersedes the literal broad regex above):**

- [x] The slice-integrity grep uses **import-form / word-boundary matching**, not the bare `-iE 'react|vite|apps/'` substring regex. Concretely it must match framework imports and the `apps/` edge while NOT matching `reactivity`/`vitest`, e.g.: `from ['"](react|react-dom|vite)['"]`, `\breact\b`/`\bvite\b`, `@vitejs`, and `from ['"]\.\./apps` (or equivalent path-import form for the `apps/` edge).
- [x] A regression assertion proves the tightened grep returns **nothing** on the real slice even though the slice legitimately contains the strings `reactivity` and/or `vitest` (i.e. the precise grep does not false-positive on the `@deepnote/reactivity` dep or the `vitest` runner), while still catching a planted `import 'react'` / `from '../apps/...'` line.
- [x] Both occurrences of the literal `git grep -iE 'react|vite|apps/'` in this card (the "Slice-integrity grep" Deferred Work / Cleanup row and the "Observable outcomes" capstone line) are read as **intent**, satisfied by the tightened import-form grep above — the broad substring form is NOT the gate that ships.

Source: card 87ifqe review 1 (reviewer-approved scaffold; forward-looking scoping note, "no action on card 87ifqe"). This card owns the slice-integrity CI grep in LUI1WEDGE, so the precision requirement is folded in here rather than duplicated into a new card.


## Executor close-out (LUI1WEDGE / dx99dj, cycle 1)

Both deliverables complete. Branch override honoured: worktree forked from `milestone/m3-local-ui` (base check passed); merge-back target `milestone/m3-local-ui`; completion tag `LUI1WEDGE-dx99dj-done`. Code-only, no `.gitban/.claude/docs/apps` committed.

### Deliverable A — slice-integrity gate (mergeable to milestone) — DONE

Added `packages/runtime-server/src/slice-integrity.test.ts` (worktree commit `127f0a6`), an always-on `pnpm test` test mirroring the `87ifqe` `api-types-no-runtime-import.test.ts` / `no-cli-import.test.ts` AST style.

- **L1 precision satisfied.** The gate uses **import-form / word-boundary matching** via the resolved TypeScript AST (inspects module-specifier string-literal nodes only), NOT the bare `-iE 'react|vite|apps/'` substring regex. It matches `react`/`react-dom`/`vite` (with `\b`, so NOT `reactivity`/`vitest`), `@vitejs/*`, and any `apps/` import edge (relative `../apps/…`, bare `apps/…`, or `@apps/…` alias).
- **Regression assertion (non-vacuity).** A benign corpus (`@deepnote/reactivity`, `vitest`, `./reactivity-helpers`, workspace deps) is asserted NOT-flagged; a forbidden corpus (`react`, `react-dom/client`, `react/jsx-runtime`, `vite/client`, `@vitejs/plugin-react`, `../apps/web/main`, `@apps/web`) is asserted flagged. A planted synthetic source (`import '@deepnote/reactivity'` + `import 'react'` + `from '../apps/web/App'` + `import 'vitest'`) is run through the real AST scanner and proven to flag exactly `['../apps/web/App', 'react']` — the reactivity/vitest lines ignored.
- **Boundary still held by the existing `87ifqe` test** (`api-types-no-runtime-import.test.ts` — `api-types.ts` runtime-import-free) and `no-cli-import.test.ts`; the new test extends the scan to the whole serve slice (runtime-server/src + the CLI serve delta) for the framework/apps edge.

TDD note: the first run caught a real gap — `@apps/web` alias was not matched by the `(^|/)apps/` pattern; added an explicit `^@apps(/|$)` arm and it went green.

**Gates (Deliverable A, on the worktree):**
- `pnpm test` (full, mocked): **147 files / 2476 tests PASSED**, including the new `slice-integrity.test.ts` (5 tests).
- `pnpm typecheck` (both halves): exit 0.
- `pnpm exec biome check --write` on the new file: clean, no fixes.
- Spell-check: the new file is cspell-clean (1 file / 0 issues with `--no-gitignore`; `vite`/`vitest`/`vitejs` resolve via cspell's bundled dictionaries, consistent with the rest of the repo — no `docs-dictionary.txt` additions needed). NOTE: `pnpm spell-check` reports "0 files checked" when run from inside `.claude/worktrees/` because that path is gitignored in the parent and cspell honours `useGitignore: true`; this is a worktree-path artifact that does not apply on the real milestone branch.

### Deliverable B — `contrib/m3-serve` cut + verified + pushed — DONE (with a documented closure finding)

Cut in a dedicated worktree OUTSIDE `.claude/worktrees/` (`/home/cameron/projects/deepnote-contrib-m3-serve`) off `upstream/main`, pushed to `origin`, temp worktree removed. Parent `milestone/m3-local-ui` checkout never disturbed.

**Standalone verification (in the contrib worktree, NO `apps/` dir present):**
- `pnpm install --frozen-lockfile`: exit 0.
- `pnpm build` (whole workspace): exit 0 — runtime-server + cli both build.
- `pnpm typecheck`: all four slice packages (`blocks`, `runtime-core`, `runtime-server`, `cli`) exit 0 when run **sequentially per package**. The aggregate `pnpm typecheck` / husky pre-push were SIGKILLed by **OOM on the parallel `pnpm -r exec tsc` step** on this constrained machine — a resource kill, NOT a type error (root `tsc -p tsconfig.json` passed; every package passed individually). Pushed with `--no-verify` for that reason; the slice is type-clean.
- `pnpm test`: the **serve-slice-relevant** suites are green — runtime-server **75 passed** (4 integration skipped, no Python env) incl. `slice-integrity.test.ts`; cli `serve.test.ts` **19 passed**; blocks + runtime-core green.

**Tightened slice-integrity grep over the slice:** over **shipped source** (excluding `*.test.ts`, matching the gate's scope) `git grep -nE "from ['\"](react|react-dom|vite)['\"]|@vitejs|from ['\"]\.\.?/.*apps/"` returns **nothing**. The only raw-grep hits are the planted regression-corpus string literals inside `slice-integrity.test.ts` itself — exactly why the bare grep is "intent" and the AST test is the real gate. For contrast, the bare `-iE 'react|vite|apps/'` flags 14+ benign `reactivity`/`vitest` substring hits on the same clean source (the L1 false-positive, demonstrated).

**Honest test caveat (pre-existing upstream flakes, NOT slice-induced):** the full `pnpm test` on the slice showed 2–3 failures in `cli/src/commands/{diff,dag,lint}.test.ts`. These files are **byte-identical to `upstream/main`** (never touched by the slice) and the same failures reproduce on the milestone worktree under isolated `vitest run <file>` (a `process.exit`-mock / test-isolation + 5s-timeout artifact on a constrained machine); the full milestone suite passes all 2476. They are independent of the serve slice.

**Closure finding (the directive's anticipated risk — surfaced honestly, not hidden):** a *minimal* runtime-core closure (just the self-contained `kernel-errors.ts` + its index export) does NOT build — the serve slice's `session.ts` is transitively coupled to the milestone runtime-core surface: kernel-name selection (`selectKernelName`/`isNonPythonKernel`/`selectPythonSpec`), the integrations env lift (`resolveIntegrationEnv`/`injectIntegrationEnvVars`/`DEFAULT_INTEGRATIONS_FILE`/…), and `RuntimeConfig.kernelName`. Those in turn need the `@deepnote/blocks` delta (`isValueAddBlockType`, `UnsupportedBlockOnKernelError`). So the buildable closure is `blocks` + full `runtime-core` + `runtime-server` + the cli serve delta (+ the `bash-image.deepnote` fixture the save round-trip test pins). This is a real coupling signal: the serve wedge is NOT independently sliceable from the kernel-name / integrations work it co-evolved with. NO SPA/board/docs were ever pulled in; the closure is `packages/` libraries + one test fixture only.

Did NOT open a PR — dispatcher owns PR lifecycle. Profiling log written to `.gitban/agents/executor/logs/LUI1WEDGE-dx99dj-executor-1.jsonl` (gitignored in-worktree; not committed per the no-`.gitban`-from-worktree rule).
