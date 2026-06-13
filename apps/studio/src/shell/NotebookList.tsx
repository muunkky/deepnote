import type { NotebookVM } from './viewModels'

// The left-hand notebook list. Each entry is a real <button> (keyboard-focusable, a11y
// by construction) that selects its notebook; the parent App owns selection + routing.
// `aria-current="page"` marks the active entry so the routing test can read selection
// straight off the DOM rather than off component internals.
export interface NotebookListProps {
  notebooks: readonly NotebookVM[]
  activeNotebookId: string | undefined
  onSelect: (notebookId: string) => void
}

export function NotebookList({ notebooks, activeNotebookId, onSelect }: NotebookListProps) {
  return (
    <nav className='notebook-list' aria-label='Notebooks'>
      <ul className='notebook-list__items'>
        {notebooks.map(notebook => {
          const isActive = notebook.id === activeNotebookId
          return (
            <li key={notebook.id} className='notebook-list__item'>
              <button
                type='button'
                className='notebook-list__link'
                aria-current={isActive ? 'page' : undefined}
                data-notebook-id={notebook.id}
                onClick={() => onSelect(notebook.id)}
              >
                {notebook.name}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
