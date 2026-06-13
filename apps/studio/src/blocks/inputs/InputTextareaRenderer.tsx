import type { BlockVM } from '../../shell/viewModels'
import { InputFieldShell } from './InputFieldShell'

// Read-only renderer for an `input-textarea` block (design Phase 8a, R8). Renders the
// persisted label + current `deepnote_variable_value` as static, multi-line-preserving text
// — no editable `<textarea>`, no change handler. `white-space: pre-wrap` (via the
// `input-renderer__textarea` hook) keeps the persisted line breaks visible while staying a
// pure display.
export function InputTextareaRenderer({ block }: { block: BlockVM }) {
  const value = block.type === 'input-textarea' ? block.metadata.deepnote_variable_value : ''
  return (
    <InputFieldShell block={block as Extract<BlockVM, { type: 'input-textarea' }>} kind='input-textarea'>
      <span className='input-renderer__textarea'>{value}</span>
    </InputFieldShell>
  )
}
