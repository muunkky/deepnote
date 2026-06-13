import type { BlockVM } from '../../shell/viewModels'
import { InputFieldShell } from './InputFieldShell'

// Read-only renderer for an `input-checkbox` block (design Phase 8a, R8). Renders the
// persisted label + checked state. A real `<input type="checkbox">` is rendered so the
// checked state is structurally visible, but it is `disabled` and `readOnly` with no change
// handler — an inert reflection of persisted state, never a control that can mutate it.
export function InputCheckboxRenderer({ block }: { block: BlockVM }) {
  const checked = block.type === 'input-checkbox' ? block.metadata.deepnote_variable_value : false
  // `deepnote_input_checkbox_label` is the checkbox's own inline label, distinct from the
  // field label resolved by the shell; surface it next to the box when present.
  const checkboxLabel =
    block.type === 'input-checkbox'
      ? (block.metadata as { deepnote_input_checkbox_label?: string }).deepnote_input_checkbox_label
      : undefined
  return (
    <InputFieldShell block={block as Extract<BlockVM, { type: 'input-checkbox' }>} kind='input-checkbox'>
      <input type='checkbox' checked={checked} disabled readOnly data-input-checkbox='true' />
      {checkboxLabel ? <span className='input-renderer__checkbox-label'>{checkboxLabel}</span> : null}
    </InputFieldShell>
  )
}
