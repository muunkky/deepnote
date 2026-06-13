# step 6: block-renderers Jupyter IOutput MIME renderer

> **Design Phase 5** (`docs/designs/m3-s2-viewer.md` ~lines 598–636). Sprint **LUIVIEW1** step 6. The browser counterpart to `output-renderer.ts` — `IOutput[]` renders to the DOM via a rendermime-style MIME dispatch, shared by every output-bearing block renderer. Depends on **step 5**. Unblocks the parallel batch 7A–7D.

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s2 → project `block-renderers` / feature `ioutput-mime-renderer`; sprint LUIVIEW1 step 6
* **Feature Area/Component:** `apps/studio/src/outputs/` (OutputRenderer, StreamRenderer, ErrorRenderer, DataRenderer) + `src/outputs/mime/registry.ts`
* **Target Release/Milestone:** m3 (fork-only showcase)

**Required Checks:**
- [x] **Associated Ticket/Epic** link is included above.
- [x] **Feature Area/Component** is identified.
- [x] **Target Release/Milestone** is confirmed.

## Documentation & Prior Art Review

- [x] `README.md` or project documentation reviewed.
- [x] Existing architecture documentation or ADRs reviewed.
- [x] Related feature implementations or similar code reviewed.
- [x] API documentation or interface specs reviewed [if applicable].

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

- [x] `stream`, `display_data`, `execute_result`, `error` all render in the DOM (R4).
- [x] HTML tables, images, ANSI tracebacks render; HTML/SVG are sanitized.
- [x] MIME precedence prefers the richest renderable bundle; `text/plain` is the last resort.
- [x] All output component tests pass against fixtures.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 5 | - [x] Design Complete |
| **Test Plan Creation** | per-output-type + precedence + sanitization + parity-of-shape tests | - [x] Test Plan Approved |
| **TDD Implementation** | OutputRenderer + Stream/Error/Data + MIME registry | - [x] Implementation Complete |
| **Integration Testing** | DOM-env vitest against fixture IOutputs | - [x] Integration Tests Pass |
| **Documentation** | README mapping to `output-renderer.ts` | - [x] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | per-output-type (stream/error/display_data/execute_result); precedence (html over text/plain); sanitization (malicious html/svg neutralized); parity-of-shape (exactly four output_types) | - [x] Failing tests are committed and documented |
| **2. Implement Feature Code** | OutputRenderer + sub-renderers + MIME registry | - [x] Feature implementation is complete |
| **3. Run Passing Tests** | DOM-env vitest green | - [x] Originally failing tests now pass |
| **4. Refactor** | Tidy registry precedence | - [x] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` + isolation/boundary green | - [x] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A (render-only) | - [x] Performance requirements are met |

### Implementation Notes

**Test Strategy:** DOM-env vitest project (jsdom + `@testing-library/react`), TDD: tests first, against fixture `IOutput`s of the same shape `run` produces. Precedence test: a bundle with both `text/html` and `text/plain` renders the **HTML**. Sanitization test: a malicious `text/html`/`image/svg+xml` fixture is sanitized (no script execution). Parity test: dispatch covers exactly the four `output_type`s, no fifth path silently dropped.

**Key Implementation Decisions:** `data` is `unknown` (M2) — JSON-bundle MIME types (vega/plotly) carry a parsed object, so the renderer prop is widened and each renderer narrows internally. Rich-first precedence inverts `output-renderer.ts`.

## Definition of Done

**Intent (plain English):** Saved cell outputs render in the browser the way Jupyter would: print/stdout text, error tracebacks with their colors, and rich results like dataframe tables and images. When a result is available in several formats, the richest one wins (an HTML table over its plain-text fallback) — the opposite of the terminal, which prefers plain text. Anything injected as HTML or SVG is sanitized first so a notebook can't smuggle in a script.

**Observable outcomes (unfakeable):**

- [x] **Capstone:** a fixture output bundle carrying multiple MIME types renders the **richest available** (assert the `image`/`text/html` renders, not `text/plain`); and `stream`, `display_data`, `execute_result`, and `error` each render in the DOM from fixtures (real DOM assertions per type). The capstone must exercise at least one **non-`stream`** output (minimum an `error` output; ideally `execute_result`/`display_data` too) end-to-end through the real `OutputRenderer`, asserting the step-5 `data-output-pending` placeholder is **fully replaced** for all output types — not just `stream`. (Closes LUIVIEW1 zy7tn8 review-1 item L1: `OutputSlot` currently renders every non-`stream` persisted output as an empty `data-output-pending` div, silently dropping content — e.g. an `error` would show blank — until this renderer lands; the capstone must prove that gap is closed for non-`stream` types, asserting the `data-output-pending` placeholder is absent once a real output renders.)
- [x] HTML dataframe tables, images, and ANSI error tracebacks render correctly; a malicious HTML/SVG fixture is sanitized (no script execution).
- [x] MIME precedence prefers the richest renderable bundle; a `text/plain`-only bundle renders text (last resort).
- [x] Dispatch covers exactly the four `output_type`s `renderOutput` handles (parity-of-shape test passes).
- [x] All output component tests pass in the DOM-env vitest project.

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

- [x] All acceptance criteria are met and verified.
- [x] All tests are passing (unit, integration, e2e, performance).
* [ ] Code review is approved and PR is merged.
- [x] Documentation is updated (README, API docs, user guides).
* [ ] Feature is deployed to production.
* [ ] Monitoring and alerting are configured.
* [ ] Stakeholders are notified of completion.
* [ ] Follow-up actions are documented and tickets created.
* [ ] Associated ticket/epic is closed.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.


## Executor Close-out (step 6 — IOutput MIME renderer)

**Shipped** (commit on worktree branch `worktree-agent-a736a406a6f94c0ff`):

- `apps/studio/src/outputs/OutputRenderer.tsx` — DOM dispatch on `output_type`, 1:1 parity with the terminal `renderOutput`: `stream`→`StreamRenderer`, `display_data`/`execute_result`→`DataRenderer`, `error`→`ErrorRenderer`. A fifth `output_type` (`update_display_data`) renders nothing and is not mis-routed (parity-of-shape).
- `apps/studio/src/outputs/mime/registry.ts` — rich-first `MIME_PRECEDENCE` (`text/html` → `image/png`/`jpeg` → `image/svg+xml` → `text/markdown` → `text/plain` last) + `pickRenderer`. This INVERTS the terminal `output-renderer.ts` text/plain-first ordering. No renderable MIME → typed `[Output with MIME types: …]` marker (terminal-parity fallback, not blank).
- Per-MIME renderers: `HtmlMime` (DOMPurify), `SvgMime` (DOMPurify `USE_PROFILES: { svg, svgFilters }`), `makeImageMime` (png/jpeg base64 data-URI `<img>`), `MarkdownMime` (reuses the shared `renderMarkdownToSafeHtml` seam), `TextMime` (preformatted, ANSI-stripped). `StreamRenderer` (stderr styled), `ErrorRenderer` (ename/evalue + ANSI-stripped traceback). `ansi.ts` strips VT/ANSI sequences with a self-contained regex (no `node:util`, no new dep).
- Boundary: re-exported `IOutput`/`IStream`/`IDisplayData`/`IExecuteResult`/`IError` **type-only** from `packages/runtime-server/src/api-types.ts`; the SPA imports them from `@deepnote/runtime-server/types` — no `@deepnote/runtime-core` runtime edge. `api-types-no-runtime-import.test.ts` still passes (the re-export erases at compile time).
- `CodeRenderer` now mounts `OutputRenderer`; the step-5 `OutputSlot.tsx` placeholder was removed and its CodeRenderer test updated.
- README: terminal-counterpart mapping table + rich-first/sanitization/ANSI rationale. cspell.json: added `multiline`, `repr`, `sanitization`, `sanitize`, `sanitized`, `sanitizer`, `svgFilters`, `unrenderable` (could not verify locally — cspell `useGitignore` 0-files quirk under the worktree path, per card note).

**Tests proved (real DOM, jsdom + @testing-library/react — NOT fixtures-only mocks):**

- Full `apps/studio` suite: **90 passed / 15 files** (`vitest run`).
- New `src/outputs` suite (`OutputRenderer`, `DataRenderer`, `registry`, `ansi`) green: per-output-type DOM render; rich-first precedence (HTML/image win over text/plain); HTML + SVG sanitization (`<script>`/`onerror` neutralized, `window.__pwned*` stays undefined, benign table/vector survives); parity-of-shape (exactly four types); markdown/text/plain arms; unrenderable fallback.
- **Capstone** (`OutputRenderer.test.tsx`): a four-output bundle (stream + error + display_data{html>plain} + execute_result{image}) renders every type's real content through the real `OutputRenderer` and asserts `[data-output-pending]` is **absent** — closing zy7tn8 review-1 item **L1** (non-stream, specifically `error`, no longer renders blank). A second capstone asserts an `error`-only bundle renders non-empty content.
- Boundary/isolation green: `api-types-no-runtime-import` (2/2); `test-helpers/apps-studio-isolation.test.ts` (3/3 — root `tsc --listFilesOnly` names **zero** `apps/` files, no frontend dep leak, Node-free). studio `tsc --noEmit` and root `tsc -p tsconfig.json --noEmit` both exit 0. Biome clean on changed files; Prettier clean on README + cspell.json.

**Deferred:** none. No tech debt created. Items left unchecked are reviewer/closeout-owned (Code Review Approved, Deployment Plan Ready, PR merged, production deploy, monitoring, stakeholder notify, follow-up tickets, epic close).

Left in `in_progress` for the reviewer to flip.