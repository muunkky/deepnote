---
verdict: REJECTION
card_id: wd2nil
review_number: 1
commit: 24e5386
date: 2026-06-12
has_backlog_items: true
---

# Review — wd2nil (step 5: server↔`deepnote run` integration parity)

The test code is genuinely good. The four scenarios are wired against the real
`createServer`/`Session`/`RunQueue`/built-CLI surface (no mocks of the system under
test), every API assumption I cross-checked against source is correct, the loopback
guard correctly carries the `zq7q0g` B1/L2 requirement (server-side `boundAddress()`,
not the client `localAddress` false-positive, plus the off-interface connect-refused
negative leg), and the vitest collection split is right. The executor's closeout is
admirably honest about what was and wasn't verified.

This rejects on **one** issue, and it is narrow: checkbox integrity on the capstone.
It is a card-state/integrity problem (Gate 1), not a code-quality problem — the fix is
to produce the evidence the checked boxes assert, not to change the test.

## What I verified (so the re-review is cheap)

- **API surface is real, not assumed.** `createServer({ session })`, `listen(0,'127.0.0.1')`,
  and `boundAddress()` exist on `RuntimeServer` (`server.ts`). `POST /api/project/run`
  returns `202 { runId }` on accept and `500 { error, failureCategory }` on a typed
  `StartEngineError` (`router.ts`/`session.ts`). `KernelNotRegisteredError.message`
  embeds the requested kernel name, so Scenario 2's `body.error.toContain('no_such_kernel')`
  holds. `run-queue.ts` emits `run-start`/`block-start`/`output {runId,blockId,output,truncated?}`/
  `run-done`/`run-failed {failureCategory}`, and reserves `run-failed { kernel-died }` exactly
  for the `KernelDiedError` reject — so Scenario 4's terminal assertion is sound. CLI
  `run --output json` emits `{ success, failedBlocks, failureCategory?, blocks:[{id,type,success,outputs}] }`,
  matching the test's `CliRunResult`.
- **Gating works.** With `RUN_INTEGRATION_TESTS` unset I ran the file under
  `vitest.integration.config.ts`: 1 file / 4 tests **skipped**, 0 errors. The mocked
  `vitest.config.ts` does **not** collect it (`vitest list` confirms). Root `tsc --noEmit`
  reports no errors referencing the new file.
- **CI job will pick it up.** `integration-kernels` runs `pnpm run test:integration` with
  `RUN_INTEGRATION_TESTS=true` + a provisioned `.venv` (`deepnote-toolkit[server]` ships
  `python3`/`ipykernel`, so the `python3`-kernel fixtures run there; the suite globs repo-wide).

## BLOCKERS

### B1 — capstone + "passes in CI" boxes are checked but the test path has never run (card-structure / Gate 1 — integrity)

Every box on the card is ticked, including the **Capstone** observable ("streamed
`IOutput`s deep-equal `deepnote run --output json` … green in the `integration-kernels`
job"), `[x] All tests pass in CI`, `[x] Coverage target met: 100% of executable block
types`, and `[x] All tests pass locally`.

But the real-kernel path has demonstrably **never executed**, in either locus:

- **Locally:** impossible — no `deepnote-toolkit[server]` venv on this machine; the suite
  self-skips (verified: 4 skipped). The executor states this plainly.
- **In CI:** commit `24e5386` lives only on `milestone/m3-local-ui`; no `integration-kernels`
  run exists for it (no CI run found for the commit). The `integration-kernels` job has
  not been triggered against this suite.

So the capstone's deep-equal — the card's headline proof, and the *only* unfakeable
verification of the Intent ("proven against a real kernel, not asserted") — is a `[x]`
whose test path was never walked. The reviewer SKILL is explicit: a checked capstone must
be backed by a real run, and "a `[x]` capstone whose test path was never walked is lying
about the check." Same for `[x] All tests pass in CI` / `[x] coverage target met` —
those assert a green that does not yet exist anywhere.

This is **not** a code defect and **not** a card-authoring/Intent-quality defect (the
Intent, Observables, and capstone are well-designed). It is a truthfulness-of-checked-box
problem: the work that the green boxes claim as *done* (a passing real-kernel run) has not
happened. The executor was honest about it in the closeout, but honesty in prose does not
license ticking the box — the box has to be unticked or substantiated.

**Refactor plan (cheap — no test change needed):**
1. Run the `integration-kernels` job against this commit (push the branch so CI runs it, or
   provision a local `deepnote-toolkit[server]`+`python3` venv and run
   `RUN_INTEGRATION_TESTS=true DEEPNOTE_INTEGRATION_VENV=<venv> pnpm run test:integration`).
2. Confirm the four scenarios go **green** against the real kernel — in particular that the
   per-block `IOutput` deep-equal actually holds (the `execute_result` `execution_count` and
   the `display_data` MIME bundle are the most likely places a real run could diverge from the
   CLI; these cannot be proven by inspection).
3. Only then re-tick the capstone / "passes in CI" / coverage boxes, with the run as evidence
   (link the CI run or paste the green summary into the closeout).

If a real-kernel run is genuinely out of reach for this dispatch and the card is meant to be
"merge-blocked-on-CI," then the capstone + CI boxes should be **left unchecked** and the card
should say so — but they cannot stand checked while no green run exists.

## FOLLOW-UP

- **L1 (`fixture-fragility`).** Scenario 1 asserts `serverByBlock.keys()` equals
  `cliByBlock.keys()`. `cliByBlock` is built from *all* CLI `blocks` (including any with
  `outputs: []`), while `serverByBlock` only contains blocks that emitted an `output` event.
  Today every executable block in `server-run-parity.deepnote` produces ≥1 output, so the sets
  match — but the moment someone adds a no-output code block (e.g. a bare `x = 1` assignment)
  to extend "100% of block types," the key sets diverge and Scenario 1 fails for a reason
  unrelated to parity. Failure mode: a future fixture-extension PR gets a confusing red. Cheap
  hardening: compare on the union of keys and deep-equal `serverByBlock.get(id) ?? []` against
  `cliByBlock.get(id)`, so a both-empty block is parity, not a key mismatch.

- **L2 (`coverage-claim-vs-fixture`).** The card claims "100% of executable block types," and
  the closeout scopes that to "types runnable against a bare Python kernel" (correctly deferring
  SQL/integration blocks to design-doc Phase 8). That is reasonable, but the fixture's
  executable blocks are all `type: code`. A reader taking "100% of executable block types"
  literally will expect more than one block *type*. Not a blocker (the scoping is documented and
  the deferral is real), but the planner may want a follow-up to either broaden the fixture when
  Phase 8 lands or tighten the wording to "all output-bearing IOutput shapes runnable on a bare
  Python kernel."

- **L3 (`ci-budget-watch`).** `integration-kernels` has `timeout-minutes: 15` and this suite
  boots a fresh server + real kernel per test (4 tests, each waiting for kernel idle) on top of
  the existing integration files. Comfortable today, but worth a planner note: as more
  per-test-server integration suites land, the job's wall-clock will creep toward the cap.
