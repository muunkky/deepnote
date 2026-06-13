import type { IOutput } from '@deepnote/runtime-server/types'
import hljs from 'highlight.js/lib/common'
import { OutputRenderer } from '../outputs/OutputRenderer'
import type { BlockVM } from '../shell/viewModels'

// Renders a `sql` block read-only (design Phase 6, R8): the syntax-highlighted SQL query from
// `block.content` plus its persisted result table. There is deliberately NO run control and NO
// editable field — the SPA is a viewer; execution is out of scope for this renderer.
//
// A `sql` block always carries SQL, so we highlight with the explicit `sql` grammar (more
// faithful than auto-detection over a short query) and fall back to `highlightAuto` only when
// the `sql` language is not registered in this build of the common subset. Either way
// highlight.js escapes the source while tokenising, so the emitted markup is its own safe
// token spans — no raw `block.content` reaches the DOM unescaped.
//
// The persisted result table is NOT rendered by a bespoke table component: a SQL result is a
// persisted Jupyter output (typically a `text/html` table), so it flows through the shared
// `OutputRenderer` / MIME registry exactly like a code block's outputs — the rich-first
// precedence renders the HTML table, and the MIME registry sanitizes HTML at its own seam.
export interface SqlRendererProps {
  block: BlockVM
}

function highlightSql(source: string): string {
  // `highlight` throws if the named language is unregistered; guard so an unexpected build of
  // the common bundle degrades to auto-detection rather than crashing the viewer.
  if (hljs.getLanguage('sql')) {
    return hljs.highlight(source, { language: 'sql' }).value
  }
  return hljs.highlightAuto(source).value
}

export function SqlRenderer({ block }: SqlRendererProps) {
  const source = block.content ?? ''
  const highlighted = highlightSql(source)
  // `outputs` exists only on executable block kinds; read it defensively off the union. The
  // persisted shape is the Jupyter `IOutput` the runtime produces (the schema types it as
  // `any[]`), so we narrow to `IOutput[]` for the renderer, which dispatches per `output_type`.
  const outputs = ('outputs' in block && Array.isArray(block.outputs) ? block.outputs : []) as IOutput[]

  return (
    <div className='sql-renderer'>
      <pre className='sql-renderer__source'>
        {/* highlight.js emits sanitized token markup from escaped source. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: highlight.js output is its own escaped token spans. */}
        <code className='hljs language-sql' dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
      <OutputRenderer outputs={outputs} />
    </div>
  )
}
