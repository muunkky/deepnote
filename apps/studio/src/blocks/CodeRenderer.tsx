import type { IOutput } from '@deepnote/runtime-server/types'
import hljs from 'highlight.js/lib/common'
import { type BlockRun, hasSessionRun } from '../execution/blockRun'
import { RunControl } from '../execution/RunControl'
import { OutputRenderer } from '../outputs/OutputRenderer'
import type { BlockVM } from '../shell/viewModels'

// Renders a `code` block (design Phase 4 / Phase 3): syntax-highlighted source from `block.content`
// plus its outputs. The `run` prop is OPTIONAL and ADDITIVE: without it the renderer keeps its s2
// read-only posture (no control, persisted outputs only) — exactly the behaviour the s2 tests pin.
// With it the renderer gains a Run control and selects LIVE session outputs over persisted while a
// session run exists for the block (KD-3 replace-on-start), through the SAME `OutputRenderer` (R2 —
// no second output renderer).
//
// Highlighting uses highlight.js `highlightAuto` because the persisted block carries no
// per-block language tag (language lives at the project/kernel level); auto-detection over
// the common-language subset is the safe default. highlight.js escapes the source while
// tokenising, so the emitted markup is its own safe token spans — no raw `block.content`
// reaches the DOM unescaped.
export interface CodeRendererProps {
  block: BlockVM
  /** Run state + trigger; absent → the s2 read-only behaviour (no control, persisted outputs). */
  run?: BlockRun
}

export function CodeRenderer({ block, run }: CodeRendererProps) {
  const source = block.content ?? ''
  const { value: highlighted } = hljs.highlightAuto(source)
  // `outputs` exists only on executable block kinds; read it defensively off the union. The
  // persisted shape is the Jupyter `IOutput` the runtime produces (the schema types it as
  // `any[]`), so we narrow to `IOutput[]` for the renderer, which dispatches per `output_type`.
  const persisted = ('outputs' in block && Array.isArray(block.outputs) ? block.outputs : []) as IOutput[]
  // Live session outputs replace persisted while a session run owns this block (KD-3).
  const outputs = run !== undefined && hasSessionRun(run) ? run.outputs : persisted

  return (
    <div className='code-renderer'>
      {run !== undefined ? (
        <div className='code-renderer__toolbar'>
          <RunControl status={run.status} canRun={run.canRun} onRun={run.onRun} />
        </div>
      ) : null}
      <pre className='code-renderer__source'>
        {/* highlight.js emits sanitized token markup from escaped source. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: highlight.js output is its own escaped token spans. */}
        <code className='hljs' dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
      <OutputRenderer outputs={outputs} />
    </div>
  )
}
