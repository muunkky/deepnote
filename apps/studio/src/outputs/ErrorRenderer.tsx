import type { IError } from '@deepnote/runtime-server/types'
import { stripAnsi } from './ansi'

// `error` output renderer — `ename: evalue` header plus the traceback (design Phase 5).
// Mirrors the terminal `renderErrorOutput`: the traceback lines are ANSI-stripped (Jupyter
// emits colour-coded tracebacks) and rendered as preformatted text. The whole block is
// flagged `data-output-error` / styled `--error` so a failed cell reads as an error in the
// DOM the way the terminal renders it red. Text reaches the DOM as React text nodes
// (escaped) — no injection surface.
//
// This is the specific gap the strengthened capstone closes: under the step-5 `OutputSlot`
// placeholder an `error` output rendered a blank `data-output-pending` div, silently
// dropping the traceback. Here it renders its real content.
export function ErrorRenderer({ output }: { output: IError }) {
  const traceback = Array.isArray(output.traceback) ? output.traceback : []
  const tracebackText = traceback.map(stripAnsi).join('\n')
  return (
    <div className='output-error' data-output-error='true'>
      <div className='output-error__name'>
        {output.ename}: {output.evalue}
      </div>
      {tracebackText.length > 0 ? <pre className='output-error__traceback'>{tracebackText}</pre> : null}
    </div>
  )
}
