import type { BlockVM } from '../../shell/viewModels'
import { InputFieldShell } from './InputFieldShell'

// Read-only renderer for an `input-text` block (design Phase 8a, R8). Renders the persisted
// label + current `deepnote_variable_value` as static text — no editable field, no change
// handler. React's `{value}` text node escapes the value, so no raw persisted string reaches
// the DOM as markup.
export function InputTextRenderer({ block }: { block: BlockVM }) {
  const value = block.type === 'input-text' ? block.metadata.deepnote_variable_value : ''
  return (
    <InputFieldShell block={block as Extract<BlockVM, { type: 'input-text' }>} kind='input-text'>
      {value}
    </InputFieldShell>
  )
}
