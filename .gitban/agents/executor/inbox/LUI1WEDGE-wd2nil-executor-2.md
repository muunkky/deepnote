# Executor directive — LUI1WEDGE / wd2nil (executor-2, REJECTION rework — REAL failures found)

## ⚠️ BRANCH OVERRIDE — read before the "Worktree branch-base check"

This sprint runs on **`milestone/m3-local-ui`**, **NOT** `sprint/LUI1WEDGE`.
- Worktree base check: `git merge-base --is-ancestor milestone/m3-local-ui HEAD && echo "base ok" || echo "WRONG BASE"`.
  Your worktree forks from `milestone/m3-local-ui` HEAD; do not check `sprint/LUI1WEDGE`.
- Merge-back target: `milestone/m3-local-ui`. Completion tag: `LUI1WEDGE-wd2nil-done`.
- Commit **code only / never stage `.gitban/`**.

## What changed since the review: the dispatcher RAN the real suite — it is RED

reviewer-1 REJECTED on Gate 1 checkbox-integrity (capstone / "tests pass in CI/locally" / coverage
boxes ticked with no real run). The dispatcher then **provisioned a real toolkit venv and ran the
integration suite for real** — and it does **NOT pass**. So this is not just a checkbox edit: there
are real failures to diagnose and fix. The test *structure* the reviewer praised is good; the *runtime
behaviour* it exercises is not all green.

### ✅ A working toolkit venv now exists (use it to verify your fixes)

A `.venv` is provisioned at the **parent repo root**: `/home/cameron/projects/deepnote/.venv`
(deepnote-toolkit[server]==2.3.1 + bash_kernel==0.10.0 + jinja2, bash+python3 kernels installed,
gitignored). Run the real integration suite exactly as CI does, pointing at the **absolute** parent
venv path (your worktree has no local `.venv`):

```bash
# from your worktree root:
RUN_INTEGRATION_TESTS=true \
DEEPNOTE_INTEGRATION_VENV=/home/cameron/projects/deepnote/.venv \
VITEST_TEST_TIMEOUT=120000 \
npx vitest run --config vitest.integration.config.ts \
  packages/runtime-server/test-integration/server-run-parity.integration.test.ts -t "Scenario 4"
```

**Run scenarios ONE AT A TIME (`-t "Scenario N"`), not the whole suite at once** — this box is
resource-constrained (6.3 GiB, no swap) and live Jupyter kernels thrash under concurrency, producing
*flaky* failures that are NOT real. Verify each scenario in isolation. Do **NOT** `pip install`
anything (the venv is read-only and already complete).

## The three real failures (dispatcher-observed, post-`pnpm install`)

1. **Scenario 4 (HIGH, runtime-server in-process — DETERMINISTIC, not flaky): kernel-death returns
   `run-done`, expected `run-failed { kernel-died }`.** Fails consistently in isolation. The test boots
   the server in-process over `kernelDeathFixture` and asserts the terminal WS event is
   `run-failed{kernel-died}` (per hlai4c's design / ADR-005 "kernel dies mid-run must be terminal
   run-failed"). The REAL kernel death surfaces as `run-done` instead. **This is the most important
   item — diagnose it properly:**
   - Drive a real mid-run kernel death (the fixture's kill block) and observe what
     `ExecutionEngine.runProject` / `kernel-client` ACTUALLY do: does `runProject` reject with
     `KernelDiedError` (→ hlai4c's `run-queue.ts` should emit `run-failed`), or does the dead-kernel
     block come back as an in-block failure (engine `break`s → resolves → `run-done` with
     `failedBlocks>0`)?
   - If `run-queue.ts`/`session.ts` has a real gap mapping a genuine `KernelDiedError` to `run-failed`,
     **fix the production path** (this is a real wedge bug — hlai4c verified kernel-death only against a
     MOCKED engine; the real toolkit behaves differently). Touch `packages/runtime-server/src/` as needed.
   - If, instead, real kernel death in this toolkit legitimately surfaces as a terminal `run-done`
     (block-errored, kernel gone) and `run-failed` only fires for kernel **launch/connection** death,
     then hlai4c's mock-based expectation was wrong: **reconcile** — fix the *fixture/test* to trigger
     the actual reject path (e.g. kill the kernel process out-of-band so `runProject` rejects), and
     document the real semantics. Either way the end state is a GREEN Scenario 4 that asserts the REAL
     terminal-event guarantee, not a mock artifact. **Do not just delete the assertion.**
2. **Scenario 1 (CRITICAL, drives the built `deepnote run` subprocess): deep-equal mismatch on one
   block** (`no server outputs for block …c6: expected […] to deeply equal […]`). Investigate: is it a
   non-deterministic output (timestamp/order) — in which case apply the planner's **L1** fix (compare on
   the *union of keys* / normalise volatile fields) — or a real server-vs-`run` output difference? Make
   the parity assertion robust and TRUE. NOTE: Scenario 1 + the `non-python` tests run the built CLI as a
   subprocess; that needs `pnpm install --frozen-lockfile` first so `packages/cli/node_modules/@deepnote/runtime-server`
   is symlinked (the built ESM cli externalises that import). If the subprocess can't resolve it from your
   worktree, run those scenarios' verification from the parent checkout instead, and say so honestly.
3. **Pre-existing `packages/cli/test-integration/non-python-kernel.integration.test.ts` — "missing-kernel
   legibility" fails in isolation too.** This is NOT your card's test, but it overlaps your Scenario 2
   (same `missing-kernel` legibility behaviour). Characterise it: if your sprint introduced the
   regression (e.g. the serve/runtime-server wiring changed the missing-kernel path), note it for the
   planner / a follow-up; if it's pre-existing/environmental, document and leave it — do not silently fold
   an unrelated pre-existing test into this card.

## Also apply the planner follow-ups already filed on this card

Read the card's amended sections: **L1** (Scenario 1 fixture-fragility → union-of-keys compare) and
**L2** (coverage-claim wording: "100% of executable block types" is currently scoped to `code` — make
the claim match the fixture, or extend the fixture). **L3** (CI wall-clock budget) is tracked separately.

## Checkbox integrity — the Gate-1 blocker

Only tick the **Capstone**, **"All tests pass locally"**, **"All tests pass in CI"**, and the
**coverage** boxes when they are TRUE with evidence:
- "pass locally": tick ONLY if you achieve a stable green run of the scenarios (isolated, with the venv);
  paste the green run output in your close-out as evidence. If the box-resource flakiness prevents a full
  green locally but each scenario passes in isolation, say exactly that.
- "pass in CI": this commit has no `integration-kernels` run yet. Either leave it unticked (honest) or,
  per the card's design, annotate it as verified-at-CI and keep it unticked until CI is green — do NOT
  tick a CI pass that hasn't happened.
- Do NOT tick the capstone unless Scenario 1's deep-equal actually passes green for real.

## Gates before returning

- Real scenarios verified per above (isolated, venv). Mocked `pnpm test` stays green and still EXCLUDES
  the integration suite. `pnpm typecheck` (both halves) green. biome/prettier/cspell clean (run cspell
  from the parent — it ignores `.claude/**`; add terms to `docs-dictionary.txt`).
- Be scrupulously honest in the close-out about what passed where (which scenarios green in isolation,
  which need CI, any real bug you fixed vs test reconciliation). A lint/typecheck/format failure is a
  completion failure.

This card is in sprint **LUI1WEDGE** — do not push a branch or open a PR; the dispatcher owns lifecycle.
