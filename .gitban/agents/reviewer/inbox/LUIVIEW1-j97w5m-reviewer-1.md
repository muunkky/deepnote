---
verdict: APPROVAL
card_id: j97w5m
review_number: 1
commit: eef8296
date: 2026-06-13
has_backlog_items: true
---

# Review — LUIVIEW1 j97w5m (step 2: spa-foundation framework + bundler setup)

## Verdict: APPROVAL

This card stands up `apps/studio` (React 19 + Vite 7) as a workspace-isolated SPA and
adds the load-bearing root-`tsconfig` `include` fix that keeps the backend's repo-wide
typecheck green despite the new JSX. The implementation matches ADR-006 and ADR-007 §3
exactly, the DoD is well-formed with two unfakeable capstones, and every load-bearing
claim was verified live (not trusted from the closeout).

### Gate 1 — completion claim: PASS
- DoD present and required (this card touches config, build, and test behaviour).
- **Intent** is plain-English and sanity-checkable: a dev can run the SPA dev server and
  see a trivial React page while the backend CI gate is provably unaffected, the isolation
  being provable by a one-line file-list check rather than convention. Not a title restatement.
- **Two capstones, both unfakeable:** (1) the isolation invariant — real `tsc -p tsconfig.json`
  file listing names zero `apps/` files; (2) the smoke render — a real `@testing-library/react`
  render under jsdom asserting the heading in the DOM. Neither is mockable; both walk the real
  pipeline. The boundary observables (no `packages/*` frontend dep; `apps/studio` Node-free) are
  checked against real manifests and real source, not assertions.
- Checkbox design covers the acceptance criteria; no trivially-satisfied or title-restating boxes.
- Integrity: the two unticked Completion-Checklist boxes (PR merge, prod deploy/monitoring) are
  correctly deferred — reviewer/PR-owned and N/A-fork-only per the card's own Validation table.

### Gate 2 — implementation quality: PASS

**Isolation mechanism (ADR-006 §4 / ADR-007 §3) — correct and load-bearing.**
The pre-change root `tsconfig.json` had **no `include` key** (it relied only on `exclude`, so it
globbed the whole repo). The diff adds `"include": ["packages/*/src", "test-helpers",
"test-fixtures", "*.config.ts"]`, which names no `apps/` path. `apps/studio/tsconfig.json` is the
app's own config (`jsx: react-jsx`), never referenced by the root (no `references`, not in the root
include). This is exactly the mechanism both ADRs specify, and the `test-fixtures` addition beyond
the ADR's illustrative example is justified — see verification below, it preserves prior coverage.

**TDD evidence is genuine, not reverse-engineered.** `test-helpers/apps-studio-isolation.test.ts`
asserts behaviour (the compiler's resolved module graph, the real package manifests, the real
source tree), not implementation artifacts. It spawns the workspace-local `tsc` with
`--listFilesOnly` (a deliberate, well-documented ~3 s vs ~45 s tradeoff, with the actual type-check
covered separately by `pnpm typecheck`), handles the non-zero-exit-but-stdout-present edge, and
normalises paths before matching. The smoke test renders a real component into jsdom via RTL and
asserts via `getByRole('heading', …)`. Failure/edge cases exist (the three isolation invariants are
themselves the negative-space assertions). This reads as test-first design, not test-after.

**Vitest restructure is faithful.** The root config moves to `test.projects` with a `backend`
(node-env) project that preserves every prior setting — `bail: 1`, the KD-9 integration exclude, the
constrained-env worker/timeout env-tuning, the setup file — plus a `studio` (jsdom + RTL) project.
The backend `include` narrows from repo-wide `**/*.test.ts` to `packages/** + test-helpers/** +
test-fixtures/**`. Shared reporter/coverage/junit stay root-level.

**Biome strictness satisfied, not relaxed.** No `apps/`/`studio` override exists in `biome.json`;
the full strict ruleset (a11y, `noExplicitAny`, `noNonNullAssertion`) applies to the new `.tsx`.
`main.tsx` looks up `#root` with a null guard rather than a `!` assertion — genuine compliance.

### Live verification performed (this commit, this tree)
- `pnpm install --frozen-lockfile` → succeeds, lockfile unmodified (the lockfile is complete and
  correct; the worktree had simply not been installed — see L1 below, an environment note, not a defect).
- Studio smoke + isolation suite → **4/4 pass** (`App.test.tsx` 1; isolation 3, incl. the
  zero-apps capstone at 6 s).
- `tsc --noEmit -p tsconfig.json` → **exit 0** (backend typecheck green).
- Independent `tsc -p tsconfig.json --listFilesOnly | grep -c /apps/` → **0**.
- `apps/studio` own `tsc --noEmit` → **exit 0**.
- `biome lint` on the 4 new files → **exit 0, no fixes**.
- Backend `include` coverage cross-check: every `.test.ts` in the repo lives under
  `packages/`, `test-helpers/`, or `test-fixtures/` — the narrowed include drops nothing
  (the `test-fixtures` addition is what preserves the one fixture test the old glob caught).

## BLOCKERS
None.

## FOLLOW-UP

- **L1 (env-note, non-blocking):** The default worktree had no `apps/studio` deps installed
  (`@vitejs/plugin-react` unresolved) until I ran `pnpm install --frozen-lockfile`. The lockfile
  is correct and frozen-install is clean, so this is a stale local install-state artifact, not a
  code defect. Worth a one-line note in onboarding/CI that adding the `apps/*` glob means a fresh
  `pnpm install` is required before `pnpm test` collects the studio project — a cold checkout that
  skips install will hit a confusing "project setup failed" rather than a test failure.

- **L2 (perf-claim-gap):** The DoD/acceptance line "HMR reflects an edit < 1 s" is verified only
  structurally (dev server injects React Fast Refresh + serves transformed modules), not timed with
  a real headless edit-loop. The executor flagged this honestly and scoped the real timed assertion
  to step 3's shell work (which is where Playwright lands). Reasonable deferral — the smoke render +
  dev-server-serves-the-app cover the practical pipeline proof for *this* card — but the timed HMR
  budget should get a real assertion in the step-3 e2e, not be left implicitly "done."

- **L3 (boundary-enforcement-gap):** ADR-007 §M1 / Validation calls for a `madge`/`dependency-cruiser`
  CI gate asserting `packages/* ↛ apps/*` and "no frontend import in the backend." This card asserts
  the boundary via a bespoke grep/manifest test (`apps-studio-isolation.test.ts`), which is good and
  real, but it is per-this-app and grep-based rather than the graph-level gate the ADR names as the
  point where the invariant becomes *enforced* vs. *convention*. Not in this card's scope (the ADR
  defers it to a design-doc/card), but it remains the open work that turns the one-way edge from
  convention into a true gate. Note also the R2 test greps only `apps/studio/src`; once step 3+
  add more source (or other `apps/*`), the walk root will need widening.

## Outstanding close-out actions
- Code Review box → checkable (this approval).
- PR/merge, stakeholder notify, ticket close → reviewer/dispatcher/PR-agent post-merge (fork-only:
  no prod deploy / monitoring, per the card's Validation table).
