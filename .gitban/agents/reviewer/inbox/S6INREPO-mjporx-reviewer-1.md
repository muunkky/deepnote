---
verdict: APPROVAL
card_id: mjporx
review_number: 1
commit: 853205f
date: 2026-06-10
has_backlog_items: false
---

# Review: step-3a-mcp-deepnote-run-env-resolution-bare-python-hint (mjporx)

## Verdict: APPROVAL

The card replaces both `pythonEnv: pythonPath || 'python'` literals in the
`deepnote_run` tool with the shared `selectPythonSpec` resolver from
`@deepnote/runtime-core`, applies the ADR-001 precedence (`arg > DEEPNOTE_PYTHON >
autodetect`), and surfaces an actionable bare-system-python hint at the tool
boundary. Implementation, tests, and docs all match the card's Definition of Done
and ADR-001. Approved.

## Gate 1 — Completion claim

DoD is required (the card touches the MCP tool surface and control flow in
`execution.ts`). It is present and strong:

- **Intent** is plain-English and verifiable from outside the code: an agent
  running with no interpreter gets `DEEPNOTE_PYTHON`/autodetect instead of bare
  system python, and a clear hint instead of an opaque mid-run toolkit-import
  failure. A reasonable engineer can sanity-check against it.
- **Two genuine capstones**, both unfakeable by internal-only assertions:
  (1) `DEEPNOTE_PYTHON` set + no `pythonPath` → the exact spec reaches
  `ExecutionEngine` (asserted on the constructor argument); (2) no override + bare
  autodetect → the `pythonHint` text is returned AND the bare spec reached the
  engine. These assert on the value the production code actually constructs the
  engine with and on the tool-boundary output — not on a return type or internal
  shape.
- **Observables and checkboxes are testable and cover the contract**: literals
  removed, precedence, hint-fires-only-on-bare-with-no-override, and both doc
  files. No happy-path-only gap — hint _suppression_ is covered for all three
  override channels (explicit `pythonPath`, bare `DEEPNOTE_PYTHON`, real-venv
  `DEEPNOTE_PYTHON`).

Checkbox integrity verified against the diff and a live run:

- `[x]` "No `pythonEnv: pythonPath || 'python'` literal remains at `:394`/`:559`"
  — grep across `packages/mcp/src` returns nothing. True.
- `[x]` README + `[x]` `docs/local-setup.md` document `DEEPNOTE_PYTHON` — both
  diffs add a precedence list, the executable/bin-dir/venv-root wire-format table,
  an example, and the bare-python hint behaviour. True.
- `[x]` capstone/tests — re-ran the suite (below). True.
- Unchecked boxes (Code Review Approved, Deployment Plan, production deploy,
  monitoring, PR merged) are correctly left unchecked — they are reviewer/PR/
  closeout scope and the card marks deploy/publish N/A. No fabricated ticks.

Gate 1 passes.

## Gate 2 — Implementation quality

**ADR-001 compliance: exact.** `resolvePythonEnv` delegates to
`selectPythonSpec({ explicit: pythonPath })` (returns `explicit ?? DEEPNOTE_PYTHON
?? detectDefaultPython()`), so precedence is `arg > DEEPNOTE_PYTHON > autodetect`
as decided. The selector returns a spec string and the engine builds the spawn env
internally — exactly the spec-not-built-env split the ADR mandates. The hint fires
only when `isBareSystemPython(spec) && !(pythonPath != null || DEEPNOTE_PYTHON !=
null)` — the ADR's "bare system interpreter, no override, no env" condition. The
required `index.ts` re-exports of `selectPythonSpec` and `isBareSystemPython` are
present at this commit, and step-2A (`c723e41`) is a verified ancestor — the build
compiles against real exports, not stubs.

**Dedupe is clean.** The card invited folding the two call sites; the executor
added one `resolvePythonEnv` helper used by both `handleRun` and `handleRunBlock`.
No duplicated precedence/hint logic. DRY satisfied.

**Response shape is consistent and non-colliding.** `pythonHint` is a new field,
distinct from the pre-existing snapshot-guidance `hint` field (line 498) — no
collision, as claimed. Both call sites surface it via `...(pythonHint ? {
pythonHint } : {})`, so the field is absent when no hint fires, matching the
`toBeUndefined()` assertions.

**TDD / test quality: sound.** The new file is contract-defining, not
reverse-engineered: it asserts on observable behaviour (which spec reaches the
engine; the boundary `pythonHint`), exercises the real precedence chain
(`selectPythonSpec`/`isBareSystemPython`/`detectDefaultPython` kept real), and only
mocks `ExecutionEngine` — the one collaborator that spawns a real Python process.
That is necessary isolation, not overmocking: the feature's value (correct
selection + hint) flows entirely through real code, and the capstone assertion on
the constructor argument is unfakeable. Failure/edge cases are present (three
hint-suppression cases + single-block parity), which is the TDD tell. The test
header honestly documents the autodetect-mock limitation (intra-module
`detectDefaultPython` reference) and adapts by asserting against the host's real
value rather than faking it.

**Docs (DaC): complete.** Behavioural change is documented in both required files
with precedence, wire format, an MCP `env` config example, and the hint behaviour.

**Verification I ran (not trusting the trace):**

- `vitest run src/tools/execution.python-env.test.ts` → 9/9 pass.
- `@deepnote/mcp` full suite → 88/88 pass (8 files), no sibling regression.
- `tsc --noEmit` on `@deepnote/mcp` → clean.
- `biome check` on both changed TS files → clean.
- grep confirms zero `pythonEnv: pythonPath` / `pythonPath || 'python'` literals
  remain in `packages/mcp/src`.

No lazy solves, no security concerns, no IaC. Fork discipline respected — the
commit touches only `packages/mcp/**` and `docs/local-setup.md`; no `.gitban/`,
`.claude/`, `docs/prds/`, or `docs/adr/` files.

## BLOCKERS

None.

## FOLLOW-UP

- **L1 (selector-contract-note, non-actionable for this card):** `selectPythonSpec`
  uses `explicit ?? …`, so a degenerate empty-string `pythonPath` (`""`) would now
  resolve to `""` rather than falling through to autodetect as the old `|| 'python'`
  literal did. This is unreachable in practice — the zod schema is
  `z.string().optional()` and no sane MCP client sends `pythonPath: ""` — and it is
  the ADR-sanctioned, CLI-convergent contract defined on step-2A's card (`onwhhg`),
  not introduced here. Noted only for completeness; no change warranted on this card.
