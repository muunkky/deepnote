# step 5: block-renderers code/markdown/text + BlockRenderer registry

> **Design Phase 4** (`docs/designs/m3-s2-viewer.md` ~lines 565–596). Sprint **LUIVIEW1** step 5. Establishes the type-keyed `BlockRenderer` registry (with `default` → unknown fallback) and the code / markdown / text renderers. Depends on **step 4**.

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s2 → project `block-renderers` / feature `code-markdown-text-renderers`; sprint LUIVIEW1 step 5
* **Feature Area/Component:** `apps/studio/src/blocks/BlockRenderer.tsx`, `CodeRenderer.tsx`, `MarkdownRenderer.tsx`, `TextRenderer.tsx`
* **Target Release/Milestone:** m3 (fork-only showcase)

**Required Checks:**
* [ ] **Associated Ticket/Epic** link is included above.
* [ ] **Feature Area/Component** is identified.
* [ ] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

* [ ] `README.md` or project documentation reviewed.
* [ ] Existing architecture documentation or ADRs reviewed.
* [ ] Related feature implementations or similar code reviewed.
* [ ] API documentation or interface specs reviewed [if applicable].

| Document Type | Link / Location | Key Findings / Action Required |
| :--- | :--- | :--- |
| **README.md** | `apps/studio/README.md` | Inline only |
| **Architecture Docs** | ADR-006 | React registry leverage; `default` branch is the unknown fallback (KDD §6) |
| **Design Doc** | `docs/designs/m3-s2-viewer.md` Phase 4 (~565–596), Interface (~341–350) | `BlockRenderer` registry shape + props |
| **Similar Features** | `@deepnote/blocks` `createMarkdownForTextBlock` | Reused to derive markdown for the 7 text-cell kinds |

### Required Reading

| Source | Location | Why |
| :--- | :--- | :--- |
| Design Phase 4 | `docs/designs/m3-s2-viewer.md` ~565–596 | Goal / Deliverables / Test strategy / DoD lifted into this card |
| Interface (BlockRenderer) | `docs/designs/m3-s2-viewer.md` ~341–350 | `Partial<Record<DeepnoteBlock['type'], FC>>`; `default` → `<UnknownBlockRenderer>` |
| s1 `ApiProject` type | `@deepnote/runtime-server/types` (`packages/runtime-server/src/api-types.ts`) | `DeepnoteBlock` discriminant drives the registry keys |
| ADR-006 / ADR-007 | `docs/adr/ADR-006-*.md`, `docs/adr/ADR-007-*.md` | Isolation + boundary |

## Design & Planning

### Initial Design Thoughts & Requirements

* Deliverable: `src/blocks/BlockRenderer.tsx` — the registry `Partial<Record<DeepnoteBlock['type'], FC<{ block }>>>`, dispatching on `block.type` with the `default` branch reserved for the unknown fallback (built in step 7D; here the registry plumbing + a placeholder default).
* Deliverable: `CodeRenderer.tsx` — syntax-highlighted source from `block.content` + `<OutputRenderer outputs={block.outputs ?? []}>` (OutputRenderer arrives in step 6; stub outputs until then or sequence the output assertion after step 6).
* Deliverable: `MarkdownRenderer.tsx` — renders `markdown` block content as prose.
* Deliverable: `TextRenderer.tsx` — the seven `text-cell-*` kinds (p/h1/h2/h3/bullet/todo/callout); reuse `createMarkdownForTextBlock` from `@deepnote/blocks` to derive markdown, then render.
* Deliverable: registry entries wiring code/markdown/text into `BlockRenderer`.
* Constraint (R8): the rendered code block exposes **no** run control and **no** editable field.

### Acceptance Criteria

* [ ] code, markdown, and all seven text-cell kinds render from the fixture; component tests pass.
* [ ] Code blocks show persisted outputs (once step 6 lands) and expose no edit/run affordance.
* [ ] The `BlockRenderer` registry dispatches on `block.type` with a `default` branch in place.
* [ ] Read-only assertion: rendered code block has no run/edit control (R8).

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 4 | - [ ] Design Complete |
| **Test Plan Creation** | per-renderer component tests + read-only assertion | - [ ] Test Plan Approved |
| **TDD Implementation** | BlockRenderer registry + Code/Markdown/Text renderers | - [ ] Implementation Complete |
| **Integration Testing** | DOM-env vitest against fixture | - [ ] Integration Tests Pass |
| **Documentation** | Inline | - [ ] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | code renders highlighted source (+ persisted output once step 6 lands); markdown renders prose; each text-cell kind renders its structure; read-only assertion | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | registry + Code/Markdown/Text renderers | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | DOM-env vitest green | - [ ] Originally failing tests now pass |
| **4. Refactor** | Tidy registry dispatch | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` + isolation/boundary green | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A (render-only) | - [ ] Performance requirements are met |

### Implementation Notes

**Test Strategy:** Component tests against fixture blocks in the DOM-env vitest project (jsdom + `@testing-library/react`), TDD: tests first. Each text-cell kind (p/h1/h2/h3/bullet/todo/callout) asserts its correct DOM structure. Read-only assertion: no run control, no editable field on code.

**Key Implementation Decisions:** The registry is keyed by the exact `block.type` discriminant; the `default` branch is structurally the unknown-type fallback (the same defensive posture the terminal path has, made structural).

## Definition of Done

**Intent (plain English):** From the loaded project, code cells show their source with syntax highlighting (and their saved outputs once the output renderer lands), markdown cells read as formatted prose, and each kind of text cell — paragraph, headings, bullet, to-do, callout — renders with the right structure. A central registry picks the right renderer by block type, so adding more types later is just a registry entry. Nothing is editable or runnable.

**Observable outcomes (unfakeable):**

* [ ] **Capstone:** each of **code**, **markdown**, and **text** renders correctly from the fixture *via the registry* — assert real DOM: highlighted source for code, formatted prose for markdown, and the correct structure for each of the seven text-cell kinds.
* [ ] The `BlockRenderer` registry dispatches by `block.type` with a `default` branch present (placeholder until step 7D supplies the real fallback).
* [ ] Read-only (R8): the rendered code block exposes no run control and no editable field.
* [ ] All renderer component tests pass in the DOM-env vitest project.

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban-reviewer approval |
| **QA Verification** | code/markdown/text render from fixture via registry |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No |
| **Future Enhancements** | step 6 supplies OutputRenderer for code's persisted outputs |

### Completion Checklist

* [ ] All acceptance criteria are met and verified.
* [ ] All tests are passing (unit, integration, e2e, performance).
* [ ] Code review is approved and PR is merged.
* [ ] Documentation is updated (README, API docs, user guides).
* [ ] Feature is deployed to production.
* [ ] Monitoring and alerting are configured.
* [ ] Stakeholders are notified of completion.
* [ ] Follow-up actions are documented and tickets created.
* [ ] Associated ticket/epic is closed.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.
