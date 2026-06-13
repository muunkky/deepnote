import type { IDisplayData, IError, IExecuteResult, IOutput, IStream } from '@deepnote/runtime-server/types'

// Fixture `IOutput`s of the same shape the runtime persists (and `run` produces). The
// renderer tests drive off these so the component contract is exercised against realistic
// Jupyter payloads, not bespoke literals. Each factory is `as I…` so the literal stays
// honest against the imported nbformat union (ADR-007 §6 drift-catch).

export function streamOutput(name: 'stdout' | 'stderr', text: string): IStream {
  return { output_type: 'stream', name, text } as IStream
}

export function displayData(data: Record<string, unknown>): IDisplayData {
  return { output_type: 'display_data', data, metadata: {} } as IDisplayData
}

export function executeResult(data: Record<string, unknown>, executionCount = 1): IExecuteResult {
  return { output_type: 'execute_result', data, metadata: {}, execution_count: executionCount } as IExecuteResult
}

export function errorOutput(ename: string, evalue: string, traceback: string[]): IError {
  return { output_type: 'error', ename, evalue, traceback } as IError
}

// An output_type outside the four the persisted-render contract handles — used by the
// parity-of-shape test to prove the dispatch neither renders nor silently mis-routes it.
export function unrecognizedOutput(): IOutput {
  return { output_type: 'update_display_data', data: { 'text/plain': 'update' }, metadata: {} } as unknown as IOutput
}

// A malicious HTML payload (script + onerror) — the sanitization test asserts these are
// neutralized before injection.
export const MALICIOUS_HTML =
  '<div class="df"><table><tr><td>cell</td></tr></table></div><script>window.__pwned_html = true</script><img src=x onerror="window.__pwned_html = true">'

// A malicious SVG payload (embedded script) — same, via the SVG arm.
export const MALICIOUS_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" /><script>window.__pwned_svg = true</script></svg>'

// A 1x1 transparent PNG, base64.
export const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
