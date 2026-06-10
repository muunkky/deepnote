---
verdict: APPROVAL
card_id: onwhhg
review_number: 1
commit: c723e41
date: 2026-06-10
has_backlog_items: false
---

# Review: step-2a shared selectPythonSpec resolver + isBareSystemPython export

## Verdict: APPROVAL

Foundational Stream-A card for sprint S6INREPO. Adds a pure `selectPythonSpec`
precedence selector to `@deepnote/runtime-core` and re-exports both
`selectPythonSpec` and `isBareSystemPython` from the package entry so steps 3A
(MCP) and 3B (CLI) can consume them. Clean, well-scoped, genuinely test-first.

## Gate 1 — completion claim (PASS)

The card touches a new function signature and the package's public re-export
surface, so a DoD is required. It is present and sound:

- **Intent** is concrete plain English: precedence `explicit > DEEPNOTE_PYTHON >
autodetection`, both CLI and MCP call it so they never disagree, with a named
  failure mode (divergent interpreters / silently-ignored `DEEPNOTE_PYTHON`).
  Not a title restatement.
- **Observable outcomes** cover the three precedence branches plus a **capstone**
  that imports BOTH symbols from `'@deepnote/runtime-core'` (the package entry,
  not the relative `./python-env` path) and asserts `selectPythonSpec` precedence
  and `isBareSystemPython` classification. This is an unfakeable contract: if
  either symbol is not re-exported from `index.ts`, the import fails to
  type-check and the assertions cannot run. It is the right capstone for a card
  whose downstream value is the package-entry contract that 3A/3B build against.
- The "pure selector, no assembly" no-capstone-style note is backed by an actual
  capstone anyway (the package-entry test), so there is no decompose-but-don't-
  assemble exposure.
- Checkbox integrity verified against reality, not taken on trust (see Gate 2).

## Gate 2 — implementation quality (PASS)

- **ADR compliance:** `selectPythonSpec({ explicit }) => explicit ??
process.env.DEEPNOTE_PYTHON ?? detectDefaultPython()` is exactly the ADR-001
  precedence chain (explicit caller arg > `DEEPNOTE_PYTHON` interop var >
  `detectDefaultPython()`). It correctly returns a spec STRING and does NOT build
  the spawn env — env assembly remains in `server-starter.ts`
  (`resolvePythonExecutable` + `buildPythonEnv`), as ADR-001 and the card both
  require. TSDoc documents the precedence and cites ADR-001 (DaC satisfied).
- **TDD verified genuine, not test-after.** Red phase `270a92a` adds ONLY the two
  test files — no implementation in `python-env.ts`, `index.ts` still re-exports
  the old three symbols — so the tests genuinely fail (`selectPythonSpec is not a
function`, missing re-export). Green phase `c723e41` adds the impl + re-exports.
  Tests define the contract (behavioral: manipulate `process.env.DEEPNOTE_PYTHON`,
  assert returned spec string), not internals. Edge/negative cases present:
  `explicit: undefined` falls through, no-arg-object reads env, autodetect
  fallback to `python` then `python3`. Per-case env save/restore in
  `beforeEach`/`afterEach` prevents global leakage.
- **Capstone exercised for real.** Ran `npx vitest run` on both files: **38
  passed (35 + 3)**, 0 failed. The package-entry capstone resolves through
  `'@deepnote/runtime-core'` (verified the import line is the package specifier,
  not a relative path) and passes — the re-export contract is proven against the
  actual source entry, no fixture stub.
- **Type surface clean.** Root `tsc --noEmit -p tsconfig.json` exits 0 — the new
  public surface type-checks across the workspace `paths` mapping.
- **Lint clean.** `biome check` on all four changed files: no fixes applied.
- The `c723e41` test-file deltas are comment-only rewordings (cspell-driven, e.g.
  "autodetection" -> "autodetect fallback") with zero behavioral change; the test
  logic itself landed in the red commit. No lazy solves, no loosened gates.

## FOLLOW-UP

None blocking. One informational note for the planner (NOT a gap in this card —
it is correctly deferred and already tracked as 3A/3B):

- `selector-wiring-pending` — No in-repo caller invokes `selectPythonSpec` yet, so
  the end-to-end ADR-001 value (CLI `run.ts:296` and MCP `execution.ts:393/558`
  converging on one interpreter, plus surfacing the `isBareSystemPython` actionable
  hint at the tool boundary) is not realized by this card alone. This is the
  explicit scope of steps 3A (MCP) and 3B (CLI), which depend on this card's
  re-exports. Flagging only so the sprint closeout confirms 3A/3B actually consume
  the new entry rather than re-deriving the precedence locally — which would
  re-introduce the exact divergence ADR-001 exists to prevent.

## Outstanding close-out actions

- Code Review box can be checked. Remaining unchecked card boxes (Deployment Plan,
  production deploy, monitoring, stakeholder notify, epic close) are correctly
  out of scope for this foundational card and belong to step 4 / sprint closeout.
