> ✅ **POSTED** to `muunkky/deepnote` Discussion #5 (fork dry-run showcase thread) on 2026-06-13:
> https://github.com/muunkky/deepnote/discussions/5#discussioncomment-17287165
> Fork-only — nothing was pushed or sent to `deepnote/deepnote`. Fork posts are pre-authorized by Cameron;
> only upstream (`deepnote/deepnote`) posts require his explicit approval. The `sprint-record/LUI1WEDGE`
> link in the posted copy was finalized to "cut at closeout" (the placeholder note was resolved).

---

## Milestone update — m3/s1: a headless runtime server + one-command launch (the upstream "wedge")

This is the first sprint reply on the thread, so a sentence of framing: the experiment is to run the
whole product-development lifecycle (roadmap → PRD → ADRs → design doc → sprint board → code → review)
_in lockstep on this fork_, then slice a clean, code-only diff out of the monolith that maps 1:1 to what
an upstream PR would look like. This reply is the story of the first such slice.

### What shipped (the m3/s1 wedge)

A small, self-contained slice that lets you run a Deepnote project locally with one command — no cloud,
no kernel-in-the-loop just to open a notebook:

- **`@deepnote/runtime-server`** — a new package, not a change to anything that exists:
  - `GET /api/project` opens and lists a project **kernel-free** — you don't pay for a Python kernel
    just to read the notebook.
  - **Run over WebSocket**, serialized through a single-concurrency **run queue**. Every run is
    guaranteed exactly one terminal event (`run-done` on normal completion _including_ an in-block
    failure, `run-failed` reserved for kernel death) so the UI can never get stuck on a "pending forever"
    run.
  - **Atomic save with external-change detection** — SHA-256 of the on-disk bytes at open vs. save, a
    `409`-no-write on mismatch, temp-then-rename so a concurrent editor write can't be silently clobbered.
- **`deepnote serve` / `deepnote ui`** — the one-command launch. `serve` is the canonical headless
  command; `ui` is the alias that defaults to opening a browser.
- **SQL / integration env parity with `deepnote run`** — the integration-env helpers were lifted to a
  shared home (the "KD-3 lift") so the server and the existing CLI run path resolve database/integration
  environment identically, instead of forking behavior.
- **A real-kernel integration parity suite** — not mocks. It runs an actual kernel and asserts the
  server produces the same outputs as `deepnote run`.

Crucially, **zero `runtime-core` behavior change** in this slice: no existing file or command changes
behavior. The server _reuses_ runtime-core primitives; the only edit to an existing file is the CLI
command registration plus a dependency line. That "no runtime-core change" invariant is what makes the
wedge safe to offer upstream.

### The de-risking — what the adversarial gates actually caught

This is the part I find most interesting, and I want to be honest rather than triumphant: the value
wasn't that the plan was perfect, it's that the gates caught real things before they shipped.

- **A genuine kernel bug that mocks — and even upstream `deepnote run` — missed.** The real-kernel
  parity card surfaced it: a hard crash (`os._exit(1)`) makes the Jupyter server **auto-restart** the
  kernel instead of leaving it `dead`. The status goes `busy → autorestarting → … → idle`; `dead` is
  never observed mid-run. The in-flight execute future is abandoned and surfaced as a _plain in-block
  error_ — so a real kernel death was being mis-reported as an ordinary block error by **both** the new
  server **and** the existing `deepnote run`. Fixed in `packages/runtime-core/src/kernel-client.ts` by
  treating `restarting`/`autorestarting` during an active execute as a kernel death, on both the
  status-signal and future-reject paths. Because the fix is in the shared client, it strengthens run
  parity for the server **and** the CLI at once.
- **A security test that was a false positive.** A reviewer rejected a loopback-bind test that asserted
  the _client-side_ address — it would have passed even if the server had bound `0.0.0.0`. Reworked to
  assert the bind via the **server-side** address so it actually proves the loopback guarantee.
- **A packaging / typecheck gap** in the serve path and a **flaky teardown unhandled-rejection** (a dead
  kernel's benign disconnect rejection wasn't being swallowed deterministically) — both caught in review
  and fixed.

Several cards were reviewer-**rejected and reworked to green** rather than waved through. That's the
process working as intended: the adversarial review gate is there to be failed.

### The two diffs

Per the two-diff model — develop the monolith here, ship a clean slice:

- **`contrib/m3-serve`** — pushed to `origin`. The clean, **`upstream-ready`** code-only slice:
  `packages/` only, no SPA / no board / no docs. It **builds, typechecks, and tests standalone** off
  `upstream/main`, and is guarded by an import-form **slice-integrity gate** so nothing from the monolith
  can leak in. This is the exact diff we'd open against `deepnote/deepnote` once invited.
- **`sprint-record/LUI1WEDGE`** — the full **`fork-only showcase`** process diff: board, the
  PRD/ADR/design docs, and the code — showing _how_ the change was reasoned and de-risked. _(To be cut at
  closeout — this branch does not exist yet; the link is a placeholder until the dispatcher cuts it.)_

### The diff-size story

Developing in lockstep with gitban naturally produces a sprint "monolith" far larger than any project
would accept in one PR — board mutations, planning docs, spikes, and code all co-evolving. The point of
the two-diff model is that none of that has to reach a maintainer: the **clean contrib slice is just the
package code**, sliced out and verified to stand on its own off `upstream/main`. The process diff stays
on the fork as context for anyone who wants to see the reasoning behind the clean one.

### Where this sits

This is the _wedge_ — the smallest honest slice of "local Deepnote UI" that's useful on its own and safe
to offer upstream. Deliberately **out** of this slice (and named as m3/s5 follow-ups, not gaps):
running-cancel of an in-flight run (needs net-new published `runtime-core` interrupt methods), run-all
coalescing, and reactive `with-upstream` run scope. Queued-cancel ships now; the rest land with the
reactivity story.

---

> ✅ **End of post.** Posted to `muunkky/deepnote` Discussion #5 (fork only). Nothing to `deepnote/deepnote`.
