# step 1: LUIRUN1 sprint planning

> Planning card for sprint **LUIRUN1** — roadmap **m3/s3** "Run blocks with live streamed output" (project `live-execution`). Turns the shipped m3/s2 read-only viewer (`apps/studio`) into a runnable one over the ADR-005 proxy transport. Planning-only card; closeout obligations live on the step 7 closeout card. Fork-only showcase (#162).

## Cleanup Scope & Context

* **Sprint/Release:** LUIRUN1 (roadmap m3/s3 — live-execution UI)
* **Primary Feature Work:** `apps/studio` gains a live-execution loop: trigger runs over the s1 HTTP `POST …/run` routes, consume the `WS /api/stream` event stream, render live outputs in place through the existing `OutputRenderer`, surface failure-category banners + tracebacks. Per `docs/designs/m3-s3-live-execution.md`, ADR-005, ADR-006/007.
* **Cleanup Category:** Sprint planning (goal, inventory, sequencing)

**Required Checks:**
* [ ] Sprint/Release is identified above.
* [ ] Primary feature work that generated this cleanup is documented.

### Sprint Goal

Make the m3/s2 viewer **runnable**: a Run affordance per code/sql block (and Run-all) triggers execution via the s1 HTTP run routes (which return the `runId`), the SPA consumes the `runId`-tagged `WS /api/stream` event stream subscribe-only, live outputs **replace** persisted ones in place through the *existing* `OutputRenderer`, per-block execution state + counts are tracked, and the typed failure categories surface as actionable banners + in-place tracebacks. The live loop is measured end-to-end **< 2 s** against a real kernel (ADR-005's load-bearing bar). Isolated by construction (root `tsc --listFilesOnly` names zero `apps/` files; backend gate stays green); the WS/HTTP protocol is consumed **type-only** from `@deepnote/runtime-server/types`. The Run control is the deliberate, allowlist-tested crossing of s2's read-only R8.

### Card Inventory & Sequencing

| Step | Type | P | Title | Depends on |
| :--- | :--- | :---: | :--- | :--- |
| 1 | chore | P1 | LUIRUN1 sprint planning (this card) | — |
| 2 | feature | P1 | ExecutionClient — HTTP trigger + WS subscribe-only stream | design doc P1 |
| 3 | feature | P1 | runStore reducer + useExecution hook (exec state, runId↔block) | step 2 |
| 4 | feature | P1 | Run / Run-all affordances + live output rendering | step 3 |
| 5 | feature | P1 | failure-category banners + in-place tracebacks | step 4 |
| 6 | feature | P1 | gated < 2 s live-loop measurement (real kernel capstone) | step 5 |
| 7 | chore | P1 | LUIRUN1 Sprint Closeout (final) | all |

### Parallelization Plan

* **Serial spine:** steps 2 → 3 → 4 → 5 → 6 are a strict chain (transport → state → run+render → failure surfacing → end-to-end measurement). Each builds on the prior.
* **step 7** (closeout) runs last.

---

## Deferred Work Review

First, identify what was deferred or left incomplete during the main feature work. Review commit messages, PR comments, code TODOs, and team discussions for items marked "not in scope" or "do later."

* [ ] Reviewed commit messages for "TODO" and "FIXME" comments added during sprint.
* [ ] Reviewed PR comments for "out of scope" or "follow-up needed" discussions.
* [ ] Reviewed code for new TODO/FIXME markers (grep for them).
* [ ] Checked team chat/standup notes for deferred items.

| Cleanup Category | Specific Item / Location | Priority | Justification for Cleanup |
| :--- | :--- | :---: | :--- |
| **Planning** | Sprint goal, inventory, sequencing recorded above | P1 | Sprint must be planned before dispatch |
| **Scope boundary** | Editing + save deferred to s4; reactive re-run to s5; running-cancel to s5 | P1 | Keeps the live-execution scope honest per the design doc |

---

## Cleanup Checklist

Planning-only card; the substantive checklist lives on the closeout card (step 7).

### Documentation Updates (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Sprint plan recorded** | Goal + inventory + sequencing captured in this card | - [ ] |
| **Other:** Design doc grounding | All cards reference `docs/designs/m3-s3-live-execution.md` + ADR-005 + ADR-006/007 | - [ ] |

### Testing & Quality (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** N/A (planning card) | No tests authored by the planning card itself | - [ ] |

### Code Quality & Technical  (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** N/A (planning card) | No code authored by the planning card itself | - [ ] |

### Dependencies &  (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** N/A (planning card) | No dependency changes by the planning card itself | - [ ] |

### Configuration & Environment (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** N/A (planning card) | No config changes by the planning card itself | - [ ] |

### Build & CI/CD (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** N/A (planning card) | No CI changes by the planning card itself | - [ ] |

### Refactoring & Code Organization (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** N/A (planning card) | No refactoring by the planning card itself | - [ ] |

---

## Validation & Closeout

### Pre-Completion Verification

| Verification Task | Status / Evidence |
| :--- | :--- |
| **All P0 Items Complete** | Sprint plan recorded (this card) |
| **All P1 Items Complete or Ticketed** | Inventory + sequencing captured; cards created in todo |
| **Tests Passing** | N/A — planning card |
| **No New Warnings** | N/A — planning card |
| **Documentation Updated** | Plan documented in this card |
| **Code Review** | N/A — planning card |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Remaining P2 Items** | None |
| **Recurring Issues** | None at planning time |
| **Process Improvements** | HTTP-trigger correlation (KD-2) chosen after adversarial review — deterministic runId binding |
| **Technical Debt Tickets** | None at planning time |

### Completion Checklist

* [ ] Sprint goal recorded.
* [ ] Card inventory + sequencing recorded.
* [ ] Parallelization plan recorded.
* [ ] All sprint cards created and moved to todo.

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.
