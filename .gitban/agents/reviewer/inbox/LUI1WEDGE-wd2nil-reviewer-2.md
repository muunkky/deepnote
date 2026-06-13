---
verdict: REJECTION
card_id: wd2nil
review_number: 2
commit: bbfd6da
date: 2026-06-12
has_backlog_items: true
---

# Review 2 — wd2nil (step 5: server↔`deepnote run` integration parity)

## Summary

The review-1 Gate 1 blocker (capstone checked without a real-kernel run) is **resolved**.
The executor went Path A: provisioned the real `deepnote-toolkit[server]==2.3.1` venv, ran
the suite, and in doing so found and fixed a **real production bug** that inspection alone
could never have surfaced — the Jupyter server *auto-restarts* a crashed kernel rather than
leaving it `'dead'`, so mid-run death was being mis-categorized as `in-block`. The fix is
root-caused at the right layer (`kernel-client.ts`), is verified to fix the CLI and the
server identically (so it *strengthens* the parity capstone rather than breaking it), and is
TDD'd (unit tests added red→green for both the status-signal and cancelled-future death
paths). I independently reproduced the four scenarios green against the real venv. That work
is genuinely good and I want to be clear it is not what blocks this card.

This rejects on **one** issue, surfaced only because I ran the real suite the executor's
own evidence rests on: **the integration suite is flaky — it intermittently exits non-zero**
even though all four test assertions pass. The card's `[x] No flaky tests introduced` and
`[x] Tests are deterministic [no flakiness]` boxes are therefore untrue, and the
`integration-kernels` CI job — the card's *designated* verification locus — would go **red**
on the flaky runs. This is a Gate 2 (code-quality) blocker on the very teardown path
commit `bbfd6da` was written to fix.

## What I verified

- **Capstone is real.** Ran `RUN_INTEGRATION_TESTS=true DEEPNOTE_INTEGRATION_VENV=.venv
  pnpm exec vitest run --config vitest.integration.config.ts <the parity file>` against the
  parent venv at commit `bbfd6da`. **All 4 scenarios pass** (deep-equal parity, missing-kernel
  legibility, serve loopback guard, mid-run kernel-death terminal). The review-1 integrity
  blocker is substantiated.
- **The kernel-death fix is correct and parity-preserving.** `kernel-client.ts` now treats
  `'restarting'`/`'autorestarting'` during an active execute as a death (typed
  `KernelDiedError`) on both the status-signal and future-reject paths. The CLI reads the same
  typed discriminant off `onBlockDone` (`run.ts:1196-1200`), so the same fix corrects both —
  the executor verified the CLI had the identical bug. `run-queue.ts` correctly elevates the
  **resolve-path** terminal to `run-failed {kernel-died}` via a per-run latch, matching the
  design-doc contract (m3-s1 R5: "a kernel that dies mid-run is surfaced as an explicit
  terminal WS event"). The M2 invariant (`run-queue` sole `.runProject` caller) still passes.
- **Unit tests precede the fix and assert behavior.** `kernel-client.test.ts` adds parameterised
  autorestart/restart death + cancelled-future-while-autorestarting (36/36). `run-queue.test.ts`
  adds the resolve-after-`onBlockDone(KernelDiedError)` → `run-failed{kernel-died}`, no `run-done`
  (14/14). Both green under the mocked config; integration file still self-skips cleanly with no
  venv (4 skipped, 0 errors) and is excluded from `pnpm test`.

## BLOCKERS

### B1 — the integration suite is flaky: it intermittently exits non-zero (would red the CI job) — code-quality (Gate 2)

Running the full parity file against the real venv at commit `bbfd6da`, **all four test
assertions always pass, but the process exit code is non-deterministic.** Across my runs the
suite exited `1` in a clear majority of full-file executions (e.g. first full-file run: exit 1;
a later back-to-back batch: exit 1, exit 1). The non-zero exit comes from an **unhandled
promise rejection during Scenario 4 teardown**:

```
⎯⎯ Unhandled Rejection ⎯⎯
Error: Kernel connection disconnected
 ❯ KernelConnection._updateConnectionStatus …/@jupyterlab/services/lib/kernel/default.js:1353
 ❯ KernelClient.disconnect packages/runtime-core/src/kernel-client.ts:340  ← this.session.dispose()
```

This is the exact failure mode `bbfd6da` claims to have fixed. The fix sank the rejection on
the wrong promise: it pre-attaches `this.kernel?.info?.catch(() => {})`, but the rejection that
actually escapes originates from **`this.session.dispose()`** (line 340), which synchronously
drives `@jupyterlab/services`' `_updateConnectionStatus → 'disconnected'` and rejects the
*session connection's* internal reconnect `PromiseDelegate` — a different, library-internal
delegate that `kernel.info` does not cover. The `try/catch` around `this.session.dispose()`
only catches a *synchronous throw*; it does nothing for an async rejection emitted by a signal
handler fired during dispose. So the leak still escapes, just less often than before — enough
that the executor's closeout (which observed "no 'Errors' line") happened to land on the clean
runs and over-claimed determinism.

**Why this is a blocker, not a follow-up:** the card's verification locus *is* the
`integration-kernels` CI job, and that job fails on a non-zero exit code regardless of how many
assertions passed. A suite that reds the job ~50% of the time is precisely a flaky test —
which directly falsifies two checked boxes: `[x] No flaky tests introduced` (Quality Gates)
and `[x] Tests are deterministic [no flakiness]` (Acceptance Criteria). The card cannot ship
its headline capstone on a CI job that intermittently fails for a teardown artifact. This is a
real-artifact flake the SKILL specifically calls out: self-consistent assertions all pass while
the process the CI gates on still exits red.

**Refactor plan (the assertions are correct — do NOT touch the four scenarios):**
- Make `disconnect()` actually swallow the *session/kernel-connection* disconnect rejection,
  not just `kernel.info`. Attach the sink to the promise that genuinely rejects — pre-arm a
  `.catch(() => {})` on whatever `PromiseDelegate`/status path `_updateConnectionStatus`
  rejects (the session connection's reconnect/connectionStatus promise), or install a scoped
  `unhandledRejection`/`process.on` no-op guard *only* around the dead-kernel dispose, or
  swap the synchronous `dispose()` for the awaited disconnect path that lets the rejection
  resolve before the test ends. The unit-level fix belongs in `kernel-client.ts` with a unit
  test that asserts disposing a dead kernel produces **no unhandled rejection** (assert via a
  process `unhandledRejection` listener in the test, red→green), since the integration suite
  can't run in mocked CI.
- Re-run the full parity file against the real venv **enough times to show a deterministic
  exit 0** (e.g. 5–10 consecutive clean runs), and record that evidence in the closeout — a
  single green run is not sufficient to retire a ~50% flake.
- The `[x] No flaky tests introduced` / `[x] Tests are deterministic` boxes must not stand
  checked until the suite exits 0 deterministically.

## FOLLOW-UP

- **L1 (`fixture-fragility`, carried from review-1 L1 — still open).** Scenario 1 still asserts
  `[...serverByBlock.keys()].sort()].toEqual([...cliByBlock.keys()].sort())`, where `cliByBlock`
  is built from *all* CLI blocks but `serverByBlock` only from blocks that emitted an `output`
  event. The executor consciously declined to change it (reasoning: a union-of-keys normalise
  could mask a real future divergence; the fixture currently has no zero-output executable
  block). That trade-off is defensible and this is correctly *not* a blocker — but the failure
  mode is real: the day someone adds a no-output code block (e.g. a bare `x = 1`) to extend
  "100% of block types," the key sets diverge and Scenario 1 reds for a reason unrelated to
  parity. The planner already tracked this as a hardening card; leaving it there is fine.

- **L2 (`teardown-symmetry`).** The same `disconnect()` dead-kernel path runs at the end of
  Scenarios 1–3 too (every test tears its server down), yet the leak only surfaces after
  Scenario 4 because that is the only scenario that actually kills the kernel. Once B1 is fixed
  at the `kernel-client` layer this resolves everywhere, but worth a paranoid note: if the fix
  is applied narrowly (e.g. only in the integration test's teardown rather than in
  `disconnect()` itself), the leak will resurface for any future test that kills a kernel. Fix
  it in `disconnect()`, not in the test harness.

- **L3 (`ci-budget-watch`, carried from review-1 L3).** A single real-kernel parity run is
  ~55s; `integration-kernels` has `timeout-minutes: 15`. Comfortable today; planner already
  tracks the wall-clock creep as more per-test-server integration suites land.
