## Feedback Overview

- **Client/Source:** Cameron — observed on sprint S6INREPO closeout (card o5pg2k)
- **Feedback Type:** Process/Correctness Issue (sprint-closeout four-type deferral grid + closeout-reviewer)
- **Date Received:** 2026-06-10
- **gitban Version:** 2.0.0a1
- **Environment:** Claude Code, gitban dispatcher + sprint-closeout-reviewer skills

**Required Checks:**

- [x] Client/source is documented above.
- [x] Feedback type is identified.
- [x] Date received is recorded.

### Initial Notes

> The closeout four-type deferral grid (backlog / sprint / note-only / fixed-with-note) was applied to two retro items in a way that contradicts the grid's own row definitions — it backlogged in-repo, no-external-prerequisite, in-scope work under a "the sprint is closing, defer it" rationale.

- **What happened:** Two reviewer findings (CLI bare-python hint — completing an ADR-001 obligation the sprint already shipped for the MCP half; and executeAgentBlock test-coverage hardening) were routed by the planner to closeout-append (correct — non-blocking, no downstream sprint dependency). At sprint end the closeout agent ticked `backlog = true` for both and created loose backlog cards (ohoh63, fkxnne).
- **Why that is wrong:** The grid's `backlog` row means "Genuinely future work; external prerequisite or belongs to a different milestone; can't be done without a shape-change." Both items have NO external prerequisite — the closeout card's own prose for ohoh63 says verbatim: "no external prerequisite ... Backlog rather than sprint: S6INREPO is closing ... promote to the next available sprint." That reasoning ("non-blocking + sprint is closing") is the `sprint` row's territory ("Blocks or **enables** sprint-scoped work, current or **next**"), not `backlog`. Right reasoning, wrong row.
- **Root cause (suspected):** `backlog` and `sprint` rows both read as "do it later," and under closeout/closing-pressure the agent defaults to `backlog`. Nothing forces `backlog` to name a concrete external prerequisite (unlike the PLANNER skill's backlog rule, which explicitly requires "a concrete prerequisite that is not yet resolved — not 'we don't know when'"). The closeout grid does not inherit that constraint, so the strict planner rule is silently weakened at the closeout step.
- **Impact:** In-scope, immediately-doable work (here: the CLI half of an ADR-001 obligation the sprint shipped for MCP) silently fell out of the sprint into untracked backlog, under-delivering against the sprint's own goal. The sprint-closeout-reviewer / Gate 0 did not flag it.

### Response & Action

| Phase / Task            | Status / Assignee / Link                                                                         |          Universal Check          |
| :---------------------- | :----------------------------------------------------------------------------------------------- | :-------------------------------: |
| **Initial Assessment**  | Confirmed against planner + closeout-reviewer SKILLs and o5pg2k card body                        |      - [x] Feedback assessed      |
| **Priority Decision**   | P1 — silently drops in-scope work                                                                |      - [x] Priority assigned      |
| **Response to Client**  | N/A — self-reported                                                                              |     - [x] Client acknowledged     |
| **Investigation**       | Root cause: backlog row lacks the planner's "concrete external prerequisite required" constraint |    - [x] Root cause identified    |
| **Implementation**      | Deferred to gitban team                                                                          | - [ ] Fix/improvement implemented |
| **Client Verification** | Pending gitban-side change                                                                       | - [ ] Client verified resolution  |

### Resolution & Follow-up

| Task                     | Detail/Link                                                                                                     |
| :----------------------- | :-------------------------------------------------------------------------------------------------------------- |
| **Final Resolution**     | Open — submitted to gitban team                                                                                 |
| **Client Communication** | N/A — self-reported                                                                                             |
| **Related Work**         | S6INREPO closeout o5pg2k retro Items 1-3; mis-backlogged cards ohoh63, fkxnne (being re-pulled into the sprint) |

#### Follow-up & Lessons Learned

| Topic                     | Status / Action Required                                                                                                                                                                                                          |
| :------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pattern Recognition**   | "Sprint is closing, defer to backlog" is a likely recurring failure mode at every closeout                                                                                                                                        |
| **Documentation Needed**  | Tighten the `backlog` row description to REQUIRE naming a concrete unresolved external prerequisite (mirror planner SKILL §a); clarify `sprint` covers "doable now / next sprint, no external blocker"                            |
| **Further Investigation** | Have the sprint-closeout-reviewer (Gate 0 or its companion) FLAG any item where `backlog=true` but the item prose admits "no external prerequisite" / "could be done now" — a contradiction, like the UIPOL7A cite reconciliation |
| **Process Improvement**   | Consider making `backlog` in the grid require a structured `prerequisite:` field that the closeout-reviewer validates as non-empty and externally-scoped                                                                          |

#### Completion Checklist

- [x] Feedback was assessed and prioritized.
- [x] Client was acknowledged and kept informed.
- [x] Root cause was identified [if applicable].
- [ ] Resolution was implemented or decision was documented.
- [ ] Client was notified of resolution.
- [x] Lessons learned were documented.
