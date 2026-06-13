---
verdict: APPROVAL
card_id: k61ziu
review_number: 1
commit: 7adf27b
date: 2026-06-13
has_backlog_items: true
---

# Review: step-6 Jupyter IOutput MIME renderer (LUIVIEW1 k61ziu)

## Verdict: APPROVAL

The step-6 OutputRenderer cleanly replaces the step-5 `OutputSlot` placeholder with a
data-driven, rich-first MIME registry. Architecture is sound, the security posture is
correct, the boundary invariant holds, and the strengthened capstone is real (not mocked
glue). Verified independently below.

## Gate 1 — Completion claim

PASS. The card requires a DoD (it touches public component contracts, control flow, and a
package-boundary type re-export) and has a strong one:

- **Intent** is plain-English and outside-the-code: outputs render the way Jupyter would,
  richest representation wins (inverting the terminal), HTML/SVG sanitized first. A reasonable
  engineer can sanity-check the diff against it.
- **Capstone is genuine and unfakeable.** It exercises a four-output bundle (stream + error +
  display_data{html>plain} + execute_result{image}) end-to-end through the *real*
  `OutputRenderer`, asserts the richest representation renders (not text/plain), and asserts
  `[data-output-pending]` is **absent** for every type — specifically proving the non-`stream`
  (error) path no longer renders blank. This directly closes the folded-in zy7tn8 review-1 L1
  gap. A second capstone proves an `error`-only bundle renders non-empty content.
- **Observables** are user-observable DOM assertions, not implementation-detail checks.
- Checkbox design proves correctness if honestly checked; integrity verified by re-running the
  suite (below).

## Gate 2 — Implementation quality

Read the full diff (23 files) and cross-referenced against the terminal counterpart
(`packages/cli/src/output-renderer.ts`), ADR-006/007 boundary, and the markdown seam.

**Architecture / parity.** `OutputRenderer` dispatches on exactly the four `output_type`s the
terminal `renderOutput` handles — confirmed 1:1 against the terminal type guards (stream /
display_data / execute_result / error). A fifth type (`update_display_data`) returns `null`
rather than being mis-routed, and the parity-of-shape test asserts it renders nothing AND
matches no other renderer's selector. The `[Output with MIME types: …]` unrenderable fallback
mirrors the terminal's exactly (verified line 69 of the terminal renderer). The precedence
inversion is real: terminal prefers `text/plain` (line 48–49); the registry demotes it to last
in `MIME_PRECEDENCE`. Honest claim.

**Security (the load-bearing concern).** Every live-markup injection path is DOMPurify-sanitized
before `dangerouslySetInnerHTML`:
- `HtmlMime` — `DOMPurify.sanitize(html)`.
- `SvgMime` — `DOMPurify.sanitize(svg, { USE_PROFILES: { svg, svgFilters } })`.
- `MarkdownMime` — funnels through the shared `renderMarkdownToSafeHtml` seam, which I read and
  confirmed calls `DOMPurify.sanitize` after `marked.parse` (no per-renderer re-derivation — DRY).
- `ImageMime` / `TextMime` / `StreamRenderer` / `ErrorRenderer` correctly need no sanitizer:
  base64 in an `<img src>` data-URI is opaque (not parsed as a document), and text reaches the
  DOM as escaped React text nodes. The code comments name this distinction explicitly — good.
Sanitization is proven by tests, not just asserted: malicious `<script>`/`onerror` HTML and an
embedded-`<script>` SVG both leave `window.__pwned_*` undefined while benign table/vector content
survives.

**Boundary invariant.** The `export type { IDisplayData, IError, IExecuteResult, IOutput, IStream }`
re-export in `api-types.ts` is fully type-only. I re-ran `api-types-no-runtime-import.test.ts`
(2/2 pass) — its AST + transpile-erasure checks confirm the module emits zero runtime
import/require, so the SPA types against the canonical `IOutput` shape with no `runtime-core`
runtime edge. ADR-006/007 isolation holds.

**TDD discipline.** Tests are contract-defining, not reverse-engineered: per-output-type DOM
render, rich-first precedence (HTML/image win over text/plain), sanitization negative cases,
parity-of-shape, ANSI-strip on a realistic escape-coded traceback, empty-array no-op, and the
unrenderable marker. Failure/edge cases present throughout — not happy-path-only. Fixtures are
shaped as real persisted `IOutput`s (typed against the imported nbformat union), not bespoke
literals.

**ANSI handling.** The self-contained `ansi.ts` regex replaces the terminal's
`node:util` `stripVTControlCharacters` (which the SPA cannot import under the isolation
invariant). Justified, scoped, zero new dep, and the test proves CSI/SGR sequences are stripped
from a traceback while the text survives. Not a lazy solve.

**DaC.** README updated with the terminal-counterpart mapping + rich-first/sanitization
rationale. Inline comments are high-quality and explain the non-obvious decisions (why no
sanitizer on images, why `join('')` not `join('\n')`, the precedence inversion).

**Independent verification run:**
- `apps/studio` suite: 90 passed / 15 files (matches attestation).
- `api-types-no-runtime-import.test.ts`: 2/2 (boundary intact with the new re-export).
- `apps/studio` typecheck (`tsc --noEmit`): exit 0.
- dompurify (^3.2.7) and marked (^15.0.12) are declared deps; `@deepnote/runtime-server` is a
  workspace dep — the type-only subpath import is legitimate.

No blockers.

## FOLLOW-UP

- **L1 (`coverage-gap`):** `coerceMultilineString` returns `undefined` for the array form only
  when *every* element is a string; a mixed `(string | object)[]` MIME value would coerce to
  `undefined` and render nothing (silent drop). Realistically Jupyter text MIME values are
  homogeneous `MultilineString`, so this is latent, not live — but there is no test for the
  array-of-strings path of `coerceMultilineString` itself (only the scalar-string paths are
  exercised through the renderers). A direct unit test for the `string[]` join behavior and the
  mixed-array `undefined` path would lock the contract the comment describes.

- **L2 (`styling-gap`):** Every renderer emits semantic class names (`output-stream--stderr`,
  `output-error`, `output-mime--html`, etc.) and `data-*` hooks, but no stylesheet in this slice
  binds them — stderr is "visually distinguished" only by an unstyled modifier class. The DOM
  contract is correct and test-asserted; the actual visual distinction (stderr color, error red)
  is deferred to whatever CSS layer steps 7A–7D or a theming card lands. Worth an explicit
  tracking item so the styling hooks don't sit dormant.

- **L3 (`consumer-narrowing`):** `CodeRenderer` casts `block.outputs` to `IOutput[]` (the schema
  types it `any[]`). The cast is reasonable and commented, but nothing validates the persisted
  shape at the seam — a malformed persisted output (missing `output_type`) would fall through
  `renderOne` to `null` (safe) but silently. Acceptable for a read-only viewer; a future
  schema-validation pass at the project-load boundary would make the narrowing honest rather than
  asserted.
