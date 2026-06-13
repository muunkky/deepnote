---
verdict: APPROVAL
card_id: sqm7ox
review_number: 1
commit: 85c5fdb
date: 2026-06-12
has_backlog_items: true
---

# Review: step-7A `deepnote ui` browser-launch alias

**Verdict: APPROVAL.**

Scope reviewed: feature commit `79566f3` (the alias) + test-hardening commit `85c5fdb`
(the SIGINT-wait deadline poll). Both belong to this card's work.

## Gate 1 — completion claim

DoD is required (this touches the CLI command surface, control flow, and a public action
factory signature). It is present and strong:

- **Intent** is plain-English and verifiable from outside the code: `deepnote ui myproject`
  pops a browser at `http://localhost:PORT`, `deepnote serve` stays headless, and the `ui`
  path never reaches `openDeepnoteFileInCloud`. A reasonable engineer can sanity-check against it.
- **Capstone (positive)** is unfakeable: it asserts `openBrowser` is called exactly once with
  the literal local URL `http://localhost:8080`, matches `^http://localhost:\d+$`, and is NOT a
  cloud/https URL. This is observable behavior, not a return-type assertion.
- **Capstone (serve-vs-ui)** exercises the *assembly* — same action, flipped `defaultOpen` —
  proving the alias genuinely differs only in the open default, not in duplicated logic.
- **Load-bearing negative capstone** is the right shape for a "must-not-reach" guarantee: a
  static source-inspection test that strips comments first (so the local-first rationale prose
  mentioning `openDeepnoteFileInCloud` does not false-positive) and asserts no import binding,
  no call expression, and no `./run` import. This is a correct way to pin a structural invariant
  that a behavioral mock could never fully prove.

Checkbox design is sound: every box maps to an acceptance criterion or observable; no
trivially-satisfied or title-restating boxes. Integrity holds — the two reviewer-owned boxes
(Code Review Approved / PR merged) are correctly left unchecked.

Gate 1 passes. Proceeding to Gate 2.

## Gate 2 — implementation quality

**Architecture.** The alias is genuinely thin. `createServeAction` gained an optional third
arg `config: ServeActionConfig = { defaultOpen: false }`; the bare `createServeAction(program)`
signature is preserved so no caller broke. `serve` registers `defaultOpen: false`, `ui` registers
`defaultOpen: true`, and `runServe` resolves `const shouldOpen = options.open ?? config.defaultOpen`.
No serve logic is duplicated — the entire behavioral delta is one nullish-coalesce. This is the
correct abstraction for an alias.

**Latent bug fixed correctly.** Registering only `--no-open` makes commander default `open` to
`true`, so real `deepnote serve` with no flags would have opened a browser — contradicting the
headless contract. Both commands now register BOTH `--open` and `--no-open`, leaving `open`
undefined unless the user opts in, and the action resolves the per-command default. This is a
root-cause fix (not a lazy widening), is documented in the `ServeOptions.open` JSDoc and a code
comment, and is covered by `cli.test.ts` (both flags present on both commands) and a new
behavioral test (`serve defaults to headless: open=undefined does NOT launch a browser`).

**ADR-005 compliance.** ADR-005 §3 establishes a single localhost-trust boundary (the Node
server) and a localhost-bind (never `0.0.0.0`) posture. The `ui` path opens the loopback URL
only and the existing `127.0.0.1` bind is re-asserted by a `ui`-specific test. Compliant.

**TDD.** Tests define the contract behaviorally (open call / no-open / port-fallback / loopback
bind) and lead with the negative invariant; failure and override cases (`ui --no-open`,
`serve --open`, port fallback) are present, not just the happy path. New production behavior has
corresponding tests in the same commit.

**Test execution.** Run from the repo root (the canonical `pnpm test` cwd), the two suites are
**43/43 green**:

```
✓ packages/cli/src/commands/serve.test.ts (19 tests)
✓ packages/cli/src/cli.test.ts (24 tests)
```

`tsc --noEmit` on `packages/cli` exits 0.

Note for the record: running vitest with `packages/cli` as the cwd (rather than the repo root)
makes the `runAction` tests fail with "SIGINT handler was never registered" — because the real-fs
`resolvePathToDeepnoteFile` resolves `examples/1_hello_world.deepnote` relative to `process.cwd()`,
which only exists at the repo root. This is an environment artifact of how the suite is invoked, not
a code defect, and it predates this card (the failing test, `binds localhost`, is suite-6 baseline
code untouched by this commit). The card's tests pass under the canonical invocation. See FOLLOW-UP
L1.

**Documentation (DaC).** README gains a self-contained `### ui [path]` section, the serve options
table now correctly lists `--open`, and `--help` text documents the alias and the P6 naming open
question. Docs match the implementation.

No DRY violations, no lazy solves, no security concerns (loopback-only, no secrets, no new surface).

## FOLLOW-UP

- **L1 (`test-env-coupling`)** — Suite 6's `runAction` tests resolve a real fixture
  (`examples/1_hello_world.deepnote`) via `process.cwd()`, so they silently fail when vitest is
  invoked from any cwd other than the repo root. Failure mode: a developer running
  `pnpm vitest` from inside `packages/cli` (or a future CI step that does) gets an opaque
  "SIGINT handler was never registered" rather than a clear "fixture not found". Pre-existing
  (not introduced by this card), but the card adds four more `runAction`-based tests that inherit
  the coupling. Suggested fix: resolve the fixture relative to the test file
  (`fileURLToPath(import.meta.url)`) — the negative-capstone test in this very commit already uses
  that pattern for `serve.ts` — instead of `process.cwd()`.
