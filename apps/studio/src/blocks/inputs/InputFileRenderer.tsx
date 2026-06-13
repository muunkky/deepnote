import type { BlockVM } from '../../shell/viewModels'
import { InputFieldShell } from './InputFieldShell'

// Read-only renderer for an `input-file` block (design Phase 8a, R8). Renders the persisted
// label + the current filename as static text — no file-chooser control, no change handler.
// An empty persisted value (no file selected) renders as "No file selected" so the field is
// never a confusing blank.
export function InputFileRenderer({ block }: { block: BlockVM }) {
  const filename = block.type === 'input-file' ? block.metadata.deepnote_variable_value : ''
  return (
    <InputFieldShell block={block as Extract<BlockVM, { type: 'input-file' }>} kind='input-file'>
      <span className='input-renderer__file'>{filename === '' ? 'No file selected' : filename}</span>
    </InputFieldShell>
  )
}
