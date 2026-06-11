---
verdict: APPROVAL
card_id: pv4px0
review_number: 1
commit: de31e4a
date: 2026-06-10
has_backlog_items: false
---

# Review: step-3b-cli-run-interpreter-resolution-converges-on-shared-selector

APPROVED. Clean, narrowly-scoped card. The CLI `deepnote run` now resolves its
Python interpreter through the shared `selectPythonSpec` selector, honoring
`DEEPNOTE_PYTHON` between `--python` and autodetect exactly as ADR-001 mandates.
Verified independently against the diff, the ADR, the real runtime-core selector,
and a live test run.

## Gate 1 — completion claim (PASS)

The card requires a DoD (it changes control flow at a call site that picks the
interpreter handed to the execution engine). The DoD is sound:

- **Intent** is concrete and outside-the-code: CLI honors `DEEPNOTE_PYTHON` the
  same way MCP does; a break shows as the CLI ignoring `DEEPNOTE_PYTHON` while MCP
  honors it. A reasonable engineer can sanity-check the diff against it.
- **Capstone is real and unfakeable by the precedence logic alone.** It asserts the
  resolved `pythonEnv` that reaches `new ExecutionEngine(config)` — for both the
  `DEEPNOTE_PYTHON`-set / no-`--python` case and the `--python`-wins case. Because
  the assertion is on the value the CLI wiring actually feeds the engine constructor
  (`mockConstructor` captures `config`, run.test.ts:40), it cannot pass unless
  `run.ts` actually routes `options.python` as `explicit` through the selector and
  forwards the result. A green capstone on the old `?? detectDefaultPython()` chain
  is impossible. Appropriate capstone for a composed feature (CLI call-site wiring +
  shared selector).
- **Observables** are user-observable (resolved interpreter), not implementation
  detail. Intent and Observables are consistent.
- **Checkbox design** proves correctness if honestly checked: all three precedence
  tiers plus arg-over-autodetect are covered.

## Gate 2 — implementation quality (PASS)

**Production change (run.ts:296)** is exactly right and minimal:
`resolvePythonExecutable(options.python ?? detectDefaultPython())` →
`resolvePythonExecutable(selectPythonSpec({ explicit: options.python }))`. The
unused `detectDefaultPython` import is dropped and `selectPythonSpec` added — no
dead imports left behind. This matches ADR-001's precedence (`--python` >
`DEEPNOTE_PYTHON` > autodetect) and the ADR's structural-convergence goal: the CLI
and MCP now consume the identical runtime-core selector, so they cannot drift.

**Mock fidelity verified.** The test mock's
`selectPythonSpec = ({ explicit }) => explicit ?? process.env.DEEPNOTE_PYTHON ?? 'python'`
faithfully mirrors the real selector at
`packages/runtime-core/src/python-env.ts:155`
(`explicit ?? process.env.DEEPNOTE_PYTHON ?? detectDefaultPython()`), routing the
autodetect tail through the mocked `detectDefaultPython` so the precedence is
identical without spawning a real interpreter. The comment in the mock is honest
about this and points to where the real precedence is unit-tested (runtime-core,
step 2A). This is the correct mocking layer for a CLI-wiring test — it does not mock
away the system under test (the wiring in run.ts), only the cross-package selector
whose own contract is tested at its source.

**TDD is genuine, not test-after.** Confirmed the red phase directly: at commit
`74346de` (test-only), `run.ts` still carried `options.python ?? detectDefaultPython()`,
so the "honors DEEPNOTE_PYTHON when no --python" test would resolve to `python`
(autodetect) and fail the `/env/venv/bin/python` assertion. The implementation in
`3283ab4` turned it green. Tests assert observable behavior (the value reaching the
engine), include the non-happy-path tiers, and were committed before the production
change.

**Test hygiene is correct.** The new `delete process.env.DEEPNOTE_PYTHON` in the
shared `beforeEach` mirrors the existing `DEEPNOTE_TOKEN` cleanup and is genuinely
necessary now that `run.ts` reads `DEEPNOTE_PYTHON` — without it a developer's
ambient env var would leak into the autodetect-fallback tests. Defensive design,
not a hack.

**Independent verification (re-run, not trusted from the close-out):**

- `vitest run packages/cli/src/commands/run.test.ts` → 155/155 pass.
- Hermeticity: `DEEPNOTE_PYTHON=/some/poison/python vitest run …` → still 155/155.
- `tsc --noEmit -p tsconfig.json` → exit 0.

ADR compliance, DRY (single shared selector — the whole point), DaC (selector
JSDoc already documents the precedence; no new help-text surface introduced), and
security (no secrets, no injection) all check out. No lazy solves — nothing was
loosened or widened.

## Parity claim (step 3A)

The close-out is honest that step 3A (MCP, card `mjporx`) is still `todo`, so parity
is established structurally rather than by a live diff: both callers consume the same
`selectPythonSpec`. That is the correct and only available form of parity right now,
and it matches ADR-001's "convergence by construction" intent. Not a blocker.

## FOLLOW-UP

- **L1 (adr-consumer-gap, MCP card / step 3A — likely already tracked):** ADR-001
  also requires consumers to surface an _actionable bare-system-python hint_
  ("set `DEEPNOTE_PYTHON` or pass a venv") when resolution lands on bare `python`
  via `isBareSystemPython`. This card's scope is explicitly precedence convergence
  only ("Scope decided; do not re-architect"), so its absence here is correct — but
  the hint is a real ADR obligation that should land on a consumer somewhere. The CLI
  currently does not emit it (run.ts:296 just resolves and proceeds). Failure mode if
  never built: a user with no venv and no `DEEPNOTE_PYTHON` still gets the opaque
  mid-run failure ADR-001 set out to eliminate. Planner: confirm this is captured on
  the MCP step (3A) or a dedicated card; out of scope for pv4px0.
