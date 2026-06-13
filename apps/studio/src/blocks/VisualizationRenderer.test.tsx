import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeBlock } from './testBlocks'
import { VisualizationRenderer } from './VisualizationRenderer'

// VisualizationRenderer (design Phase 7, KDD M1 / Decision 3): a `visualization` block is a
// PURE FUNCTION of its persisted state. It prefers the persisted `outputs[]` (rendered
// through the shared OutputRenderer / MIME registry — image, HTML, svg, vega/plotly bundle),
// and falls back to a labelled "spec, not yet rendered" placeholder ONLY when `outputs` is
// empty. It NEVER re-executes the `deepnote_visualization_spec` (R8 — no kernel).
describe('VisualizationRenderer', () => {
  it('renders the persisted image output in the DOM (Capstone)', () => {
    // A chart that has run carries its rendered picture as a persisted image bundle. The
    // viewer must surface that real image — the unfakeable capstone is a live <img> whose
    // data URI carries the persisted base64.
    const block = makeBlock('v1', 'visualization', '', {
      outputs: [
        {
          output_type: 'display_data',
          data: { 'image/png': 'iVBORw0KGgoAAAANSUhEUgChartBytes==' },
          metadata: {},
        },
      ],
    })
    const { container } = render(<VisualizationRenderer block={block} />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toContain('data:image/png;base64,')
    expect(img?.getAttribute('src')).toContain('iVBORw0KGgoAAAANSUhEUgChartBytes==')
  })

  it('renders a persisted HTML bundle (e.g. a vega/plotly HTML chart) through the MIME registry', () => {
    const block = makeBlock('v2', 'visualization', '', {
      outputs: [
        {
          output_type: 'execute_result',
          data: { 'text/html': '<div class="vega-chart">CHART_HTML_MARKER</div>' },
          metadata: {},
          execution_count: 1,
        },
      ],
    })
    const { container } = render(<VisualizationRenderer block={block} />)
    expect(container.textContent).toContain('CHART_HTML_MARKER')
  })

  it('falls back to a labelled placeholder when outputs are empty (no re-execution, M1)', () => {
    // A viz block that has never run carries only its authoring spec. The viewer does NOT
    // re-execute it (R8) — it renders a labelled, non-throwing placeholder that names the
    // unrendered state.
    const block = makeBlock('v3', 'visualization', '', {
      outputs: [],
      metadata: { deepnote_visualization_spec: { mark: 'bar' } },
    })
    const { container } = render(<VisualizationRenderer block={block} />)
    const placeholder = container.querySelector('[data-viz-unrendered="true"]')
    expect(placeholder).not.toBeNull()
    // No image was rendered (there was no persisted output to show).
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders the placeholder when the block carries no outputs key at all', () => {
    const block = makeBlock('v4', 'visualization')
    const { container } = render(<VisualizationRenderer block={block} />)
    expect(container.querySelector('[data-viz-unrendered="true"]')).not.toBeNull()
  })

  it('exposes NO run/kernel control — pure function of persisted state (R8)', () => {
    const block = makeBlock('v5', 'visualization', '', {
      outputs: [{ output_type: 'display_data', data: { 'image/png': 'AAA=' }, metadata: {} }],
    })
    const { container } = render(<VisualizationRenderer block={block} />)
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('input')).toBeNull()
    expect(container.querySelector('textarea')).toBeNull()
  })
})
