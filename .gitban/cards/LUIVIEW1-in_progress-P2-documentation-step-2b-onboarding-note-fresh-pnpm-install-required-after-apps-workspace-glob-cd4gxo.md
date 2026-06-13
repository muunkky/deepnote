# Onboarding note: fresh `pnpm install` required after the `apps/*` workspace glob

**Source:** j97w5m (LUIVIEW1 step 2) review 1, finding L1. Routed as a sprint card (not a closeout item) because the router contract forbids new-documentation work as a closeout-append item.

## Documentation Scope & Context

* **Related Work:** LUIVIEW1 sprint, step 2 card `j97w5m` (spa-foundation framework + bundler — added the `apps/*` workspace glob and the `studio` vitest project).
* **Documentation Type:** Onboarding / CI discoverability note (one line).
* **Target Audience:** Contributors and CI maintainers running `pnpm test` on a cold checkout.

**Required Checks:**
* [ ] Related work/context is identified above
* [ ] Documentation type and audience are clear
* [ ] Existing documentation locations are known (avoid creating duplicates)

---

## Pre-Work Documentation Audit

The new `apps/*` workspace glob (landed by `j97w5m`) means `pnpm test` will not collect the `studio` vitest project until a fresh `pnpm install` has resolved `apps/studio`'s deps (e.g. `@vitejs/plugin-react`). A cold checkout that skips install surfaces a confusing **"project setup failed"** instead of a clean test failure. The fix is a single discoverable sentence in onboarding/CI docs.

* [ ] Repository root reviewed for doc cruft (stray .md files, outdated READMEs)
* [ ] `/docs` directory (or equivalent) reviewed for existing coverage
* [ ] Related service/component documentation reviewed
* [ ] Team wiki or internal docs reviewed

| Document Location | Current State | Action Required |
| :--- | :--- | :--- |
| **apps/studio/README.md** | No install-ordering note | Add the one-line "run `pnpm install` after pulling the `apps/*` glob or the studio vitest project won't be collected" note (primary home) |
| **CONTRIBUTING.md / root README** | `pnpm install --frozen-lockfile` documented as baseline, but not the `apps/*` collection consequence | Optionally cross-reference the note where `pnpm test` is described |
| **CI workflow** | Assumes install precedes test | Confirm install step precedes the studio project collection; add a comment if a cold path exists |

**Documentation Organization Check:**
* [ ] No duplicate documentation found across locations
* [ ] Documentation follows team's organization standards
* [ ] Cross-references between docs are working
* [ ] Orphaned or outdated docs identified for cleanup

---

## Documentation Work

| Task | Status / Link to Artifact | Universal Check |
| :--- | :--- | :---: |
| **Add the one-line install-ordering note** | `apps/studio/README.md` (primary), cross-ref where `pnpm test` is documented | - [ ] Complete |
| **Verify the cold-checkout symptom** | Reproduce: clean tree, skip install, run `pnpm test`, confirm the "project setup failed" message the note warns about | - [ ] Complete |

**Documentation Quality Standards:**
* [ ] All code examples tested and working
* [ ] All commands verified
* [ ] All links working (no 404s)
* [ ] Consistent formatting and style
* [ ] Appropriate for target audience
* [ ] Follows team's documentation style guide

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

* [ ] All documentation tasks from work plan are complete
* [ ] Documentation is in the correct location (not in root dir or random places)
* [ ] Cross-references to related docs are added
* [ ] Documentation is peer-reviewed for accuracy
* [ ] No doc cruft left behind (old files cleaned up)
* [ ] Future maintenance plan identified [if applicable]
* [ ] Related work cards are updated [if applicable]

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.
