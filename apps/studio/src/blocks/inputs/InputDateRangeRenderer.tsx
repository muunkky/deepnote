import type { BlockVM } from '../../shell/viewModels'
import { InputFieldShell } from './InputFieldShell'

// Read-only renderer for an `input-date-range` block (design Phase 8a, R8). Renders the
// persisted label + current range as static text. The persisted `deepnote_variable_value`
// is either a `[start, end]` tuple (an absolute range) or a string (a relative range like
// `past7days`, or `customDays14`); both are rendered verbatim — tuple joined as `start – end`
// — with no range picker and no change handler.
export function InputDateRangeRenderer({ block }: { block: BlockVM }) {
  const raw = block.type === 'input-date-range' ? block.metadata.deepnote_variable_value : ''
  const display = Array.isArray(raw) ? `${raw[0]} – ${raw[1]}` : raw
  return (
    <InputFieldShell block={block as Extract<BlockVM, { type: 'input-date-range' }>} kind='input-date-range'>
      {display}
    </InputFieldShell>
  )
}
