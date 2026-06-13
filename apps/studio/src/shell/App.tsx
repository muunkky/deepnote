import { useCallback, useEffect, useState } from 'react'
import { formatNotebookHash, parseNotebookHash } from './hashRoute'
import { NotebookList } from './NotebookList'
import { NotebookView } from './NotebookView'
import type { ProjectVM } from './viewModels'
import { resolveActiveNotebookId } from './viewModels'

// The app shell. Owns the single piece of viewer state — which notebook is active — and
// keeps it in lockstep with `location.hash` so every view is linkable (design Phase 2).
//
// Selection ⇆ hash is bidirectional but single-sourced through `activeNotebookId`:
//   • mount / hashchange → derive the active id from the hash (resolveActiveNotebookId
//     applies the `valid-id → initNotebookId → first` precedence);
//   • a click → set state AND write the hash; the hashchange that the write triggers
//     resolves back to the same id, so there is no loop.
//
// The project arrives as a prop. Step 3 passes the in-memory `: ApiProject` fixture; step 4
// swaps in the project fetched from the s1 server with no change to this shell.
export interface AppProps {
  project: ProjectVM
}

function readHashId(): string | undefined {
  return parseNotebookHash(window.location.hash)
}

export function App({ project }: AppProps) {
  const [activeNotebookId, setActiveNotebookId] = useState<string | undefined>(() =>
    resolveActiveNotebookId(project, readHashId())
  )

  // Keep state in sync with browser-driven hash changes (back/forward, manual edit, a
  // pasted deep link landing after mount).
  useEffect(() => {
    const onHashChange = () => {
      setActiveNotebookId(resolveActiveNotebookId(project, readHashId()))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [project])

  const handleSelect = useCallback(
    (notebookId: string) => {
      setActiveNotebookId(resolveActiveNotebookId(project, notebookId))
      window.location.hash = formatNotebookHash(notebookId)
    },
    [project]
  )

  const activeNotebook = project.notebooks.find(nb => nb.id === activeNotebookId)

  return (
    <div className='app'>
      <header className='app__header'>
        <h1 className='app__title'>{project.name}</h1>
      </header>
      <div className='app__body'>
        <NotebookList notebooks={project.notebooks} activeNotebookId={activeNotebookId} onSelect={handleSelect} />
        {activeNotebook ? (
          <NotebookView notebook={activeNotebook} />
        ) : (
          <main className='notebook-view notebook-view--empty' aria-label='No notebook'>
            <p>This project has no notebooks.</p>
          </main>
        )}
      </div>
    </div>
  )
}
