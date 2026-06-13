import { BlockRenderer } from '../blocks/BlockRenderer'
import type { NotebookVM } from './viewModels'

// The main pane: the active notebook rendered top-to-bottom. Blocks are mapped in their
// persisted `blocks[]` array order — the order the file saved them in is the order the
// reader sees (design Phase 2 order invariant). Keys are block ids (stable, persisted).
export interface NotebookViewProps {
  notebook: NotebookVM
}

export function NotebookView({ notebook }: NotebookViewProps) {
  return (
    <main className='notebook-view' aria-label={`Notebook: ${notebook.name}`}>
      <h2 className='notebook-view__title'>{notebook.name}</h2>
      <div className='notebook-view__blocks'>
        {notebook.blocks.map(block => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </div>
    </main>
  )
}
