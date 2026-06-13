import type { ReactNode } from 'react'
import type { BlockVM } from '../../shell/viewModels'

// Shared read-only presentation shell for the eight input kinds (design Phase 8a, R8). An
// input block persists a *variable* — a label and a current value — but the viewer is
// read-only: it must render that persisted state as an inert display, NEVER a live form
// control wired to execution or state mutation. This shell renders the persisted label
// (preferring the explicit `deepnote_input_label`, falling back to the variable name) and a
// kind-specific read-only value display supplied by each input renderer. There is no
// `<input>`/`<select>`/`<button>` that could mutate state and no change handler — the value
// is rendered as static text or a disabled, non-interactive affordance.
export interface InputFieldShellProps {
  /** The persisted input block — supplies the label and variable name. */
  block: Extract<BlockVM, { type: `input-${string}` }>
  /** The input kind, surfaced as a DOM hook (`data-input-kind`) for tests and styling. */
  kind: string
  /** The read-only value display for this kind (static text or a disabled affordance). */
  children: ReactNode
}

// Resolve the human label for an input: the explicit author-set `deepnote_input_label`
// wins; otherwise fall back to the persisted variable name so the value is never orphaned
// from what it represents. Both fields live on every input block's metadata.
function resolveLabel(block: InputFieldShellProps['block']): string {
  const metadata = block.metadata as {
    deepnote_input_label?: string
    deepnote_variable_name?: string
  }
  return metadata.deepnote_input_label || metadata.deepnote_variable_name || ''
}

export function InputFieldShell({ block, kind, children }: InputFieldShellProps) {
  const label = resolveLabel(block)
  return (
    <div className='input-renderer' data-input-kind={kind}>
      {label !== '' && (
        <span className='input-renderer__label' data-input-label='true'>
          {label}
        </span>
      )}
      <span className='input-renderer__value' data-input-value='true'>
        {children}
      </span>
    </div>
  )
}
