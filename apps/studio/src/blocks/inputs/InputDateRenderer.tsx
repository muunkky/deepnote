import type { BlockVM } from '../../shell/viewModels'
import { InputFieldShell } from './InputFieldShell'

// Read-only renderer for an `input-date` block (design Phase 8a, R8). Renders the persisted
// label + current date value as static text — no date picker, no change handler. The
// persisted value is an author-supplied date string; it is shown verbatim.
export function InputDateRenderer({ block }: { block: BlockVM }) {
  const value = block.type === 'input-date' ? block.metadata.deepnote_variable_value : ''
  return (
    <InputFieldShell block={block as Extract<BlockVM, { type: 'input-date' }>} kind='input-date'>
      <time className='input-renderer__date'>{value}</time>
    </InputFieldShell>
  )
}
