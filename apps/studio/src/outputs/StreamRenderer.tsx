import type { IStream } from '@deepnote/runtime-server/types'
import { stripAnsi } from './ansi'

// `stream` output renderer — stdout/stderr text (design Phase 5). Mirrors the terminal
// `renderStreamOutput`: stderr is visually distinguished (the terminal colours it yellow;
// the browser flags it with a `--stderr` modifier + `data-stream="stderr"` hook for
// styling). Text is preformatted so column alignment / progress bars survive, and ANSI
// escapes are stripped so colour codes don't leak as raw bytes. Text reaches the DOM as a
// React text node (escaped) — no injection surface.
export function StreamRenderer({ output }: { output: IStream }) {
  // `output.text` is typed `string | string[]`, but the wire JSON is untrusted at runtime
  // (no schema validation between fetch and render): a malformed/older persisted stream output
  // can carry `text: null`/absent. Coerce a non-array, nullish value to '' so `stripAnsi` never
  // receives `undefined` (which would `.replace` on undefined → TypeError and blank the view).
  const raw = output.text
  const text = Array.isArray(raw) ? raw.join('') : (raw ?? '')
  const isStderr = output.name === 'stderr'
  return (
    <pre
      className={`output-stream${isStderr ? ' output-stream--stderr' : ''}`}
      data-stream={isStderr ? 'stderr' : 'stdout'}
    >
      {stripAnsi(text)}
    </pre>
  )
}
