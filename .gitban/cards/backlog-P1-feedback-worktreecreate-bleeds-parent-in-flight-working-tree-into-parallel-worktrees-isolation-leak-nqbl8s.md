## Feedback Overview

- **Client/Source:** Cameron — observed during S6INREPO parallel executor dispatch (ohoh63 + fkxnne)
- **Feedback Type:** Bug — worktree isolation / `.gitban/hooks/worktree-create.sh`
- **Date Received:** 2026-06-10
- **gitban Version:** 2.0.0a1
- **Environment:** Claude Code, gitban-dispatcher, Linux, two parallel worktree-isolated executors

**Required Checks:**

- [x] Client/source is documented above.
- [x] Feedback type is identified.
- [x] Date received is recorded.

### Initial Notes

> When two worktree-isolated executors run in parallel, the second worktree was created carrying the FIRST executor's uncommitted, in-flight edits — a break of the per-worktree isolation guarantee.

- **What happened:** Dispatched two parallel executors from `sprint/S6INREPO` HEAD `dc21230` (disjoint files by design): `ohoh63` (edits `packages/cli/src/commands/run.ts` + `run.test.ts`) and `fkxnne` (edits `packages/runtime-core/src/agent-handler.test.ts`). The `fkxnne` executor reported its worktree contained **uncommitted modifications to `packages/cli/src/commands/run.ts` and `run.test.ts` that it did not author** — i.e. `ohoh63`'s in-flight (uncommitted) work was visible inside `fkxnne`'s worktree. The parent repo's working tree was clean at dispatch time; the only source of those edits was the sibling worktree's live executor.
- **Suspected cause:** `.gitban/hooks/worktree-create.sh` forks the new worktree from current HEAD (correct — fixes anthropics/claude-code#27876), but appears to seed the working tree by COPYING the parent/working-dir contents (including tracked-but-modified and/or untracked files) rather than doing a clean checkout of the fork commit. When a sibling executor is mid-edit, those uncommitted edits get copied into the new worktree.
- **Why it matters (even though it was benign this time):**
  - **Accidental cross-commit:** a less careful executor could `git add .` and commit a sibling's uncommitted work into the wrong card's commit. (`fkxnne`'s executor correctly noticed and left them untouched — but that relied on executor diligence, not isolation.)
  - **Test contamination:** worktree B running its suite while worktree A's uncommitted source changes are present could produce a false pass/fail attributable to the wrong card.
  - **Isolation is the whole point** of worktree-per-executor; a leak undermines the guarantee the dispatcher relies on.

### Response & Action

| Phase / Task            | Status / Assignee / Link                                                                          |          Universal Check          |
| :---------------------- | :------------------------------------------------------------------------------------------------ | :-------------------------------: |
| **Initial Assessment**  | Reproduced symptom via executor self-report; parent tree confirmed clean at dispatch              |      - [x] Feedback assessed      |
| **Priority Decision**   | P2 — latent correctness risk; benign in this run only because executors were diligent             |      - [x] Priority assigned      |
| **Response to Client**  | N/A — self-reported                                                                               |     - [x] Client acknowledged     |
| **Investigation**       | Suspected `worktree-create.sh` copies dirty parent working dir rather than clean-checkout of HEAD |    - [x] Root cause identified    |
| **Implementation**      | Deferred to gitban team                                                                           | - [ ] Fix/improvement implemented |
| **Client Verification** | Pending gitban-side change                                                                        | - [ ] Client verified resolution  |

### Resolution & Follow-up

| Task                     | Detail/Link                                                                                                              |
| :----------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| **Final Resolution**     | Open — submitted to gitban team                                                                                          |
| **Client Communication** | N/A — self-reported                                                                                                      |
| **Related Work**         | S6INREPO parallel batch: executors a23442b514b1 (ohoh63), ac6e22ad8a4e (fkxnne); hook `.gitban/hooks/worktree-create.sh` |

#### Follow-up & Lessons Learned

| Topic                     | Status / Action Required                                                                                                                                                   |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pattern Recognition**   | Surfaces only with >=2 concurrent worktree executors mid-edit — easy to miss in single-executor batches                                                                    |
| **Documentation Needed**  | Document the expected isolation guarantee (a new worktree is a clean checkout of the fork commit, never a copy of the parent's dirty working tree)                         |
| **Further Investigation** | Audit `worktree-create.sh` for a working-dir copy step; replace with a clean `git worktree add <path> <fork-commit>` so only committed state is present, then install deps |
| **Process Improvement**   | Until fixed, the dispatcher should not assume cross-worktree isolation of uncommitted state; executors must scope `git add` to their own paths (never `git add .`)         |

#### Completion Checklist

- [x] Feedback was assessed and prioritized.
- [x] Client was acknowledged and kept informed.
- [x] Root cause was identified [if applicable].
- [ ] Resolution was implemented or decision was documented.
- [ ] Client was notified of resolution.
- [x] Lessons learned were documented.
