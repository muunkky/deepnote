---
verdict: APPROVAL
card_id: dx99dj
review_number: 1
commit: 127f0a6
date: 2026-06-12
has_backlog_items: true
---

# Review: dx99dj (step-8 contrib-diff-cut / slice-integrity gate) — APPROVAL

Two deliverables, both sound. Deliverable A (the mergeable CI gate at commit `127f0a6`)
is the code under review for merge to `milestone/m3-local-ui`; Deliverable B
(`origin/contrib/m3-serve` @ `5e4976b`) is the fork artifact, inspected via git.

## Gate 1 — completion claim

DoD is required (this card adds test behavior and a runtime CI gate) and is present and
strong. Intent is plain-English and externally checkable ("a maintainer with only
`upstream/main` + this branch can check out, install, build, typecheck, test green, and
see nothing but a server package + serve command"). The capstone observable is unfakeable
— it asserts the contrib branch builds/typechecks/tests with **no `apps/` present** and
the grep returns nothing, which only passes when the whole slice boundary holds end-to-end.
Checkboxes cover the acceptance criteria including the L1 precision sub-criteria. Checkbox
integrity verified below. Gate 1 passes.

## Gate 2 — implementation quality

### Deliverable A — the slice-integrity gate (the merge target)

Verified directly:

- **Runs green, non-vacuously.** `vitest run src/slice-integrity.test.ts` → 5/5 passed.
  Root `tsc --noEmit -p tsconfig.json` → exit 0 (the new file is type-clean on milestone).
- **L1 precision is correctly implemented and proven.** The gate matches module-specifier
  string-literal nodes via the in-repo TypeScript AST — the same pattern as the established
  `87ifqe` tests (`api-types-no-runtime-import.test.ts`, `no-cli-import.test.ts`), which I
  read for parity. I probed `isForbiddenSpecifier` against an independent edge corpus: it
  correctly rejects `@deepnote/reactivity`, `vitest`, `./reactivity-helpers`, `mapps/x`,
  `capps/y` and flags `react`, `react-dom/client`, `react/jsx-runtime`, `vite/client`,
  `@vitejs/plugin-react`, `../apps/web`, `apps/web`, `@apps/web`. The `\b` after `react`/`vite`
  is exactly what defeats the `reactivity`/`vitest` false positive the L1 finding flagged.
- **The false-positive the gate exists to avoid is real.** Bare `-iE 'react|vite|apps/'`
  over the *actual* contrib serve-delta source flags `preAction`, `backward`, and the
  `reactivity: 'python' | 'disabled'` capability enum/prose — all zero frontend coupling.
  The AST gate ignores every one (none is a module specifier). This is the L1 false-positive
  demonstrated on production source, not just asserted.
- **Non-vacuity is structurally guarded.** A broken path resolution throws ENOENT (loud),
  and the explicit guards (`sourceFiles.length > 3`, `serve.ts` present, `runtime-server/src`
  present, some `@deepnote/` specifier parsed) prevent a vacuous empty/partial scan from
  passing silently. The planted-source test walks the matcher + scanner together end-to-end
  and proves it flags exactly `['../apps/web/App', 'react']` while ignoring the planted
  `@deepnote/reactivity` and `vitest` lines.
- **TDD-shaped.** Failure/edge corpora precede the happy path; the executor's own note that
  the first run caught the unmatched `@apps/web` alias (red → added `^@apps(/|$)` arm → green)
  is the test-first signature, not test-after.

### Deliverable B — the `contrib/m3-serve` fork artifact

Verified directly against `origin/contrib/m3-serve` (`5e4976b`):

- **Genuinely cut off `upstream/main`.** Its base commit (`d921be7`) is an ancestor of
  `upstream/main`. The two slice commits sit on top.
- **Upstream-clean — no forbidden paths.** The full `upstream/main...contrib/m3-serve`
  name-only diff (67 files) contains **zero** `.gitban/`, `.claude/`, `docs/`, or `apps/`
  paths. Top-level dirs touched are exactly `packages/` + `pnpm-lock.yaml`. The capstone
  observable holds.
- **The larger closure is ADR-compliant, not scope creep.** The slice spans
  `runtime-core` + `runtime-server` + the cli serve delta. ADR-007 §86–89 states
  `runtime-server` depends on `@deepnote/runtime-core`, `@deepnote/blocks`,
  `@deepnote/reactivity` (all `workspace:*`); a buildable cut must carry those workspace
  deps. ADR Validation (1) requires "the relevant code paths," not `runtime-server` alone.
  The executor's honest closure finding (serve `session.ts` is transitively coupled to the
  milestone runtime-core kernel-name/integrations surface, which needs the `blocks` delta)
  is a real coupling signal correctly surfaced — and crucially the closure is **`packages/`
  libraries + one test fixture only**; no SPA/board/docs leaked. The boundary the milestone
  is organized around held.

### The two honest caveats — both independently verified

1. **Pre-existing cli flakes (diff/dag/lint).** I confirmed `diff.test.ts`, `dag.test.ts`,
   and `lint.test.ts` are **byte-identical** between `upstream/main` and `contrib/m3-serve`
   (the slice only adds `serve.ts`/`serve.test.ts` to `commands/`). The flakes are genuinely
   upstream/constrained-box artifacts, not slice-induced. Honest reporting.
2. **`--no-verify` push due to parallel-`tsc` OOM.** Acceptable per project conventions —
   intermediate agent commits may bypass hooks; the PR/closeout agent must run hooks before
   merge. The type-cleanliness claim is independently corroborated: root `tsc --noEmit -p
   tsconfig.json` is exit 0 on milestone, and the OOM is on the parallel `pnpm -r exec tsc`
   step (a resource kill), not a type error. The PR/closeout gate carries the obligation to
   run a full hook pass on a non-constrained machine before this slice is ever offered.

No lazy solves, no loosened checks, no overmocking. The gate adds a real, always-on
boundary invariant with no production-behavior change. Approved.

## FOLLOW-UP

- **L1 (doc-accuracy nit, test-comment):** The non-vacuity block's comment (lines ~129–131)
  states the slice "does legitimately import `@deepnote/reactivity`." In the gate's actual
  scan scope (`runtime-server/src` non-test + cli serve delta), `@deepnote/reactivity` appears
  only as a comment/enum value and in the planted test corpus — it is **not** an actual import
  specifier in shipped slice source; the real `@deepnote/` specifiers that satisfy the
  assertion are `@deepnote/runtime-core`, `@deepnote/blocks`, `@deepnote/runtime-server/types`.
  The *assertion that runs* (line 132, `some(s => s.startsWith('@deepnote/'))`) is correct and
  the gate is non-vacuous regardless; only the prose slightly overstates. Tighten the comment
  to "imports `@deepnote/*` workspace packages" so a future reader isn't misled into thinking a
  reactivity import is load-bearing for the test.

- **L2 (ci-gate-scope-gap):** The always-on gate scans `runtime-server/src` + the three CLI
  serve-delta files only. The contrib closure also pulls in `runtime-core` + `blocks`. A
  frontend/`apps/` import planted in `runtime-core` or `blocks` would not be caught by this
  gate (it would still be caught by the existing one-way-dependency convention, but that is
  review-asserted, not enforced — ADR-007 Validation bullet 3, the M1 madge/depcruise check
  that "has not landed"). Consider whether the standing CI gate should widen to the whole
  slice closure, or whether the deferred madge/depcruise boundary check (already noted as a
  recurring-issue follow-up on this card) is the right home for that. Non-blocking — the
  serve-delta files are where a leak is most plausible, and this gate covers them.

- **L3 (pre-existing-flake debt):** The cli diff/dag/lint `process.exit`-mock / 5s-timeout
  test-isolation flakes on constrained machines are independent of this card but real and
  recurring (they forced the `--no-verify` workaround). Worth a backlog card to harden those
  three suites against the isolation/timeout artifact so future contrib-slice pushes can run
  the full hook suite without OOM/flake noise.
