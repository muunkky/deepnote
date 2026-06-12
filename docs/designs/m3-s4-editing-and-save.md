# Design Doc: m3/s4 — Edit blocks & save safely (per-type editors + atomic `.deepnote` persistence)

> **Status**: 🚧 **STUB / DRAFT** — skeleton only; to be fleshed out before the `m3/s4` sprint is architected. | **ADRs**: _none yet_ (reuses ADR-005/006/007 from s1–s3) | **PRD**: [PRD-003](../prds/PRD-003-local-deepnote-ui.md) (m3 master, Phase P4) | **Date**: 2026-06-12 | **Author**: muunkky

## Overview

This design will implement **PRD-003 Phase P4** — roadmap story [`m3/s4`](../prds/PRD-003-local-deepnote-ui.md),
"Edit blocks & save safely." It is the editable counterpart to the read-only s2 viewer: per-type
editors for the editable block types, structural add/delete/reorder, and a **safe save** back to the
`.deepnote` file. Save is the single most data-loss-prone operation in the product, so the central
engineering concern here is **persistence safety**, not editor ergonomics.

The save-safety primitive itself already ships in **s1** (the `save-api` feature: `serializeDeepnoteFile`
with the semantic round-trip + idempotence gate, _before any editing UI exists_). s4 consumes that
gate from the browser and adds the two things s1 deliberately left out: **atomic write**
(write-temp-then-rename) and **external-change detection** (refuse to clobber a file edited on disk
since it was opened).

> _This is a stub. The detailed editor model, the dirty-state / save-trigger policy, the
> external-change conflict UX, and the per-block-type edit affordances are TBD and will be worked
> out here before sprint-card creation._

## Scope (from the roadmap)

Story `m3/s4` decomposes into two projects:

- **`block-editors` — Per-type block editors + structural edits**
  - Code / SQL editor — per-type source editors with language-appropriate affordances.
  - Markdown / text editor — per-type source editors.
  - Input config / value editor — editing both configuration and current value across the eight input kinds.
  - Add / delete / reorder blocks — structural editing of the notebook.
- **`persistence` — Safe save back to `.deepnote`**
  - Serialize + save round-trip — save via `serializeDeepnoteFile`; re-deserialize deep-equals the saved project; idempotent no-op save. Reuses the s1 `save-api` gate.
  - Atomic write + external-change detection — write-temp-then-rename (no partial/corrupt file on interruption); detect external edits and warn rather than silently clobber.

## Success criteria (from the roadmap)

- Faithful persistence: edit N blocks, save, re-deserialize — saved project deep-equals the in-UI project; only the user's edits (plus any first-pass canonicalization) appear in the diff.
- A no-op save is idempotent: a second save with no edits produces an empty git diff.
- Save is atomic (write-temp-then-rename) — no partial/corrupt file on interruption.
- External-change conflict is detected and warned, not silently clobbered, when the `.deepnote` file changed on disk since it was opened.
- Per-type editors exist for code, sql, markdown/text, and input values; blocks can be added, deleted, and reordered.

## Open questions (to resolve before sprint)

- **Save trigger** — explicit save vs autosave-on-idle vs both; how dirty-state is tracked per block and per project.
- **External-change conflict UX** — reload / overwrite / diff-and-merge; what the warning surface looks like and whether a merge is even attempted (likely not in P4).
- **Editor stack** — what code/SQL editor component is used and how it stays inside the `apps/studio` toolchain-isolation boundary (ADR-006).
- **Structural-edit data model** — how add/delete/reorder mutate app state and map back through `serializeDeepnoteFile` without disturbing untouched blocks.
