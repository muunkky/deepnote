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
