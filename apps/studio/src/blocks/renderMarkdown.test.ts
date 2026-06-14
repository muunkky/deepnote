import { describe, expect, it } from 'vitest'
import { renderMarkdownToSafeHtml } from './renderMarkdown'

// `renderMarkdownToSafeHtml` is the single markdown→HTML seam shared by the markdown and
// text renderers (design Phase 4). It MUST sanitize before returning (design security
// note, Decision 2 / DOMPurify-class): the renderers inject the result via
// `dangerouslySetInnerHTML`, so an unsanitized `<script>` in persisted markdown would be a
// latent XSS/DOM-corruption footgun even on the localhost trust boundary.
describe('renderMarkdownToSafeHtml', () => {
  it('renders standard markdown to HTML', () => {
    const html = renderMarkdownToSafeHtml('# Title')
    expect(html).toContain('<h1')
    expect(html).toContain('Title')
  })

  it('renders inline emphasis', () => {
    const html = renderMarkdownToSafeHtml('a **bold** word')
    expect(html).toContain('<strong>bold</strong>')
  })

  it('strips a <script> tag (sanitization)', () => {
    const html = renderMarkdownToSafeHtml('ok\n\n<script>window.__pwned = true</script>')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('window.__pwned')
  })

  it('strips an onerror handler from injected HTML (sanitization)', () => {
    const html = renderMarkdownToSafeHtml('<img src=x onerror="window.__pwned=true">')
    expect(html.toLowerCase()).not.toContain('onerror')
  })

  it('strips a javascript: URL (sanitization)', () => {
    const html = renderMarkdownToSafeHtml('[click](javascript:alert(1))')
    expect(html.toLowerCase()).not.toContain('javascript:')
  })

  it('returns an empty string for empty input', () => {
    expect(renderMarkdownToSafeHtml('')).toBe('')
  })

  it('strips target from anchors so links cannot open a new tab with window.opener access', () => {
    // Reverse-tabnabbing defense: DOMPurify's default config drops `target` entirely, so a
    // persisted `<a target="_blank">` cannot open a new browsing context that inherits
    // window.opener. (Verified here rather than adding a redundant rel-injection hook.)
    const html = renderMarkdownToSafeHtml('<a href="https://evil.test" target="_blank">x</a>')
    expect(html).toContain('href="https://evil.test"')
    expect(html).not.toContain('target=')
  })
})
