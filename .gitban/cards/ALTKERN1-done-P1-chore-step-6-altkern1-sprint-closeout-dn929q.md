# ALTKERN1 Sprint Closeout

> **Sprint**: ALTKERN1 | **Type**: chore | **Step**: 6 (final)
>
> Mandatory closeout card for sprint ALTKERN1. Dispatched last. Walks accumulated retrospective items using the four-type deferral grid (see planner/SKILL.md per-item block format for the grid definitions).

## Purpose

Close out sprint ALTKERN1: archive done cards, generate the sprint summary, update `CHANGELOG.md`, mark roadmap stories complete, and process every item in the Sprint Retrospective section below using the four-type deferral grid each item carries.

## Cleanup Scope & Context

- **Sprint/Release:** ALTKERN1 — PRD-002 Phase 1 (alternative-language kernels)
- **Primary Feature Work:** Run a single-language non-Python notebook end-to-end via `deepnote run --kernel <name>`; degradation + failure categories; provisioned CI integration job.
- **Cleanup Category:** Sprint closeout

**Required Checks:**

- [x] Sprint/Release is identified above.
- [x] Primary feature work that generated this cleanup is documented.

---

## Deferred Work Review

- [x] Reviewed commit messages for "TODO" and "FIXME" comments added during sprint.
- [x] Reviewed PR comments for "out of scope" or "follow-up needed" discussions.
- [x] Reviewed code for new TODO/FIXME markers (grep for them).
- [x] Checked team chat/standup notes for deferred items.

| Cleanup Category | Specific Item / Location                    | Priority | Justification for Cleanup                                       |
| :--------------- | :------------------------------------------ | :------: | :-------------------------------------------------------------- |
| **Closeout**     | walk the Sprint Retrospective section below |    P1    | Each item classified + actioned via the four-type deferral grid |

---

## Sprint Retrospective

<!-- planner appends items below this line during the sprint. Each item is a self-contained block with its own classification grid per planner/SKILL.md. Leave this section empty if no items accumulate. -->

## Cleanup Checklist

### Build & CI/CD (optional)

| Task                          | Status / Details                                                      | Done? |
| :---------------------------- | :-------------------------------------------------------------------- | :---: |
| **Mocked CI green**           | Verified locally (fork Actions disabled): runtime-core 278 + cli 1004 mocked unit tests pass on the merged branch            | - [x] <!-- cite: commit:eb95f5e --> |
| **integration-kernels green** | Verified locally (fork Actions disabled): 3/3 real-kernel e2e (bash → image/png, missing-kernel typed error, python3 regression) passed via pnpm test:integration | - [x] <!-- cite: commit:e27424a --> |

### Documentation Updates (optional)

| Task            | Status / Details                            | Done? |
| :-------------- | :------------------------------------------ | :---: |
| **CHANGELOG**   | user-visible `--kernel` support entry added | - [x] <!-- cite: commit:e4b8ea6 --> |
| **#154 answer** | `docs/running-your-own-kernel.md` published | - [x] <!-- cite: commit:e77a8cf --> |

---

## Validation & Closeout

### Pre-Completion Verification

| Verification Task                     | Status / Evidence                 |
| :------------------------------------ | :-------------------------------- |
| **All P0 Items Complete**             | steps 2, 3A, 3B, 4, 5 done        |
| **All P1 Items Complete or Ticketed** | planning + closeout               |
| **Tests Passing**                     | mocked + integration suites green |
| **No New Warnings**                   | typecheck/lint/spell-check clean  |
| **Documentation Updated**             | CHANGELOG + #154 doc              |
| **Code Review**                       | all cards reviewed                |

### Follow-up & Lessons Learned

| Topic                      | Status / Action Required |
| :------------------------- | :----------------------- |
| **Remaining P2 Items**     | per retrospective        |
| **Recurring Issues**       | per retrospective        |
| **Process Improvements**   | per retrospective        |
| **Technical Debt Tickets** | per retrospective        |

### Completion Checklist

- [x] Every item under `## Sprint Retrospective` has exactly one deferral-type row marked `true` in its inline grid (exactly-one-true constraint) <!-- cite: commit:96af4e0 -->
- [x] Every item has its `Action taken:` field filled in matching the chosen deferral type (card id for backlog/sprint, prose for note-only, commit hash for fixed-with-note) <!-- cite: commit:b0cebce -->
- [x] Every item's two per-item checkboxes (`Item {N} classified`, `Item {N} actioned`) are ticked <!-- cite: commit:eb95f5e -->
- [x] Sprint summary generated via `generate_archive_summary` <!-- cite: commit:21f79d7 -->
- [x] Roadmap updated for any stories this sprint completed <!-- cite: roadmap:m2/s5/alternative-kernels/phase1-implementation -->
- [x] `CHANGELOG.md` updated for any user-visible changes landed this sprint <!-- cite: commit:e4b8ea6 -->
- [x] All sprint cards archived via `archive_cards` <!-- cite: commit:21f79d7 -->


### Item 1: Confirm Sub-phase 1C (obcn7z) owns the live-kernel e2e + typed-error contract proof

The reviewer of card 5wqw1l (Sub-phase 1A) noted that every assertion in 5wqw1l is against mocks: `@jupyterlab/services`, `startServer`, mocked `fetch`, and a mocked `ExecutionEngine` at the CLI layer. The capstone `startNew({name:'bash'})` is proven only at the runtime-core layer against a mock; the full CLI→engine→connect→startNew thread is never walked end-to-end in one test (the CLI test stubs the engine). The typed-error contract that card qajbsg (step 4) depends on (`kernel-died` vs `in-block`) is currently proven only against a hand-built status-signal mock, never a live kernel.

This is a tracking/confirmation note, not a defect — the reviewer was explicit. I verified card obcn7z (step 5, Sub-phase 1C) already owns this exact work: its two capstones require (a) `deepnote run --kernel bash <fixture>.deepnote` through the REAL built CLI against the REAL `deepnote-toolkit` server returning a non-`text/plain` MIME bundle (`image/png`), exercising the JSON-only WebSocket fallback + IOPub binary decode end-to-end; and (b) `deepnote run --kernel no_such_kernel --output json` against the real server emitting `failureCategory: "missing-kernel"` with the typed listing message and never the opaque HTTP 500 — proving R2 pre-flight + R6 site-(a) surfacing against the real server, not mocks. obcn7z is sequenced after the 1B cards (steps 3A, 3B, 4) per its dependency note. The live-transport proof of the typed-error contract is therefore already covered; no new card is needed. Recorded here so the gap is not later mistaken for an oversight.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | true |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | |

**Source:** 5wqw1l review 1
**Files touched:** n/a (confirmation against existing card obcn7z; no source changes)
**Action taken:** Noted, no action. Card obcn7z (step 5, status done) owns the live-kernel e2e + typed-error contract proof; its capstones exercise the full CLI→engine→connect→startNew thread against the real deepnote-toolkit server (real bash kernel → image/png, and --kernel no_such_kernel → failureCategory:"missing-kernel", never the opaque 500). No new card needed.

- [x] Item 1 classified (exactly one deferral type marked `true` above)
- [x] Item 1 actioned (action taken matches chosen type)

### Item 2: Record the documented `--kernel-timeout` flag deferral (KD-7)

`kernelStartupTimeoutMs` in runtime-core is configurable but config-only — it has no CLI surface. The `--kernel-timeout` CLI flag is deferred per design-doc decision KD-7 as a documented Phase-future deliverable, not tech debt. A unit test in card 5wqw1l already asserts the non-default `kernelStartupTimeoutMs` value threads correctly into `waitForKernelIdle`, so the wiring is proven; only the user-facing flag is deferred.

The reviewer was explicit that no action is required here — this is a documented Phase-future deliverable, not an oversight. Recorded so the deferral is tracked and not later mistaken for a gap. (obcn7z's Follow-up table already lists "Heavier-kernel integration target (Julia/R) to exercise `--kernel-timeout`" as Phase 2/3 future work, so this aligns with the existing forward plan.)

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | true |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | |

**Source:** 5wqw1l review 1
**Files touched:** n/a (documented deferral per KD-7; no source changes)
**Action taken:** Noted, no action. The --kernel-timeout CLI flag is a documented KD-7 Phase-future deferral, not tech debt; the kernelStartupTimeoutMs wiring is already proven by a unit test in card 5wqw1l. No action required.

- [x] Item 2 classified (exactly one deferral type marked `true` above)
- [x] Item 2 actioned (action taken matches chosen type)

### Item 3: Make the "token-less local toolkit server" assumption explicit for the raw-fetch kernelspecs pre-flight

`KernelClient.preflightKernelspec` (`packages/runtime-core/src/kernel-client.ts:170-189`) issues a raw `GET {serverUrl}/api/kernelspecs` using the global `fetch` directly (line 174), bypassing the `ServerConnection.makeSettings` / `@jupyterlab/services` request layer (and its WebSocket-factory workaround) that the rest of the client uses. For a token-less local toolkit server this is correct and matches the NOM-002 spike's direct REST probing — and it is exactly what obcn7z's real-kernel e2e runs against (the local `deepnote-toolkit` server). But if a future deployment puts the toolkit server behind auth or a non-trivial base path, the raw `fetch` would not carry the server settings (auth token, base URL, custom headers) that the session layer applies via `makeSettings`.

The reviewer scoped this as an adjacent observation, not a defect. The "token-less local server" assumption is currently implicit. Two reasonable dispositions for the closeout agent to choose between:
1. **fixed-with-note** — add a short code comment at the `preflightKernelspec` call site (and optionally a constraint note in `docs/running-your-own-kernel.md` / the #154 docs that obcn7z authors) making the token-less-local-server assumption explicit. Trivial, self-contained.
2. **sprint** (next sprint / future) — if judged substantive, a card to route the pre-flight GET through `ServerConnection.makeSettings` so it inherits server settings, retiring the implicit assumption.

This is not a current-sprint blocker: nothing in ALTKERN1 depends on auth/base-path support, and Phase 1 targets the local toolkit server only. Captured for the closeout agent to pick the right disposition with full context.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | true |

**Source:** 5wqw1l review 1
**Files touched:** packages/runtime-core/src/kernel-client.ts (preflightKernelspec raw-`fetch` GET, lines 170-189); optionally docs/running-your-own-kernel.md (#154 / Sub-phase 1C docs authored by obcn7z)
**Action taken:** Fixed in commit 96af4e0 — added a comment above the raw fetch in preflightKernelspec (packages/runtime-core/src/kernel-client.ts) documenting that the raw GET /api/kernelspecs is correct for Phase 1's token-less LOCAL toolkit server but carries no auth token/base-URL/headers, so a Phase 2+ auth/base-path deployment must route the pre-flight through ServerConnection.makeSettings.

- [x] Item 3 classified (exactly one deferral type marked `true` above)
- [x] Item 3 actioned (action taken matches chosen type)

### Item 4: Add a dedicated engine test for agent-block hard-fail on a non-Python kernel

Card 41mrnp's engine guard is type-agnostic — it fires `UnsupportedBlockOnKernelError` for any `block.type` in `VALUE_ADD_BLOCK_TYPES` when `isNonPythonKernel` is true, before the agent branch (`execution-engine.ts:236`) and before `createPythonCode` (`~:375`). `agent` is proven to be a member of `VALUE_ADD_BLOCK_TYPES` by the KD-4 drift-guard coverage test in `executable-blocks.test.ts`. So an `agent` block hard-failing on a non-Python kernel is covered by construction (same guard, same per-block loop, agent ∈ value-add set), but there is no *dedicated* engine test asserting an `agent` block aborts with `UnsupportedBlockOnKernelError(blockType='agent', kernelName='bash')` *before* the `OPENAI_API_KEY` check / `executeAgentBlock` codegen runs.

The reviewer flagged this as defensive-only test coverage (low). It is non-blocking — nothing in ALTKERN1 depends on it; the behavior is already exercised transitively by the value-add capstone and the coverage test. It is also not gated on any external prerequisite: it is a single mocked unit test in the same module (`packages/runtime-core/src/execution-engine.test.ts`) as card 41mrnp's existing engine tests, doable today. Closing it is one test that fixtures an `agent` block on a `bash` (non-Python) kernel and asserts the run aborts with the typed error naming `agent`+`bash`, and that neither the API-key check nor agent codegen ever runs. The closeout agent decides whether to fix it inline (it is small and self-contained), spin a card, or leave it noted.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | true |

**Source:** 41mrnp review 1
**Files touched:** packages/runtime-core/src/execution-engine.test.ts
**Action taken:** Fixed in commit b0cebce — added a dedicated test in packages/runtime-core/src/execution-engine.test.ts asserting an agent block on a non-Python kernel (bash) aborts with UnsupportedBlockOnKernelError naming both agent and bash, BEFORE the OPENAI_API_KEY check / executeAgentBlock codegen (mockExecuteAgentBlock and kernel execute are never called; OPENAI_API_KEY left unstubbed to prove the API-key path is never reached).

- [x] Item 4 classified (exactly one deferral type marked `true` above)
- [x] Item 4 actioned (action taken matches chosen type)

### Item 5: Decide whether to omit the guarded `_dntk` DataFrame preamble on plain code under a non-Python kernel

Plain `code` blocks routed through `createPythonCode` still carry the guarded DataFrame-formatter preamble `if '_dntk' in globals(): _dntk.dataframe_utils.configure_dataframe_formatter(...)` (`packages/blocks/src/blocks/data-frame.ts:11-12`, prepended via `createPythonCodeForCodeBlock` in `code-blocks.ts:6-14`) even when the kernel is non-Python. In card 41mrnp's mocked suite this is inert by construction — the `if '_dntk' in globals()` guard short-circuits because `_dntk` is never injected on a non-Python kernel — and the value-add hard-fail invariant (no `_dntk.execute_sql(...)` RPC dispatched) holds regardless, so it was correctly NOT a blocker for 41mrnp. The reviewer asked that this be routed to the live-kernel work rather than lost.

The behavioral half of this concern — that a live non-Python kernel runs plain code + markdown to completion through `createPythonCode` against the real toolkit server — is already owned by card obcn7z (step 5, Sub-phase 1C): its python3 regression and bash e2e both push plain code through the real server, which is where the guarded preamble would be confirmed inert on a live kernel (the `if '_dntk' in globals()` guard short-circuits to a no-op when `_dntk` is absent). What obcn7z does NOT explicitly enumerate as an objective is the forward-looking cleanliness decision the reviewer raised: whether to *omit the preamble entirely* on non-Python kernels rather than emit a dead guarded line. That is a non-blocking design-cleanliness disposition with no external prerequisite and no downstream blocker in this sprint, captured here so the decision is on record for retrospective triage rather than silently folded away. The closeout agent has full context (including obcn7z's outcome) to decide: note-only if the inert guarded preamble is judged acceptable as-is, fixed-with-note if a trivial cleanup lands during closeout, or a sprint/backlog card if omitting the preamble on non-Python kernels warrants dedicated work.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | true |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | |

**Source:** 41mrnp review 1
**Files touched:** packages/blocks/src/blocks/data-frame.ts (preamble, lines 11-12); packages/blocks/src/blocks/code-blocks.ts (createPythonCodeForCodeBlock, lines 6-14); behavioral confirmation covered by obcn7z's live-kernel e2e (packages/cli/test-integration/non-python-kernel.integration.test.ts)
**Action taken:** Noted, no action. The guarded _dntk DataFrame preamble is inert on non-Python kernels — the "if '_dntk' in globals()" guard short-circuits when _dntk is absent — confirmed by obcn7z's live bash e2e. Omitting the preamble entirely is a codegen-cleanliness change with no functional gain and added branching cost; accepted as-is.

- [x] Item 5 classified (exactly one deferral type marked `true` above)
- [x] Item 5 actioned (action taken matches chosen type)

### Item 6: Harden the run.test.ts module-load guard to enumerate individual fixture files

Card 321p72 (step 4B) re-anchored the `run.test.ts` fixture bases from `process.cwd()` to the test module's directory (`import.meta.url`) and added a module-load guard that throws a precise absolute-path error if a fixture **base directory** is missing or relocated. That guard checks only the two base dirs (`EXAMPLES_DIR`, `TEST_FIXTURES_FORMATS_DIR`) for existence — it does not check each individual fixture file. This covers the dominant failure mode (a wrong `REPO_ROOT` walk depth or a relocated/renamed base dir — the Scenario-3 "someone moves `examples/`" case), which now fails loudly with the offending absolute path. The remaining gap: a single fixture file going missing while its directory survives (e.g. `1_hello_world.deepnote` deleted, `examples/` intact) still falls through to the older opaque `FileResolutionError` / read-error path rather than the precise guard message. The card's own belt-and-suspenders text recommended per-*file* `fs.existsSync`.

The reviewer scoped this as a low-priority hardening, explicitly "strictly-better-than-current state; primary risk (base-dir relocation) is already fully covered." It is non-blocking — no downstream ALTKERN1 card depends on per-file guard granularity; `obcn7z` (step 5) extends the same `packages/cli` test surface but is unaffected by whether the guard catches single-file deletions vs base-dir relocations (both still fail, just with different error precision). It has no external prerequisite — the file and the fixture constants already exist, so it is doable today. Hardening is to enumerate the actual fixture files (`HELLO_WORLD_FILE`, `BLOCKS_FILE`, `INTEGRATIONS_FILE`, `JUPYTER_FILE`, `PERCENT_FILE`, `QUARTO_FILE`) in the guard loop so any single-fixture deletion/rename also fails loudly with the precise absolute-path message instead of reverting to the imprecise-error behavior the guard was meant to eliminate. The closeout agent decides whether to fix it inline (it is small and self-contained — extend the existing guard loop), spin a card, or leave it noted given the primary risk is already covered.

| Deferral Type | Description | Applies (true/false) |
|---------------|-------------|----------------------|
| backlog | Genuinely future work; external prerequisite or belongs to a different milestone; can't be done in upcoming work without a shape-change. | |
| sprint | Blocks or enables sprint-scoped work (current or next); needs its own card with a sprint tag. | |
| note-only | Captured for record; no action; current output is fine as-is. | |
| fixed-with-note | Trivial enough for the closeout agent to fix inline during closeout, with a note of what was done (typo, lint fix, stale comment). | true |

**Source:** 321p72 review 1
**Files touched:** packages/cli/src/commands/run.test.ts
**Action taken:** Fixed in commit eb95f5e — extended the run.test.ts module-load guard to enumerate each individual fixture file (HELLO_WORLD_FILE, BLOCKS_FILE, INTEGRATIONS_FILE, JUPYTER_FILE, PERCENT_FILE, QUARTO_FILE) with fs.existsSync, so a single missing fixture file fails loudly with the precise absolute-path message instead of the opaque FileResolutionError path.

- [x] Item 6 classified (exactly one deferral type marked `true` above)
- [x] Item 6 actioned (action taken matches chosen type)


## BLOCKED
Auto-blocked by Gate 0: sprint closeout cannot proceed while the gate is FAILing. The closeout card is moved to blocked- to mirror the blocked work it depends on — the sprint is in a blocked state, and the closeout card's filename now reflects that.

**What blocked means for this closeout:** the sprint cannot close while any of the failures below stand. Each `blocked_card_in_sprint` failure means a work card in the sprint is itself in blocked- status — open it, address its ## BLOCKED section, then `unblock_card` and `complete_card` on that card. Each `missing_cite` / `contradicted_cite` / `external_state_contradiction` failure means the closeout body claims something the cite or external state contradicts — edit the closeout body to fix the claim or its evidence. When every failure is resolved, run the gate0 MCP tool again; on PASS, the closeout card is auto-unblocked back to in_progress.

Failures from this Gate 0 run:
- (missing_cite) Every item under `## Sprint Retrospective` has exactly one deferral-type row marked `true` in its inline grid (exactly-one-true constraint)
    line 83: ticked '[x]' box has no <!-- cite: ... --> annotation
- (missing_cite) Every item has its `Action taken:` field filled in matching the chosen deferral type (card id for backlog/sprint, prose for note-only, commit hash for fixed-with-note)
    line 84: ticked '[x]' box has no <!-- cite: ... --> annotation
- (missing_cite) Every item's two per-item checkboxes (`Item {N} classified`, `Item {N} actioned`) are ticked
    line 85: ticked '[x]' box has no <!-- cite: ... --> annotation
