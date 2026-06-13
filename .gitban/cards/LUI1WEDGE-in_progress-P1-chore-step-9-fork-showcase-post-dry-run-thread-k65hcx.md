# step 9: fork-showcase-post — post the milestone update to the fork dry-run thread

> **Sprint**: LUI1WEDGE | **Step**: 9 | **Roadmap**: m3/s1/wedge-slice-showcase/fork-showcase-post
> **Depends on**: step 8 (contrib-diff-cut, `dx99dj`). **Unblocks**: step 10 (closeout).
> **CAMERON APPROVES THE FIRST POST — DO NOT AUTO-POST.** This is a process artifact: prepare the comment, get Cameron's sign-off, then post to the FORK (`muunkky/deepnote`) dry-run showcase thread. Nothing goes to `deepnote/deepnote`.

## Cleanup Scope & Context

* **Sprint/Release:** LUI1WEDGE (m3/s1 upstream wedge)
* **Primary Feature Work:** `@deepnote/runtime-server` + `deepnote serve`/`ui`, sliced as `contrib/m3-serve`
* **Cleanup Category:** Showcase / process artifact (design doc Phase 10; `.claude/CLAUDE.md` "Showcase thread")

**Required Checks:**
* [ ] Sprint/Release is identified above.
* [ ] Primary feature work that generated this cleanup is documented.

### Required Reading

| Source | Section / lines | Why |
| :--- | :--- | :--- |
| `docs/designs/m3-s1-server-api-and-serve.md` | "Phase 10: Fork showcase post" | What to post: what shipped, link both diffs, label upstream-ready vs fork-only. |
| `.claude/CLAUDE.md` | "Showcase thread (dry run on our own fork)"; "Use an upstream issue to showcase and ask — never push unsolicited" (#288 pattern) | First post is hand-written / approved by Cameron; the thread lives on `muunkky/deepnote`; nothing to `deepnote/deepnote`. |
| `docs/prds/PRD-003-local-deepnote-ui.md` | Phase P7 (decompose) | The wedge-delivery framing for the post. |

## Deferred Work Review

* [ ] Reviewed commit messages for "TODO" and "FIXME" comments added during sprint.
* [ ] Reviewed PR comments for "out of scope" or "follow-up needed" discussions.
* [ ] Reviewed code for new TODO/FIXME markers (grep for them).
* [ ] Checked team chat/standup notes for deferred items.

| Cleanup Category | Specific Item / Location | Priority | Justification for Cleanup |
| :--- | :--- | :---: | :--- |
| **Documentation** | Draft the showcase comment: what shipped (server API + serve/ui), link the contrib diff (`contrib/m3-serve`) and the process diff (`sprint-record/LUI1WEDGE`), label upstream-ready vs fork-only | P1 | The milestone update for the dry-run thread. |
| **Documentation** | Get Cameron's approval BEFORE posting (first-post-approval rule) | P0 | `.claude/CLAUDE.md` requires the first post be hand-written/approved by Cameron. |
| **Documentation** | Post to the `muunkky/deepnote` showcase thread (fork only) | P1 | Dry run of the eventual #162 engagement. |

## Cleanup Checklist

### Documentation Updates (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Showcase draft** | comment drafted: shipped scope, both diffs linked + labeled | - [ ] |
| **Cameron approval** | first post approved by Cameron (DO NOT auto-post) | - [ ] |
| **Post to fork thread** | posted on `muunkky/deepnote` (record thread `#<n>`) | - [ ] |
| **Upstream check** | confirm NOTHING pushed/posted to `deepnote/deepnote` | - [ ] |

## Validation & Closeout

### Pre-Completion Verification

| Verification Task | Status / Evidence |
| :--- | :--- |
| **All P0 Items Complete** | Cameron-approved before posting |
| **All P1 Items Complete or Ticketed** | comment posted on the fork thread with both diffs labeled |
| **Tests Passing** | N/A (process artifact) |
| **No New Warnings** | N/A |
| **Documentation Updated** | showcase comment is the artifact |
| **Code Review** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Remaining P2 Items** | none |
| **Recurring Issues** | none |
| **Process Improvements** | this format becomes the template for the eventual real upstream #162 post |
| **Technical Debt Tickets** | none |

## Definition of Done

### Intent

This is a documentation/process artifact, not runtime behavior. Success is: a clear milestone-update comment is posted on the fork's own dry-run showcase thread (`muunkky/deepnote`), describing what shipped and linking both the clean contrib diff and the full process diff with each labeled upstream-ready or fork-only — AND it was approved by Cameron before going up, with nothing pushed or posted to `deepnote/deepnote`.

### Observable outcomes

- [ ] Cameron approves the drafted showcase comment before it is posted (the first-post-approval rule is honored — no auto-post).
- [ ] A showcase comment is posted on the `muunkky/deepnote` thread with the contrib diff and the process diff both linked and each labeled upstream-ready vs fork-only.
- [ ] Nothing is pushed or posted to `deepnote/deepnote`.
- [ ] No capstone applicable: this is a process/documentation artifact (a showcase post) with no runtime behavior to exercise end-to-end; the observables above are the complete, verifiable definition of done.

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
