import type { BlockVM } from '../../shell/viewModels'
import { InputFieldShell } from './InputFieldShell'

// Read-only renderer for an `input-select` block (design Phase 8a, R8). Renders the persisted
// label + the chosen option(s). The persisted `deepnote_variable_value` is a string for a
// single-select and a `string[]` for a multi-select; both are rendered as static text (joined
// for the multi case) — no `<select>`, no change handler, nothing that can mutate the choice.
export function InputSelectRenderer({ block }: { block: BlockVM }) {
  const raw = block.type === 'input-select' ? block.metadata.deepnote_variable_value : ''
  const display = Array.isArray(raw) ? raw.join(', ') : raw
  return (
    <InputFieldShell block={block as Extract<BlockVM, { type: 'input-select' }>} kind='input-select'>
      {display}
    </InputFieldShell>
  )
}
