import type { FC } from 'react'
import type { BlockVM } from '../shell/viewModels'
import { CodeRenderer } from './CodeRenderer'
import { MarkdownRenderer } from './MarkdownRenderer'
import { TextRenderer } from './TextRenderer'

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

// The unknown-type fallback. Step 7D supplies the real `UnknownBlockRenderer` (a labelled,
// graceful "unsupported block" card); until then this placeholder keeps the `default`
// branch structurally present and identifiable in the DOM (`data-block-unknown`).
const UnknownBlockRenderer: BlockRendererComponent = ({ block }) => (
  <div className='block__unknown' data-block-unknown='true'>
    <span className='block__type'>{block.type}</span>
  </div>
)

export const BLOCK_RENDERERS: Partial<Record<BlockVM['type'], BlockRendererComponent>> & {
  default: BlockRendererComponent
} = {
  code: CodeRenderer,
  markdown: MarkdownRenderer,
  'text-cell-p': TextRenderer,
  'text-cell-h1': TextRenderer,
  'text-cell-h2': TextRenderer,
  'text-cell-h3': TextRenderer,
  'text-cell-bullet': TextRenderer,
  'text-cell-todo': TextRenderer,
  'text-cell-callout': TextRenderer,
  default: UnknownBlockRenderer,
}

// Dispatches a persisted block to its registered renderer, wrapped in a stable element that
// carries the `.block` / `data-block-id` / `data-block-type` hooks the shell's order test
// asserts against (persisted `blocks[]` order == rendered DOM order, design Phase 2). The
// wrapper is renderer-agnostic, so the order invariant holds no matter which concrete
// renderer fires.
export function BlockRenderer({ block }: BlockRendererProps) {
  const Renderer = BLOCK_RENDERERS[block.type] ?? BLOCK_RENDERERS.default
  return (
    <div className='block' data-block-id={block.id} data-block-type={block.type}>
      <Renderer block={block} />
    </div>
  )
}
