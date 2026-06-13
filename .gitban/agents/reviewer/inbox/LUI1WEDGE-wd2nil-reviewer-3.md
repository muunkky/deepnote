---
verdict: APPROVAL
card_id: wd2nil
review_number: 3
commit: 1c97429
date: 2026-06-12
has_backlog_items: true
---

# Review 3 — wd2nil (step 5: server↔`deepnote run` integration parity)

## Summary

**APPROVAL.** The single review-2 Gate-2 blocker (B1: the parity integration suite
intermittently exited non-zero — ~50% of full-file runs — from an unhandled
`Error('Kernel connection disconnected')` during Scenario-4 teardown, falsifying the
`[x] No flaky tests introduced` and `[x] Tests are deterministic` boxes) is **resolved**.

The fix is scoped exactly to the directive: only `packages/runtime-core/src/kernel-client.ts`
(the `disconnect()` teardown) and its unit test changed. The four scenarios and the
review-2 kernel-death fix were **not touched** (`git show --name-only` confirms a 2-file diff;
neither is the integration suite nor `run-queue.ts`). The fix lives in `disconnect()`, not the
test harness — satisfying review-2 L2 (teardown-symmetry): every dead-kernel disconnect, in any
present or future caller, inherits the guard.

## What I verified

### The root-cause diagnosis is correct, and the prior fix was on the wrong promise
Review-2's refactor plan offered three options; the executor took the scoped
`process.on('unhandledRejection')` guard. The diagnosis is right and the `bbfd6da`
`this.kernel?.info?.catch(() => {})` genuinely could not have worked: the rejecting promise is
`@jupyterlab/services`' internal reconnect `PromiseDelegate`, scheduled from a fire-and-forget
`void Promise.resolve().then(async () => { await this.reconnect() })` with no `.catch` and no
handle our code can reach (`DefaultKernel._handleMessage` ~L1406 → `reconnect()` L649/L660). The
only ways to suppress an unhandled rejection from an unreachable promise are a process-level
guard or letting it resolve before exit — the guard is the right tool here.

### The guard is correct and does not mask real errors
`#withDeadKernelRejectionGuard` snapshots the prior `unhandledRejection` listeners, installs a
guard that **swallows ONLY** `reason instanceof Error && reason.message === 'Kernel connection
disconnected'` and **re-delegates everything else** to the captured prior listeners (or re-throws
on `process.nextTick` if there were none, restoring Node's default crash-on-unhandled behavior).
The prior listener set is restored in a `finally`. So a real error during teardown is not
masked — it reaches whatever vitest/Node had registered. The macrotask drain
(`nextRealMacrotask`) is bound to real `setImmediate`/`setTimeout` captured at module load, so it
does not hang under the `vi.useFakeTimers()` the existing `connect()`-failure tests use — a
genuine hazard the executor anticipated. The two-pass microtask+macrotask drain is empirically
tuned to the library's nested-async layering; it's a touch magic-number-y but documented and
backed by the determinism evidence below.

### The unit tests are real TDD (red→green verified independently)
`kernel-client.test.ts` adds a `describe('disconnect — dead-kernel rejection guard')` with three
behavioral tests under real timers: (1) the benign leak is swallowed (zero escaped rejections),
(2) an *unrelated* rejection still escapes (the guard is not a blanket sink), (3) prior listeners
are restored. I confirmed test (1) is genuinely red→green by mutation: changing the guard's match
string to a non-matching literal makes the benign leak escape and test (1) fails with the exact
`[Error: Kernel connection disconnected]` it asserts against `[]`. Restored, the file is **39/39
green** (36 prior + 3 new). The tests assert observable process behavior (escaped vs. swallowed
rejections), not internals — the correct contract for this fix.

### Determinism evidence — independently reproduced against a real kernel
I ran the full parity file (`server-run-parity.integration.test.ts`) against the parent venv
`/home/cameron/projects/deepnote/.venv` (deepnote-toolkit[server]==2.3.1),
`RUN_INTEGRATION_TESTS=true`, **5 consecutive times**, capturing each exit code and grepping every
captured output for `Unhandled Rejection`:

```
RUN 1: exit=0 :: Tests 4 passed :: unhandledRejectionLines=0
RUN 2: exit=0 :: Tests 4 passed :: unhandledRejectionLines=0
RUN 3: exit=0 :: Tests 4 passed :: unhandledRejectionLines=0
RUN 4: exit=0 :: Tests 4 passed :: unhandledRejectionLines=0
RUN 5: exit=0 :: Tests 4 passed :: unhandledRejectionLines=0
```

**5/5 clean exit, 0 unhandled-rejection lines.** Against the ~50% non-zero rate I would expect
(reviewer-2 reproduced exactly that at `bbfd6da`, and the executor recorded 10/10 clean at
`1c97429`), 5 consecutive clean exits is strong corroboration the flake is retired. All four
scenarios pass on every run, so the fix did not regress the capstone, missing-kernel,
serve-loopback, or kernel-death assertions.

### Other gates
- **Unit suite:** runtime-core 192 tests pass. The one *file-level* "failed" entry is
  `execution-engine.test.ts`'s `ENOENT: examples/1_hello_world.deepnote` — a pre-existing
  CWD-relative-fixture artifact in a file this commit does **not** touch (confirmed via
  `git show --name-only`); it resolves from the package dir. Not a regression.
- **biome:** clean on both changed files. **tsc --noEmit** (runtime-core): no `kernel-client`
  errors.
- Integration suite remains gated: collected only by `vitest.integration.config.ts`, excluded
  from the mocked default config; self-skips with no venv.

## Checkbox integrity (the review-1/review-2 concern)

- `[x] No flaky tests introduced` / `[x] Tests are deterministic [no flakiness]` — now **TRUE**,
  backed by 5/5 (my run) + 10/10 (executor) consecutive clean real-venv exits. These were the two
  boxes review-2 B1 falsified; they now stand on real evidence.
- `[ ] All tests pass in CI` — correctly **UNCHECKED**. No `integration-kernels` run exists for
  `1c97429`; the executor honestly declined to tick a CI pass that has not happened (review-1
  Path-B sanction). This is the honest state, not an integrity violation — and it is the
  dispatcher/CI's confirmation step, not something the executor can or should fabricate.
- Capstone, missing-kernel, serve/loopback, only-under-`test:integration` — all remain TRUE and
  untouched (the four scenarios were not modified this cycle; the review-2 reviewer independently
  reproduced them green).

## FOLLOW-UP

- **L1 (`teardown-listener-reentrancy`, code-quality, low-risk).** `#withDeadKernelRejectionGuard`
  mutates the **process-global** `unhandledRejection` listener set (`removeAllListeners` →
  install guard → restore). It is safe for the wedge because a `Session` holds a single `#engine`
  and runs are serialized (the M2 invariant: `run-queue` is the sole `runProject` caller), and
  `close()` runs once on SIGINT — so two `disconnect()` calls never overlap in production. But the
  guard is not re-entrant: if a future caller ever invokes `disconnect()` concurrently with
  another (e.g. multi-session server, or a test that races two teardowns), the second call's
  `priorListeners` snapshot would capture the first call's guard, and restore ordering could leak
  a guard or double-restore. Failure mode: a stuck/duplicated `unhandledRejection` handler after
  concurrent teardown. Cheap hardening: a re-entrancy guard (ref-count or "already-armed" flag) so
  nested/overlapping calls share one armed window. Not a blocker — unreachable in this card's
  single-engine design — but worth a paranoid note for whenever the server grows to multiple
  concurrent sessions.

- **L2 (`drain-tuning-fragility`, test-robustness, low-risk).** The teardown drain is a fixed
  2 passes × (5 microtask flushes + 1 real macrotask). It is empirically sufficient (5/5 + 10/10
  clean), but the count is tied to the current `@jupyterlab/services` internal layering; a library
  upgrade that adds another async hop in the reconnect path could let the rejection escape after
  the guard tears down, resurfacing the flake. The existing unit test (1) would NOT catch that
  (it models a single-hop leak). Consider, on the next `@jupyterlab/services` bump, re-running the
  5–10× real-venv determinism check as a regression gate. Tracked observation, not a blocker.

The L1 (fixture-fragility / union-of-keys) and L3 (ci-budget-watch) items from reviews 1–2 are
already routed to the planner (planner-2 dedup note) and are out of scope for this cycle's diff.
