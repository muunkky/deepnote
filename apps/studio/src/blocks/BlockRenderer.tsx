import type { FC } from 'react'
import type { BlockVM } from '../shell/viewModels'
import { BigNumberRenderer } from './BigNumberRenderer'
import { ButtonRenderer } from './ButtonRenderer'
import { CodeRenderer } from './CodeRenderer'
import { ImageRenderer } from './ImageRenderer'
import {
  InputCheckboxRenderer,
  InputDateRangeRenderer,
  InputDateRenderer,
  InputFileRenderer,
  InputSelectRenderer,
  InputSliderRenderer,
  InputTextareaRenderer,
  InputTextRenderer,
} from './inputs'
import { MarkdownRenderer } from './MarkdownRenderer'
import { SeparatorRenderer } from './SeparatorRenderer'
import { SqlRenderer } from './SqlRenderer'
import { TextRenderer } from './TextRenderer'
import { UnknownBlockRenderer } from './UnknownBlockRenderer'
import { VisualizationRenderer } from './VisualizationRenderer'

export interface BlockRendererProps {
  block: BlockVM
}

// The type-keyed renderer registry (design Phase 4 / Interface ~341-350). A
// `Partial<Record<BlockVM['type'], FC>>` plus a `default` branch reserved for the
// unknown-type fallback. Dispatch is `registry[block.type] ?? registry.default` — the same
// defensive posture the terminal/CLI path takes for an unhandled block, made *structural*
// here so an unregistered type can never crash the viewer.
//
// ── Additive seam (steps 7A-7D) ──
// This card registers `code`, `markdown`, and the seven `text-cell-*` kinds. Later steps
// (sql, visualization, big-number, image, input/…) each register their OWN key into THIS
// object. Adding a renderer is a one-line entry — no edit to the dispatch logic — so the
// later cards' diffs are keep-both-mergeable additions to the literal, never a rewrite.
type BlockRendererComponent = FC<BlockRendererProps>

// The `default` branch is the unknown-type fallback — step 7D supplies the real
// `UnknownBlockRenderer` (its own file: a labelled, graceful "unsupported block type" card
// that renders the block's raw persisted content alongside the type label and never throws),
// replacing the step-5 placeholder.
export const BLOCK_RENDERERS: Partial<Record<BlockVM['type'], BlockRendererComponent>> & {
  default: BlockRendererComponent
} = {
  code: CodeRenderer,
  markdown: MarkdownRenderer,
  sql: SqlRenderer,
  'text-cell-p': TextRenderer,
  'text-cell-h1': TextRenderer,
  'text-cell-h2': TextRenderer,
  'text-cell-h3': TextRenderer,
  'text-cell-bullet': TextRenderer,
  'text-cell-todo': TextRenderer,
  'text-cell-callout': TextRenderer,
  // ── step 7A/7B: sql, visualization, big-number, image ──
  visualization: VisualizationRenderer,
  'big-number': BigNumberRenderer,
  image: ImageRenderer,
  // ── step 7C: read-only input / button / separator renderers (own files) ──
  'input-text': InputTextRenderer,
  'input-textarea': InputTextareaRenderer,
  'input-checkbox': InputCheckboxRenderer,
  'input-select': InputSelectRenderer,
  'input-slider': InputSliderRenderer,
  'input-date': InputDateRenderer,
  'input-date-range': InputDateRangeRenderer,
  'input-file': InputFileRenderer,
  button: ButtonRenderer,
  separator: SeparatorRenderer,
  default: UnknownBlockRenderer,
}

// Dispatches a persisted block to its registered renderer, wrapped in a stable element that
// carries the `.block` / `data-block-id` / `data-block-type` hooks the shell's order test
// asserts against (persisted `blocks[]` order == rendered DOM order, design Phase 2). The
// wrapper is renderer-agnostic, so the order invariant holds no matter which concrete
// renderer fires.
export function BlockRenderer({ block }: BlockRendererProps) {
  // `Object.hasOwn`, not a bare `registry[type] ?? default`: the persisted `block.type` is
  // untrusted at runtime (fetchProject casts the wire JSON; no schema validation), so a
  // block whose `type` names an inherited Object.prototype member ("constructor", "toString",
  // "hasOwnProperty", …) would otherwise resolve to that prototype function — truthy, so the
  // `?? default` fallback never fires and React tries to render `<Object>` and throws, blanking
  // the whole notebook. Own-key lookup keeps the "an unknown type can never crash the viewer"
  // invariant honest for every string, not just non-prototype ones.
  const Renderer = Object.hasOwn(BLOCK_RENDERERS, block.type)
    ? (BLOCK_RENDERERS[block.type] ?? BLOCK_RENDERERS.default)
    : BLOCK_RENDERERS.default
  return (
    <div className='block' data-block-id={block.id} data-block-type={block.type}>
      <Renderer block={block} />
    </div>
  )
}
