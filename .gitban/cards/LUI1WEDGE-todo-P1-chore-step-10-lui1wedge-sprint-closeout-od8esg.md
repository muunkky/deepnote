# LUI1WEDGE Sprint Closeout

> **Sprint**: LUI1WEDGE | **Type**: chore | **Step**: 10 (final)
>
> Mandatory closeout card for sprint LUI1WEDGE. Dispatched last. Walks accumulated retrospective items using the four-type deferral grid (see planner/SKILL.md per-item block format for the grid definitions).

## Purpose

Close out sprint LUI1WEDGE: archive done cards, generate the sprint summary, update `CHANGELOG.md`, mark roadmap stories complete (m3/s1 and its features under serve-api / cli-serve / wedge-slice-showcase), and process every item in the Sprint Retrospective section below using the four-type deferral grid each item carries.

## Cleanup Scope & Context

* **Sprint/Release:** LUI1WEDGE (m3/s1 — Headless runtime server + one-command launch)
* **Primary Feature Work:** `@deepnote/runtime-server` (HTTP+WS over runtime-core) + `deepnote serve`/`ui`, sliced as the upstream wedge.
* **Cleanup Category:** Sprint closeout (archive + summary + CHANGELOG + roadmap + retrospective)

**Required Checks:**
* [ ] Sprint/Release is identified above.
* [ ] Primary feature work that generated this cleanup is documented.

## Deferred Work Review

* [ ] Reviewed commit messages for "TODO" and "FIXME" comments added during sprint.
* [ ] Reviewed PR comments for "out of scope" or "follow-up needed" discussions.
* [ ] Reviewed code for new TODO/FIXME markers (grep for them).
* [ ] Checked team chat/standup notes for deferred items.

| Cleanup Category | Specific Item / Location | Priority | Justification for Cleanup |
| :--- | :--- | :---: | :--- |
| **Documentation** | CHANGELOG.md entry for `@deepnote/runtime-server` + `deepnote serve`/`ui` | P1 | user-visible new package + commands. |
| **Build/CI** | confirm slice-integrity + boundary CI gates are wired (from scaffold + contrib-diff-cut) | P1 | the ADR-007 invariant must stay enforced. |
| **Technical Debt** | m3/s5 follow-ups (P4 coalescing, P6 running-cancel, `runScope:'with-upstream'`) are SETTLED DEFERRALS by design — record, do not action here | P2 | they need net-new runtime-core methods / public reactivity primitives; out of s1 by design. |

## Sprint Retrospective

<!-- planner appends items below this line during the sprint. Each item is a self-contained block with its own classification grid per planner/SKILL.md. Leave this section empty if no items accumulate. -->

## Cleanup Checklist

### Documentation Updates (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **CHANGELOG** | added entry for runtime-server + serve/ui | - [ ] |
| **Architecture Docs** | roadmap m3/s1 marked complete | - [ ] |

### Build & CI/CD (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **CI Pipeline** | slice-integrity + boundary checks confirmed wired | - [ ] |

## Validation & Closeout

### Pre-Completion Verification

| Verification Task | Status / Evidence |
| :--- | :--- |
| **All P0 Items Complete** | execute-stream-ws + save-api done and reviewed |
| **All P1 Items Complete or Ticketed** | all 9 work cards done |
| **Tests Passing** | mocked + integration suites green |
| **No New Warnings** | biome/cspell clean |
| **Documentation Updated** | CHANGELOG + roadmap |
| **Code Review** | all cards reviewed + closeout review |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Remaining P2 Items** | m3/s5 follow-ups recorded (not actioned — settled deferrals) |
| **Recurring Issues** | (captured from retro) |
| **Process Improvements** | (captured from retro) |
| **Technical Debt Tickets** | (per retro classification) |

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

## Acceptance Criteria

- [ ] Every item under `## Sprint Retrospective` has exactly one deferral-type row marked `true` in its inline grid (exactly-one-true constraint)
- [ ] Every item has its `Action taken:` field filled in matching the chosen deferral type (card id for backlog/sprint, prose for note-only, commit hash for fixed-with-note)
- [ ] Every item's two per-item checkboxes (`Item {N} classified`, `Item {N} actioned`) are ticked
- [ ] Sprint summary generated via `generate_archive_summary`
- [ ] Roadmap updated for any stories this sprint completed
- [ ] `CHANGELOG.md` updated for any user-visible changes landed this sprint
- [ ] All sprint cards archived via `archive_cards`


## Sprint Retrospective

### Item 1: Engine-construction-spy regression for the kernel-free guarantee (post-4A)

Reviewer cycle 1 on x71bcm (GET /api/project, kernel-free) flagged a test-depth gap (L2). The
"opens with NO kernel started" test currently asserts only the **positive** signal — a
fully-populated `ApiProject` payload comes back. It cannot yet assert the **negative**: that no
`ExecutionEngine` is ever constructed during `loadProject` / `GET /api/project`. The reason is
structural — in step 3's phase there is no `ExecutionEngine` to spy on; the engine only becomes
constructible once step 4A (`hlai4c`, execute-stream-ws) lands `startEngine`. The KD-6 kernel-free
guarantee is currently enforced only by the positive assertion; a future refactor could silently
start constructing an engine on open and the suite would stay green.

**The follow-up:** once `hlai4c` has landed a constructible `ExecutionEngine`, add a regression test
that spies on engine construction and asserts `loadProject` / `GET /api/project` never triggers it,
so the kernel-free guarantee stays enforced after the engine becomes constructible. This is
captured here (not filed as a sprint card now) because its prerequisite is the in-sprint card
`hlai4c`, which is still `todo` — the closeout agent revisits this with full sprint context after
4A is done and decides final disposition. If 4A has landed by closeout, this is almost certainly a
`sprint` deferral (a small new card sequenced into this sprint, or folded into 4A's own suite). The
exactly-one-true grid below is for the closeout agent to fill.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | |

**Source:** x71bcm review 1
**Files touched:** packages/runtime-server/src/session.test.ts (the kernel-free regression lives here; engine spy target arrives via hlai4c / step 4A)
**Action taken:** {closeout fills prose — card {id} created in sprint {tag} / card {id} created in loose backlog / noted, no action / fixed in commit {hash}}

- [ ] Item 1 classified (exactly one deferral type marked `true` above)
- [ ] Item 1 actioned (action taken matches chosen type)

### Item 2: Fix `run-start.totalBlocks` contract lie

Reviewer cycle 1 on hlai4c (run-serialization queue, approved at 955c41d) flagged a docs-vs-code
mismatch (L1). `run-queue.ts:231` always emits `{ type: 'run-start', runId, totalBlocks: 0 }`, and
`run-queue.test.ts:78` codifies `totalBlocks: 0` as correct — but the contract type advertises the
field (`api-types.ts:109`) and the README documents it as a meaningful value, with the worked example
showing `"totalBlocks": 3`. A consumer that branches on `run-start.totalBlocks` to size a progress UI
gets `0` for every run, contradicting the documented `3`. The real per-run count IS carried correctly
on every `block-start.total`, and the count is genuinely unknowable before `engine.runProject` is
invoked. Resolution options: (a) drop `totalBlocks` from the `run-start` shape and update the
README/contract, deferring count to `block-start`; or (b) plumb the executable-block count out of the
engine and emit it for real. Either way the README example must stop showing a value the code never
produces. Failure mode: a downstream progress/percent indicator computed from `run-start.totalBlocks`
is permanently stuck at 0% or divides by zero.

Captured here (not a sprint card) because it does not block any downstream sprint card — the inbox
context confirms step 5's integration suite (wd2nil) "would benefit ... but does not strictly depend
on" these items, and there is no external prerequisite. The closeout agent revisits with full sprint
context; if option (a) is chosen this is a near-trivial doc+type+test edit (lean toward fixed-with-note),
while option (b) (real count plumbed from the engine) is a sprint-scoped feature edit — the grid below
is for the closeout agent to fill.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | |

**Source:** hlai4c review 1
**Files touched:** packages/runtime-server/src/run-queue.ts, packages/runtime-server/src/api-types.ts, packages/runtime-server/README.md, packages/runtime-server/src/run-queue.test.ts
**Action taken:** {closeout fills prose — card {id} created in sprint {tag} / card {id} created in loose backlog / noted, no action / fixed in commit {hash}}

- [ ] Item 2 classified (exactly one deferral type marked `true` above)
- [ ] Item 2 actioned (action taken matches chosen type)

### Item 3: Reset dead engine after mid-run kernel death (session lifecycle)

Reviewer cycle 1 on hlai4c flagged a lifecycle gap (L2). After a `KernelDiedError`, `#runTask` emits
the terminal `run-failed` and `#drain` continues, but `session.#engine` is never set back to `null`
(`session.ts:255` sets it; only `close()` at `:285` clears it). `startEngine()` is idempotent and
returns early on a non-null engine, so the *next* enqueued run calls `runProject` on a dead engine.
The design doc flags this as a "discrete deliverable in P3" with an explicit "or": the session marks
itself needing re-`start()`, or the server surfaces a fatal state. Decide between auto-resetting the
engine (re-`start()` on next run) vs. transitioning the session to an explicit fatal state, and test
the second-run-after-death path. The terminal-event guarantee (the DoD) still holds today — a
subsequent run rejects again and produces another terminal `run-failed`, so it degrades to repeated
kernel-died terminals rather than a hang. Failure mode today: every run after the first kernel death
silently re-fails with `kernel-died` instead of attempting a fresh kernel.

Captured here (not a sprint card) because the DoD-level terminal-event guarantee still holds and no
downstream sprint card is blocked — it degrades, it does not break. No external prerequisite exists
(the design choice and the fix both live entirely within the already-built runtime-server package).
The closeout agent revisits with full sprint context: this is a real behavioral gap that likely
warrants a `sprint` card (the design doc explicitly scoped it as a P3 deliverable with a decision to
make), but the exactly-one-true grid below is for the closeout agent to fill.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | |

**Source:** hlai4c review 1
**Files touched:** packages/runtime-server/src/session.ts, packages/runtime-server/src/run-queue.ts (terminal-failure path), session/run-queue tests
**Action taken:** {closeout fills prose — card {id} created in sprint {tag} / card {id} created in loose backlog / noted, no action / fixed in commit {hash}}

- [ ] Item 3 classified (exactly one deferral type marked `true` above)
- [ ] Item 3 actioned (action taken matches chosen type)

### Item 4: Thread `wsLowWaterMark`/`drainPollMs` through `createServer`

Reviewer cycle 1 on hlai4c flagged a config-surface gap (L3). `RunQueueOptions` exposes both
`wsLowWaterMark` and `drainPollMs`, but `createServer` only threads `runQueueDepth` and
`wsHighWaterMark` into the `RunQueue` (`server.ts:111-114`). The cross-block drain low-water mark and
poll interval are hardcoded to defaults (0 / 5ms) in any real server. Thread both options through
`createServer` so the drain behavior is tunable. Failure mode: an operator wanting to drain to a
non-zero low-water mark (e.g. to avoid thrashing on a chatty socket) has no config path short of
constructing the queue by hand.

Captured here (not a sprint card) because no downstream sprint card consumes these config knobs and
there is no external prerequisite — the options already exist on `RunQueueOptions`; this is purely
threading two existing fields through one constructor plus a test. The closeout agent revisits with
full sprint context; this is a small mechanical edit (lean toward fixed-with-note or a tiny sprint
card), but the exactly-one-true grid below is for the closeout agent to fill.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | |

**Source:** hlai4c review 1
**Files touched:** packages/runtime-server/src/server.ts, packages/runtime-server/src/run-queue.ts (RunQueueOptions surface), packages/runtime-server/src/server-run.test.ts
**Action taken:** {closeout fills prose — card {id} created in sprint {tag} / card {id} created in loose backlog / noted, no action / fixed in commit {hash}}

- [ ] Item 4 classified (exactly one deferral type marked `true` above)
- [ ] Item 4 actioned (action taken matches chosen type)

### Item 5: Harden the server↔`run` parity Scenario 1 against future no-output executable blocks

Reviewer cycle 1 AND cycle 2 on wd2nil flagged this (L1, fixture-fragility) — it was routed by the
review-1 planner directive but the proposed card was never actually created (confirmed orphaned: no
matching card in `search_cards`, absent from this retrospective until now). Capturing it here this
cycle so it is no longer untracked.

The finding: Scenario 1 of the real-kernel parity suite
(`packages/runtime-server/test-integration/server-run-parity.integration.test.ts:237-249`) asserts
`[...serverByBlock.keys()].sort()` deep-equals `[...cliByBlock.keys()].sort()`. `cliByBlock` is built
from ALL CLI blocks (`cli.blocks.map(b => [b.id, b.outputs])`, line 238), while `serverByBlock` only
contains blocks that emitted an `output` event (`serverOutputsByBlock(events)`, line 237). Today every
executable block in `server-run-parity.deepnote` produces ≥1 output, so the key sets match and the
assertion holds. But the moment someone adds a no-output executable code block (e.g. a bare `x = 1`)
— exactly what a future "broaden the fixture" task would do — the two key sets diverge and Scenario 1
reds for a reason unrelated to parity (a key-presence mismatch, not an output mismatch).

The review-2 executor consciously declined to weaken this assertion as part of the B1 rework, on the
grounds that a naive union-of-keys normalise could mask a real future divergence, and the fixture
currently has no zero-output executable block. That trade-off is defensible and correctly NOT a
blocker — but the latent fragility is real. The hardening: compare on the UNION of the two key sets
and deep-equal `serverByBlock.get(id) ?? []` against `cliByBlock.get(id) ?? []`, so a both-empty
block reads as parity rather than a key mismatch — while still failing loudly if one side has outputs
the other lacks. This makes the suite safe to extend with zero-output blocks without weakening the
real parity guarantee.

Note on the sibling L2-wording item (coverage-claim-vs-fixture, also routed in the review-1/review-2
directives): it is ALREADY RESOLVED and needs no further action. The review-2 executor reworded
`packages/runtime-server/README.md` (lines 228-245) to "every output-bearing `IOutput` shape a bare
Python kernel produces" and added the explicit "(Block types that need external services — SQL,
integration, input blocks — are out of scope … the design doc's `sql-integration-parity` phase owns
them.)" clause, and the matching test comment (lines 240-243) carries the same scoping. The SQL/
integration parity lift itself is owned by step-7B `yzd78n` — not duplicated here. So this Item 5 is
ONLY the Scenario 1 union-of-keys hardening; the wording is done.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | |

**Source:** wd2nil review 1 (L1) + review 2 (L1)
**Files touched:** packages/runtime-server/test-integration/server-run-parity.integration.test.ts (Scenario 1, lines 237-249); packages/runtime-server/test-integration/fixtures/server-run-parity.deepnote (only if the fixture is broadened). README/wording sub-item already resolved at packages/runtime-server/README.md:228-245.
**Action taken:** {closeout fills prose — card {id} created in sprint {tag} / card {id} created in loose backlog / noted, no action / fixed in commit {hash}}

- [ ] Item 5 classified (exactly one deferral type marked `true` above)
- [ ] Item 5 actioned (action taken matches chosen type)

### Item 6: Watch the `integration-kernels` CI wall-clock budget as per-test-server suites accrue

Reviewer cycle 1 AND cycle 2 on wd2nil flagged this (L3, ci-budget-watch) — routed by the review-1
planner directive but, like Item 5, the proposed card was never actually created (confirmed orphaned:
no matching card in `search_cards`, absent from this retrospective until now). Capturing here this
cycle so it is tracked.

The finding: the `integration-kernels` CI job (`.github/workflows/ci.yml:229`, `timeout-minutes: 15`,
line 232) now also runs the new real-kernel parity suite, which boots a fresh server + real kernel
per test (4 tests, each waiting for kernel idle) on top of the existing integration files. A single
real-kernel parity run is ~55s locally. The job has comfortable headroom today, but the per-test-
server pattern is multiplicative: each additional per-test-server integration suite that lands
(step-7B `yzd78n` SQL parity is already queued, and more will follow) adds another fresh-server +
fresh-kernel boot per test, so the job's wall-clock will creep toward the 15-minute cap over time.

The ask is preventive instrumentation, not a fix to anything broken: make the trend visible before it
hits the timeout — e.g. record per-suite wall-clock (a vitest reporter line, or a CI step that
echoes elapsed per integration file), or document a per-test-server budget convention near
`vitest.integration.config.ts` so future suite authors know the shared ceiling. This is a watch/
hygiene item with no current failure and no external prerequisite (the workflow and config both exist
today); it does not block any sprint card.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | |

**Source:** wd2nil review 1 (L3) + review 2 (L3)
**Files touched:** .github/workflows/ci.yml (integration-kernels job, lines 229-232); vitest.integration.config.ts
**Action taken:** {closeout fills prose — card {id} created in sprint {tag} / card {id} created in loose backlog / noted, no action / fixed in commit {hash}}

- [ ] Item 6 classified (exactly one deferral type marked `true` above)
- [ ] Item 6 actioned (action taken matches chosen type)

### Item 7: Make the dead-kernel disconnect rejection guard re-entrant before multi-session

Reviewer cycle 3 on wd2nil flagged this (L1, teardown-listener-reentrancy, code-quality, low-risk),
a FOLLOW-UP on commit `1c97429` (the review-2→3 flake fix that introduced the
`#withDeadKernelRejectionGuard` teardown machinery — distinct from the review-1/2 follow-ups already
captured as Items 5 and 6, which predate this machinery).

The finding: `#withDeadKernelRejectionGuard` in `disconnect()` mutates the process-global
`unhandledRejection` listener set (removeAllListeners → install guard → restore prior listeners). It
is safe in the wedge today — a `Session` holds a single `#engine`, runs serialized, and `close()`
fires once on SIGINT, so two `disconnect()` calls never overlap. But the guard is NOT re-entrant: if
a future caller ever invokes `disconnect()` concurrently with another (a multi-session server, or a
test racing two teardowns), the second call's `priorListeners` snapshot would capture the first
call's guard, and restore ordering could leak a guard or double-restore. Failure mode under that
future concurrency: a stuck or duplicated `unhandledRejection` handler surviving past teardown.

The hardening: add a re-entrancy guard (ref-count, or an "already-armed" flag) so nested/overlapping
calls share one armed window and the listener set is restored exactly once when the last caller
exits. Currently unreachable in this card's single-engine design, but a hard prerequisite before the
server grows to multiple concurrent sessions.

Captured here (not a sprint card) because no downstream LUI1WEDGE card is blocked — the remaining
sprint cards (sqm7ox `deepnote ui` alias, yzd78n SQL parity, dx99dj contrib-cut, k65hcx showcase) all
run against the single-engine design where this path is provably safe — and the triggering condition
(multiple concurrent sessions) is a different-milestone shape change, not an external prerequisite
that merely needs resolving within this sprint. The closeout agent revisits with full sprint context;
this likely reads as `note-only` for this sprint (record the constraint against the multi-session
work) or a `sprint`/backlog card if multi-session lands sooner — the exactly-one-true grid below is
for the closeout agent to fill.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | |

**Source:** wd2nil review 3 (L1)
**Files touched:** packages/runtime-core/src/kernel-client.ts (`disconnect()` / `#withDeadKernelRejectionGuard` teardown path), packages/runtime-core/src/kernel-client.test.ts
**Action taken:** {closeout fills prose — card {id} created in sprint {tag} / card {id} created in loose backlog / noted, no action / fixed in commit {hash}}

- [ ] Item 7 classified (exactly one deferral type marked `true` above)
- [ ] Item 7 actioned (action taken matches chosen type)

### Item 8: Gate the teardown-drain magic count against the next `@jupyterlab/services` bump

Reviewer cycle 3 on wd2nil flagged this (L2, drain-tuning-fragility, test-robustness, low-risk),
a FOLLOW-UP on commit `1c97429` — same review-2→3 flake fix that introduced the
`#withDeadKernelRejectionGuard` machinery (distinct from Items 5/6, which predate it).

The finding: the teardown drain in `disconnect()` is a fixed 2 passes × (5 microtask flushes + 1 real
macrotask). It is empirically sufficient today (5/5 + 10/10 clean real-venv exits) but the magic count
is tuned to the CURRENT `@jupyterlab/services` internal reconnect layering. A library upgrade that
adds another async hop could let the unhandled rejection escape after the guard has torn down,
resurfacing the original Scenario-4 flake — and the existing unit test models a single-hop leak, so it
would NOT catch the regression.

Two parts to the ask:
1. Regression gate (the minimum): on the next `@jupyterlab/services` bump, re-run the 5–10× real-venv
   determinism check — the full `server-run-parity.integration.test.ts`, capturing exit codes and
   grepping output for `Unhandled Rejection`. Document this as a required check tied to that dependency
   bump (e.g. a note near the drain code or in the integration suite's README).
2. Optional hardening (if cheaply achievable): make the drain self-tuning — loop until a quiescent
   tick with no escaped rejection rather than a fixed magic count — so it is resilient to added async
   hops without a hand-retuned constant.

Captured here (not a sprint card) because there is no current failure and no downstream LUI1WEDGE card
is blocked — the drain is correct against the version pinned today. The trigger is a future dependency
bump, not an in-sprint prerequisite, so it is a watch/regression-gate item rather than blocking work.
The closeout agent revisits with full sprint context; this pairs naturally with Item 6 (CI
wall-clock / real-venv integration hygiene) and likely reads as `note-only` (record the gate) or a
small `fixed-with-note` documentation drop — the exactly-one-true grid below is for the closeout agent
to fill.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | |

**Source:** wd2nil review 3 (L2)
**Files touched:** packages/runtime-core/src/kernel-client.ts (`disconnect()` drain count), packages/runtime-core/src/kernel-client.test.ts, packages/runtime-server/test-integration/server-run-parity.integration.test.ts (real-venv determinism gate)
**Action taken:** {closeout fills prose — card {id} created in sprint {tag} / card {id} created in loose backlog / noted, no action / fixed in commit {hash}}

- [ ] Item 8 classified (exactly one deferral type marked `true` above)
- [ ] Item 8 actioned (action taken matches chosen type)