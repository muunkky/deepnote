import type { IOutput } from '@deepnote/runtime-server/types'
import { OutputRenderer } from '../outputs/OutputRenderer'
import type { BlockVM } from '../shell/viewModels'

// Renders a `big-number` (KPI tile) block read-only (design Phase 7, KDD M1). Like the
// visualization renderer it is a PURE FUNCTION of persisted state (R8) and follows the same
// precedence: prefer the persisted output tile (the actual computed value the block produced
// when it ran), fall back to the `deepnote_big_number_*` authoring metadata ONLY when
// `outputs` is empty (a tile that has never run still shows its configured title/value).
//
// A `big-number` block's metadata extends the executable metadata with the
// `deepnote_big_number_*` authoring fields; we read them off the union defensively.
interface BigNumberMetadata {
  deepnote_big_number_title?: string
  deepnote_big_number_value?: string
  deepnote_big_number_comparison_title?: string
  deepnote_big_number_comparison_value?: string
}

export interface BigNumberRendererProps {
  block: BlockVM
}

export function BigNumberRenderer({ block }: BigNumberRendererProps) {
  const outputs = ('outputs' in block && Array.isArray(block.outputs) ? block.outputs : []) as IOutput[]

  // Persisted output is the ground truth: a tile that has run carries its computed value.
  if (outputs.length > 0) {
    return (
      <div className='big-number-renderer' data-bignumber-output='true'>
        <OutputRenderer outputs={outputs} />
      </div>
    )
  }

  // Never-run fallback (M1): render the authoring metadata tile.
  const meta = (block.metadata ?? {}) as BigNumberMetadata
  const title = meta.deepnote_big_number_title ?? ''
  const value = meta.deepnote_big_number_value ?? ''
  const comparisonTitle = meta.deepnote_big_number_comparison_title
  const comparisonValue = meta.deepnote_big_number_comparison_value
  const hasComparison = Boolean(comparisonTitle || comparisonValue)

  return (
    <div className='big-number-renderer big-number-renderer--metadata' data-bignumber-metadata='true'>
      {title && <div className='big-number-renderer__title'>{title}</div>}
      <div className='big-number-renderer__value'>{value}</div>
      {hasComparison && (
        <div className='big-number-renderer__comparison' data-bignumber-comparison='true'>
          {comparisonTitle && <span className='big-number-renderer__comparison-title'>{comparisonTitle}</span>}
          {comparisonValue && <span className='big-number-renderer__comparison-value'>{comparisonValue}</span>}
        </div>
      )}
    </div>
  )
}
