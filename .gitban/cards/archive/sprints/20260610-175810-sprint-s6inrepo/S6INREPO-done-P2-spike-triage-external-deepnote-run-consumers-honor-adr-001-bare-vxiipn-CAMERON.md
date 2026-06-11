# Triage external deepnote-run consumers honor ADR-001 bare-python hint

## Spike Overview

- **Investigation Question:** Do the external (out-of-repo) `deepnote-run` producers/consumers — primarily the `vscode-deepnote` producer — honor the ADR-001 bare-system-python hint obligation, or do they leave users with the opaque mid-run toolkit-import failure that ADR-001 set out to eliminate?
- **Problem/Opportunity:** ADR-001 requires every `deepnote-run` consumer to surface an actionable bare-system-python hint ("set `DEEPNOTE_PYTHON` or pass a venv with deepnote-toolkit[server]") when interpreter resolution lands on bare `python`, detected via `isBareSystemPython` from `@deepnote/runtime-core`. The two in-repo consumers now satisfy this: the MCP `deepnote_run` tool (card `mjporx`, `packages/mcp/src/tools/execution.ts`) and the CLI `deepnote run` command (card `ohoh63`, `packages/cli/src/commands/run.ts`). Card `ohoh63`'s own "Further Investigation" note asks whether external producers/consumers (e.g. `vscode-deepnote`) honor the same obligation. ADR-001 explicitly scopes the producer as out-of-repo and unverifiable from this repository, so no code or test can be written here to satisfy it — this is a discovery/triage item requiring access to a component outside this tree.
- **Time Box:** 0.5 day (discovery/triage only — no implementation in this repo)
- **Success Criteria:** A written finding answering whether `vscode-deepnote` (and any other external `deepnote-run` consumer) emits the ADR-001 bare-python hint, with a clear recommendation: either (a) confirm parity and note-only, or (b) file an issue/card against the external component's own repo. No in-repo code change is expected from this spike.
- **Priority:** P2 — Nice to know; the in-repo parity story is already complete and this targets an out-of-tree component.
- **Related Work:** Follow-up from card `ohoh63` review 1 (S6INREPO). ADR-001 (shared interpreter contract). In-repo precedents: `mjporx` (MCP hint), `ohoh63` (CLI hint), `pv4px0` (CLI selector convergence).

**Required Checks:**

- [x] **Investigation question** is specific and answerable.
- [x] **Time box** is defined (prevents endless investigation).
- [x] **Success criteria** clearly defines what "done" looks like.

---

## Context & Background Research

Before diving into investigation, review existing knowledge, related work, and available documentation.

- [x] Existing documentation reviewed (internal docs, ADRs, wiki).
- [x] Related tickets/issues reviewed (past spikes, bug reports, feature requests).
- [x] Similar systems/implementations reviewed (other teams, open source projects).
- [x] Team knowledge consulted (asked team members with relevant experience).
- [x] External research reviewed (blog posts, papers, vendor docs if applicable).

Use the table below to document background research findings. Add rows as needed.

| Source Type           | Link / Location                                                                                   | Key Findings / Relevant Context                                                                                                                                                                                                                                                                                                                                                                      |
| :-------------------- | :------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Internal Docs**     | ADR-001 (shared interpreter contract); `packages/mcp/README.md:144-147`                           | ADR-001 scopes the `deepnote-run` producer as out-of-repo and unverifiable from this tree; MCP README documents the in-repo hint shape.                                                                                                                                                                                                                                                              |
| **Past Tickets**      | `mjporx` (MCP hint), `ohoh63` (CLI hint), `pv4px0` (CLI selector)                                 | In-repo consumers now emit the hint gated on `isBareSystemPython(spec) && no override`.                                                                                                                                                                                                                                                                                                              |
| **Similar Systems**   | `vscode-deepnote` producer (external repo)                                                        | Primary external consumer to triage; not present in this tree.                                                                                                                                                                                                                                                                                                                                       |
| **Team Knowledge**    | `deepnote/vscode-deepnote` (public repo; owned by Deepnote)                                       | Repo is now PUBLIC and readable. Cloned at HEAD `923ec53` (2026-06-10) for inspection. No owner contact needed — read access sufficient.                                                                                                                                                                                                                                                             |
| **External Research** | `deepnote/vscode-deepnote` @ `923ec53`; `@deepnote/runtime-core` `startServer`/`selectPythonSpec` | Extension resolves and manages its own venv, then passes it to `startServer({ pythonEnv })` as an explicit path. `startServer` resolves `pythonEnv` directly via `resolvePythonExecutable` — it does NOT consult `DEEPNOTE_PYTHON` (only `selectPythonSpec`, used by the in-repo CLI/MCP, applies the `DEEPNOTE_PYTHON` precedence). `DEEPNOTE_PYTHON` appears zero times in vscode-deepnote `src/`. |

---

## Initial Hypotheses & Questions

> Use this space to brainstorm initial hypotheses, key questions to answer, potential approaches, and known unknowns before investigation begins.

**Initial Hypotheses:**

- Hypothesis: The external `vscode-deepnote` producer does NOT yet emit the ADR-001 bare-python hint, because the obligation was added to `@deepnote/runtime-core` (`isBareSystemPython`) during this milestone and external consumers may not have adopted it.
- Hypothesis: If a hint is needed, the fix belongs in the external repo, not this one.

**Key Questions to Answer:**

- Question: Does `vscode-deepnote` resolve interpreters through `@deepnote/runtime-core`'s shared selector / `isBareSystemPython`, or via its own path?
- Question: Are there other external `deepnote-run` consumers beyond `vscode-deepnote`?
- Question: Is the right disposition a note-only acknowledgement, or an issue/card filed against the external repo?

**Potential Approaches to Explore:**

- Approach 1: Inspect the external repo (if/when access is granted) for `isBareSystemPython` usage and hint emission.
- Approach 2: Contact the external repo owner to confirm whether the obligation is tracked there.

**Known Unknowns:**

- Unknown: Whether this account/clone has read access to the external `vscode-deepnote` repo at all.
- Unknown: The full list of external `deepnote-run` consumers.

**Investigation Constraints:**

- Constraint: The external component does not exist in this tree and cannot be verified or modified from this sprint — this is why the item is BLOCKED on access to an out-of-repo component.
- Constraint: No in-repo code change is expected from this spike.

---

## Investigation Log

| Iteration # | Hypothesis / Goal                                                                             | Test/Action Taken                                                                                                                                                                           | Outcome / Findings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| :---------: | :-------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    **1**    | Confirm access to the external `vscode-deepnote` repo                                         | `gh repo clone deepnote/vscode-deepnote` (public). Cloned @ `923ec53`.                                                                                                                      | ACCESS CONFIRMED. Repo is public and readable; blocker resolved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
|    **2**    | Determine whether the external consumer sets `DEEPNOTE_PYTHON` when spawning the server / CLI | Located spawn sites; grepped `DEEPNOTE_PYTHON`, `startServer`, `pythonEnv`, `runtime-core` across `src/`.                                                                                   | `DEEPNOTE_PYTHON` set NOWHERE (0 hits in `src/`). The extension does not use the env-var contract — it uses the explicit-arg tier instead (see Iteration 3).                                                                                                                                                                                                                                                                                                                                                                                   |
|    **3**    | Determine WHY no `DEEPNOTE_PYTHON`, and whether the ADR-001 hint is even reachable            | Read `deepnoteServerStarter.node.ts`, `deepnoteToolkitInstaller.node.ts`, `deepnoteAgentSkillsManager.node.ts`; cross-referenced `@deepnote/runtime-core` `startServer`/`selectPythonSpec`. | Extension creates/manages its own venv (seeded from a user-selected base interpreter), installs `deepnote-toolkit[server]` into it, and passes that **explicit venv path** as `startServer({ pythonEnv })`. That is the `explicit` (highest-precedence) tier of the ADR-001 chain — it pre-empts both `DEEPNOTE_PYTHON` and the bare-`python` fallback. The interpreter is never bare `python`, so `isBareSystemPython` is structurally never true and the hint is unreachable by construction. Conclusion: PARITY-BY-CONSTRUCTION, not a gap. |

---

#### Iteration 1: Confirm access to the external component

**Hypothesis/Goal:** Goal: Determine whether this clone has read access to the external `vscode-deepnote` repo (the BLOCKED prerequisite for this spike).

**Test/Action Taken:** `gh repo clone deepnote/vscode-deepnote` (shallow). Confirmed the repo is a PUBLIC GitHub repo.

**Outcome:** ACCESS CONFIRMED. Cloned at HEAD `923ec53` (commit date 2026-06-10). Blocker resolved. `vscode-deepnote` is a fork of the VS Code Python extension (`pvsc`) with Deepnote kernel/server integration layered under `src/kernels/deepnote/`.

---

#### Iteration 2: Verify hint emission in the external consumer

**Hypothesis/Goal:** Question (re-scoped per dispatch context): Does the `vscode-deepnote` extension set the `DEEPNOTE_PYTHON` env var (the user-selected interpreter) when it spawns the deepnote MCP server and/or CLI?

**Test/Action Taken:** Located every Deepnote process-spawn site and read it:

- Server spawn: `src/kernels/deepnote/deepnoteServerStarter.node.ts:271-276` — calls `startServer({ pythonEnv: venvPath.fsPath, workingDirectory, startupTimeoutMs, env: extraEnv })` from `@deepnote/runtime-core`. `extraEnv` is built by `gatherSqlIntegrationEnvVars()` (`:368-398`) and contains ONLY SQL-integration env vars — never `DEEPNOTE_PYTHON`.
- CLI spawn: `src/kernels/deepnote/deepnoteAgentSkillsManager.node.ts:84-92` — runs the venv's `bin/deepnote install-skills` by absolute path (and `python -m pip install --upgrade deepnote-cli` at `:72-78`). No `DEEPNOTE_PYTHON` in env; the interpreter is addressed by absolute path, not via the env-var contract.
- Grep: `grep -rc DEEPNOTE_PYTHON src/` → 0 occurrences across the whole extension source.
- The extension does NOT spawn the deepnote **MCP** server at all — it spawns the deepnote-toolkit **Jupyter** server (`python -m deepnote_toolkit server`, via runtime-core `startServer`) and the `deepnote` **CLI** (`install-skills`). The MCP `deepnote_run` tool (card `mjporx`) is a separate in-repo consumer, not invoked by this extension.

**Outcome:** NO — the extension does not set `DEEPNOTE_PYTHON`. Evidence: it is absent from all three spawn sites above and from the entire `src/` tree.

---

#### Iteration 3: Why no DEEPNOTE_PYTHON — and is the ADR-001 hint even reachable?

**Hypothesis/Goal:** Goal: A bare "it doesn't set `DEEPNOTE_PYTHON`" finding is only actionable if the ADR-001 bare-python hint is reachable in this extension. Determine which ADR-001 precedence tier the extension actually uses, and whether `isBareSystemPython` can ever be true for the interpreter it passes.

**Test/Action Taken:** Read the interpreter-resolution path end to end and cross-referenced the runtime-core contract:

- `deepnoteToolkitInstaller.node.ts:84-130` (`ensureVenvAndToolkit` / `getVenvInterpreterByPath`): the extension creates and manages its OWN venv at `globalStorage/deepnote-venvs/<hash>-<toolkitVersion>`, seeded from a user-selected base interpreter, and installs `deepnote-toolkit[server]==<version>` into it. It resolves the venv's interpreter with `resolvePythonExecutable(venvPath)`.
- `deepnoteServerStarter.node.ts:246-276`: that managed **venv path** is what gets passed as `startServer({ pythonEnv })`.
- runtime-core contract (`packages/runtime-core/src/python-env.ts:160-161`, `server-starter.ts:33-58`): the ADR-001 precedence chain `selectPythonSpec` = `explicit > DEEPNOTE_PYTHON > autodetect`. `startServer` does NOT call `selectPythonSpec` — it takes `pythonEnv` directly and runs `resolvePythonExecutable` on it. The `DEEPNOTE_PYTHON` env tier exists specifically for hosts that DON'T pass an explicit interpreter (e.g. the in-repo CLI/MCP when given no `--python`).

**Outcome:** PARITY-BY-CONSTRUCTION. The extension supplies the interpreter via the `explicit` (highest) tier of the ADR-001 chain — an absolute, managed venv path that always contains `deepnote-toolkit[server]`. `DEEPNOTE_PYTHON` is therefore redundant for it (a lower-precedence tier it has already pre-empted), and `isBareSystemPython(pythonEnv)` is structurally never true, so the opaque bare-`python` mid-run import failure that ADR-001 set out to eliminate cannot occur here. The hint is unreachable not because of a gap, but because the extension never lands on the bare-python branch the hint guards.

_(Copy and paste the 'Iteration N' block above for each subsequent investigation cycle.)_

---

## Spike Findings & Recommendation

| Task                   | Detail/Link                                  |
| :--------------------- | :------------------------------------------- |
| **PoC Code**           | n/a (discovery/triage only, no in-repo code) |
| **Test Results**       | n/a                                          |
| **Recommendation Doc** | This card's Final Synthesis section below    |
| **Presentation/Demo**  | n/a                                          |

### Final Synthesis & Recommendation

#### Summary of Findings

**Question:** Does the external `deepnote-run` producer — the `vscode-deepnote` extension (VS Code / Cursor / Windsurf) — honor the ADR-001 `DEEPNOTE_PYTHON` contract, i.e. does it set the `DEEPNOTE_PYTHON` env var (the user-selected interpreter) when it spawns the deepnote server / CLI?

**Answer: NO — and it does not need to. PARITY-BY-CONSTRUCTION.**

Investigated `deepnote/vscode-deepnote` @ `923ec53` (public repo, cloned 2026-06-10).

- `DEEPNOTE_PYTHON` is set **nowhere** in the extension (`grep -rc DEEPNOTE_PYTHON src/` → 0).
- Server spawn site: `src/kernels/deepnote/deepnoteServerStarter.node.ts:271-276` — `startServer({ pythonEnv: venvPath.fsPath, env: extraEnv })`. `extraEnv` (`gatherSqlIntegrationEnvVars`, `:368-398`) carries SQL-integration vars only.
- CLI spawn site: `src/kernels/deepnote/deepnoteAgentSkillsManager.node.ts:84-92` — runs the venv's `bin/deepnote install-skills` by absolute path; no `DEEPNOTE_PYTHON`.
- The extension does NOT spawn the in-repo deepnote **MCP** server; it spawns the deepnote-toolkit **Jupyter** server via runtime-core `startServer`, plus the `deepnote` CLI for skills.
- Root cause of "no env var": the extension uses the **`explicit`** (highest-precedence) tier of the ADR-001 chain instead. It creates/manages its own venv (`globalStorage/deepnote-venvs/<hash>-<toolkitVersion>`), installs `deepnote-toolkit[server]` into it, and passes that absolute venv path as `pythonEnv` (`deepnoteToolkitInstaller.node.ts:84-130` → `deepnoteServerStarter.node.ts:246-276`). `startServer` resolves `pythonEnv` directly (`@deepnote/runtime-core` `server-starter.ts:33-58`) and never consults `selectPythonSpec`/`DEEPNOTE_PYTHON`. Because the interpreter is always an explicit managed-venv path, `isBareSystemPython` is never true and the bare-`python` import-failure the ADR-001 hint guards is structurally unreachable.

So the absence of `DEEPNOTE_PYTHON` is correct, not a defect: the env var is the contract for hosts that _don't_ pass an interpreter; this host always does, via a higher-precedence tier that already guarantees a toolkit-bearing interpreter.

#### Recommendation

**(a) Confirm parity → NOTE-ONLY. No issue/PR against `vscode-deepnote` is warranted, and no in-repo change.**

- The original `ohoh63` follow-up worry — that an external consumer would leave users with the opaque mid-run toolkit-import failure — does NOT apply to `vscode-deepnote`: it pre-installs `deepnote-toolkit[server]` into the managed venv it points the server at, so the failure mode cannot arise.
- Filing a "please set `DEEPNOTE_PYTHON`" issue would be actively wrong: setting it would be redundant (lower-precedence tier already pre-empted) and could only matter if the extension stopped passing an explicit `pythonEnv` — which is not how it works.
- Residual nuance (NOT blocking, NOT this card's scope): the ADR-001 `DEEPNOTE_PYTHON` env contract has, as of `923ec53`, **zero external adopters** among the spawn paths reviewed — the only known external producer satisfies the goal structurally rather than via the env var. If a future host wants to delegate interpreter choice to runtime-core's autodetect/selector path (no explicit `pythonEnv`), that is the case where it would need to publish `DEEPNOTE_PYTHON`; worth a sentence in ADR-001's "known consumers" notes if/when such a host appears, but there is nothing to action today.

#### Alternative Approaches Considered

- **File an issue/PR against `vscode-deepnote` to set `DEEPNOTE_PYTHON`.** Rejected: redundant and semantically wrong (see Recommendation). The extension already satisfies ADR-001's intent via the explicit tier.
- **Duplicate / add hint logic in this repo.** Rejected: out of scope per ADR-001 (the producer is out-of-repo) and there is no gap to cover — the in-repo CLI/MCP hint parity (`mjporx`, `ohoh63`) already handles the in-repo consumers, and the one external consumer is parity-by-construction.
- **Leave the question open pending owner confirmation.** Rejected: the public source is authoritative and self-evident at `923ec53`; no owner round-trip is needed to answer the spawn-env question.

### Follow-up & Lessons Learned

| Topic                             | Status / Action Required                                                                                                                                                                                                                                                                                                                           |
| :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Implementation Card Created?**  | None. No in-repo card and no external `vscode-deepnote` issue/PR — parity-by-construction (recommendation (a), note-only).                                                                                                                                                                                                                         |
| **Further Investigation Needed?** | No. `vscode-deepnote` @ `923ec53` is the only known external `deepnote-run`/server consumer and it satisfies ADR-001 intent via the explicit-interpreter tier. Re-open only if a future external host delegates interpreter choice to runtime-core's autodetect path (would then need to publish `DEEPNOTE_PYTHON`).                               |
| **Documentation Updated?**        | None required for this spike. Optional, non-blocking: a one-line note in ADR-001's "known consumers" that the only external producer satisfies the contract structurally (explicit `pythonEnv`), so `DEEPNOTE_PYTHON` currently has no external env-var adopters.                                                                                  |
| **PoC Code Preserved?**           | n/a — no code produced.                                                                                                                                                                                                                                                                                                                            |
| **Team Communicated?**            | Findings recorded in this card (Spike Findings / Final Synthesis); follow-up from `ohoh63` review 1 is resolved as note-only.                                                                                                                                                                                                                      |
| **Lessons Learned?**              | The ADR-001 `DEEPNOTE_PYTHON` env var is one of three precedence tiers; a consumer that always supplies an explicit interpreter (managed venv) satisfies the contract's _intent_ without ever touching the env var. "Honors ADR-001" must be judged on the bare-python failure mode being unreachable, not on the literal presence of the env var. |

### Completion Checklist

- [x] Investigation question was clearly answered.
- [x] All hypotheses were tested and outcomes documented.
- [x] Success criteria were met (PoC/report/recommendation delivered).
- [x] Time box was respected (investigation completed within limit).
- [x] Findings are documented in investigation log.
- [x] Final recommendation is clear and actionable.
- [x] Alternative approaches were considered and documented.
- [x] Follow-up work is captured (implementation cards created).
- [x] PoC code is preserved [if applicable].
- [x] Team was communicated findings (demo/presentation/doc).
- [x] Related tickets updated or closed.

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them.

## BLOCKED

Blocked on an external/out-of-repo prerequisite: this triage targets the external `vscode-deepnote` `deepnote-run` producer (and any other external consumer), which does not exist in this repository's tree and cannot be verified or modified from this sprint. ADR-001 explicitly scopes the `deepnote-run` producer as out-of-repo and unverifiable from this repo, so no code or test can be written here to satisfy it. Unblock once read access to the external `vscode-deepnote` repo is available (or its owner confirms how the ADR-001 bare-python hint obligation is tracked there). The in-repo parity story is already complete (MCP hint: card mjporx; CLI hint: card ohoh63), so this is pure discovery/triage against an out-of-tree component.

## Close-out Summary (executor)

**Disposition: COMPLETE — note-only. No in-repo code change, no external issue/PR.**

Blocker resolved: `deepnote/vscode-deepnote` is a public repo, cloned and inspected at HEAD `923ec53` (2026-06-10).

**Finding (the dispatched question — does the extension set `DEEPNOTE_PYTHON` when spawning the server/CLI?): NO, and it does not need to.**

- Server spawn: `deepnoteServerStarter.node.ts:271-276` → `startServer({ pythonEnv: venvPath.fsPath, env: extraEnv })`; `extraEnv` (`:368-398`) = SQL vars only. No `DEEPNOTE_PYTHON`.
- CLI spawn: `deepnoteAgentSkillsManager.node.ts:84-92` → venv `bin/deepnote install-skills` by absolute path. No `DEEPNOTE_PYTHON`.
- `grep -rc DEEPNOTE_PYTHON src/` → 0 across the whole extension.
- Root cause: the extension uses the ADR-001 **explicit** (highest) precedence tier — it manages its own venv (`deepnote-venvs/<hash>-<toolkitVersion>`, `deepnote-toolkit[server]` pre-installed) and passes that absolute path as `pythonEnv`. `startServer` resolves it directly (runtime-core `server-starter.ts:33-58`) and never consults `selectPythonSpec`/`DEEPNOTE_PYTHON`. `isBareSystemPython` is therefore never true → the bare-`python` import failure ADR-001 guards is structurally unreachable here. **Parity-by-construction.**

Note: the extension spawns the deepnote-toolkit **Jupyter** server + the `deepnote` **CLI**; it does NOT spawn the in-repo deepnote **MCP** server (`mjporx`).

**Recommendation:** confirm parity, note-only. Filing a "set `DEEPNOTE_PYTHON`" issue against `vscode-deepnote` would be redundant/wrong. The `ohoh63` review-1 follow-up worry is resolved.

**Evidence scope (honest):** static source review of `deepnote/vscode-deepnote` @ `923ec53` + cross-reference to in-repo `@deepnote/runtime-core` (`python-env.ts`, `server-starter.ts`). NOT a runtime/dynamic trace — no extension was launched. The conclusion rests on the spawn sites and the documented runtime-core precedence contract, which are unambiguous.

No git commit (discovery/triage; findings live in this card via MCP). Completion tag emitted per executor SKILL.
