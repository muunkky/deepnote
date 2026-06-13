import type { BlockVM } from '../../shell/viewModels'
import { InputFieldShell } from './InputFieldShell'

// Read-only renderer for an `input-slider` block (design Phase 8a, R8). Renders the persisted
// label + current value, and reflects the slider's *position* between its persisted min/max
// via a `<progress>` element — a non-interactive, native read-only affordance (no thumb to
// drag, no change handler). The numeric value is always shown as text alongside it.
export function InputSliderRenderer({ block }: { block: BlockVM }) {
  // The registry routes only `input-slider` here; narrow on the discriminant so `metadata`
  // is the slider shape, and render an empty shell defensively for any other type.
  if (block.type !== 'input-slider') {
    return (
      <InputFieldShell block={block as Extract<BlockVM, { type: `input-${string}` }>} kind='input-slider'>
        {''}
      </InputFieldShell>
    )
  }
  const { deepnote_variable_value, deepnote_slider_min_value, deepnote_slider_max_value } = block.metadata
  const value = Number(deepnote_variable_value)
  const min = deepnote_slider_min_value
  const max = deepnote_slider_max_value
  // `<progress>` wants a 0-based max; offset by min so a slider that ranges e.g. 10..20
  // positions correctly. Guard a zero/negative span so the element never gets a bad max.
  const span = max - min
  const safeValue = Number.isFinite(value) ? value : min
  return (
    <InputFieldShell block={block} kind='input-slider'>
      {span > 0 ? (
        <progress className='input-renderer__slider' data-input-slider='true' max={span} value={safeValue - min} />
      ) : null}
      <span className='input-renderer__slider-value'>{deepnote_variable_value}</span>
    </InputFieldShell>
  )
}
