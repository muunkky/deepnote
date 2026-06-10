# Triage external deepnote-run consumers honor ADR-001 bare-python hint

## Spike Overview

- **Investigation Question:** Do the external (out-of-repo) `deepnote-run` producers/consumers — primarily the `vscode-deepnote` producer — honor the ADR-001 bare-system-python hint obligation, or do they leave users with the opaque mid-run toolkit-import failure that ADR-001 set out to eliminate?
- **Problem/Opportunity:** ADR-001 requires every `deepnote-run` consumer to surface an actionable bare-system-python hint ("set `DEEPNOTE_PYTHON` or pass a venv with deepnote-toolkit[server]") when interpreter resolution lands on bare `python`, detected via `isBareSystemPython` from `@deepnote/runtime-core`. The two in-repo consumers now satisfy this: the MCP `deepnote_run` tool (card `mjporx`, `packages/mcp/src/tools/execution.ts`) and the CLI `deepnote run` command (card `ohoh63`, `packages/cli/src/commands/run.ts`). Card `ohoh63`'s own "Further Investigation" note asks whether external producers/consumers (e.g. `vscode-deepnote`) honor the same obligation. ADR-001 explicitly scopes the producer as out-of-repo and unverifiable from this repository, so no code or test can be written here to satisfy it — this is a discovery/triage item requiring access to a component outside this tree.
- **Time Box:** 0.5 day (discovery/triage only — no implementation in this repo)
- **Success Criteria:** A written finding answering whether `vscode-deepnote` (and any other external `deepnote-run` consumer) emits the ADR-001 bare-python hint, with a clear recommendation: either (a) confirm parity and note-only, or (b) file an issue/card against the external component's own repo. No in-repo code change is expected from this spike.
- **Priority:** P2 — Nice to know; the in-repo parity story is already complete and this targets an out-of-tree component.
- **Related Work:** Follow-up from card `ohoh63` review 1 (S6INREPO). ADR-001 (shared interpreter contract). In-repo precedents: `mjporx` (MCP hint), `ohoh63` (CLI hint), `pv4px0` (CLI selector convergence).

**Required Checks:**

- [ ] **Investigation question** is specific and answerable.
- [ ] **Time box** is defined (prevents endless investigation).
- [ ] **Success criteria** clearly defines what "done" looks like.

---

## Context & Background Research

Before diving into investigation, review existing knowledge, related work, and available documentation.

- [ ] Existing documentation reviewed (internal docs, ADRs, wiki).
- [ ] Related tickets/issues reviewed (past spikes, bug reports, feature requests).
- [ ] Similar systems/implementations reviewed (other teams, open source projects).
- [ ] Team knowledge consulted (asked team members with relevant experience).
- [ ] External research reviewed (blog posts, papers, vendor docs if applicable).

Use the table below to document background research findings. Add rows as needed.

| Source Type           | Link / Location                                                         | Key Findings / Relevant Context                                                                                                         |
| :-------------------- | :---------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **Internal Docs**     | ADR-001 (shared interpreter contract); `packages/mcp/README.md:144-147` | ADR-001 scopes the `deepnote-run` producer as out-of-repo and unverifiable from this tree; MCP README documents the in-repo hint shape. |
| **Past Tickets**      | `mjporx` (MCP hint), `ohoh63` (CLI hint), `pv4px0` (CLI selector)       | In-repo consumers now emit the hint gated on `isBareSystemPython(spec) && no override`.                                                 |
| **Similar Systems**   | `vscode-deepnote` producer (external repo)                              | Primary external consumer to triage; not present in this tree.                                                                          |
| **Team Knowledge**    | [Owner of the external `vscode-deepnote` repo]                          | [To fill: who owns the external producer and how the hint obligation is tracked there.]                                                 |
| **External Research** | [Link to external repo / issue tracker once accessible]                 | [To fill during triage.]                                                                                                                |

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

| Iteration # | Hypothesis / Goal                                              | Test/Action Taken                        | Outcome / Findings |
| :---------: | :------------------------------------------------------------- | :--------------------------------------- | :----------------- |
|    **1**    | Confirm access to the external `vscode-deepnote` repo          | [To fill once the prerequisite resolves] | [To fill]          |
|    **2**    | Determine whether the external consumer emits the ADR-001 hint | [To fill]                                | [To fill]          |
|    **3**    | [Goal]                                                         | [Action]                                 | [Outcome]          |

---

#### Iteration 1: Confirm access to the external component

**Hypothesis/Goal:** Goal: Determine whether this clone has read access to the external `vscode-deepnote` repo (the BLOCKED prerequisite for this spike).

**Test/Action Taken:** [To fill once the prerequisite resolves — e.g. attempt to clone/read the external repo, or contact its owner.]

**Outcome:** [To fill.]

---

#### Iteration 2: Verify hint emission in the external consumer

**Hypothesis/Goal:** Hypothesis: The external `vscode-deepnote` producer does not yet emit the ADR-001 bare-python hint.

**Test/Action Taken:** [To fill — inspect interpreter-resolution path for `isBareSystemPython` usage and hint emission.]

**Outcome:** [To fill.]

---

#### Iteration 3: [Iteration Summary]

**Hypothesis/Goal:** [Goal or hypothesis...]

**Test/Action Taken:** [Action taken...]

**Outcome:** [Findings...]

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

[To fill once the BLOCKED prerequisite resolves and the external component is accessible. Should answer: does `vscode-deepnote` (and any other external `deepnote-run` consumer) emit the ADR-001 bare-python hint?]

#### Recommendation

[To fill: either (a) confirm parity → note-only, or (b) file an issue/card against the external component's own repo to add the hint. No in-repo code change is expected.]

#### Alternative Approaches Considered

[To fill — e.g. duplicating the hint logic in-repo was rejected because the external producer is out of scope per ADR-001.]

### Follow-up & Lessons Learned

| Topic                             | Status / Action Required                                                    |
| :-------------------------------- | :-------------------------------------------------------------------------- |
| **Implementation Card Created?**  | [To fill — likely an issue against the external repo, not an in-repo card.] |
| **Further Investigation Needed?** | [To fill.]                                                                  |
| **Documentation Updated?**        | [To fill.]                                                                  |
| **PoC Code Preserved?**           | n/a                                                                         |
| **Team Communicated?**            | [To fill.]                                                                  |
| **Lessons Learned?**              | [To fill.]                                                                  |

### Completion Checklist

- [ ] Investigation question was clearly answered.
- [ ] All hypotheses were tested and outcomes documented.
- [ ] Success criteria were met (PoC/report/recommendation delivered).
- [ ] Time box was respected (investigation completed within limit).
- [ ] Findings are documented in investigation log.
- [ ] Final recommendation is clear and actionable.
- [ ] Alternative approaches were considered and documented.
- [ ] Follow-up work is captured (implementation cards created).
- [ ] PoC code is preserved [if applicable].
- [ ] Team was communicated findings (demo/presentation/doc).
- [ ] Related tickets updated or closed.

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them.

## BLOCKED

Blocked on an external/out-of-repo prerequisite: this triage targets the external `vscode-deepnote` `deepnote-run` producer (and any other external consumer), which does not exist in this repository's tree and cannot be verified or modified from this sprint. ADR-001 explicitly scopes the `deepnote-run` producer as out-of-repo and unverifiable from this repo, so no code or test can be written here to satisfy it. Unblock once read access to the external `vscode-deepnote` repo is available (or its owner confirms how the ADR-001 bare-python hint obligation is tracked there). The in-repo parity story is already complete (MCP hint: card mjporx; CLI hint: card ohoh63), so this is pure discovery/triage against an out-of-tree component.
