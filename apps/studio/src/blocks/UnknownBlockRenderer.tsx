import type { BlockVM } from '../shell/viewModels'

// The registry `default` branch — the graceful unknown-type fallback (design Phase 8b, R5;
// ADR-006 KDD §6). When a notebook carries a block whose `type` no renderer is registered
// for (a future block kind, or one we deliberately don't special-case such as `agent` /
// `notebook-function`), the viewer must NOT crash or blank the surrounding notebook view.
// Instead it renders this labelled card: a clear "unsupported block type" label plus the
// block's raw persisted `content`, so the block is visible and identifiable rather than
// silently dropped or fatal.
//
// **Safety:** the raw content is rendered as a React text node inside a `<pre>`, NOT through
// `dangerouslySetInnerHTML`. React escapes text-node children, so an unknown block whose
// persisted `content` happens to contain `<script>` / `onerror=` / `javascript:` markup is
// displayed literally and can never reach the DOM as live markup — the injection seam simply
// does not exist on this path. (If a future variant ever needs to inject the raw content AS
// markup, it must funnel through the shared `renderMarkdownToSafeHtml` / DOMPurify seam, per
// the design's security note — but text-node rendering is the stronger, simpler guarantee
// and is what the fallback uses.)
export interface UnknownBlockRendererProps {
  block: BlockVM
}

export function UnknownBlockRenderer({ block }: UnknownBlockRendererProps) {
  // `content` is optional on the persisted union (present for prose/code kinds, absent for
  // value/visual kinds); coerce to a string so an unknown block with no content still renders
  // its label without throwing.
  const rawContent = typeof block.content === 'string' ? block.content : ''
  return (
    <div className='block__unknown' data-block-unknown='true'>
      <span className='block__unknown-label' data-block-unknown-label='true'>
        Unsupported block type: <span className='block__type'>{block.type}</span>
      </span>
      {rawContent !== '' && (
        // Raw persisted content as an escaped text node — no markup injection (see above).
        <pre className='block__unknown-content' data-block-unknown-content='true'>
          {rawContent}
        </pre>
      )}
    </div>
  )
}
