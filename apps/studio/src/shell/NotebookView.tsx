import { BlockRenderer } from '../blocks/BlockRenderer'
import type { BlockRun } from '../execution/blockRun'
import type { BlockVM, NotebookVM } from './viewModels'

// The main pane: the active notebook rendered top-to-bottom. Blocks are mapped in their
// persisted `blocks[]` array order — the order the file saved them in is the order the
// reader sees (design Phase 2 order invariant). Keys are block ids (stable, persisted).
//
// `buildRun` (design Phase 3) is OPTIONAL: when the Shell wires execution it supplies a per-block
// run descriptor builder; `BlockRenderer` forwards the descriptor only to the executable renderers
// (`code`/`sql`). Absent → the notebook renders exactly as the s2 read-only viewer (no run
// affordance), which is what keeps the s2 shell/order tests green.
export interface NotebookViewProps {
  notebook: NotebookVM
  buildRun?: (block: BlockVM) => BlockRun
}

export function NotebookView({ notebook, buildRun }: NotebookViewProps) {
  return (
    <main className='notebook-view' aria-label={`Notebook: ${notebook.name}`}>
      <h2 className='notebook-view__title'>{notebook.name}</h2>
      <div className='notebook-view__blocks'>
        {notebook.blocks.map(block => (
          <BlockRenderer key={block.id} block={block} run={buildRun?.(block)} />
        ))}
      </div>
    </main>
  )
}
