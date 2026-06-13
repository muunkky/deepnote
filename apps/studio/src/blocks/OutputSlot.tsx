// PLACEHOLDER output region — the seam step 6 (design Phase 5, `OutputRenderer.tsx` + the
// MIME registry) replaces with the real Jupyter `IOutput[]` renderer. CodeRenderer mounts
// this now so the output WIRING (`block.outputs ?? []` flowing into a render region) is in
// place and tested before step 6 lands; step 6 swaps this component for the full
// rendermime-style dispatch without changing CodeRenderer's call site.
//
// Boundary note (ADR-006/007): this stub stays type-only/structural — it does NOT import
// `@deepnote/runtime-core` (which would risk a non-type runtime edge). It reads the minimal
// `output_type === 'stream'` shape defensively off `unknown` so the placeholder never
// crashes on a richer persisted output; non-stream outputs render a typed marker until the
// real renderer arrives.

interface StreamLike {
  output_type: 'stream'
  text?: string | string[]
}

function isStreamOutput(value: unknown): value is StreamLike {
  return typeof value === 'object' && value !== null && (value as { output_type?: unknown }).output_type === 'stream'
}

function streamText(output: StreamLike): string {
  return Array.isArray(output.text) ? output.text.join('') : (output.text ?? '')
}

export interface OutputSlotProps {
  outputs: unknown[]
}

export function OutputSlot({ outputs }: OutputSlotProps) {
  if (outputs.length === 0) return null
  return (
    <div className='output-slot' data-output-slot='placeholder'>
      {outputs.map((output, index) =>
        isStreamOutput(output) ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: persisted outputs are a stable ordered list.
          <pre key={index} className='output-slot__stream'>
            {streamText(output)}
          </pre>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: persisted outputs are a stable ordered list.
          <div key={index} className='output-slot__pending' data-output-pending='true' />
        )
      )}
    </div>
  )
}
