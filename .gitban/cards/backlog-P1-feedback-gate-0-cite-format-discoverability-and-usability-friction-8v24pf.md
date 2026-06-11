## Feedback Overview

- **Client/Source:** Cameron (dispatcher operator), during S6INREPO sprint-closeout
- **Feedback Type:** Usability Issue + Documentation Gap (Gate 0 cite annotations)
- **Date Received:** 2026-06-10
- **gitban Version:** 2.0.0a1
- **Environment:** Claude Code, gitban MCP server

**Required Checks:**

- [x] Client/source is documented above.
- [x] Feedback type is identified.
- [x] Date received is recorded.

### Initial Notes

> Driving a sprint-closeout Gate 0 (`gate0` MCP tool) to PASS took several avoidable round-trips. The work was complete; only the cite _formatting_ failed. The cite grammar is effectively undiscoverable from the tooling, and the FAIL messages diagnose without teaching.

- **Discoverability gap:** `get_help(topic="gate0")` -> "Invalid help topic"; `search_help("gate0 ... cite ...")` -> 0 matches. The canonical cite grammar lives only in `gitban/contracts/sprint-closeout-gate0.md` and the parser source `gitban/skills/sprint_closeout_reviewer/gate0.py`. I had to read the Python source to learn the rules; a normal operator cannot.
- **FAIL messages diagnose but don't teach:** errors like `unknown cite kind 'none (no P0 cards...)'` and `'onwhhg' (allowed: commit, pr, ci, card, roadmap, retro, none)` are correct but never show a _valid_ example. Operators can't infer that (a) `none` must be the bare literal — any trailing prose makes the parenthetical parse as the "kind" and fails; (b) multi-cite is comma-separated but **each part needs its own `kind:` prefix** (`card:a, card:b`, not `card:a,b`); (c) `retro:` values are cross-checked against a 12-line window for contradiction lexemes (`deferred`, `blocked`, `not yet`...), so a legitimately-deferred retro item can false-positive.
- **MCP signature vs documented invocation mismatch:** the contract documents `--sprint <tag>`, but the `gate0` MCP tool rejects a `sprint_tag` arg ("Additional properties are not allowed"). Only `card_id` + `strict_external` are accepted; sprint is inferred.
- **EXTERNAL_PROBE_ERROR has no graceful fork/no-CI path:** `strict_external=true` returns EXTERNAL_PROBE_ERROR ("no probe is wired") on 2.0.0a1. For a fork / pre-PR branch, CI legitimately never runs on branch push (only on PR), so there is no dashboard to probe by design. The error reads as a hard defect rather than pointing to the human-vouched `strict_external=false` workflow.
- **Gate 0 PASS vs card-complete is opaque:** Gate 0 only scrutinizes **ticked** `[x]` boxes (audits positive claims) and silently ignores unticked ones (correct — `complete_card` auto-block enforces those separately). But this two-gate split isn't surfaced, so "PASS" can be misread as "card is done."

### Response & Action

| Phase / Task            | Status / Assignee / Link                             |          Universal Check          |
| :---------------------- | :--------------------------------------------------- | :-------------------------------: |
| **Initial Assessment**  | Reviewed by Cameron — valid usability/docs gaps      |      - [x] Feedback assessed      |
| **Priority Decision**   | P2 — friction, not a blocker (worked around)         |      - [x] Priority assigned      |
| **Response to Client**  | N/A — self-reported                                  |     - [x] Client acknowledged     |
| **Investigation**       | Root causes confirmed by reading gate0.py + contract |    - [x] Root cause identified    |
| **Implementation**      | Deferred to gitban team                              | - [ ] Fix/improvement implemented |
| **Client Verification** | Pending gitban-side change                           | - [ ] Client verified resolution  |

### Resolution & Follow-up

| Task                     | Detail/Link                                                                         |
| :----------------------- | :---------------------------------------------------------------------------------- |
| **Final Resolution**     | Open — submitted to gitban team for triage                                          |
| **Client Communication** | N/A — self-reported                                                                 |
| **Related Work**         | S6INREPO closeout card o5pg2k; contract `gitban/contracts/sprint-closeout-gate0.md` |

#### Follow-up & Lessons Learned

| Topic                     | Status / Action Required                                                                                              |
| :------------------------ | :-------------------------------------------------------------------------------------------------------------------- |
| **Pattern Recognition**   | Five distinct friction points around one feature (Gate 0 cites) — suggests a cohesive docs+UX pass                    |
| **Documentation Needed**  | Add a `get_help` topic for sprint-closeout Gate 0 cite grammar with valid examples                                    |
| **Further Investigation** | Consider emitting valid-cite-form hints on FAIL output                                                                |
| **Process Improvement**   | Reconcile MCP tool signature with the documented `--sprint` flag; soften EXTERNAL_PROBE_ERROR for fork/no-CI contexts |

#### Completion Checklist

- [x] Feedback was assessed and prioritized.
- [x] Client was acknowledged and kept informed.
- [x] Root cause was identified [if applicable].
- [ ] Resolution was implemented or decision was documented.
- [ ] Client was notified of resolution.
- [ ] Any follow-up work was created and tracked.
- [x] Lessons learned were documented.
