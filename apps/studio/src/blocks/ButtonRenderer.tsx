import type { BlockVM } from '../shell/viewModels'

// Read-only renderer for a `button` block (design Phase 8a, R8). In a live notebook a button
// triggers execution or sets a variable; the viewer renders it as a STATIC, inert affordance:
// a real `<button>` element (so its label is structurally a button) that is `disabled` and
// carries NO `onClick` handler. There is no run call, no state mutation — clicking it does
// nothing. The label comes from the persisted `deepnote_button_title`, falling back to a
// generic "Button" so the affordance is never unlabelled.
export function ButtonRenderer({ block }: { block: BlockVM }) {
  const title =
    block.type === 'button' ? (block.metadata as { deepnote_button_title?: string }).deepnote_button_title : undefined
  const label = title && title !== '' ? title : 'Button'
  return (
    <div className='button-renderer'>
      {/* Disabled + no onClick: a non-firing display of the persisted button, never wired
          to execution or state mutation (R8). */}
      <button type='button' className='button-renderer__button' data-button='true' disabled>
        {label}
      </button>
    </div>
  )
}
