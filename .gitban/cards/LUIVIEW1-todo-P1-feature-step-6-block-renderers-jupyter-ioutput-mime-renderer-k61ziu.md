# step 6: block-renderers Jupyter IOutput MIME renderer

> **Design Phase 5** (`docs/designs/m3-s2-viewer.md` ~lines 598–636). Sprint **LUIVIEW1** step 6. The browser counterpart to `output-renderer.ts` — `IOutput[]` renders to the DOM via a rendermime-style MIME dispatch, shared by every output-bearing block renderer. Depends on **step 5**. Unblocks the parallel batch 7A–7D.

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s2 → project `block-renderers` / feature `ioutput-mime-renderer`; sprint LUIVIEW1 step 6
* **Feature Area/Component:** `apps/studio/src/outputs/` (OutputRenderer, StreamRenderer, ErrorRenderer, DataRenderer) + `src/outputs/mime/registry.ts`
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
| **README.md** | `apps/studio/README.md` | Note mapping this renderer to `output-renderer.ts` + rich-first precedence rationale |
| **Architecture Docs** | ADR-006 | rendermime-style dispatch is the React-ecosystem leverage ADR-006 unlocks |
| **Design Doc** | `docs/designs/m3-s2-viewer.md` Phase 5 (~598–636), Interface (~352–388) | OutputRenderer dispatch + MIME registry (rich-first precedence) |
| **Similar Features** | `packages/cli/src/output-renderer.ts` | The terminal counterpart this mirrors (text/plain-first); we INVERT to rich-first |

### Required Reading

| Source | Location | Why |
| :--- | :--- | :--- |
| Design Phase 5 | `docs/designs/m3-s2-viewer.md` ~598–636 | Goal / Deliverables / Test strategy / DoD lifted into this card |
| Interface (Output + MIME) | `docs/designs/m3-s2-viewer.md` ~352–388 | `OutputRenderer` dispatch; `MIME_PRECEDENCE` (rich-first); `pickRenderer` |
| s1 `ApiProject` type | `@deepnote/runtime-server/types` (`packages/runtime-server/src/api-types.ts`) | `IOutput` shape flows from persisted `block.outputs` (via `@deepnote/runtime-core` type-only) |
| ADR-006 / ADR-007 | `docs/adr/ADR-006-*.md`, `docs/adr/ADR-007-*.md` | Isolation + boundary |

## Design & Planning

### Initial Design Thoughts & Requirements

* Deliverable: `src/outputs/OutputRenderer.tsx` — dispatch on `output_type`: `stream` → `StreamRenderer`, `display_data`/`execute_result` → `DataRenderer` (MIME registry), `error` → `ErrorRenderer`. Mirrors `renderOutput`.
* Deliverable: `StreamRenderer.tsx` (stdout/stderr, stderr styling), `ErrorRenderer.tsx` (ANSI-aware ename/evalue + traceback), `DataRenderer.tsx`.
* Deliverable: `src/outputs/mime/registry.ts` + per-MIME renderers: HTML (sanitized — dataframe tables), image (png/jpeg/svg, svg sanitized), `text/markdown`, `text/plain` (ANSI), with **rich-first** precedence (inverts the terminal's text/plain-first).
* Constraint: HTML/SVG sanitized before injection (DOMPurify-class).
* Constraint: dispatch covers exactly the four `output_type`s `renderOutput` handles — no fifth path silently dropped.

### Acceptance Criteria

* [ ] `stream`, `display_data`, `execute_result`, `error` all render in the DOM (R4).
* [ ] HTML tables, images, ANSI tracebacks render; HTML/SVG are sanitized.
* [ ] MIME precedence prefers the richest renderable bundle; `text/plain` is the last resort.
* [ ] All output component tests pass against fixtures.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 5 | - [ ] Design Complete |
| **Test Plan Creation** | per-output-type + precedence + sanitization + parity-of-shape tests | - [ ] Test Plan Approved |
| **TDD Implementation** | OutputRenderer + Stream/Error/Data + MIME registry | - [ ] Implementation Complete |
| **Integration Testing** | DOM-env vitest against fixture IOutputs | - [ ] Integration Tests Pass |
| **Documentation** | README mapping to `output-renderer.ts` | - [ ] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | per-output-type (stream/error/display_data/execute_result); precedence (html over text/plain); sanitization (malicious html/svg neutralized); parity-of-shape (exactly four output_types) | - [ ] Failing tests are committed and documented |
| **2. Implement Feature Code** | OutputRenderer + sub-renderers + MIME registry | - [ ] Feature implementation is complete |
| **3. Run Passing Tests** | DOM-env vitest green | - [ ] Originally failing tests now pass |
| **4. Refactor** | Tidy registry precedence | - [ ] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` + isolation/boundary green | - [ ] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A (render-only) | - [ ] Performance requirements are met |

### Implementation Notes

**Test Strategy:** DOM-env vitest project (jsdom + `@testing-library/react`), TDD: tests first, against fixture `IOutput`s of the same shape `run` produces. Precedence test: a bundle with both `text/html` and `text/plain` renders the **HTML**. Sanitization test: a malicious `text/html`/`image/svg+xml` fixture is sanitized (no script execution). Parity test: dispatch covers exactly the four `output_type`s, no fifth path silently dropped.

**Key Implementation Decisions:** `data` is `unknown` (M2) — JSON-bundle MIME types (vega/plotly) carry a parsed object, so the renderer prop is widened and each renderer narrows internally. Rich-first precedence inverts `output-renderer.ts`.

## Definition of Done

**Intent (plain English):** Saved cell outputs render in the browser the way Jupyter would: print/stdout text, error tracebacks with their colors, and rich results like dataframe tables and images. When a result is available in several formats, the richest one wins (an HTML table over its plain-text fallback) — the opposite of the terminal, which prefers plain text. Anything injected as HTML or SVG is sanitized first so a notebook can't smuggle in a script.

**Observable outcomes (unfakeable):**

* [ ] **Capstone:** a fixture output bundle carrying multiple MIME types renders the **richest available** (assert the `image`/`text/html` renders, not `text/plain`); and `stream`, `display_data`, `execute_result`, and `error` each render in the DOM from fixtures (real DOM assertions per type).
* [ ] HTML dataframe tables, images, and ANSI error tracebacks render correctly; a malicious HTML/SVG fixture is sanitized (no script execution).
* [ ] MIME precedence prefers the richest renderable bundle; a `text/plain`-only bundle renders text (last resort).
* [ ] Dispatch covers exactly the four `output_type`s `renderOutput` handles (parity-of-shape test passes).
* [ ] All output component tests pass in the DOM-env vitest project.

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban-reviewer approval |
| **QA Verification** | All four output types + precedence + sanitization verified |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No |
| **Future Enhancements** | steps 7A–7D consume OutputRenderer for output-bearing blocks |

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
