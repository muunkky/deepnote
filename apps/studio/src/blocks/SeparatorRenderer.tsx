import type { BlockVM } from '../shell/viewModels'

// Read-only renderer for a `separator` block (design Phase 8a, R8). A separator carries no
// content or value — it is purely a visual divider. `@deepnote/blocks`'
// `createMarkdownForSeparatorBlock` defines the persisted form as the literal markdown
// `'<hr>'`; the viewer's read-only equivalent is exactly that DOM element, emitted natively
// here (no `dangerouslySetInnerHTML` needed for a constant element). Rendering the `<hr>`
// directly keeps the divider in lockstep with how the file format represents it while
// staying a pure, inert display.
export function SeparatorRenderer(_props: { block: BlockVM }) {
  return <hr className='separator-renderer' data-separator='true' />
}
