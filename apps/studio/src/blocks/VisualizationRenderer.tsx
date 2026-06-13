import type { IOutput } from '@deepnote/runtime-server/types'
import { OutputRenderer } from '../outputs/OutputRenderer'
import type { BlockVM } from '../shell/viewModels'

// Renders a `visualization` (chart/plot) block read-only (design Phase 7, KDD M1 /
// Decision 3). The viewer is a PURE FUNCTION of persisted state (R8): it never re-executes
// the `deepnote_visualization_spec` — that needs a kernel, which is out of scope here.
//
// Precedence (M1 — prefer persisted output, fall back only when `outputs` is empty):
//   1. If the block carries persisted `outputs[]`, render them through the shared
//      `OutputRenderer` / MIME registry. A persisted chart is typically an image
//      (`image/png`) or an HTML/vega/plotly bundle; the registry already routes each to the
//      richest renderable representation, so the chart path is unified with every other
//      output-bearing block — no bespoke visualization-execution path (Decision 3).
//      Native vega/plotly is an ADDITIVE MIME-registry entry (Decision 3a); until/unless it
//      is registered, a vega/plotly-only bundle degrades to the persisted image the registry
//      already renders, which satisfies R3 without a kernel.
//   2. If `outputs` is empty (a chart that has never run carries only its authoring spec),
//      render a labelled, non-throwing placeholder. We do NOT render the raw spec as a chart
//      — that would require execution — so the placeholder simply names the unrendered state.
export interface VisualizationRendererProps {
  block: BlockVM
}

export function VisualizationRenderer({ block }: VisualizationRendererProps) {
  // `outputs` exists only on executable block kinds; read it defensively off the union.
  const outputs = ('outputs' in block && Array.isArray(block.outputs) ? block.outputs : []) as IOutput[]

  if (outputs.length > 0) {
    return (
      <div className='visualization-renderer' data-viz-rendered='true'>
        <OutputRenderer outputs={outputs} />
      </div>
    )
  }

  // No persisted output → the chart has not been executed. Render a labelled placeholder
  // rather than re-executing the spec (R8).
  return (
    <div className='visualization-renderer visualization-renderer--unrendered' data-viz-unrendered='true'>
      <span className='visualization-renderer__placeholder'>Chart not yet rendered (no persisted output).</span>
    </div>
  )
}
