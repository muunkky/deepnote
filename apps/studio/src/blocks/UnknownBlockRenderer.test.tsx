import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { BlockVM } from '../shell/viewModels'
import { BLOCK_RENDERERS, BlockRenderer } from './BlockRenderer'
import { makeBlock } from './testBlocks'
import { UnknownBlockRenderer } from './UnknownBlockRenderer'

// Step 7D — the registry `default` branch: the graceful unknown-type fallback (design Phase
// 8b, R5; ADR-006 KDD §6). An unrecognized/unsupported `block.type` must render a labelled
// raw-content card WITHOUT crashing the surrounding notebook view, and every in-scope type
// registered by steps 2–7C must resolve to its REAL renderer rather than this fallback.
describe('UnknownBlockRenderer (registry `default` branch)', () => {
  it('renders a clear "unsupported block type" label naming the unknown type', () => {
    const { container } = render(<UnknownBlockRenderer block={makeBlock('u', 'future-block' as BlockVM['type'])} />)
    const label = container.querySelector('[data-block-unknown-label="true"]')
    expect(label).not.toBeNull()
    expect(label?.textContent?.toLowerCase()).toContain('unsupported block type')
    expect(label?.textContent).toContain('future-block')
  })

  it('renders the block’s raw persisted content alongside the label', () => {
    const { container } = render(
      <UnknownBlockRenderer block={makeBlock('u', 'future-block' as BlockVM['type'], 'raw payload here')} />
    )
    const content = container.querySelector('[data-block-unknown-content="true"]')
    expect(content).not.toBeNull()
    expect(content?.textContent).toBe('raw payload here')
  })

  it('does not throw or render a content node when the unknown block has no content', () => {
    const { container } = render(<UnknownBlockRenderer block={makeBlock('u', 'future-block' as BlockVM['type'])} />)
    // Label still renders; the (empty) raw-content node is omitted rather than blank.
    expect(container.querySelector('[data-block-unknown-label="true"]')).not.toBeNull()
    expect(container.querySelector('[data-block-unknown-content="true"]')).toBeNull()
  })

  it('renders raw HTML/script content as inert escaped text (no markup injection, R5 security)', () => {
    const payload = '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>'
    const { container } = render(
      <UnknownBlockRenderer block={makeBlock('u', 'future-block' as BlockVM['type'], payload)} />
    )
    const content = container.querySelector('[data-block-unknown-content="true"]')
    // The payload is present as literal text (escaped), so the live <img>/<script> never
    // entered the DOM as markup — a text node cannot execute.
    expect(content?.textContent).toBe(payload)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('script')).toBeNull()
    expect((globalThis as { __xss?: unknown }).__xss).toBeUndefined()
  })
})

// Capstone (R5): the fallback never crashes the surrounding notebook view, and a notebook
// mixing known + unknown blocks renders the known ones normally.
describe('unknown-type fallback in a mixed notebook (R5 capstone)', () => {
  it('renders the unknown block as a labelled fallback while the known blocks still render', () => {
    // A mixed run of blocks dispatched through the real registry — one genuinely-unknown type
    // among known ones. Each is rendered via `BlockRenderer` (the production dispatch path).
    const blocks: BlockVM[] = [
      makeBlock('k1', 'markdown', '## Known heading'),
      makeBlock('k2', 'code', 'x = 1'),
      makeBlock('u1', 'future-block' as BlockVM['type'], 'unknown raw content'),
      makeBlock('k3', 'text-cell-p', 'a paragraph'),
    ]

    const { container } = render(
      <div>
        {blocks.map(b => (
          <BlockRenderer key={b.id} block={b} />
        ))}
      </div>
    )

    // The unknown block fell back gracefully (labelled + raw content), not crashed.
    const fallback = container.querySelector('[data-block-unknown="true"]')
    expect(fallback).not.toBeNull()
    expect(fallback?.querySelector('[data-block-unknown-content="true"]')?.textContent).toBe('unknown raw content')

    // The known blocks around it still rendered their real output.
    expect(container.querySelector('h2')?.textContent).toContain('Known heading') // markdown
    expect(container.querySelector('code')).not.toBeNull() // code
    expect(container.textContent).toContain('a paragraph') // text-cell-p

    // All four blocks are present in DOM order — the unknown block did not blank the view.
    const wrappers = container.querySelectorAll('.block')
    expect(wrappers).toHaveLength(4)
  })
})

// Full-coverage capstone (R3): drive off the REAL `BLOCK_RENDERERS` keys, not a hardcoded
// list, so this stays honest as the registry evolves. Every registered (non-`default`) type
// must resolve to its real renderer — i.e. it must NOT fall through to the unknown fallback —
// and ONLY a genuinely-unregistered/synthetic type may hit it.
describe('registry full-coverage (R3 capstone)', () => {
  // Every key the registry registers, minus the structural `default` branch. This is the set
  // of in-scope block types steps 2–7C are responsible for. Derived from the live registry so
  // adding/removing a renderer keeps the assertion truthful with no test edit.
  const registeredTypes = Object.keys(BLOCK_RENDERERS).filter(k => k !== 'default') as BlockVM['type'][]

  it('registers a non-trivial set of in-scope block types (sanity: the registry is populated)', () => {
    // Guards against a regression where the registry collapses to just `default` and every
    // per-type assertion below vacuously "passes".
    expect(registeredTypes.length).toBeGreaterThanOrEqual(20)
    expect(registeredTypes).toContain('code')
    expect(registeredTypes).toContain('separator')
  })

  it('every registered in-scope type resolves to its REAL renderer (not the unknown fallback)', () => {
    for (const type of registeredTypes) {
      const { container, unmount } = render(<BlockRenderer block={makeBlock(`cov-${type}`, type, 'x')} />)
      // The block wrapper carries the dispatched type...
      expect(container.querySelector(`[data-block-type="${type}"]`), `${type} wrapper`).not.toBeNull()
      // ...and crucially it did NOT route to the unknown fallback — proving real coverage.
      expect(
        container.querySelector('[data-block-unknown="true"]'),
        `${type} must resolve to its real renderer, not the unknown fallback`
      ).toBeNull()
      unmount()
    }
  })

  it('ONLY a genuinely-unregistered/synthetic type hits the unknown fallback', () => {
    const syntheticType = '__never-registered-synthetic-type__' as BlockVM['type']
    expect(registeredTypes).not.toContain(syntheticType)
    const { container } = render(<BlockRenderer block={makeBlock('synthetic', syntheticType)} />)
    expect(container.querySelector('[data-block-unknown="true"]')).not.toBeNull()
    expect(container.querySelector('[data-block-unknown-label="true"]')?.textContent).toContain(syntheticType)
  })

  it('the `default` branch is wired to the real UnknownBlockRenderer (own file)', () => {
    expect(BLOCK_RENDERERS.default).toBe(UnknownBlockRenderer)
  })
})
