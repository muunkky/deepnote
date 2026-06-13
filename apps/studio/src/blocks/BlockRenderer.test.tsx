import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { sampleProject } from '../__fixtures__/sampleProject'
import type { BlockVM } from '../shell/viewModels'
import { BLOCK_RENDERERS, BlockRenderer } from './BlockRenderer'
import { makeBlock } from './testBlocks'

// The type-keyed registry is the dispatch seam (design Phase 4 / Interface ~341-350):
// `Partial<Record<BlockVM['type'], FC>>` with a `default` unknown-type fallback. Steps
// 7A-7D extend it additively — each registers its own key — so these tests pin the
// dispatch contract that the later cards must keep mergeable.
describe('BlockRenderer registry', () => {
  it('dispatches code blocks to the code renderer (highlighted source)', () => {
    const { container } = render(<BlockRenderer block={makeBlock('c', 'code', 'x = 1')} />)
    expect(container.querySelector('code')).not.toBeNull()
    expect(container.querySelector('[class*="hljs-"]')).not.toBeNull()
  })

  it('dispatches markdown blocks to the markdown renderer (formatted prose)', () => {
    const { container } = render(<BlockRenderer block={makeBlock('m', 'markdown', '## Heading')} />)
    expect(container.querySelector('h2')?.textContent).toContain('Heading')
  })

  it('dispatches each of the seven text-cell kinds to the text renderer', () => {
    const cases: Array<[BlockVM['type'], string]> = [
      ['text-cell-p', 'p'],
      ['text-cell-h1', 'h1'],
      ['text-cell-h2', 'h2'],
      ['text-cell-h3', 'h3'],
      ['text-cell-bullet', 'li'],
      ['text-cell-todo', 'li'],
      ['text-cell-callout', 'blockquote'],
    ]
    for (const [type, selector] of cases) {
      const { container, unmount } = render(<BlockRenderer block={makeBlock(`tc-${type}`, type, 'Content')} />)
      expect(container.querySelector(selector), `${type} -> <${selector}>`).not.toBeNull()
      unmount()
    }
  })

  it('falls back to the default (unknown) renderer for an unregistered type', () => {
    // `separator` is a real persisted type with no renderer registered until a later step;
    // the `default` branch must catch it rather than crash.
    const { container } = render(<BlockRenderer block={makeBlock('u', 'separator')} />)
    expect(container.querySelector('[data-block-unknown="true"]')).not.toBeNull()
  })

  it('the default branch is present in the registry as a structural fallback', () => {
    expect(BLOCK_RENDERERS.default).toBeDefined()
    expect(typeof BLOCK_RENDERERS.default).toBe('function')
  })

  it('the registry is a partial map keyed by block type (additive seam for steps 7A-7D)', () => {
    // The concrete keys this card registers; later cards add to the same object.
    expect(BLOCK_RENDERERS.code).toBeDefined()
    expect(BLOCK_RENDERERS.markdown).toBeDefined()
    expect(BLOCK_RENDERERS['text-cell-p']).toBeDefined()
    expect(BLOCK_RENDERERS['text-cell-callout']).toBeDefined()
  })

  // Capstone: each of code / markdown / text renders correctly FROM THE FIXTURE via the
  // registry — real DOM, not a mock. Walks the shared `sampleProject` tree the shell uses.
  it('capstone: code, markdown, and text render from the fixture via the registry', () => {
    const blocks = sampleProject.project.notebooks.flatMap(nb => nb.blocks)

    const codeBlock = blocks.find(b => b.type === 'code')
    expect(codeBlock).toBeDefined()
    const code = render(<BlockRenderer block={codeBlock as BlockVM} />)
    expect(code.container.querySelector('code')).not.toBeNull()
    expect(code.container.querySelector('[class*="hljs-"]')).not.toBeNull()
    code.unmount()

    const mdBlock = blocks.find(b => b.type === 'markdown')
    expect(mdBlock).toBeDefined()
    const md = render(<BlockRenderer block={mdBlock as BlockVM} />)
    // The fixture's first markdown is '## Setup' -> <h2>.
    expect(md.container.querySelector('h1, h2, h3, p')).not.toBeNull()
    md.unmount()

    const textBlock = blocks.find(b => b.type === 'text-cell-h1')
    expect(textBlock).toBeDefined()
    render(<BlockRenderer block={textBlock as BlockVM} />)
    expect(screen.getByText(/Sales analysis|Data exploration/)).toBeTruthy()
  })
})
