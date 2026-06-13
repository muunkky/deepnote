import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ImageRenderer } from './ImageRenderer'
import { makeBlock } from './testBlocks'

// ImageRenderer (design Phase 7): an `image` block renders its persisted source
// (`deepnote_img_src`) as a real <img>, with the src sanitized (no `javascript:` / event
// handler injection survives). It reuses `@deepnote/blocks`' image-markdown derivation and
// funnels it through the shared DOMPurify sanitizer seam.
describe('ImageRenderer', () => {
  it('renders an <img> with the persisted src in the DOM (Capstone)', () => {
    const block = makeBlock('i1', 'image', '', {
      metadata: { deepnote_img_src: 'https://example.com/chart.png' },
    })
    const { container } = render(<ImageRenderer block={block} />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('https://example.com/chart.png')
  })

  it('renders a data-URI image src', () => {
    const block = makeBlock('i2', 'image', '', {
      metadata: { deepnote_img_src: 'data:image/png;base64,AAAABBBB==' },
    })
    const { container } = render(<ImageRenderer block={block} />)
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toContain('data:image/png;base64,AAAABBBB==')
  })

  it('sanitizes a javascript: src (no live script attribute survives)', () => {
    // The persisted src is untrusted markup. A `javascript:`/`onerror` payload must be
    // stripped by the sanitizer seam rather than reaching the DOM live.
    const block = makeBlock('i3', 'image', '', {
      metadata: { deepnote_img_src: 'javascript:alert(1)' },
    })
    const { container } = render(<ImageRenderer block={block} />)
    const img = container.querySelector('img')
    // Either the img is dropped or its src no longer carries the executable scheme.
    expect(img?.getAttribute('src') ?? '').not.toContain('javascript:')
    expect(container.querySelector('[onerror]')).toBeNull()
    expect(container.innerHTML).not.toContain('onerror')
  })

  it('renders without throwing when no src is configured', () => {
    const block = makeBlock('i4', 'image')
    expect(() => render(<ImageRenderer block={block} />)).not.toThrow()
  })

  it('exposes NO run/edit control (R8 read-only)', () => {
    const block = makeBlock('i5', 'image', '', {
      metadata: { deepnote_img_src: 'https://example.com/x.png' },
    })
    const { container } = render(<ImageRenderer block={block} />)
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('input')).toBeNull()
    expect(container.querySelector('textarea')).toBeNull()
  })
})
