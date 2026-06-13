# Executor directive — LUI1WEDGE / k65hcx (executor-1, step 9: fork-showcase post — DRAFT ONLY)

## ⚠️ BRANCH OVERRIDE
This sprint runs on **`milestone/m3-local-ui`**, NOT `sprint/LUI1WEDGE`.
- Base check: `git merge-base --is-ancestor milestone/m3-local-ui HEAD && echo "base ok" || echo "WRONG BASE"`.
- Merge-back target `milestone/m3-local-ui`; completion tag `LUI1WEDGE-k65hcx-done`. Commit **code/doc only**.

## ⚠️⚠️ DRAFT ONLY — DO NOT POST ANYTHING. DO NOT TOUCH ANY REMOTE.
This card's actual post is **Cameron-approved and Cameron-posted** ("CAMERON APPROVES THE FIRST POST — DO
NOT AUTO-POST"). Your job is to **draft** the showcase comment as a file artifact for Cameron's review.
**Do NOT** run `gh`, do NOT post to any GitHub Discussion/Issue, do NOT push any branch, do NOT contact
`deepnote/deepnote` in any way. The dispatcher halts for Cameron's approval after you produce the draft.

## What to draft
Write a polished milestone-update showcase comment to a NEW fork-only file:
**`docs/showcase/LUI1WEDGE-showcase-post.md`** (docs/ is fork-only — it never rides the contrib slice).

`read_card(k65hcx)` + read `.claude/CLAUDE.md` ("Showcase thread (dry run on our own fork)") and
`docs/designs/m3-s1-server-api-and-serve.md` "Phase 10: Fork showcase post" for the required format. The
post is a **per-sprint reply** on the `muunkky/deepnote` **Discussion #5** dry-run thread (the opening
post already exists / is Cameron's). Tell the *story*, not just a changelog. Include:

- **What shipped (m3/s1 wedge):** `@deepnote/runtime-server` (open `GET /api/project` kernel-free, run
  over WS with a single-concurrency run-serialization queue, atomic save with external-change detection)
  + the `deepnote serve` / `deepnote ui` CLI, + SQL/integration env parity with `deepnote run` via the
  KD-3 helper lift, + a real-kernel integration parity suite.
- **The de-risking / what the adversarial gates caught** (this is the compelling part — be concrete and
  honest): the real-kernel parity card surfaced a genuine **kernel auto-restart-masks-mid-run-death** bug
  that mocks (and even upstream `deepnote run`) missed — fixed in `kernel-client.ts`, strengthening parity
  for BOTH the server and the CLI; a reviewer caught a **loopback security test that was a false positive**
  (asserted the client-side address, passed even on a `0.0.0.0` bind); a serve **packaging/typecheck gap**
  and a **flaky teardown unhandled-rejection** were both caught and fixed. Multiple cards were
  reviewer-rejected and reworked to green — show the rigor.
- **The two diffs, each LABELED:**
  - **`contrib/m3-serve`** (pushed to `origin`) — the clean, **upstream-ready** code-only slice
    (`packages/` only; no SPA/board/docs; builds+typechecks+tests standalone off `upstream/main`; guarded
    by an import-form slice-integrity gate).
  - **`sprint-record/LUI1WEDGE`** — the full **fork-only** process diff (board + PRD/ADR/design + code).
    **NOTE:** this branch does NOT exist yet — the dispatcher/closeout cuts it. In the draft, link it as a
    placeholder (`sprint-record/LUI1WEDGE`, "to be cut at closeout") and clearly label it fork-only.
- The **diff-size story** (monolith developed with gitban → sliced clean for upstream) per CLAUDE.md.

Keep it authentic and not overzealous (Cameron's voice; he will edit). End the file with a short
**"⚠️ DRAFT — awaiting Cameron's approval before posting to muunkky/deepnote Discussion #5"** banner at the
top so it's unmistakably not-yet-posted.

## Card checkboxes
Tick ONLY the "Showcase draft" task. **Leave "Cameron approval", "Post to fork thread", and "Upstream
check" UNCHECKED** — those are Cameron's gated actions, not yours. Do NOT call `complete_card` (the card
cannot complete until Cameron approves + posts). Leave the card `in_progress`.

## Gates
`pnpm spell-check` (from parent; add any new proper nouns to `docs-dictionary.txt`), prettier on the new
`.md`. No code tests apply (doc artifact). Do not push or post anything.
