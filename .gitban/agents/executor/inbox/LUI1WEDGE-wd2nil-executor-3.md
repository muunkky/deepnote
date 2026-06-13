# Executor directive — LUI1WEDGE / wd2nil (executor-3, review-2 REJECTION rework, Gate 2)

## ⚠️ BRANCH OVERRIDE — read before the "Worktree branch-base check"

This sprint runs on **`milestone/m3-local-ui`**, **NOT** `sprint/LUI1WEDGE`.
- Worktree base check: `git merge-base --is-ancestor milestone/m3-local-ui HEAD && echo "base ok" || echo "WRONG BASE"`. Your worktree forks from `milestone/m3-local-ui` HEAD; do not check `sprint/LUI1WEDGE`.
- Merge-back target: `milestone/m3-local-ui`. Completion tag: `LUI1WEDGE-wd2nil-done`.
- Commit **code only / never stage `.gitban/`**.

## Environment

Run Python via the repo venv `/home/cameron/projects/deepnote/.venv` (deepnote-toolkit[server]==2.3.1). The real-kernel suite needs the workspace built and the integration env set:
```
pnpm install --frozen-lockfile && pnpm -r build   # so packages/cli/dist/bin.js exists for the CLI subprocess
RUN_INTEGRATION_TESTS=true DEEPNOTE_INTEGRATION_VENV=/home/cameron/projects/deepnote/.venv VITEST_TEST_TIMEOUT=120000 \
  pnpm exec vitest run --config vitest.integration.config.ts <the parity file>
```

## Context: this is a Gate 2 (code-quality) rejection — exactly ONE blocker

The review-1 Gate 1 capstone-integrity blocker is **RESOLVED**. The four scenarios are real and green against the real venv, and the kernel auto-restart death fix in `kernel-client.ts` + `run-queue.ts` is correct, parity-preserving, and TDD'd. The reviewer independently reproduced all four green.

**Do NOT touch the four scenarios. Do NOT touch the kernel-death detection fix.** There is one mandatory blocker, on the teardown path.

Full review report: `.gitban/agents/reviewer/inbox/LUI1WEDGE-wd2nil-reviewer-2.md` (commit `bbfd6da`).

===BEGIN REFACTORING INSTRUCTIONS===

## B1 — the integration suite is flaky: it intermittently exits non-zero (reds the CI job)

Running the full parity file against the real venv at commit `bbfd6da`, **all four assertions always pass, but the process exit code is non-deterministic** (the reviewer saw exit 1 on a clear majority of full-file runs). The non-zero exit comes from an **unhandled promise rejection during Scenario 4 teardown**:

```
⎯⎯ Unhandled Rejection ⎯⎯
Error: Kernel connection disconnected
 ❯ KernelConnection._updateConnectionStatus …/@jupyterlab/services/lib/kernel/default.js:1353
 ❯ KernelClient.disconnect packages/runtime-core/src/kernel-client.ts:340  ← this.session.dispose()
```

This is the exact failure mode `bbfd6da` claimed to fix, but the fix **sank the rejection on the wrong promise.** The `bbfd6da` patch pre-attaches `this.kernel?.info?.catch(() => {})`, but the rejection that actually escapes originates from **`this.session.dispose()`** (line 340), which synchronously drives `@jupyterlab/services`' `_updateConnectionStatus → 'disconnected'` and rejects the *session connection's* internal reconnect `PromiseDelegate` — a different, library-internal delegate that `kernel.info` does not cover. The `try/catch` around `this.session.dispose()` only catches a *synchronous throw*; it does nothing for an async rejection emitted by a signal handler fired during dispose. So the leak still escapes, just less often than before — enough that the prior closeout (which observed "no 'Errors' line") landed on the clean runs and over-claimed determinism.

**Why this is a blocker, not a follow-up:** the card's verification locus IS the `integration-kernels` CI job, which fails on a non-zero exit regardless of how many assertions passed. A suite that reds the job ~50% of the time is a flaky test — directly falsifying two checked boxes: `[x] No flaky tests introduced` (Quality Gates) and `[x] Tests are deterministic [no flakiness]` (Acceptance Criteria).

### Mandatory fix (the assertions are correct — do NOT touch the four scenarios)

1. **Make `disconnect()` actually swallow the *session/kernel-connection* disconnect rejection, not just `kernel.info`.** Attach the sink to the promise that genuinely rejects — pre-arm a `.catch(() => {})` on whatever `PromiseDelegate`/status path `_updateConnectionStatus` rejects (the session connection's reconnect / connectionStatus promise), OR install a scoped `unhandledRejection`/`process.on` no-op guard *only* around the dead-kernel dispose, OR swap the synchronous `dispose()` for the awaited disconnect path that lets the rejection resolve before the test ends. **Fix this in `disconnect()` in `packages/runtime-core/src/kernel-client.ts` — NOT in the integration test harness.** (Per reviewer L2/teardown-symmetry: the same dead-kernel `disconnect()` path runs at the end of every scenario; a harness-only fix re-leaks for any future test that kills a kernel. Fix it at the `kernel-client` layer so it resolves everywhere.)

2. **Add a unit test** in `packages/runtime-core/src/kernel-client.test.ts` that asserts disposing a dead kernel produces **no unhandled rejection** — assert via a process `unhandledRejection` listener in the test, written red→green. This is required because the integration suite can't run in mocked CI, so the determinism guarantee must be enforced at the unit layer.

3. **Re-run the full parity file against the real venv enough times to show a deterministic exit 0** — e.g. 5–10 consecutive clean runs, capturing the exit code of each — and record that evidence in the closeout. A single green run is NOT sufficient to retire a ~50% flake.

4. The `[x] No flaky tests introduced` / `[x] Tests are deterministic` boxes must NOT stand checked until the suite exits 0 deterministically with the consecutive-clean-exit evidence recorded.

===END REFACTORING INSTRUCTIONS===

## Close-out

After the fix: re-verify every checked box is still true (especially the two flakiness boxes, now backed by the consecutive clean-exit evidence). The `[x] All tests pass in CI` box stays unchecked unless an actual `integration-kernels` run for the new commit has gone green. Leave the card `in_progress` and re-run the reviewer. Do not close, archive, or finalize the sprint — the dispatcher owns sprint lifecycle.
