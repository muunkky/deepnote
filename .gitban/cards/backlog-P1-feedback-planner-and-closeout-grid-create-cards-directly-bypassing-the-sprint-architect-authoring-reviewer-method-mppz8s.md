## Feedback Overview

- **Client/Source:** Cameron — observed on S6INREPO follow-up cards (ohoh63, fkxnne, vxiipn)
- **Feedback Type:** Process/Design Issue (gitban-planner + sprint-closeout card creation)
- **Date Received:** 2026-06-10
- **gitban Version:** 2.0.0a1
- **Environment:** Claude Code, gitban-planner + sprint-closeout-reviewer skills

**Required Checks:**

- [x] Client/source is documented above.
- [x] Feedback type is identified.
- [x] Date received is recorded.

### Initial Notes

> The planner (and the sprint-closeout four-type deferral grid) author cards by calling `create_card` DIRECTLY with a chosen template, instead of going through the sprint-architect's card-authoring method (template right-sizing, proportional Definition of Done, and marking inapplicable acceptance criteria as `N/A`) plus a sprint-reviewer validation pass. The result is cards that inherit raw, heavy template boilerplate that does not fit the card's actual context.

- **Concrete failure:** Card `ohoh63` (a small in-repo CLI doc/log-line change) was materialized from a closeout retro item using the full `feature` template, which ships production-lifecycle acceptance criteria — `Code review is approved and PR is merged`, `Feature is deployed to production`, `Monitoring and alerting are configured`. None apply to an in-repo fork card, and none were marked `N/A`. At close-out, `complete_card` requires every box ticked, so the close-out agent ticked those **false** claims to close the card (a fabrication: "deployed to production" / "PR is merged" when neither is true). I had to hand-correct them to honest `N/A` annotations after the fact.
- **Where it comes from:** `gitban-planner/SKILL.md` taxonomy (a)/(b) mechanics say `create_card(template=…)` directly; the sprint-closeout deferral grid likewise creates backlog/sprint cards directly. Neither delegates to `gitban-sprint-architect` (which owns DoD authoring, template selection, capstone, and `N/A` discipline) nor runs the new card past `gitban-sprint-reviewer`. By contrast, a card I authored via sprint-architect (`3oz7aa`) had the inapplicable deploy boxes pre-marked `[x] N/A` and never had this problem.
- **Why it matters:** This is upstream of the over-ticking fabrication. A properly-authored card never presents a close-out agent with inapplicable boxes to falsely tick. Fixing it at the authoring step removes the fabrication pressure at the root, rather than relying on a human to notice and hand-fix ticked false claims.

### Response & Action

| Phase / Task            | Status / Assignee / Link                                                             |          Universal Check          |
| :---------------------- | :----------------------------------------------------------------------------------- | :-------------------------------: |
| **Initial Assessment**  | Confirmed against planner SKILL mechanics + the ohoh63 card body                     |      - [x] Feedback assessed      |
| **Priority Decision**   | P1 — directly produces fabricated completion claims at close-out                     |      - [x] Priority assigned      |
| **Response to Client**  | N/A — self-reported                                                                  |     - [x] Client acknowledged     |
| **Investigation**       | Planner/closeout call create_card directly; no architect authoring, no reviewer gate |    - [x] Root cause identified    |
| **Implementation**      | Deferred to gitban team                                                              | - [ ] Fix/improvement implemented |
| **Client Verification** | Pending gitban-side change                                                           | - [ ] Client verified resolution  |

### Resolution & Follow-up

| Task                     | Detail/Link                                                                                                               |
| :----------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| **Final Resolution**     | Open — submitted to gitban team                                                                                           |
| **Client Communication** | N/A — self-reported                                                                                                       |
| **Related Work**         | Cards ohoh63 (over-ticked, hand-corrected), fkxnne, vxiipn; planner SKILL taxonomy (a)/(b); sprint-closeout deferral grid |

#### Follow-up & Lessons Learned

| Topic                     | Status / Action Required                                                                                                                                                                                                                                |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Pattern Recognition**   | Any planner/closeout-created card inherits raw template boilerplate; the over-tick surfaces whenever the chosen template carries criteria the card's context doesn't satisfy                                                                            |
| **Documentation Needed**  | Specify that card-creating skills (planner taxonomy a/b, closeout deferral grid) author via the sprint-architect method — template right-sizing, proportional DoD, and `[x] N/A` (or removal) of inapplicable acceptance criteria                       |
| **Further Investigation** | Decide whether the planner should invoke sprint-architect for card creation (delegation) vs inherit its authoring rules inline; and whether planner/closeout-created cards should pass a lightweight sprint-reviewer check before entering todo/backlog |
| **Process Improvement**   | Pairs with the `complete_card` all-boxes-ticked constraint — if cards are authored with inapplicable boxes pre-marked `N/A`, the all-boxes constraint stops forcing fabrication                                                                         |

#### Completion Checklist

- [x] Feedback was assessed and prioritized.
- [x] Client was acknowledged and kept informed.
- [x] Root cause was identified [if applicable].
- [ ] Resolution was implemented or decision was documented.
- [ ] Client was notified of resolution.
- [x] Lessons learned were documented.
