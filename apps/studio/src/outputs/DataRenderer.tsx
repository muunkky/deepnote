import type { IDisplayData, IExecuteResult } from '@deepnote/runtime-server/types'
import { pickRenderer } from './mime/registry'

// `display_data` / `execute_result` renderer (design Phase 5). Both carry a `data` MIME
// bundle; this picks the RICHEST renderable representation via the rich-first registry
// (`pickRenderer`) and renders it. This is where the terminal/browser precedence inverts:
// the terminal's `renderDataOutput` prefers `text/plain`; here HTML/image/svg win over it.
//
// When the bundle carries no MIME type the viewer can render, we emit a typed marker that
// names the available MIME types — parity with the terminal's
// "[Output with MIME types: …]" fallback — rather than dropping the output silently.
export function DataRenderer({ output }: { output: IDisplayData | IExecuteResult }) {
  const data = (output.data ?? {}) as Record<string, unknown>
  const picked = pickRenderer(data)

  if (!picked) {
    const mimeTypes = Object.keys(data)
    return (
      <div className='output-data output-data--unrenderable' data-output-unrenderable='true'>
        {mimeTypes.length > 0 ? `[Output with MIME types: ${mimeTypes.join(', ')}]` : '[Empty output]'}
      </div>
    )
  }

  const { mime, render: Render } = picked
  return (
    <div className='output-data' data-output-mime={mime}>
      <Render data={data[mime]} />
    </div>
  )
}
