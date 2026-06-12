---
verdict: APPROVAL
card_id: sjwaox
review_number: 1
commit: ed13053
date: 2026-06-10
has_backlog_items: false
---

# Review: step-4-runtime-core-version-bump-changelog-for-agent-helpers

## Summary

APPROVAL. The card is a `chore`: bump `@deepnote/runtime-core` past `0.3.0` and
add a CHANGELOG documenting the agent-block helpers + the shared Python-spec
resolver exports. The commit (`ed13053`) does exactly that — 2 files, +67/-1,
code-only with no `.gitban/`, `.claude/`, `docs/prds/`, or `docs/adr/` leakage.
The defining standard for a CHANGELOG card is documentation accuracy (DaC), and
the executor met it with unusual rigor: rather than restating the card's loose
"seven helpers" framing, they verified the actual public surface and documented
it honestly.

## Gate 1 — Completion claim

This card is in the **documentation/config-bump exempt** category. It changes a
package-version metadata field and adds CHANGELOG prose — no function signature,
control flow, business logic, data schema, runtime-read config branch, agent
prose, or test behavior is touched. A formal Intent/Observables DoD with a
capstone is therefore not required. The structured Sprint Cleanup template is
used; checkboxes are concrete and verifiable (version moved past 0.3.0,
CHANGELOG created enumerating the named exports). The single unchecked
Completion-Checklist box ("Code changes reviewed and merged") is correctly left
as the reviewer's gate. Gate 1 passes.

## Gate 2 — Implementation quality

Verified each material claim against the actual repo state:

- **Version bump.** `package.json` is `0.4.0` (HEAD). Correct minor/additive
  bump — new public exports, no existing signature changed. Lockfile correctly
  untouched (runtime-core is a `link:` workspace dep, not a pinned version).
- **Public-vs-internal split is accurate.** `src/index.ts` re-exports
  `executeAgentBlock`, `serializeNotebookContext`,
  `serializeNotebookContextFromBlocks`,
  `createBlocksWithAttachedOutputsFromCollectedOutputs`, plus `selectPythonSpec`
  and `isBareSystemPython` (the latter two via `./python-env`), and the types
  `AgentBlockContext` / `AgentBlockResult` / `AgentStreamEvent`. All match the
  CHANGELOG's "Public exports" sections. The three helpers documented as
  internal — `resolveEnvVars`, `mergeMcpConfigs`, `buildSystemPrompt` — are
  `export`ed from `src/agent-handler.ts` but are NOT in `index.ts`, exactly as
  the CHANGELOG's "Internal (not part of the public package entry)" subsection
  states, with an appropriate SemVer-stability caveat. This is the correct,
  honest call: silently re-exporting the three to make the docs match the card's
  "seven public helpers" phrasing would have been a real out-of-scope code
  change to the public API. Documenting reality and flagging the discrepancy was
  the right move.
- **CHANGELOG references point to real artifacts.** The "Tests" section
  describes `executeAgentBlock` tool-loop coverage (`add_code_block` /
  `add_markdown_block`, `maxTurns` defaults) — `agent-handler.test.ts` exists and
  covers exactly that. The ADR-001 link
  (`docs/adr/ADR-001-shared-python-interpreter-resolution.md`) resolves to a real
  file. The CHANGELOG documents real, not aspirational, state.
- **CHANGELOG novelty.** No prior CHANGELOG existed in runtime-core (or any
  package); `ed13053` is the only commit touching it. No record overwritten.
- **No new tests required.** A version-string edit plus a markdown file alters no
  runtime behavior — proportionality applies, TDD rigor is not triggered.
- **No lazy solves, no secrets, no IaC gaps.** npm publish is correctly and
  explicitly declared out of scope (maintainer-only `NPM_TOKEN`).

Format/SemVer conventions (Keep a Changelog, SemVer) are followed.

## BLOCKERS

None.

## FOLLOW-UP

None. The public-vs-internal helper discrepancy the executor surfaced is not a
defect introduced by this card and not adjacent debt the diff worsens — it is the
pre-existing shape of the package API, now accurately documented. If the sprint
ever intends all seven helpers to be public, that is a deliberate `index.ts`
change requiring its own card and a SemVer decision; nothing here forecloses it.

## Outstanding close-out actions

- The Completion-Checklist box "Code changes (if any) are reviewed and merged"
  remains open pending merge of the `feat/*` PR carrying this commit. That is the
  expected post-review/merge step, not a review blocker.
