# Executor directive — LUI1WEDGE / wd2nil (executor-1, step 5: integration parity tests)

## ⚠️ BRANCH OVERRIDE — read before the "Worktree branch-base check"

This sprint runs on **`milestone/m3-local-ui`**, **NOT** `sprint/LUI1WEDGE`. There is no
`sprint/LUI1WEDGE` branch.

- **Worktree branch-base check:** run
  ```bash
  git merge-base --is-ancestor milestone/m3-local-ui HEAD && echo "base ok" || echo "WRONG BASE"
  ```
  Your worktree was forked from `milestone/m3-local-ui`'s HEAD. Checking the default `sprint/LUI1WEDGE`
  ref would error and falsely report `WRONG BASE`.
- **Merge-back target**: the dispatcher merges your `worktree-agent-…` branch into `milestone/m3-local-ui`.
- **Completion tag**: `LUI1WEDGE-wd2nil-done`.

Commit **code only / never stage `.gitban/`**; TDD.

## Build context

This is **step 5 — the real-kernel integration parity suite**, the wedge's headline proof that "the
server runs your project exactly the way `deepnote run` does." `read_card(wd2nil)` for the full DoD and
the **four scenarios**. The grounding doc is `docs/designs/m3-s1-server-api-and-serve.md` ("Test strategy"
suites 1 & 5, Phase 5 DoD). All upstream pieces are landed on `milestone/m3-local-ui`: open
(`GET /api/project`), run-all over WS (`hlai4c`), save (`e6e3lt`), and — newly — the real
**`deepnote serve`** command (`zq7q0g`).

### Reuse the existing integration harness — do NOT build new test infra

- Use `vitest.integration.config.ts` (`pnpm test:integration` / the CI `integration-kernels` job). It
  collects `*.integration.test.ts`. The mocked `pnpm test` deliberately excludes these.
- **Mirror the existing integration test** `packages/cli/test-integration/non-python-kernel.integration.test.ts`
  for the venv-detection + self-skip guard pattern and fixture wiring. Match its shape.

### ⚠️ Local verification reality — be honest, do NOT fake a green run

There is **no `deepnote-toolkit[server]` venv on this machine** and `RUN_INTEGRATION_TESTS` is unset, so
the integration suite **self-skips locally** (by design — same as the existing integration test). **Do
NOT `pip install` anything — the shared venv is read-only and pip-install in a worktree is forbidden.**
Therefore:
- You CANNOT produce a real-kernel green run locally. Do not claim one.
- What you CAN and MUST verify locally: the new `*.integration.test.ts` file(s) are **collected** by
  `pnpm test:integration`, **self-skip cleanly** (no errors) when the venv/`RUN_INTEGRATION_TESTS` are
  absent, the mocked `pnpm test` still excludes them and stays green, and `pnpm typecheck` / biome /
  prettier / spell are clean on the new files.
- The capstone (real deep-equal parity) is verified in **CI's `integration-kernels` job** — the card's
  designed verification locus. State this honestly in your close-out: "structure + self-skip verified
  locally; real-kernel parity rides the integration-kernels CI job."

### The four scenarios (from the card — all must have tests)

1. **API ↔ `run` parity (Critical):** boot the server over a fixture exercising **100% of executable
   block types**, `GET /api/project`, run-all over WS, collect streamed `IOutput`s; separately run
   `deepnote run --output json` on the same file; assert the streamed `IOutput`s **deep-equal** the CLI's
   (R3, measured not asserted), events in order. **If the parity fixture is missing a block type, EXTEND
   the fixture — do NOT narrow the claim.**
2. **Failure-category legibility (Critical):** a deliberately-missing kernel name → `missing-kernel`
   end-to-end (typed discriminant, not a stringified message) + a terminal event (consumer does not hang).
3. **`serve` smoke (e2e):** `deepnote serve fixture.deepnote --no-open` (the real command from `zq7q0g`)
   boots, answers `GET /api/project` with the tree, and shuts down cleanly on SIGINT.
   **⚠️ L2 fold-in (planner amendment — read the card's amended Scenario 3 + DoD):** assert the bind on
   the **server-side bound `AddressInfo`** (`127.0.0.1`, never `0.0.0.0`), with a leg that would FAIL on
   an all-interfaces bind. Do **NOT** assert via the client socket's `localAddress` — that is the exact
   false-positive that got `zq7q0g` rejected (it always reads `127.0.0.1` over loopback). Use
   `server.boundAddress()` (the accessor `zq7q0g` added) or the server-side `AddressInfo`.
4. **Mid-run kernel death is terminal (real):** a run that kills the kernel mid-execution → terminal
   `run-failed { failureCategory:'kernel-died' }`, no further events for that `runId`.

## ⚠️ Before you finish — gates

Run from the **repo root** (NOT a package dir — some cli tests resolve `examples/*.deepnote` against
`process.cwd()` and only pass from root):
- `pnpm test` (mocked — must stay green; confirm your integration tests are EXCLUDED from it).
- `pnpm test:integration` — confirm your new tests are collected and self-skip cleanly (no errors) with
  no venv.
- `pnpm typecheck` (BOTH halves: `tsc -p tsconfig.json` and `pnpm -r exec tsc --noEmit`).
- `pnpm exec biome check --write` on touched packages; prettier on any touched Markdown; `pnpm spell-check`
  (run from the parent/root, not the worktree — cspell ignores `.claude/**` so a worktree run reports 0
  files; add new terms to `docs-dictionary.txt`, not source).

A lint/spell/format/typecheck failure is a completion failure, not a follow-up.

This card is in sprint **LUI1WEDGE** — do not push a branch or open a PR; the dispatcher owns lifecycle.

---

# ROUTER DIRECTIVE — review 1 (REJECTION, Gate 1) — supersedes the build context above

Use `.venv/Scripts/python.exe` to run Python commands.

===CARD STRUCTURE FIX REQUIRED (Gate 1 failure)===
This rejection is about the card's checkbox design, Definition of Done, or
completion-claim integrity — not the code. Before re-submitting: edit the card
to fix the issues per the blockers below, re-verify that every checked box is
actually true and every observable is actually met, then re-run the reviewer.
The reviewer did not evaluate your code changes. Do not rewrite working code
unless the fixed card structure surfaces an actual gap.
===END CARD STRUCTURE FIX REQUIRED===

The code for gitban card `wd2nil` was reviewed (review 1, commit `24e5386`) and
REJECTED on a single, narrow Gate 1 integrity blocker. The reviewer was explicit:
the test code is correct, every API assumption was cross-checked against source and
holds, the loopback guard correctly carries the `zq7q0g` requirement, and the vitest
split is right. **Do not change the test.** The fix is to make the card's checked
boxes truthful.

Full review: `.gitban/agents/reviewer/inbox/LUI1WEDGE-wd2nil-reviewer-1.md`

## BLOCKER (B1) — checked boxes assert a green real-kernel run that has never executed

Every box on the card is ticked, including:
- **Capstone** observable ("streamed `IOutput`s deep-equal `deepnote run --output json` … green in the `integration-kernels` job")
- `[x] All tests pass in CI`
- `[x] All tests pass locally`
- `[x] Coverage target met: 100% of executable block types` (Quality Gates AND the Acceptance-Criteria line)

But the real-kernel test path has demonstrably **never executed**:
- **Locally:** impossible — no `deepnote-toolkit[server]` venv on this machine; the suite self-skips (4 tests skipped, verified). The closeout states this plainly.
- **In CI:** commit `24e5386` lives only on `milestone/m3-local-ui`; no `integration-kernels` run exists for it. The job has not been triggered against this suite.

A `[x]` capstone whose test path was never walked is lying about the check. Honesty
in the closeout prose does not license ticking the box — the box must be either
**substantiated** or **unticked**.

### Required fix — pick the path the dispatch can actually deliver

**Path A (preferred — substantiate the boxes):**
1. Run the `integration-kernels` job against this commit — push the branch so CI runs
   it, or provision a local `deepnote-toolkit[server]` + `python3` venv and run
   `RUN_INTEGRATION_TESTS=true DEEPNOTE_INTEGRATION_VENV=<venv> pnpm run test:integration`.
2. Confirm the four scenarios go **green** against the real kernel — in particular that
   the per-block `IOutput` deep-equal actually holds. The `execute_result`
   `execution_count` and the `display_data` MIME bundle are the most likely places a
   real run could diverge from the CLI; these cannot be proven by inspection.
3. Only then re-tick the capstone / "passes in CI" / "passes locally" / coverage boxes,
   with the run as **evidence** — link the CI run or paste the green run summary into the
   closeout.

**Path B (if a real-kernel run is genuinely out of reach this dispatch):**
- The card is then "merge-blocked-on-CI." **Uncheck** the capstone, `[x] All tests pass
  in CI`, `[x] All tests pass locally`, and the coverage boxes (Quality Gates +
  Acceptance Criteria), and edit the card so it explicitly states the real-kernel green
  is pending the `integration-kernels` job on the integration branch. The boxes cannot
  stand checked while no green run exists.
- Whichever boxes legitimately ARE true (structure created, self-skip verified, mocked
  config excludes it, tsc/biome/prettier/cspell clean) stay checked.

Use gitban's checkbox/edit-card tools to make the boxes match reality — do **not** edit
the card markdown file directly. After the card is truthful, re-run the reviewer.

Note: You are closing out this card only. The dispatcher owns sprint lifecycle — do not
close, archive, or finalize the sprint itself.
