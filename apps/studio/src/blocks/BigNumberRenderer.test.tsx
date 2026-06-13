import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BigNumberRenderer } from './BigNumberRenderer'
import { makeBlock } from './testBlocks'

// BigNumberRenderer (design Phase 7, KDD M1): a `big-number` block prefers its persisted
// output tile (the computed value, rendered through the shared OutputRenderer / MIME
// registry), and falls back to the `deepnote_big_number_*` authoring metadata ONLY when
// `outputs` is empty. Both paths must produce real DOM (the unfakeable capstone).
describe('BigNumberRenderer', () => {
  it('renders the persisted output tile when outputs are present (Capstone — executed)', () => {
    const block = makeBlock('b1', 'big-number', '', {
      outputs: [
        {
          output_type: 'execute_result',
          data: { 'text/html': '<div class="big-number">PERSISTED_TILE_42</div>' },
          metadata: {},
          execution_count: 1,
        },
      ],
      metadata: { deepnote_big_number_title: 'Stale Title', deepnote_big_number_value: 'ignored' },
    })
    const { container } = render(<BigNumberRenderer block={block} />)
    // The persisted (ground-truth) tile wins over the authoring metadata.
    expect(container.textContent).toContain('PERSISTED_TILE_42')
    expect(container.querySelector('[data-bignumber-metadata="true"]')).toBeNull()
  })

  it('renders from deepnote_big_number_* metadata when outputs are empty (Capstone — never-run)', () => {
    const block = makeBlock('b2', 'big-number', '', {
      outputs: [],
      metadata: {
        deepnote_big_number_title: 'Total Sales',
        deepnote_big_number_value: '$1,234',
        deepnote_big_number_comparison_title: 'vs last month',
        deepnote_big_number_comparison_value: '+12%',
      },
    })
    const { container } = render(<BigNumberRenderer block={block} />)
    const tile = container.querySelector('[data-bignumber-metadata="true"]')
    expect(tile).not.toBeNull()
    expect(container.textContent).toContain('Total Sales')
    expect(container.textContent).toContain('$1,234')
    expect(container.textContent).toContain('vs last month')
    expect(container.textContent).toContain('+12%')
  })

  it('renders the metadata tile when the block carries no outputs key at all', () => {
    const block = makeBlock('b3', 'big-number', '', {
      metadata: { deepnote_big_number_title: 'Revenue', deepnote_big_number_value: '99' },
    })
    const { container } = render(<BigNumberRenderer block={block} />)
    expect(container.querySelector('[data-bignumber-metadata="true"]')).not.toBeNull()
    expect(container.textContent).toContain('Revenue')
    expect(container.textContent).toContain('99')
  })

  it('renders without a comparison when none is configured', () => {
    const block = makeBlock('b4', 'big-number', '', {
      metadata: { deepnote_big_number_title: 'Users', deepnote_big_number_value: '7' },
    })
    const { container } = render(<BigNumberRenderer block={block} />)
    expect(container.querySelector('[data-bignumber-comparison]')).toBeNull()
    expect(container.textContent).toContain('Users')
  })

  it('exposes NO run/edit control (R8 read-only)', () => {
    const block = makeBlock('b5', 'big-number', '', {
      metadata: { deepnote_big_number_title: 'X', deepnote_big_number_value: '1' },
    })
    const { container } = render(<BigNumberRenderer block={block} />)
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('input')).toBeNull()
  })
})
