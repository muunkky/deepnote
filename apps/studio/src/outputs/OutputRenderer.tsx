import type { IDisplayData, IError, IExecuteResult, IOutput, IStream } from '@deepnote/runtime-server/types'
import { DataRenderer } from './DataRenderer'
import { ErrorRenderer } from './ErrorRenderer'
import { StreamRenderer } from './StreamRenderer'

// The browser counterpart to the terminal `renderOutput` (`packages/cli/src/output-renderer.ts`).
// Renders persisted Jupyter `IOutput[]` to the DOM, dispatching on `output_type` over EXACTLY
// the four types `renderOutput` handles — `stream`, `display_data`, `execute_result`, `error`
// — with NO fifth path silently dropped (the parity-of-shape invariant the card requires). It
// replaces the step-5 `OutputSlot` placeholder, which rendered every non-`stream` output as an
// empty `data-output-pending` div; here every output type renders its real content.
//
// Read-only: this renders persisted state only — no execution, no run affordance (R8 posture).
//
// `IOutput` is consumed TYPE-ONLY from the `@deepnote/runtime-server/types` contract subpath
// (re-exported there from `@deepnote/runtime-core`), so the SPA never takes a runtime edge on
// `runtime-core` — the ADR-006/007 isolation invariant holds.

// The discriminants mirror the terminal renderer's type guards 1:1.
function isStream(output: IOutput): output is IStream {
  return output.output_type === 'stream'
}
function isDisplayData(output: IOutput): output is IDisplayData {
  return output.output_type === 'display_data'
}
function isExecuteResult(output: IOutput): output is IExecuteResult {
  return output.output_type === 'execute_result'
}
function isError(output: IOutput): output is IError {
  return output.output_type === 'error'
}

function renderOne(output: IOutput) {
  if (isStream(output)) return <StreamRenderer output={output} />
  if (isDisplayData(output) || isExecuteResult(output)) return <DataRenderer output={output} />
  if (isError(output)) return <ErrorRenderer output={output} />
  // A fifth `output_type` (e.g. `update_display_data`) is not part of the persisted-render
  // contract `renderOutput` handles. Returning `null` keeps parity with the terminal — which
  // also no-ops on it — without silently masking it as a different type.
  return null
}

export interface OutputRendererProps {
  outputs: IOutput[]
}

export function OutputRenderer({ outputs }: OutputRendererProps) {
  if (outputs.length === 0) return null
  return (
    <div className='output-renderer' data-output-renderer='true'>
      {outputs.map((output, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: persisted outputs are a stable ordered list.
        <div key={index} className='output-renderer__item'>
          {renderOne(output)}
        </div>
      ))}
    </div>
  )
}
