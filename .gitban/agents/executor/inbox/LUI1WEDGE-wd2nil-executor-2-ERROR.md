# Executor ERROR — LUI1WEDGE / wd2nil (executor-2): worktree vanished mid-session

## What happened (ENVIRONMENT failure, NOT a code/test failure)

My designated worktree `agent-ad2582d088c42fb85` was DELETED out from under me mid-session,
before I could commit any code or emit the completion tag. A fresh worktree
(`agent-ac9dcf1b9eba23fb0`) now exists — the dispatcher already re-spun this work, so this
session is orphaned. No committed work was lost (nothing was committed yet; the only loss is one
trivial, reconstructable docstring edit). I did NOT commit to the parent branch (SKILL forbids it;
breaks the per-card audit boundary). The diagnosis below is the durable deliverable.

## ROOT CAUSE of Scenario 4 (the deterministic failure) — FULLY DIAGNOSED, with the exact patch

Scenario 4 expects the mid-run-kernel-death terminal WS event to be
`run-failed { failureCategory:'kernel-died' }`; the REAL kernel death yields `run-done`. This is a
REAL production bug in `run-queue.ts`, introduced because hlai4c verified kernel-death only against
a MOCK engine that REJECTED. The real engine does NOT reject.

### Verified control flow (read from source)
1. `kernel-client.ts:248/289` — `kernel.execute()` rejects with a typed `KernelDiedError` on mid-run
   death. Correct, unchanged.
2. `execution-engine.ts:431-446` — `runProject`'s per-block outer try/catch CATCHES that
   `KernelDiedError`, builds a failed `BlockExecutionResult` with `error: executionError` (the
   still-typed `KernelDiedError`), calls `onBlockDone`, `break`s, and `runProject` then RESOLVES with
   `failedBlocks>0`. It does NOT re-throw — `runProject` never rejects on a real mid-run death.
3. `run.ts:1196-1200` (CLI reference) reads `result.error instanceof KernelDiedError` INSIDE its
   `onBlockDone` to tag per-block `failureCategory:'kernel-died'`. CLI does NOT rely on a reject.
4. `run-queue.ts` `#runTask` emits `run-failed{kernel-died}` ONLY in its `catch` (reject path). The
   real engine resolves -> queue emits `run-done`. The adapter already computes the per-`block-done`
   kernel-died discriminant (`run-queue.ts:303-311`) but never lifts it to the terminal event.

CONCLUSION: engine+CLI path is CORRECT and must NOT change (it is the parity guarantee). Fix belongs
in `run-queue.ts` (owns the WS terminal contract / ADR-005), mirroring how the CLI reads the
discriminant from `onBlockDone`. Do NOT make the engine re-throw (would change the shared CLI path
and blast-radius the parity capstone).

## THE FIX — packages/runtime-server/src/run-queue.ts

In `#createAdapter`, add closure vars + lift them on the adapter:
    let kernelDied = false
    let kernelDeathMessage: string | undefined
In `onBlockDone`, BEFORE sending `block-done`:
    if (!result.success && result.error instanceof KernelDiedError) {
      kernelDied = true
      kernelDeathMessage = result.error.message
    }
Change `#createAdapter`'s return to a `RunAdapter` interface exposing getters:
    interface RunAdapter { readonly kernelDied: boolean; readonly kernelDeathMessage: string | undefined; readonly callbacks: RunCallbacks }
    return { get kernelDied(){return kernelDied}, get kernelDeathMessage(){return kernelDeathMessage}, callbacks: {...} }
In `#runTask`, on the RESOLVE path, BEFORE the run-done send:
    const summary = await this.#target.runProject(request, adapter.callbacks)
    if (adapter.kernelDied) {
      this.#sink.send({ type:'run-failed', runId, failureCategory:'kernel-died', message: adapter.kernelDeathMessage ?? 'Kernel died mid-run' })
      return
    }
    // else existing run-done send
Keep the existing `catch` (reject path) untouched — both paths now converge on run-failed{kernel-died}.
Update the file's top B1 docstring to describe BOTH the reject path and the resolve path.

### TDD unit test to add in run-queue.test.ts
Sibling to the existing "block-done with a mid-run KernelDiedError reports kernel-died" (~line 291):
"a RESOLVE after an onBlockDone KernelDiedError emits a terminal run-failed{kernel-died}
(real-engine path), not run-done" — mock target: call `onBlockDone({...,success:false,
error:new KernelDiedError()})` then RESOLVE the summary; assert last sink event is
`run-failed{failureCategory:'kernel-died'}` and NO `run-done`. Keep the existing reject-path test.

## OTHER two failures (still to verify in the fresh worktree)
- Scenario 1 deep-equal mismatch on block `...c6` (the `execute_result` `x+y` block — the ONLY output
  carrying an `execution_count`). Server run and CLI subprocess run are two SEPARATE kernel sessions
  with independent execution counters, so `execution_count` almost certainly diverges. Apply planner
  L1: normalise/strip `execution_count` (and any timestamp) before the per-block deep-equal (or compare
  on union-of-keys excluding `execution_count`). CONFIRM by inspecting the actual c6 IOutput (CLI vs
  server) against the real kernel before weakening anything; weaken only as far as the volatile field.
- Pre-existing `packages/cli/test-integration/non-python-kernel.integration.test.ts` "missing-kernel
  legibility": characterise (sprint regression vs pre-existing/environmental); do not fold into this card.

## IMPORTANT build note (why my run self-skipped)
Scenarios 1 & 2 drive the BUILT `packages/cli/dist/bin.js` as a subprocess. The test resolves `cliBin`
relative to the WORKTREE (`test-dir/../../..`), and the worktree has NO `packages/cli/dist/` (only the
PARENT does). The `existsSync(cliBin)` gate (test ~line 57) then self-skips the WHOLE suite. So in the
fresh worktree you MUST build the CLI first:
    pnpm install --frozen-lockfile
    pnpm -F @deepnote/cli build      # -> packages/cli/dist/bin.js in the worktree
Then run scenarios ONE AT A TIME (6.3 GiB box, no swap; kernel concurrency = flaky):
    RUN_INTEGRATION_TESTS=true DEEPNOTE_INTEGRATION_VENV=/home/cameron/projects/deepnote/.venv \
    VITEST_TEST_TIMEOUT=120000 npx vitest run --config vitest.integration.config.ts \
      packages/runtime-server/test-integration/server-run-parity.integration.test.ts -t "Scenario 4"
The venv at /home/cameron/projects/deepnote/.venv (deepnote-toolkit[server]==2.3.1 + bash_kernel +
jinja2; python3+bash kernels) is real and READ-ONLY — do NOT pip install.

## State left behind
- NO code committed (worktree gone before any commit).
- NO completion tag `LUI1WEDGE-wd2nil-done` (no worktree HEAD to tag).
- Card remains `blocked` (B1 BLOCKED section still on it; Path A not yet substantiated).
- This diagnosis + exact patch is the durable output.

## Return signal
INTERNAL_ERROR (environment): worktree `agent-ad2582d088c42fb85` deleted mid-session; no commit/tag
possible. Re-dispatch (a fresh worktree `agent-ac9dcf1b9eba23fb0` already exists) and build the CLI
into it before running the integration suite. Scenario-4 root cause + exact patch + Scenario-1 lead
captured above.
