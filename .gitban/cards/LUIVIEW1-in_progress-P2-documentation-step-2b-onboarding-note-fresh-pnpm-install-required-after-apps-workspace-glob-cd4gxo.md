# Onboarding note: fresh `pnpm install` required after the `apps/*` workspace glob

**Source:** j97w5m (LUIVIEW1 step 2) review 1, finding L1. Routed as a sprint card (not a closeout item) because the router contract forbids new-documentation work as a closeout-append item.

## Documentation Scope & Context

* **Related Work:** LUIVIEW1 sprint, step 2 card `j97w5m` (spa-foundation framework + bundler — added the `apps/*` workspace glob and the `studio` vitest project).
* **Documentation Type:** Onboarding / CI discoverability note (one line).
* **Target Audience:** Contributors and CI maintainers running `pnpm test` on a cold checkout.

**Required Checks:**
- [x] Related work/context is identified above
- [x] Documentation type and audience are clear
- [x] Existing documentation locations are known (avoid creating duplicates)

---

## Pre-Work Documentation Audit

The new `apps/*` workspace glob (landed by `j97w5m`) means `pnpm test` will not collect the `studio` vitest project until a fresh `pnpm install` has resolved `apps/studio`'s deps (e.g. `@vitejs/plugin-react`). A cold checkout that skips install surfaces a confusing **"project setup failed"** instead of a clean test failure. The fix is a single discoverable sentence in onboarding/CI docs.

- [x] Repository root reviewed for doc cruft (stray .md files, outdated READMEs)
- [x] `/docs` directory (or equivalent) reviewed for existing coverage
- [x] Related service/component documentation reviewed
- [x] Team wiki or internal docs reviewed

| Document Location | Current State | Action Required |
| :--- | :--- | :--- |
| **apps/studio/README.md** | No install-ordering note | Add the one-line "run `pnpm install` after pulling the `apps/*` glob or the studio vitest project won't be collected" note (primary home) |
| **CONTRIBUTING.md / root README** | `pnpm install --frozen-lockfile` documented as baseline, but not the `apps/*` collection consequence | Optionally cross-reference the note where `pnpm test` is described |
| **CI workflow** | Assumes install precedes test | Confirm install step precedes the studio project collection; add a comment if a cold path exists |

**Documentation Organization Check:**
- [x] No duplicate documentation found across locations
- [x] Documentation follows team's organization standards
- [x] Cross-references between docs are working
- [x] Orphaned or outdated docs identified for cleanup

---

## Documentation Work

| Task | Status / Link to Artifact | Universal Check |
| :--- | :--- | :---: |
| **Add the one-line install-ordering note** | `apps/studio/README.md` (primary), cross-ref where `pnpm test` is documented | - [x] Complete |
| **Verify the cold-checkout symptom** | Reproduce: clean tree, skip install, run `pnpm test`, confirm the "project setup failed" message the note warns about | - [x] Complete |

**Documentation Quality Standards:**
- [x] All code examples tested and working
- [x] All commands verified
- [x] All links working (no 404s)
- [x] Consistent formatting and style
- [x] Appropriate for target audience
- [x] Follows team's documentation style guide

---

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Final Location** | `apps/studio/README.md` (+ optional cross-reference) |
| **Path to final** | `apps/studio/README.md` |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Documentation Gaps Identified?** | The `apps/*` glob's install-ordering consequence was undocumented; this card closes that gap |
| **Style Guide Updates Needed?** | No |
| **Future Maintenance Plan** | Revisit if additional `apps/*` packages are added that change the install/collection contract |

### Completion Checklist

- [x] All documentation tasks from work plan are complete
- [x] Documentation is in the correct location (not in root dir or random places)
- [x] Cross-references to related docs are added
- [x] Documentation is peer-reviewed for accuracy
- [x] No doc cruft left behind (old files cleaned up)
- [x] Future maintenance plan identified [if applicable]
- [x] Related work cards are updated [if applicable]

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.


## Close-out summary (executor cycle 1)

**Shipped.** Documented the cold-checkout footgun: after the `apps/*` workspace glob landed (LUIVIEW1 step 2, j97w5m), `pnpm test` will not collect the `studio` vitest project until a fresh `pnpm install` has resolved `apps/studio`'s deps.

- **`apps/studio/README.md` (primary home)** — added a blockquote note in the test-suite paragraph explaining the mechanism (root `vitest.config.ts` references `./apps/studio/vitest.config.ts`, which imports `@vitejs/plugin-react` at config-eval time; a cold `pnpm test` before install fails that import and vitest reports a confusing "project setup failed" with zero `studio` tests collected) and the fix (`pnpm install` first; CI must order install before test).
- **`CONTRIBUTING.md` (cross-reference)** — added a shorter note in the "Testing" section right under `pnpm test`, pointing to `apps/studio/README.md` for the mechanism.

**Verification (honest scope).** The symptom was verified **statically**, not by a destructive cold-checkout reproduction: the root `vitest.config.ts` `projects` array references `./apps/studio/vitest.config.ts`, and that file does a top-level `import react from '@vitejs/plugin-react'` evaluated when vitest loads the project config — so an unresolved `apps/studio` dep tree fails project setup before any test is collected. I did NOT run `pnpm test` on a wiped node_modules, because the shared workspace install in this worktree environment is read-only/shared and must not be torn down (executor rule: never run installers against the shared toolchain).

**CI cold path: none.** `.github/workflows/ci.yml` Test job orders `Install dependencies` (`pnpm install --frozen-lockfile`) before `Run tests with coverage` (`pnpm run test:coverage`), so no CI comment was needed — the footgun is purely a local cold-checkout one, now covered by the two doc notes.

**cspell.** No new vocabulary required; both changed files pass `cspell` clean (0 issues). `cspell.json` `words` unchanged.

**Deferred:** none.