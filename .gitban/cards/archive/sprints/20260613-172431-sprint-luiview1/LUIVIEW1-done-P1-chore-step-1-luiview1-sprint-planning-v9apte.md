# step 1: LUIVIEW1 sprint planning

> Planning card for sprint **LUIVIEW1** — roadmap **m3/s2** "Open & view a notebook locally", the read-only viewer SPA (`apps/studio`). This card captures the sprint goal, the card inventory + sequencing, and the parallelization plan. It is a planning card: it carries no end-of-sprint closeout obligations (those live on the step 8 closeout card).

## Cleanup Scope & Context

* **Sprint/Release:** LUIVIEW1 (roadmap m3/s2 — read-only viewer SPA)
* **Primary Feature Work:** `apps/studio` — React 19 + Vite 7 read-only notebook viewer rendering the s1 `GET /api/project` payload (per ADR-006, ADR-007, and `docs/designs/m3-s2-viewer.md`).
* **Cleanup Category:** Sprint planning (goal, inventory, sequencing, parallelization)

**Required Checks:**
- [x] Sprint/Release is identified above.
- [x] Primary feature work that generated this cleanup is documented.

### Sprint Goal

Stand up the monorepo's first frontend — an isolated `apps/studio` React 19 + Vite 7 SPA — that opens a `.deepnote` project over the **s1** `GET /api/project` API and renders every in-scope block type and persisted Jupyter `IOutput` **read-only**, with a safe unknown-type fallback. No execution, no editing (those are P3/P4). The app must be **isolated by construction**: no `packages/*` gains a frontend dependency, and `tsc -p tsconfig.json --listFiles` names zero `apps/` files. Fork-only showcase (per #162); creates no backend→apps dependency.

### Card Inventory & Sequencing

| Step | Type | P | Title | Depends on |
| :--- | :--- | :---: | :--- | :--- |
| 1 | chore | P1 | LUIVIEW1 sprint planning (this card) | — |
| 2 | feature | P0 | spa-foundation framework + bundler setup (apps/studio, isolated) | ADR-006/007 |
| 3 | feature | P1 | spa-foundation app shell + routing | step 2 |
| 4 | feature | P1 | spa-foundation project load over s1 API + state | step 3 + s1 (merged) |
| 5 | feature | P1 | block-renderers code/markdown/text + BlockRenderer registry | step 4 |
| 6 | feature | P1 | block-renderers Jupyter IOutput MIME renderer | step 5 |
| 7A | feature | P1 | block-renderers SQL renderer | step 6 |
| 7B | feature | P1 | block-renderers visualization / big-number / image renderers | step 6 |
| 7C | feature | P1 | block-renderers input / button / separator renderers | step 6 |
| 7D | feature | P1 | block-renderers unknown-type fallback | step 6 + 7A–7C |
| 8 | chore | P1 | LUIVIEW1 Sprint Closeout (final) | all |

### Parallelization Plan

* **Serial spine:** steps 2 → 3 → 4 → 5 → 6 are a strict chain (each phase builds on the prior — scaffold, shell, load, registry, output renderer).
* **Parallel batch (after step 6):** steps **7A / 7B / 7C** are independent and run concurrently. Each renderer lives in its own file and registers **additively** into the `BlockRenderer` / MIME registry, so merges are keep-both (no contested registry edit).
* **7D runs after 7A–7C land** (not fully concurrent): unlike the additive sibling renderers, the unknown-type fallback wires the shared `BlockRenderer` **`default`** branch, and its full-coverage capstone asserts that every *other* block type now resolves to a real renderer — so the sibling renderers must be present for that coverage assertion to be meaningful. Dispatch 7A/7B/7C concurrently, then 7D.
* **step 8** (closeout) runs last, after all of 7A–7D land.

---

## Deferred Work Review

First, identify what was deferred or left incomplete during the main feature work. Review commit messages, PR comments, code TODOs, and team discussions for items marked "not in scope" or "do later."

- [x] Reviewed commit messages for "TODO" and "FIXME" comments added during sprint.
- [x] Reviewed PR comments for "out of scope" or "follow-up needed" discussions.
- [x] Reviewed code for new TODO/FIXME markers (grep for them).
- [x] Checked team chat/standup notes for deferred items.

| Cleanup Category | Specific Item / Location | Priority | Justification for Cleanup |
| :--- | :--- | :---: | :--- |
| **Planning** | Sprint goal, inventory, and parallelization recorded above | P1 | Sprint must be planned before dispatch |
| **Scope boundary** | Execution + editing explicitly deferred to P3/P4 (read-only viewer only) | P1 | Keeps the viewer scope honest per the design doc |

---

## Cleanup Checklist

Planning-only card; the substantive checklist lives on the closeout card (step 8). The single planning obligation is recorded below.

### Documentation Updates (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Sprint plan recorded** | Goal + inventory + sequencing + parallelization captured in this card | - [x] |
| **Other:** Design doc grounding | All cards reference `docs/designs/m3-s2-viewer.md` phases + ADR-006/007 | - [x] |

### Testing & Quality (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** N/A (planning card) | No tests authored by the planning card itself | - [x] |

### Code Quality & Technical  (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** N/A (planning card) | No code authored by the planning card itself | - [x] |

### Dependencies &  (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** N/A (planning card) | No dependency changes by the planning card itself | - [x] |

### Configuration & Environment (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** N/A (planning card) | No config changes by the planning card itself | - [x] |

### Build & CI/CD (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** N/A (planning card) | No CI changes by the planning card itself | - [x] |

### Refactoring & Code Organization (optional)

| Task | Status / Details | Done? |
| :--- | :--- | :---: |
| **Other:** N/A (planning card) | No refactoring by the planning card itself | - [x] |

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
| **Process Improvements** | Parallel batch 7A–7D keeps registry merges keep-both (additive registration) |
| **Technical Debt Tickets** | None at planning time |

### Completion Checklist

- [x] Sprint goal recorded.
- [x] Card inventory + sequencing recorded.
- [x] Parallelization plan recorded.
- [x] All sprint cards created and moved to todo.

---

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.
