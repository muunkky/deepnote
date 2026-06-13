# step 5: block-renderers code/markdown/text + BlockRenderer registry

> **Design Phase 4** (`docs/designs/m3-s2-viewer.md` ~lines 565–596). Sprint **LUIVIEW1** step 5. Establishes the type-keyed `BlockRenderer` registry (with `default` → unknown fallback) and the code / markdown / text renderers. Depends on **step 4**.

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s2 → project `block-renderers` / feature `code-markdown-text-renderers`; sprint LUIVIEW1 step 5
* **Feature Area/Component:** `apps/studio/src/blocks/BlockRenderer.tsx`, `CodeRenderer.tsx`, `MarkdownRenderer.tsx`, `TextRenderer.tsx`
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

- [x] code, markdown, and all seven text-cell kinds render from the fixture; component tests pass.
- [x] Code blocks show persisted outputs (once step 6 lands) and expose no edit/run affordance.
- [x] The `BlockRenderer` registry dispatches on `block.type` with a `default` branch in place.
- [x] Read-only assertion: rendered code block has no run/edit control (R8).

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 4 | - [x] Design Complete |
| **Test Plan Creation** | per-renderer component tests + read-only assertion | - [x] Test Plan Approved |
| **TDD Implementation** | BlockRenderer registry + Code/Markdown/Text renderers | - [x] Implementation Complete |
| **Integration Testing** | DOM-env vitest against fixture | - [x] Integration Tests Pass |
| **Documentation** | Inline | - [x] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | code renders highlighted source (+ persisted output once step 6 lands); markdown renders prose; each text-cell kind renders its structure; read-only assertion | - [x] Failing tests are committed and documented |
| **2. Implement Feature Code** | registry + Code/Markdown/Text renderers | - [x] Feature implementation is complete |
| **3. Run Passing Tests** | DOM-env vitest green | - [x] Originally failing tests now pass |
| **4. Refactor** | Tidy registry dispatch | - [x] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` + isolation/boundary green | - [x] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A (render-only) | - [x] Performance requirements are met |

### Implementation Notes

**Test Strategy:** Component tests against fixture blocks in the DOM-env vitest project (jsdom + `@testing-library/react`), TDD: tests first. Each text-cell kind (p/h1/h2/h3/bullet/todo/callout) asserts its correct DOM structure. Read-only assertion: no run control, no editable field on code.

**Key Implementation Decisions:** The registry is keyed by the exact `block.type` discriminant; the `default` branch is structurally the unknown-type fallback (the same defensive posture the terminal path has, made structural).

## Definition of Done

**Intent (plain English):** From the loaded project, code cells show their source with syntax highlighting (and their saved outputs once the output renderer lands), markdown cells read as formatted prose, and each kind of text cell — paragraph, headings, bullet, to-do, callout — renders with the right structure. A central registry picks the right renderer by block type, so adding more types later is just a registry entry. Nothing is editable or runnable.

**Observable outcomes (unfakeable):**

- [x] **Capstone:** each of **code**, **markdown**, and **text** renders correctly from the fixture *via the registry* — assert real DOM: highlighted source for code, formatted prose for markdown, and the correct structure for each of the seven text-cell kinds.
- [x] The `BlockRenderer` registry dispatches by `block.type` with a `default` branch present (placeholder until step 7D supplies the real fallback).
- [x] Read-only (R8): the rendered code block exposes no run control and no editable field.
- [x] All renderer component tests pass in the DOM-env vitest project.

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

- [x] All acceptance criteria are met and verified.
- [x] All tests are passing (unit, integration, e2e, performance).
* [ ] Code review is approved and PR is merged.
* [ ] Documentation is updated (README, API docs, user guides).
* [ ] Feature is deployed to production.
* [ ] Monitoring and alerting are configured.
* [ ] Stakeholders are notified of completion.
- [x] Follow-up actions are documented and tickets created.
* [ ] Associated ticket/epic is closed.

### Note on validation

This card follows a structured template. Keep its sections, checkboxes, and tables and fill them in rather than removing them — gitban validates card structure when the card is created and when it is completed, and a non-conforming card is held as a draft until it is corrected.


## Executor Close-out (LUIVIEW1 step 5)

**Status:** Implementation complete, all tests green, left `in_progress` for the reviewer.

**What shipped (apps/studio/src/blocks/):**
- `BlockRenderer.tsx` — replaced the placeholder with the real type-keyed registry `BLOCK_RENDERERS: Partial<Record<BlockVM['type'], FC>> & { default }`. Dispatch is `BLOCK_RENDERERS[block.type] ?? BLOCK_RENDERERS.default`, wrapped in the stable `.block`/`data-block-id`/`data-block-type` element the shell order-invariant test asserts on. The `default` branch is the structural unknown-type fallback (placeholder `UnknownBlockRenderer` with `data-block-unknown`; step 7D supplies the real one). Registration is an additive object literal — steps 7A-7D add their own key, keep-both-mergeable.
- `CodeRenderer.tsx` — highlight.js `highlightAuto` source from `block.content` (no per-block language tag exists; language lives at project/kernel level). Persisted outputs flow through `OutputSlot` (the seam step 6 swaps for the real `OutputRenderer`). Read-only (R8): renders only `<pre><code>` + output region — no `<button>`, no `<textarea>`/`<input>`, no `contenteditable`.
- `MarkdownRenderer.tsx` / `TextRenderer.tsx` — render prose via the shared `renderMarkdown.ts` seam (`marked` parse → `DOMPurify.sanitize` → `dangerouslySetInnerHTML`). `TextRenderer` reuses `@deepnote/blocks` `createMarkdown` (which delegates to `createMarkdownForTextBlock`) to derive markdown for the seven text-cell kinds — reuse via the package's PUBLIC export rather than reaching into the non-exported internal.
- `OutputSlot.tsx` — explicit placeholder seam for step 6; boundary-safe (no `@deepnote/runtime-core` runtime import), reads the minimal stream shape off `unknown`.

**Design decision — sanitization:** the design's DOMPurify-class security note targets `text/html`/SVG outputs (Phase 5). It also applies here because the markdown/text renderers inject markdown-derived HTML via `dangerouslySetInnerHTML`; `renderMarkdownToSafeHtml` sanitizes at that single seam. Tests prove `<script>`, `onerror=`, and `javascript:` payloads are stripped (markdown + text paths).

**Dependencies added** (`apps/studio/package.json`): `marked@^15.0.12`, `highlight.js@^11.11.1`, `dompurify@^3.2.7`, and `@deepnote/blocks` (workspace). `vitest.config.ts` aliases `@deepnote/blocks` → package source (worktree has no backend dist), mirroring the tsconfig `@deepnote/*` glob. `pnpm install` run; lockfile updated. cspell vocabulary added (behaviour, dompurify, gfm, highlightAuto, hljs, pwned, rendermime, tokenising).

**Tests — what they actually verified (DOM-env vitest, jsdom + RTL):**
- Full studio suite: **64 passed / 11 files** (was 6 files / 29 before). New: `renderMarkdown.test.ts`, `CodeRenderer.test.tsx`, `MarkdownRenderer.test.tsx`, `TextRenderer.test.tsx`, `BlockRenderer.test.tsx` (35 new tests).
- Capstone: code/markdown/text render correctly **from the shared `sampleProject` fixture via the registry** — real DOM assertions (hljs token spans for code, `<h*>/<p>` for markdown, fixture text for text-cell).
- All seven text-cell kinds assert their correct DOM structure (p→`<p>`, h1/h2/h3→`<hN>`, bullet→`<li>`, todo→`<li>` with disabled checkbox, callout→`<blockquote>`).
- Read-only (R8): code block has no run/edit control; to-do checkbox is `disabled`.
- Code output wiring: a persisted `stream` output reaches the DOM through `OutputSlot` (real renderer arrives step 6).

**Boundary / isolation (verified):**
- Root `tsc -p tsconfig.json --listFilesOnly` names **zero** `apps/` files (isolation invariant holds).
- No `node:` builtins in any new block file; runtime-server contract consumed type-only (via `viewModels` alias). `@deepnote/blocks` is a pure-TS runtime edge with no `node:` builtin.
- Backend boundary tests still green: `slice-integrity.test.ts` (5) + `api-types-no-runtime-import.test.ts` (2).
- Studio `tsc --noEmit` clean; Biome check clean; cspell clean on the new files (explicit-path run, bypassing the worktree gitignore quirk).

**Commits (worktree branch):** `00ef45a` (deps/config scaffold), `0ef87a5` (registry + renderers). Completion tag `LUIVIEW1-zy7tn8-done` → `0ef87a5`.

**Deferred:** none. Code's persisted-output *rendering fidelity* depends on step 6's real `OutputRenderer` (the `OutputSlot` seam is in place and tested) — this is the design's stated sequencing, not deferred scope.
