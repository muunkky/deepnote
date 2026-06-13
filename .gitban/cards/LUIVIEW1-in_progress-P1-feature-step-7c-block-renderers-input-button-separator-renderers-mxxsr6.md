# step 7C: block-renderers input / button / separator renderers

> **Design Phase 8a** (`docs/designs/m3-s2-viewer.md` ~lines 706–751). Sprint **LUIVIEW1** step 7C — part of the parallel batch (7A/7B/7C/7D). **PACKED CARD: 3 renderer groups** (input — eight kinds, button, separator). Depends on **step 6**. **Additive registration:** each renderer lives in its own file and registers its type **additively** into the `BlockRenderer` registry — merges with sibling 7x cards are keep-both. All read-only (R8).

## Feature Overview & Context

* **Associated Ticket/Epic:** roadmap m3/s2 → project `block-renderers` / feature `input-button-separator-renderers`; sprint LUIVIEW1 step 7C
* **Feature Area/Component:** `apps/studio/src/blocks/inputs/` (8 kinds), `ButtonRenderer.tsx`, `SeparatorRenderer.tsx`
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
| **Architecture Docs** | ADR-006 | Additive registry entries; read-only inputs (no interactivity) |
| **Design Doc** | `docs/designs/m3-s2-viewer.md` Phase 8a (~706–751) | eight input kinds + button + separator deliverables |
| **Similar Features** | `createMarkdownForSeparatorBlock` (`<hr>`) | Reused for the separator |

### Required Reading

| Source | Location | Why |
| :--- | :--- | :--- |
| Design Phase 8a | `docs/designs/m3-s2-viewer.md` ~706–751 | Goal / Deliverables / Test strategy / DoD lifted into this card |
| Interface (BlockRenderer) | `docs/designs/m3-s2-viewer.md` ~341–350 | Additive registry entries by `block.type` |
| s1 `ApiProject` type | `@deepnote/runtime-server/types` (`packages/runtime-server/src/api-types.ts`) | input/button/separator block shapes + `deepnote_variable_value` |
| ADR-006 / ADR-007 | `docs/adr/ADR-006-*.md`, `docs/adr/ADR-007-*.md` | Isolation + boundary |

## Design & Planning

### Initial Design Thoughts & Requirements

* Deliverable: `src/blocks/inputs/` — eight read-only input renderers (text, textarea, checkbox, select, slider, date, date-range, file), each showing its **current persisted value** from `deepnote_variable_value` (no interactivity — read-only, R8): slider shows its value/position, select the chosen option(s), checkbox its checked state, date its date, file its filename.
* Deliverable: `ButtonRenderer.tsx` (renders the button label, disabled/non-firing — read-only).
* Deliverable: `SeparatorRenderer.tsx` (a horizontal rule — reuse `createMarkdownForSeparatorBlock`'s `<hr>`).
* Deliverable: **additive** registry entries for each type (own files; keep-both merge with sibling 7x cards).
* Constraint (R8): no interactive control that would mutate state; button does not fire on click.

### Acceptance Criteria

- [x] All eight input kinds, button, and separator render their persisted state read-only; tests pass.
- [x] Each input exposes no interactive control that would mutate state (R8).
- [x] Button renders its label and does not fire on click; separator renders a rule.
- [x] Each renderer registered additively (own file) into the registry.

## Feature Work Phases

| Phase / Task | Status / Link to Artifact or Card | Universal Check |
| :--- | :--- | :---: |
| **Design & Architecture** | Design Phase 8a | - [x] Design Complete |
| **Test Plan Creation** | per-input-kind + button + separator component tests | - [x] Test Plan Approved |
| **TDD Implementation** | 8 inputs + Button + Separator + additive registry entries | - [x] Implementation Complete |
| **Integration Testing** | DOM-env vitest against fixture | - [x] Integration Tests Pass |
| **Documentation** | Inline | - [x] Documentation Complete |
| **Code Review** | gitban-reviewer | - [ ] Code Review Approved |
| **Deployment Plan** | Fork-only; no deploy | - [ ] Deployment Plan Ready |

## TDD Implementation Workflow

| Step | Status/Details | Universal Check |
| :---: | :--- | :---: |
| **1. Write Failing Tests** | each input kind renders its current value read-only (no mutating control); button renders label + does not fire on click; separator renders a rule | - [x] Failing tests are committed and documented |
| **2. Implement Feature Code** | 8 inputs + Button + Separator + additive registry entries | - [x] Feature implementation is complete |
| **3. Run Passing Tests** | DOM-env vitest green | - [x] Originally failing tests now pass |
| **4. Refactor** | Tidy | - [x] Code is refactored for clarity and maintainability |
| **5. Full Regression Suite** | `pnpm test` + isolation/boundary green | - [x] All tests pass (unit, integration, e2e) |
| **6. Performance Testing** | N/A (render-only) | - [x] Performance requirements are met |

### Implementation Notes

**Test Strategy:** Component tests against fixtures in the DOM-env vitest project (jsdom + `@testing-library/react`), TDD: tests first, one test per input kind asserting its persisted value renders read-only. **Additive registration:** each renderer registers its own type in its own file; merges with 7A/7B/7D are keep-both.

**Key Implementation Decisions:** Read-only (R8) — inputs show value but expose no state-mutating control; button is disabled/non-firing.

## Definition of Done

**Intent (plain English):** Every kind of interactive widget in a notebook — text boxes, checkboxes, dropdowns, sliders, date pickers, file pickers, buttons, and separators — shows its last-saved state, but you can't change it. A slider sits at its saved position, a checkbox shows whether it was checked, a button shows its label but does nothing when clicked, and a separator draws a line.

**Observable outcomes (unfakeable) — PER RENDERER:**

- [x] **Capstone (input):** an input block renders its label + current persisted value from `deepnote_variable_value` (assert in real DOM, for the input kinds in the fixture), with no mutating control.
- [x] **Capstone (button):** a `button` block renders its label (assert in real DOM) and does not fire on click.
- [x] **Capstone (separator):** a `separator` block renders a divider/`<hr>` (assert the rule element in real DOM).
- [x] All eight input kinds render their persisted value read-only (R8) — no control that would mutate state.
- [x] Each of input/button/separator is registered additively from its own file into the registry.

## Validation & Closeout

| Task | Detail/Link |
| :--- | :--- |
| **Code Review** | gitban-reviewer approval |
| **QA Verification** | inputs/button/separator render from fixture read-only |
| **Staging Deployment** | N/A (fork-only) |
| **Production Deployment** | N/A (fork-only) |
| **Monitoring Setup** | N/A |

### Follow-up & Lessons Learned

| Topic | Status / Action Required |
| :--- | :--- |
| **Postmortem Required?** | No |
| **Further Investigation?** | No |
| **Technical Debt Created?** | No |
| **Future Enhancements** | Interactivity (binding inputs to execution) is P3/P4, out of scope |

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


## Close-out — step 7C (executor cycle 1)

**Shipped (commit 56da693, tag `LUIVIEW1-mxxsr6-done`):** three read-only renderer groups for the persisted, non-interactive form of the interactive block types (design Phase 8a, R8), all additively registered.

**Eight input renderers** — `apps/studio/src/blocks/inputs/` (one file per kind + `index.ts` barrel + shared `InputFieldShell.tsx`):
- `input-text`, `input-textarea`, `input-select`, `input-date`, `input-date-range`, `input-file` → static text display of the persisted `deepnote_variable_value` (label from `deepnote_input_label`, falling back to `deepnote_variable_name`). Select joins multi-value arrays; date-range joins the `[start, end]` tuple or shows the relative-range string; file shows the filename (or "No file selected").
- `input-checkbox` → a real `<input type=checkbox>` reflecting the checked state, but **`disabled` + `readOnly`, no change handler**.
- `input-slider` → the numeric value as text + position via a native non-interactive `<progress>` (offset by min so non-zero-based ranges position correctly).
- Read-only invariant is asserted per test via `assertNoMutatingControl`: no `<select>`/`<textarea>`/enabled `<input>`; the only `<input>` allowed is a disabled checkbox.

**`ButtonRenderer.tsx`** — persisted `deepnote_button_title` (fallback "Button") on a `disabled` `<button>` with **no `onClick`**; clicking is inert (no execution, no state mutation).

**`SeparatorRenderer.tsx`** — a native `<hr data-separator>` rule (the persisted `'<hr>'` markdown form from `@deepnote/blocks` `createMarkdownForSeparatorBlock`).

**Additive registration:** appended exactly the ten keys (`input-*` ×8, `button`, `separator`) into the `BLOCK_RENDERERS` object literal in `BlockRenderer.tsx`; dispatch logic untouched — keep-both-mergeable with siblings 7A/7B/7D. The pre-existing `BlockRenderer.test.tsx` fallback test used `separator` as its "unregistered" placeholder; since 7C registers it, that one assertion was repointed to a synthetic `future-block` type so the unknown-fallback invariant stays honest. That is the only edit to a sibling-shared test file.

**Per-renderer capstones (real DOM, jsdom + RTL, from fixtures — NOT mocked):**
- Capstone (input): `InputRenderers.test.tsx` asserts label + persisted `deepnote_variable_value` render with no mutating control.
- Capstone (button): `ButtonRenderer.test.tsx` asserts the label in real DOM, `disabled`, `onclick === null`, and a fired click is inert.
- Capstone (separator): `SeparatorRenderer.test.tsx` asserts the `<hr>` element.
- `BlockRenderer.inputs.test.tsx` additionally asserts all ten keys dispatch through the PUBLIC `BlockRenderer` (not the unknown fallback) and that sibling keys (code/markdown/text/default) remain registered.

**Verification (run in worktree):**
- `vitest run src/blocks/` → **57 tests / 9 files passed** (29 new + 28 pre-existing). Constrained-box env vars applied.
- `tsc --noEmit -p apps/studio/tsconfig.json` → clean.
- Isolation invariant: root `tsc -p tsconfig.json --listFilesOnly` names **zero** `apps/` files (ADR-006/007).
- No `node:` builtins in any new file; `@deepnote/blocks` consumed type-only via `BlockVM` (ADR-007 §6 boundary).
- `biome check` clean on all touched files; `cspell` clean on the new files (no new vocabulary → no `cspell.json` edit needed). Note: `pnpm spell-check` reports "0 files" in-worktree (gitignore quirk), so spelling was verified via a direct cspell glob instead.

**Scope honesty:** tests exercise jsdom fixtures (the project's DOM-env vitest project), not a live `deepnote serve` render. That matches the design's per-component test strategy for this phase; the full-coverage (R3) and time-to-first-render (R7) end-to-end checks belong to Phase 8's closeout, not this packed card.

**Deferred:** the README block-type coverage-matrix note (design Phase 8 "Documentation") is shared territory with 7D's unknown-fallback and is left to the Phase 8 closeout to avoid colliding with sibling README prose; this card's documentation is inline doc-comments per its card spec.

Left in `in_progress` for the reviewer.
