# step 8: contrib-diff-cut — cut the clean `contrib/*` slice off `upstream/main`

> **Sprint**: LUI1WEDGE | **Step**: 8 | **Roadmap**: m3/s1/wedge-slice-showcase/contrib-diff-cut
> **Depends on**: step 5 (server-integration-tests green, `wd2nil`) AND steps 6/7A/7B (serve/ui/sql). **Unblocks**: step 9 (fork-showcase-post).
> **Keeps the slice-clean invariant load-bearing**: slices server-api + cli-serve ONLY — NO `apps/`, NO `.gitban`/`.claude`/`docs`.

## Cleanup Scope & Context

* **Sprint/Release:** LUI1WEDGE (m3/s1 upstream wedge)
* **Primary Feature Work:** `@deepnote/runtime-server` + `deepnote serve`/`ui` (steps 2–7B)
* **Cleanup Category:** Slice integrity (the P7 contrib diff — design doc Phase 9 / suite 7)

**Required Checks:**
* [ ] Sprint/Release is identified above.
* [ ] Primary feature work that generated this cleanup is documented.

### Required Reading

| Source | Section / lines | Why |
| :--- | :--- | :--- |
| `docs/designs/m3-s1-server-api-and-serve.md` | "Phase 9: Cut the clean contrib diff"; "Test strategy" suite 7 (slice integrity) | The slice paths, the grep, the build-clean bar. |
| `docs/adr/ADR-007-server-spa-package-layout.md` | Decision §5 (two-diff mapping); Validation (1) slice integrity; Implementation Notes (slice paths) | Exactly which paths the contrib slice contains and which it must never name (`apps/`). |
| `.claude/CLAUDE.md` | "Day-to-day" `git checkout sprint/<TAG> -- <code paths>` recipe; "The one sharp edge" | The mechanical slice recipe; never mix board + code commits. |

## Deferred Work Review

* [ ] Reviewed commit messages for "TODO" and "FIXME" comments added during sprint.
* [ ] Reviewed PR comments for "out of scope" or "follow-up needed" discussions.
* [ ] Reviewed code for new TODO/FIXME markers (grep for them).
* [ ] Checked team chat/standup notes for deferred items.

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
| **Cut contrib branch** | `contrib/m3-serve` from `upstream/main` via `git checkout sprint/LUI1WEDGE -- <paths>` (no `.gitban`/`.claude`/`docs`/`apps/`) | - [ ] |
| **Build/typecheck/test on slice** | `pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm test` pass with NO `apps/` present | - [ ] |
| **Slice-integrity grep** | the no-frontend grep across the whole serve delta returns nothing | - [ ] |
| **Boundary check** | dependency-cruiser/madge: no `packages/ → apps/` edge; `api-types.ts` runtime-import-free | - [ ] |

### Refactoring & Code Organization (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Import Cleanup** | confirm the slice's import closure is entirely within `packages/` | - [ ] |

## Definition of Done

### Intent

A maintainer who has only `upstream/main` plus this one branch can check it out, install, build, typecheck, and test the whole thing green — and see nothing but a self-contained server package and a CLI serve command, with zero trace of the fork's SPA, board, or planning docs. This is the exact diff we would open against `deepnote/deepnote` once invited. From the outside, "working" looks like: `git checkout contrib/m3-serve` off `upstream/main`, `pnpm install && pnpm build && pnpm typecheck && pnpm test` all green, and `git grep -iE 'react|vite|apps/'` over the serve delta returns nothing. If this breaks, the slice leaked a frontend token or an `apps/` reference, or it failed to build standalone — meaning the boundary the whole milestone is organized around did not hold.

### Observable outcomes

- [ ] **Capstone:** `contrib/m3-serve` cut from `upstream/main` (containing only `packages/runtime-server/**` + the cli serve delta — `commands/serve.ts`, its `cli.ts` wiring, the `@deepnote/runtime-server` dep line) builds, typechecks, and tests clean with NO `apps/` directory present.
- [ ] `git grep -iE 'react|vite|apps/' -- packages/runtime-server packages/cli/src/commands/serve.ts packages/cli/src/cli.ts packages/cli/package.json` returns nothing.
- [ ] A dependency-cruiser/madge run shows no edge from `packages/` into `apps/`, no frontend-framework import in `packages/runtime-server`, and no runtime import in `api-types.ts`.
- [ ] The diff contains no `.gitban/`, `.claude/`, `docs/`, or `apps/` path — it is exactly the upstream-ready PR.

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

* [ ] All P0 items are complete and verified.
* [ ] All P1 items are complete or have follow-up tickets created.
* [ ] P2 items are complete or explicitly deferred with tickets.
* [ ] All tests are passing (unit, integration, and regression).
* [ ] No new linter warnings or errors introduced.
* [ ] All documentation updates are complete and reviewed.
* [ ] Code changes (if any) are reviewed and merged.
* [ ] Follow-up tickets are created and prioritized for next sprint.
* [ ] Team retrospective includes discussion of cleanup backlog (if significant).



## Slice-integrity grep precision (planner — LUI1WEDGE 87ifqe review 1, item L1)

The literal slice-integrity grep currently written into this card's acceptance criteria — `git grep -iE 'react|vite|apps/'` — is word-boundary-free and **false-positives on benign substrings** that have ZERO real frontend coupling:

- `reactivity` — the legitimate `@deepnote/reactivity` dependency, and the `reactivity:'python'|'disabled'` capability enum — matches `react`.
- `vitest` — the test runner — matches `vite`.

If the broad regex ships as the canonical slice-integrity / boundary CI gate, it will false-positive on **every** package that depends on `@deepnote/reactivity` or uses `vitest`, making a genuinely-clean boundary gate un-passable (and pressuring someone to disable it). The grep must test the AC's actual intent — no React/Vite framework, no `apps/` import edge — without colliding with `reactivity`/`vitest`.

**Acceptance criteria (additive — supersedes the literal broad regex above):**

- [ ] The slice-integrity grep uses **import-form / word-boundary matching**, not the bare `-iE 'react|vite|apps/'` substring regex. Concretely it must match framework imports and the `apps/` edge while NOT matching `reactivity`/`vitest`, e.g.: `from ['"](react|react-dom|vite)['"]`, `\breact\b`/`\bvite\b`, `@vitejs`, and `from ['"]\.\./apps` (or equivalent path-import form for the `apps/` edge).
- [ ] A regression assertion proves the tightened grep returns **nothing** on the real slice even though the slice legitimately contains the strings `reactivity` and/or `vitest` (i.e. the precise grep does not false-positive on the `@deepnote/reactivity` dep or the `vitest` runner), while still catching a planted `import 'react'` / `from '../apps/...'` line.
- [ ] Both occurrences of the literal `git grep -iE 'react|vite|apps/'` in this card (the "Slice-integrity grep" Deferred Work / Cleanup row and the "Observable outcomes" capstone line) are read as **intent**, satisfied by the tightened import-form grep above — the broad substring form is NOT the gate that ships.

Source: card 87ifqe review 1 (reviewer-approved scaffold; forward-looking scoping note, "no action on card 87ifqe"). This card owns the slice-integrity CI grep in LUI1WEDGE, so the precision requirement is folded in here rather than duplicated into a new card.
