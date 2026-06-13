# EXECUTOR ERROR — LUI1WEDGE / wd2nil (executor-2, retry 1) — WORKTREE VANISHED MID-SESSION

## TL;DR for the next dispatch

**The worktree was destroyed mid-session by something upstream (not by the agent).** No
source edits were lost — no code was written yet (only diagnostics + dist builds). The
valuable output of this session is a CONFIRMED root-cause diagnosis of Scenario 4 and the
correct fix design. Read it so retry 2 starts from the answer.

## What happened (environment failure, outside agent control)

- Worktree `worktree-agent-ac9dcf1b9eba23fb0` (.claude/worktrees/agent-ac9dcf1b9eba23fb0).
- Verified branch-base ok, set up profiling, read card + both directives + production
  paths, built @deepnote/runtime-server then @deepnote/cli (the integration gate needs
  packages/cli/dist/bin.js), and ran Scenario 4 in isolation vs the real venv — it failed
  exactly as predicted.
- Immediately after (~18:47) the worktree dir AND its worktree-agent-… branch both
  DISAPPEARED: `git worktree list` shows only the parent checkout; .claude/worktrees/ is
  empty; no worktree-agent-ac9dcf1b9eba23fb0 branch. No `git worktree remove` / `rm` was
  run by the agent. Parent intact on milestone/m3-local-ui @ d35ff72.
- Same crash class the commit log shows already hit this card twice ("crash recovery",
  "retry 1"). Recurring worktree-lifecycle instability on this card, not a code problem.

No work lost: zero source changes before the crash; dist/ is gitignored build output.

## CONFIRMED DIAGNOSIS — Scenario 4 (the deterministic failure)

Observed (real venv, isolated): mid-run kernel death yields terminal `run-done`; test
expects `run-failed { kernel-died }`. Reproduced cleanly:

    AssertionError: expected 'run-done' to be 'run-failed'
      packages/runtime-server/test-integration/server-run-parity.integration.test.ts:280

Toolkit even logs `Kernel: autorestarting`, but the in-flight execute future still
rejects with KernelDiedError, the block fails, and the run resolves.

Root cause (traced through source — a REAL wedge bug, not a test artifact):
1. kernel-client.ts:248/289 — on mid-run death the execute future REJECTS with
   KernelDiedError (typed). Correct.
2. execution-engine.ts:408 `await kernel.execute(...)` throws it; caught by the
   block-level try/catch at :431, which sets BlockExecutionResult{success:false,
   error:KernelDiedError}, calls onBlockDone, BREAKs, and runProject RESOLVES with
   failedBlocks>0 (:449-454). It does NOT re-throw.
3. run-queue.ts #runTask (:227-251) emits run-failed ONLY in its catch path (only when
   runProject REJECTS). Real engine resolves ⇒ queue emits the guaranteed run-done (B1).
   Hence run-done, not run-failed.

Why hlai4c's mock passed but real fails: hlai4c's mock runProject REJECTED with
KernelDiedError (run-queue.test.ts:255). The real toolkit engine never rejects on mid-run
death (catch-and-resolve); it only rejects for LAUNCH-time death. The mock modeled a
reject path the real engine does not take mid-run.

Design intent is unambiguous (docs/designs/m3-s1-server-api-and-serve.md line 645):
kernel-died (mid-run) ⇒ "terminal run-failed {failureCategory:'kernel-died'} WS event",
"via onBlockDone/queue task catch". Line 657 ASSUMES the promise rejects — that assumption
is wrong for the real engine, but the CONTRACT (mid-run death ⇒ terminal
run-failed{kernel-died}) is binding. The test assertion is CORRECT; production has a gap.

## CORRECT FIX (retry 2) — fix the SERVER, not the engine

In packages/runtime-server/src/run-queue.ts (NOT the engine or CLI):
- The engine's catch-and-resolve is deliberate and the CLI depends on it (run.ts reads
  kernel-died from the resolved block result, run.ts:1196-1200 via onBlockDone /
  result.error instanceof KernelDiedError). Re-throwing from execution-engine.ts would
  break the CLI's failureCategory reporting and is cross-package blast radius. DO NOT
  TOUCH THE ENGINE.
- The queue adapter already has the typed signal: onBlockDone at run-queue.ts:304-311
  computes result.error instanceof KernelDiedError ? 'kernel-died' : 'in-block' for the
  block-done event. Thread that up to the terminal:
  1. In #createAdapter add a per-run flag (let kernelDied=false) set true in onBlockDone
     when result.error instanceof KernelDiedError.
  2. Expose it from the adapter (e.g. return { callbacks, didKernelDie: () => kernelDied }).
  3. In #runTask, after runProject RESOLVES, if the flag is set emit
     run-failed{runId,failureCategory:'kernel-died',message} instead of run-done. Keep the
     existing catch path as the secondary route for a genuine reject (launch-time death).
     Exactly one terminal; mid-run death ⇒ run-failed{kernel-died} per contract.
- Keep the in-block break path emitting run-done{failedBlocks>0} (design line 646 /
  existing run-queue.test.ts:219) — only kernel-died blocks elevate the terminal.

TDD: add a run-queue.test.ts unit test — mock runProject that calls
onBlockDone({success:false,error:new KernelDiedError()}) then RESOLVES
summary({failedBlocks:1}) (mirrors the REAL engine; distinct from the :255 reject test and
the :291 block-done-only test) ⇒ assert terminal is run-failed{kernel-died} and no
run-done. Integration Scenario 4 expectation stays as-is (already correct). Comment the
production change citing design line 645 + real-engine-resolves so the mock-vs-real
divergence is documented.

## STILL OUTSTANDING (not diagnosed this session — crash hit first)

- Scenario 1 (deep-equal mismatch on one block): NOT investigated. Apply planner L1
  (union-of-keys / normalise volatile fields — execution_count, ordering) if non-
  deterministic; else find the real server-vs-run diff. Needs the BUILT CLI
  (packages/cli/dist/bin.js). Build runtime-server THEN cli first — the gate
  integrationEnabled requires cliBin to exist, which ALSO gates 2/3/4, so build is
  mandatory even for in-process scenarios. The cli node_modules/@deepnote/runtime-server
  symlink is present in a fresh worktree (verified this session).
- Pre-existing packages/cli/test-integration/non-python-kernel.integration.test.ts
  "missing-kernel" failure (dispatcher item 3): NOT characterized.
- Planner L2 (coverage-claim wording "100% of executable block types" scoped to code):
  NOT applied.
- Checkbox integrity (Gate-1 B1): capstone / "tests pass in CI" / "tests pass locally" /
  coverage boxes stay UNTICKED until the fix lands and a real green run exists (Scenario 4
  is currently RED).

## Build recipe that worked (saves retry 2 time)

    pnpm --filter @deepnote/runtime-server build   # ~8s
    pnpm --filter @deepnote/cli build              # ~6s, produces packages/cli/dist/bin.js
    # then ONE scenario at a time (6.3GiB, no swap — kernels thrash under concurrency):
    RUN_INTEGRATION_TESTS=true \
    DEEPNOTE_INTEGRATION_VENV=/home/cameron/projects/deepnote/.venv \
    VITEST_TEST_TIMEOUT=120000 \
    npx vitest run --config vitest.integration.config.ts \
      packages/runtime-server/test-integration/server-run-parity.integration.test.ts -t "Scenario 4"

## State left behind

- Card wd2nil: still blocked (reviewer-1 B1). Card state NOT mutated (no boxes toggled, no
  append — the worktree MCP context died with it). This file is the authoritative handoff.
- No commits, no completion tag (no code authored before the crash).
- Parent repo clean on milestone/m3-local-ui @ d35ff72.

INTERNAL_ERROR equivalent: worktree agent-ac9dcf1b9eba23fb0 destroyed mid-session
(environment, not agent action). No work lost. Retry 2: apply the run-queue.ts fix above,
then Scenarios 1/2/3 + planner L1/L2 + checkbox integrity.
