import type { BlockVM } from '../shell/viewModels'

// Placeholder block renderer. The real type-keyed renderer registry arrives in steps 5–7D
// (design Phases 4–8); here every block renders the same labelled stub so the shell +
// routing can be proven against a project's full block tree without any renderer work.
// The `data-block-id` / `data-block-type` hooks let the order test assert that rendered DOM
// order equals persisted `blocks[]` array order.
export interface BlockRendererProps {
  block: BlockVM
}

export function BlockRenderer({ block }: BlockRendererProps) {
  return (
    <div className='block' data-block-id={block.id} data-block-type={block.type}>
      <span className='block__type'>{block.type}</span>
    </div>
  )
}
