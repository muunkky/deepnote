---
verdict: APPROVAL
card_id: 5wqw1l
review_number: 1
commit: 80a2bf8
date: 2026-06-11
has_backlog_items: true
---

# Review: Sub-phase 1A — thread kernelName + selectKernelName + --kernel + pre-flight + typed errors

## Summary

APPROVAL. This is a clean, well-disciplined card. The implementation matches ADR-002
(launch model, R1/R2, KD-2/KD-3/KD-7/KD-8) and ADR-003 (selection precedence, R3/KD-1)
precisely, the TDD evidence is real (tests define the contract, failure cases are
first-class), and the scope boundary against Sub-phase 1C (real-kernel e2e) is honest and
matches the design doc. All 301 tests across the four affected suites pass on my own run;
root typecheck is exit 0.

## Gate 1 — completion claim: PASS

The card requires a DoD (it touches a public API contract, control flow, config fields read
at runtime, and an MCP/CLI external surface). The DoD is well-formed:

- **Intent** is concrete and outside-the-code: a caller can pick a kernel; `--kernel bash`
  echoes the resolved kernel and starts a bash session; no flag = byte-stable python3 with
  no extra GET; an unregistered kernel yields a typed listing error, not an opaque 500. It
  names the two regression tells a developer would notice if it broke (flag silently
  ignored / python3 suddenly does an extra GET). A reasonable engineer can sanity-check
  against it.
- **Observable outcomes** are testable and user-/contract-observable, not implementation
  detail. The truth-table observables for `selectKernelName`/`isNonPythonKernel`, the
  fetch-not-called assertion for python3, the `startNew`-not-called-before-throw assertion,
  and the typed-instance KernelDiedError observable all map to real assertions in the diff.
- **Capstone** is present, composed, and unfakeable at its layer: `--kernel bash` resolves
  `kernelName='bash'` into the engine config, echoes "Resolved kernel: bash", and (proven
  in the runtime-core layer) drives `SessionManager.startNew` with `{ name: 'bash' }`, while
  no-flag resolves python3, performs no kernelspecs GET, and starts python3 as today. The
  capstone is split across two suites because the CLI test mocks `ExecutionEngine` (the
  existing CI reality); the card states this split explicitly and the seam continuity is
  unbroken — the `kernelName` field is asserted identically at each boundary (CLI→engine
  config; engine→`connect(url, kernelName)`; `connect`→`startNew({kernel:{name}})`). The
  `No capstone applicable` declaration on the pure `kernel-name.ts` functions is valid (pure
  library functions, covered by truth-table observables; the composed thread carries the
  real capstone). Not a weak declaration.

Checkbox design proves correctness if honestly checked; checkbox integrity verified against
the diff and a live test run (see Gate 2). The integration/e2e and deployment boxes left
unticked are correctly deferred to Sub-phase 1C / the PR step — not in-scope work disguised
as future work.

## Gate 2 — implementation quality: PASS

**ADR compliance — exact.**
- ADR-003 selector: `firstNonBlank(explicit) ?? firstNonBlank(declared) ?? DEFAULT_KERNEL_NAME`,
  pure, no env read, `declared` forward-declared-not-wired, `DEEPNOTE_KERNEL` documented as a
  deferred extension point. Mirrors `selectPythonSpec`'s shape as KD-1 mandates. The
  `DEEPNOTE_PYTHON`-no-effect assertion proves the no-env-read claim at both the unit and CLI
  layers.
- ADR-002 launch model: `connect(serverUrl, kernelName = 'python3'): Promise<string | undefined>`,
  python3 skips the GET (KD-2, asserted via fetch-not-called), pre-flight throws
  `KernelNotRegisteredError` BEFORE `startNew` for an absent name (asserted via
  startNew-not-called), GET-reject and non-ok both fall through to readiness returning
  `undefined` (R2), `startNew` rejection wrapped in `KernelLaunchError`, configurable
  `kernelStartupTimeoutMs` threaded into `waitForKernelIdle` (KD-7). All match the ADR's
  Decision points 1–4 and Implementation Notes.

**The mid-run KernelDiedError path is the load-bearing piece and it is correct.** A single
`settled` flag guards three terminal paths (status-dead handler, `done.then`, `done.catch`);
exactly one wins, no double-settle, no leaked subscription (the status handler tears down its
own slot and `.finally` runs `cleanup()` + `future.dispose()`; double-dispose/double-disconnect
are no-ops). The future-rejects-while-dead branch maps to the typed class; future-rejects-while-
alive preserves the underlying error. All four branches have dedicated tests. This is exactly the
contract card `qajbsg` (step 4) depends on, and the typed instance reaches the caller intact.

**TDD evidence is genuine, not test-after.** Tests read as the specification: the truth-table
in `kernel-name.test.ts`, the "throws BEFORE startNew" / "fetch not called" / "falls through"
negative cases in `kernel-client.test.ts`, the four execute() death/alive branches. These are
the cases TDD produces by writing the failing test first, not artifacts reverse-engineered from
the implementation. The status-changed mock is a deliberate lumino-ISignal stand-in built to
exercise the real subscription path, not to paper over it. The real `KernelClient` runs against
mocked `@jupyterlab/services` — the system under test is not mocked away.

**Backward compatibility.** `KernelClient`'s new constructor arg is optional (`= {}`) and
`connect`'s new param defaults to python3, so the lone production consumer (`ExecutionEngine`)
and any zero-arg call sites stay valid. The only other `.connect(` in source is the unrelated
MCP transport.

**DaC / quality gates.** JSDoc on `RuntimeConfig.kernelName`/`kernelStartupTimeoutMs`, the
selector (deferred-tier note), the error family, and the engine getter is thorough and cites
the governing ADR/KD. cspell terms (`ECONNREFUSED`, `lumino`, `preflight`, `xeus`) added.
Root typecheck exit 0; the four suites are green (301 passed) on my run.

No lazy solves, no widened catches, no DRY violations, no security concerns. The
`summarizeKernelspecs` defensive defaults (`name ?? key`, `display_name ?? name`, `language ?? ''`)
are reasonable hardening against a loose REST shape, not error-swallowing.

## BLOCKERS

None.

## FOLLOW-UP

- **L1 (live-artifact-gap):** every assertion in this card is against mocks
  (`@jupyterlab/services`, `startServer`, mocked `fetch`, a mocked `ExecutionEngine` at the CLI
  layer). The capstone's `startNew({name:'bash'})` is proven only at the runtime-core layer
  against a mock, and the CLI→engine→connect→startNew thread is never walked end-to-end in one
  test because the CLI test stubs the engine. This is the correct decision for Sub-phase 1A
  (the design doc explicitly owns the real-kernel e2e in Sub-phase 1C, including the bash
  `image/png` and unregistered-kernel `missing-kernel` JSON assertions against the real
  server). Flagging so the planner can confirm Sub-phase 1C exists and is sequenced — the
  mocked thread is self-consistent but has not touched a live kernel, and the typed-error
  contract `qajbsg` relies on is currently proven only against a hand-built status-signal mock.
  No new card needed if 1C already covers it; this is a tracking note, not a defect.

- **L2 (transport-decode-gap):** the `preflightKernelspec` GET uses the global `fetch` directly
  against `{serverUrl}/api/kernelspecs`, bypassing the `ServerConnection.makeSettings` /
  `@jupyterlab/services` request layer the rest of the client uses (and its WebSocket factory
  workaround). For a token-less local toolkit server this is fine and matches the spike's direct
  REST probing, but if a future deployment puts the toolkit server behind auth or a non-trivial
  base path, the raw `fetch` would not carry the server settings the session layer does. Adjacent
  observation, not in scope for this card — surface it so a later card (or the #154 docs) sets
  the "token-less local server" expectation explicitly.

- **L3 (config-only-flag):** `kernelStartupTimeoutMs` is config-only with no CLI surface
  (`--kernel-timeout` deferred per KD-7, documented as not-debt). A unit test does assert the
  non-default value threads through. No action — recording that the user-facing flag remains a
  documented Phase-future deliverable so the planner does not mistake the gap for an oversight.

## Close-out actions (approval)

- Move card to in_progress (unblock for the executor to finalize) — done via MCP.
- Integration/e2e and deployment checkboxes correctly remain Sub-phase 1C / PR-step scope.
