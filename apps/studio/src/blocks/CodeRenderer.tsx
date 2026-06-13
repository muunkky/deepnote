import type { IOutput } from '@deepnote/runtime-server/types'
import hljs from 'highlight.js/lib/common'
import { OutputRenderer } from '../outputs/OutputRenderer'
import type { BlockVM } from '../shell/viewModels'

// Renders a `code` block read-only (design Phase 4, R8): syntax-highlighted source from
// `block.content` plus its persisted outputs. There is deliberately NO run control and NO
// editable field — the SPA is a viewer; execution is out of scope for this renderer.
//
// Highlighting uses highlight.js `highlightAuto` because the persisted block carries no
// per-block language tag (language lives at the project/kernel level); auto-detection over
// the common-language subset is the safe default for a read-only view. highlight.js escapes
// the source while tokenising, so the emitted markup is its own safe token spans — no raw
// `block.content` reaches the DOM unescaped.
export interface CodeRendererProps {
  block: BlockVM
}

export function CodeRenderer({ block }: CodeRendererProps) {
  const source = block.content ?? ''
  const { value: highlighted } = hljs.highlightAuto(source)
  // `outputs` exists only on executable block kinds; read it defensively off the union. The
  // persisted shape is the Jupyter `IOutput` the runtime produces (the schema types it as
  // `any[]`), so we narrow to `IOutput[]` for the renderer, which dispatches per `output_type`.
  const outputs = ('outputs' in block && Array.isArray(block.outputs) ? block.outputs : []) as IOutput[]

  return (
    <div className='code-renderer'>
      <pre className='code-renderer__source'>
        {/* highlight.js emits sanitized token markup from escaped source. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: highlight.js output is its own escaped token spans. */}
        <code className='hljs' dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
      <OutputRenderer outputs={outputs} />
    </div>
  )
}
