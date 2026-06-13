---
verdict: APPROVAL
card_id: cd4gxo
review_number: 1
commit: 4fb53fc
date: 2026-06-13
has_backlog_items: false
---

# Review: cd4gxo — onboarding note, fresh `pnpm install` required after `apps/*` workspace glob

Documentation-only card (step 2b, P2). The bar is accuracy + discoverable placement, with
CI-path-unaffected confirmation. All three are met. **APPROVED.**

## Gate 1 — card structure

DoD-exempt: this is a documentation-only update (no function signature, control flow, schema,
runtime config, agent prose, or test behavior changed), so no Definition of Done / capstone is
required. The card follows the documentation template; required-check and audit checkboxes are
truthful and appropriate for a docs card. The executor close-out summary is honest about its
verification scope — it states plainly that the symptom was verified **statically** (not via a
destructive cold-checkout reproduction) and gives a sound reason (the shared worktree install is
read-only and must not be torn down). No integrity issue. Gate 1 passes.

## Gate 2 — accuracy and placement

Every documented mechanism claim was cross-checked against the real source and holds:

- **Top-level import at config-eval time.** `apps/studio/vitest.config.ts:2` is
  `import react from '@vitejs/plugin-react'` — a top-level import evaluated when vitest loads the
  project config. Accurate.
- **Root config references the studio project file.** `vitest.config.ts:51` lists
  `'./apps/studio/vitest.config.ts'` in the `projects` array, alongside the inline `backend`
  project. So a cold `pnpm test` that loads the root config must load (and evaluate the imports of)
  the studio project config before any studio test is collected. The "zero studio tests collected /
  project setup failed" framing is the correct symptom of that import failing to resolve. Accurate.
- **`apps/*` workspace glob.** `pnpm-workspace.yaml` lists `apps/*` (alongside `packages/*`). The
  "after pulling the `apps/*` workspace glob" framing is correct.
- **Root test entry point.** Root `package.json` `test` script is `vitest run`, which loads the root
  `vitest.config.ts`. Accurate.

**CI path is unaffected — confirmed.** `.github/workflows/ci.yml` Test job (lines 182–188) runs
`pnpm install --frozen-lockfile` → `pnpm run build` → `pnpm run test:coverage`, i.e. install
strictly precedes any test collection. The doc's claim "CI must order the install step before
`pnpm test`" is satisfied today, so this footgun is purely a local cold-checkout one — no CI comment
was needed and none was added. Correct call by the executor.

**Placement is discoverable and non-duplicative.** Primary note lands in `apps/studio/README.md`
inside the existing test-suite paragraph (right where a reader learns `pnpm test` collects the SPA
project), with a tighter cross-reference in `CONTRIBUTING.md` directly under the `pnpm test` block,
linking back to the README for the mechanism. The relative markdown link
`[apps/studio/README.md](apps/studio/README.md)` is correct. Two notes, one canonical home — no
content duplication, consistent with the card's stated organization plan.

**Prose quality.** Both notes name the concrete symptom ("project setup failed", zero studio tests),
the cause (config-eval-time import of an unresolved dep), and the fix (fresh `pnpm install` first).
A contributor hitting the confusing error can self-serve. Style matches the surrounding blockquote
conventions in both files.

Minor accuracy nuance (not a blocker, no action required): the studio config's top-level imports
also include `vitest/config` and `node:url`; the note singles out `@vitejs/plugin-react` as the
import that fails to resolve. That is the right one to name — it is the app-specific dependency most
likely to be unresolved on a cold checkout (the others are workspace-root tooling), so the pointer is
both accurate and maximally useful.

## FOLLOW-UP

None. The diff is two additive doc blockquotes with no adjacent debt exposed.
