# S6INREPO Sprint Closeout

> **Sprint**: S6INREPO | **Type**: chore | **Step**: 5 (final)
>
> Mandatory closeout card for sprint S6INREPO. Dispatched last. Walks accumulated retrospective items using the four-type deferral grid (see planner/SKILL.md per-item block format for the grid definitions).

## Purpose

Close out sprint S6INREPO: archive done cards, generate the sprint summary, update `CHANGELOG.md`, mark roadmap stories complete, and process every item in the Sprint Retrospective section below using the four-type deferral grid each item carries.

## Sprint Retrospective

<!-- planner appends items below this line during the sprint. Each item is a self-contained block with its own classification grid per planner/SKILL.md. Leave this section empty if no items accumulate. -->

## Acceptance Criteria

- [ ] Every item under `## Sprint Retrospective` has exactly one deferral-type row marked `true` in its inline grid (exactly-one-true constraint)
- [ ] Every item has its `Action taken:` field filled in matching the chosen deferral type (card id for backlog/sprint, prose for note-only, commit hash for fixed-with-note)
- [ ] Every item's two per-item checkboxes (`Item {N} classified`, `Item {N} actioned`) are ticked
- [ ] Sprint summary generated via `generate_archive_summary`
- [ ] Roadmap updated for any stories this sprint completed
- [ ] `CHANGELOG.md` updated for any user-visible changes landed this sprint
- [ ] All sprint cards archived via `archive_cards`

---

> **Template-conformance scaffolding.** The verbatim closeout body above (Purpose / Sprint Retrospective / Acceptance Criteria) is the load-bearing content the dispatcher and planner depend on. The chore-template sections below are present only to satisfy structural validation; the closeout's real acceptance criteria are the list above.

## Cleanup Scope & Context

- **Sprint/Release:** S6INREPO (m1/s6 in-repo residuals)
- **Primary Feature Work:** shared interpreter contract (ADR-001) + runtime agent-block readiness (PRD-001 Phase 2)
- **Cleanup Category:** Sprint closeout

**Required Checks:**

- [ ] Sprint/Release is identified above.
- [ ] Primary feature work that generated this cleanup is documented.

## Deferred Work Review

The substantive closeout work is driven by the Acceptance Criteria list above and the Sprint Retrospective items. This section is template scaffolding.

- [ ] Reviewed commit messages for "TODO" and "FIXME" comments added during sprint.
- [ ] Reviewed PR comments for "out of scope" or "follow-up needed" discussions.
- [ ] Reviewed code for new TODO/FIXME markers (grep for them).
- [ ] Checked team chat/standup notes for deferred items.

| Cleanup Category    | Specific Item / Location                                                 | Priority | Justification for Cleanup                            |
| :------------------ | :----------------------------------------------------------------------- | :------: | :--------------------------------------------------- |
| **Sprint Closeout** | Process all Sprint Retrospective items per the Acceptance Criteria above |    P1    | The closeout must walk every accumulated retro item. |

## Cleanup Checklist

Closeout actions are enumerated in the Acceptance Criteria list above (archive cards, generate summary, update CHANGELOG, update roadmap, process retro items).

- [ ] Closeout actions tracked via the Acceptance Criteria list above.

## Validation & Closeout

### Pre-Completion Verification

| Verification Task                 | Status / Evidence                           |
| :-------------------------------- | :------------------------------------------ |
| **Retrospective items processed** | Per Acceptance Criteria above               |
| **Sprint summary generated**      | `generate_archive_summary`                  |
| **CHANGELOG updated**             | For user-visible changes this sprint        |
| **Roadmap updated**               | For completed stories (m1/s6 in-repo scope) |
| **Cards archived**                | `archive_cards`                             |

### Follow-up & Lessons Learned

| Topic                    | Status / Action Required                                                                                |
| :----------------------- | :------------------------------------------------------------------------------------------------------ |
| **External residuals**   | #289 Cloud import, #288 vscode/Cursor E2E, live-keyed agent E2E + npm publish remain out of this sprint |
| **Process Improvements** | Captured via Sprint Retrospective items above                                                           |

### Completion Checklist

> **Cite-affordance contract (sprint-closeout Gate 0):** when this card is the
> sprint-closeout chore, every ticked `[x]` box below MUST be annotated with a
> `<!-- cite: <kind>:<value> -->` HTML comment supplying primary-source
> evidence — `commit:<sha>`, `pr:<n>`, `ci:<run-url>`, `card:<id>`,
> `roadmap:<path>`, `retro:<anchor>`, or the explicit `none` marker for
> genuinely-N/A rows. Free-form ticks are rejected by Gate 0. See
> `gitban/contracts/sprint-closeout-gate0.md` for the contract spec, and
> `.claude/skills/sprint-closeout-reviewer/SKILL.md` §0a for the worked
> failure case (UIPOL7A `9padx1`). The `<!-- gate0: upper-checklist -->`
> anchor below marks the inspected region for the runtime parser.

<!-- gate0: upper-checklist -->

- [x] All P0 items are complete and verified. <!-- cite: none -->
- [x] All P1 items are complete or have follow-up tickets created. <!-- cite: card:5qz6zl, card:onwhhg, card:1yecdf, card:mjporx, card:pv4px0, card:sjwaox -->
- [x] P2 items are complete or explicitly deferred with tickets. <!-- cite: card:fkxnne -->
- [x] All tests are passing (unit, integration, and regression). <!-- cite: none -->
- [x] No new linter warnings or errors introduced. <!-- cite: none -->
- [x] All documentation updates are complete and reviewed. <!-- cite: commit:853205f, commit:ed13053 -->
- [ ] Code changes (if any) are reviewed and merged. <!-- cite: none — DELIBERATELY LEFT UNTICKED: no PR has been opened or merged yet. Per-card architectural reviews completed during dispatch (reviewer inbox logs for onwhhg/1yecdf/mjporx/pv4px0/sjwaox), but the sprint PR is a DRAFT opened by the dispatcher after this closeout, and merge is gated on user request. Ticking this would falsely claim a merge that has not happened. -->
- [x] Follow-up tickets are created and prioritized for next sprint. <!-- cite: card:fkxnne, card:ohoh63 -->
- [x] Team retrospective includes discussion of cleanup backlog (if significant). <!-- cite: retro:Sprint Retrospective -->
- [ ] All sprint cards archived via `archive_cards`. <!-- cite: none — DELIBERATELY LEFT UNTICKED: the dispatcher archives sprint cards AFTER Gate 0 passes; archival has not occurred yet (S6INREPO is absent from list_archive). The closeout agent does not archive. -->
- [ ] Sprint summary generated via `generate_archive_summary`. <!-- cite: none — DELIBERATELY LEFT UNTICKED: generate_archive_summary('S6INREPO') was attempted this closeout and returned SPRINT_NOT_FOUND because the sprint is not yet archived. Summary generation is unblocked once the dispatcher archives the cards after Gate 0. -->
- [x] `CHANGELOG.md` updated for any user-visible changes landed this sprint. <!-- cite: commit:ed13053 -->
- [ ] Roadmap (`m1/s6`) updated for stories this sprint completed. <!-- cite: roadmap:m1/s6 — DELIBERATELY LEFT UNTICKED: m1/s6 remains status=in_progress and is NOT flipped by this closeout. External residuals stay open (Cloud import #289, vscode-deepnote producer, live OpenAI E2E, npm publish), so the dispatcher owns the post-closeout roadmap re-scope, not the closeout agent. -->

---

### Item 1: Assert executeAgentBlock tool-wiring bindings (add_code_block / add_markdown_block execute)

The shipped tests for card 1yecdf (step 2B) invoke `executeAgentBlock` directly and assert the
`fullStream` part → `onAgentEvent` mapping, but the fake `ToolLoopAgent` replays pre-recorded
`tool-result` parts rather than invoking the registered tools' `execute` callbacks. The two real
agent tools are registered with `execute: context.addAndExecuteCodeBlock` (`add_code_block`) and
`context.addMarkdownBlock` (`add_markdown_block`) at agent-handler.ts:199,207, but the `makeContext`
`vi.fn` callbacks are never called, so nothing asserts the wiring: a swapped or dropped `execute`
binding (`add_code_block` accidentally wired to the markdown callback, or vice versa) would not be
caught. Close it by asserting on `captured.settings.tools` that
`add_code_block.execute === context.addAndExecuteCodeBlock` (and the markdown counterpart), or have
the fake invoke a registered tool's `execute` and assert the corresponding context callback fired.
The reviewer classified this as a non-blocking follow-up (outside card 1yecdf's stream→event-mapping
capstone). It does not block any downstream S6INREPO card — step 4 (sjwaox) is a version bump +
CHANGELOG that does not depend on this added assertion, and steps 3A/3B depend on step 2A, not 2B —
and it needs no external prerequisite (the registrations already exist), so it is captured here for
closeout triage rather than a sprint card.

| Deferral Type   | Description                                                                                                                              | Applies (true/false) |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| backlog         | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | true                 |
| sprint          | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag.                                            | false                |
| note-only       | Captured for record; no action; current output is fine as-is.                                                                            | false                |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment).       | false                |

**Source:** 1yecdf review 1
**Files touched:** packages/runtime-core/src/agent-handler.ts, packages/runtime-core/src/agent-handler.test.ts
**Action taken:** card `fkxnne` created in loose backlog (test, P2) — "Harden executeAgentBlock tool-wiring and MCP finally coverage". This is genuine non-blocking test-coverage hardening (assert `add_code_block.execute === context.addAndExecuteCodeBlock` and the markdown counterpart on `captured.settings.tools`). Tracked alongside Item 2 in the same card since both are assertion gaps in the same file (`agent-handler.test.ts`). Backlog rather than sprint: S6INREPO is closing and it blocks no remaining card; no external prerequisite (registrations already exist at agent-handler.ts:199,207).

- [x] Item 1 classified (exactly one deferral type marked `true` above)
- [x] Item 1 actioned (action taken matches chosen type)

### Item 2: Cover executeAgentBlock MCP lifecycle / close-error finally branch

`executeAgentBlock` merges and instantiates MCP clients (`mergeMcpConfigs` + `createMCPClient`,
agent-handler.ts:177-191) and closes them in a `finally` block with per-client error handling
(lines 247-256). `mergeMcpConfigs` is unit-tested in isolation, but the executor's MCP lifecycle and
close-error path _inside_ `executeAgentBlock` is unexercised — the new card-1yecdf tests all use
`mcpServers: []`, so neither the client-instantiation path nor the close-error `finally` branch is
ever entered. Add coverage that drives `executeAgentBlock` with a non-empty `mcpServers` config and
asserts the close-error branch behaves correctly (a client whose `.close()` rejects is caught
per-client and does not abort the others or the overall result). The reviewer classified this as a
non-blocking follow-up. It does not block any downstream S6INREPO card (step 4 is a version bump +
CHANGELOG independent of this branch; steps 3A/3B depend on step 2A) and needs no external
prerequisite (the MCP merge/close code already exists), so it is captured here for closeout triage
rather than a sprint card.

| Deferral Type   | Description                                                                                                                              | Applies (true/false) |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| backlog         | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | true                 |
| sprint          | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag.                                            | false                |
| note-only       | Captured for record; no action; current output is fine as-is.                                                                            | false                |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment).       | false                |

**Source:** 1yecdf review 1
**Files touched:** packages/runtime-core/src/agent-handler.ts, packages/runtime-core/src/agent-handler.test.ts
**Action taken:** card `fkxnne` created in loose backlog (test, P2) — same card as Item 1. Adds coverage that drives `executeAgentBlock` with a non-empty `mcpServers` config and asserts the close-error `finally` branch (agent-handler.ts:247-256) catches a rejecting `.close()` per-client without aborting other clients or the result. Backlog rather than sprint: S6INREPO is closing and it blocks no remaining card; no external prerequisite (the MCP merge/close code already exists).

- [x] Item 2 classified (exactly one deferral type marked `true` above)
- [x] Item 2 actioned (action taken matches chosen type)

### Item 3: Emit the ADR-001 bare-system-python hint on the CLI `deepnote run` consumer

ADR-001 requires every deepnote-run consumer to surface an actionable bare-system-python hint
("set `DEEPNOTE_PYTHON` or pass a venv with deepnote-toolkit[server]") when interpreter resolution
lands on bare `python`, detected via `isBareSystemPython` from `@deepnote/runtime-core`. The MCP
half of this obligation is already shipped: card `mjporx` (step 3A) added the hint at the
`deepnote_run` tool boundary as a `pythonHint` field on both call sites in
`packages/mcp/src/tools/execution.ts`, gated on `isBareSystemPython(spec) && no override` — that
portion is fully covered and is NOT what this item tracks. The genuinely-open residual is the CLI:
`packages/cli/src/commands/run.ts:296` resolves through `selectPythonSpec` (precedence convergence,
the scope of card `pv4px0`, which was deliberately precedence-only) but never calls
`isBareSystemPython` and emits no hint — `run.ts` imports `selectPythonSpec` but not
`isBareSystemPython`. Failure mode if never built: a user with no venv and no `DEEPNOTE_PYTHON`
running `deepnote run` still gets the opaque mid-run toolkit-import failure ADR-001 set out to
eliminate, even though the parallel MCP path now warns them. This is additive, in-repo work with no
external prerequisite (`isBareSystemPython` is already exported and the CLI already resolves the
spec at the same call site), and it does not block any remaining S6INREPO card: step 4 (`sjwaox`,
runtime-core version bump + CHANGELOG) and the closeout do not depend on the CLI emitting a hint.
Captured here for closeout triage — the closeout agent decides whether to promote it to a card
(this sprint or next) or defer, with full sprint context. Suggested shape if promoted: import
`isBareSystemPython`, compute the spec once, and when it is bare with no `--python`/`DEEPNOTE_PYTHON`
override, log the same actionable hint the MCP consumer returns (mirror the `mjporx` text for
cross-consumer parity); add a vitest precedence-style test asserting the hint fires only on bare
autodetect with no override.

| Deferral Type   | Description                                                                                                                              | Applies (true/false) |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| backlog         | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | true                 |
| sprint          | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag.                                            | false                |
| note-only       | Captured for record; no action; current output is fine as-is.                                                                            | false                |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment).       | false                |

**Source:** pv4px0 review 1
**Files touched:** packages/cli/src/commands/run.ts, packages/runtime-core/src/python-env.ts (isBareSystemPython consumer), packages/cli/src/commands/run.test.ts
**Action taken:** card `ohoh63` created in loose backlog (feature, P1) — "Emit ADR-001 bare-python hint on CLI deepnote run". Verified the residual is genuinely open against primary source: `packages/cli/src/commands/run.ts` imports `selectPythonSpec` (line 18) and resolves the spec at line 296 but does NOT import or call `isBareSystemPython`, so the CLI emits no bare-python hint — whereas the MCP half is shipped (`packages/mcp/src/tools/execution.ts:114` gates the hint on `isBareSystemPython(spec) && !hasOverride`). `isBareSystemPython` is already exported (`python-env.ts:162`), so this is additive in-repo work with no external prerequisite. Backlog rather than sprint: S6INREPO is closing and the closeout/step-4 do not depend on the CLI hint; promote to the next available sprint.

- [x] Item 3 classified (exactly one deferral type marked `true` above)
- [x] Item 3 actioned (action taken matches chosen type)

## BLOCKED

Auto-blocked by Gate 0: sprint closeout cannot proceed while the gate is FAILing. The closeout card is moved to blocked- to mirror the blocked work it depends on — the sprint is in a blocked state, and the closeout card's filename now reflects that.

**What blocked means for this closeout:** the sprint cannot close while any of the failures below stand. Each `blocked_card_in_sprint` failure means a work card in the sprint is itself in blocked- status — open it, address its ## BLOCKED section, then `unblock_card` and `complete_card` on that card. Each `missing_cite` / `contradicted_cite` / `external_state_contradiction` failure means the closeout body claims something the cite or external state contradicts — edit the closeout body to fix the claim or its evidence. When every failure is resolved, run the gate0 MCP tool again; on PASS, the closeout card is auto-unblocked back to in_progress.

Failures from this Gate 0 run:

- (contradicted_cite) All P0 items are complete and verified.
  unknown cite kind 'none (no P0 cards in S6INREPO; all six delivered cards are P1)' (allowed: commit, pr, ci, card, roadmap, retro, none)
- (contradicted_cite) All P1 items are complete or have follow-up tickets created.
  unknown cite kind 'onwhhg' (allowed: commit, pr, ci, card, roadmap, retro, none)
- (contradicted_cite) P2 items are complete or explicitly deferred with tickets.
  card cite 'fkxnne (no P2 sprint cards; deferred P2-class coverage hardening from retro Items 1&2 tracked in backlog ticket fkxnne)' is not a plausible card id
- (contradicted_cite) All tests are passing (unit, integration, and regression).
  unknown cite kind 'none (verified locally from repo root' (allowed: commit, pr, ci, card, roadmap, retro, none)
- (contradicted_cite) No new linter warnings or errors introduced.
  unknown cite kind 'none (biome check on all sprint-touched source files' (allowed: commit, pr, ci, card, roadmap, retro, none)
- (contradicted_cite) All documentation updates are complete and reviewed.
  commit cite '853205f (packages/mcp/README.md documents the bare-python hint) and commit:ed13053 (packages/runtime-core/CHANGELOG.md 0.4.0 documents agent-block helper exports)' is not a valid sha (7..40 hex chars)
- (contradicted_cite) Follow-up tickets are created and prioritized for next sprint.
  card cite 'fkxnne (P2 coverage hardening' is not a plausible card id
- (contradicted_cite) Team retrospective includes discussion of cleanup backlog (if significant).
  retro cite 'items-1-2-3 (all three Sprint Retrospective items processed via the four-type deferral grid this closeout; each classified backlog and actioned into a tracked ticket — fkxnne for Items 1&2' is not a plausible anchor/item id
- (contradicted_cite) `CHANGELOG.md` updated for any user-visible changes landed this sprint.
  commit cite 'ed13053 (packages/runtime-core/CHANGELOG.md bumped to 0.4.0 documenting agent-block helper exports). NOTE: this monorepo has NO root CHANGELOG.md (only per-package); none was fabricated. The MCP+CLI shared DEEPNOTE_PYTHON interpreter contract is user-documented in packages/mcp/README.md (commit:853205f) since the mcp/cli packages carry no CHANGELOG.' is not a valid sha (7..40 hex chars)
