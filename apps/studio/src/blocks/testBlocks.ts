import type { BlockVM } from '../shell/viewModels'

// Typed block factory for the renderer component tests. Mirrors the `__fixtures__`
// factory but is colocated with the block tests and covers the persisted shapes the
// registry must render — including all seven text-cell kinds and a code block carrying
// persisted `outputs`, which the shared shell fixture does not enumerate. `as BlockVM`
// keeps each literal honest against the imported `DeepnoteBlock` union (ADR-007 §6) while
// only spelling out the fields a renderer reads.
export function makeBlock(
  id: string,
  type: BlockVM['type'],
  content = '',
  extra: Record<string, unknown> = {}
): BlockVM {
  return {
    id,
    blockGroup: `g-${id}`,
    sortingKey: id,
    type,
    content,
    metadata: {},
    ...extra,
  } as BlockVM
}

// The seven `text-cell-*` kinds the design enumerates (p/h1/h2/h3/bullet/todo/callout).
export const TEXT_CELL_TYPES = [
  'text-cell-p',
  'text-cell-h1',
  'text-cell-h2',
  'text-cell-h3',
  'text-cell-bullet',
  'text-cell-todo',
  'text-cell-callout',
] as const
