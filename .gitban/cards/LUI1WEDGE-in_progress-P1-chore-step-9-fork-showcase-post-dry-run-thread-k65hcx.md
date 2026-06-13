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
| **Showcase draft** | comment drafted: shipped scope, both diffs linked + labeled | - [x] |
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


## Executor close-out (executor-1, step 9 — DRAFT ONLY)

**Drafted, NOT posted.** Showcase comment drafted to a new fork-only file:
`docs/showcase/LUI1WEDGE-showcase-post.md` (committed on the worktree branch, doc-only —
no `.gitban/` staged). The card remains `in_progress`.

**What the draft covers** (per the directive + design-doc Phase 10 + `.claude/CLAUDE.md` "Showcase
thread"):
- Per-sprint reply for `muunkky/deepnote` Discussion #5 (the dry-run thread; opening post is
  Cameron's). Tells the story, not a changelog.
- **What shipped (m3/s1 wedge):** `@deepnote/runtime-server` (kernel-free `GET /api/project`, run over
  WS via single-concurrency run queue with guaranteed terminal event, atomic save w/ external-change
  detection) + `deepnote serve`/`ui` + SQL/integration env parity (KD-3 lift) + the real-kernel parity
  suite; the "zero runtime-core behavior change" invariant.
- **De-risking / adversarial gates** (verified against real commits): the kernel auto-restart-masks-
  mid-run-death bug fixed in `packages/runtime-core/src/kernel-client.ts` (commit `ad9738e`,
  strengthens BOTH server and CLI parity); the loopback security test that was a false positive
  (asserted client-side address; reworked to server-side bind — commits `4866ab5`/`8ab721c`); the serve
  packaging/typecheck gap and the flaky teardown unhandled-rejection (`1c97429`/`bbfd6da`); multiple
  reviewer rejection→rework→green cycles.
- **Two diffs, labeled:** `contrib/m3-serve` (pushed to origin) = upstream-ready code-only slice
  guarded by the import-form slice-integrity gate; `sprint-record/LUI1WEDGE` = fork-only process diff,
  linked as a placeholder ("to be cut at closeout — branch does not exist yet").
- The diff-size / monolith→slice story.
- DRAFT banners top and bottom; explicit "nothing to `deepnote/deepnote`".

**Gates run:** `prettier --check` PASS (reflow-stable); `cspell` PASS exit 0 (proper nouns
`autorestart`/`autorestarting`/`muunkky`/`deepnote` already in `docs-dictionary.txt` — no dictionary
edit needed). No code tests apply (doc artifact).

**Checkbox state:** only "Showcase draft" ticked. "Cameron approval", "Post to fork thread", and
"Upstream check" left UNCHECKED — those are Cameron's gated actions. `complete_card` NOT called; card
stays `in_progress` pending Cameron's approval + post.

**Did NOT** run `gh`, post to any GitHub Discussion/Issue, push any branch, or contact
`deepnote/deepnote` in any way.
