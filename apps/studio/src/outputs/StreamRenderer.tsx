import type { IStream } from '@deepnote/runtime-server/types'
import { stripAnsi } from './ansi'

// `stream` output renderer — stdout/stderr text (design Phase 5). Mirrors the terminal
// `renderStreamOutput`: stderr is visually distinguished (the terminal colours it yellow;
// the browser flags it with a `--stderr` modifier + `data-stream="stderr"` hook for
// styling). Text is preformatted so column alignment / progress bars survive, and ANSI
// escapes are stripped so colour codes don't leak as raw bytes. Text reaches the DOM as a
// React text node (escaped) — no injection surface.
export function StreamRenderer({ output }: { output: IStream }) {
  const text = Array.isArray(output.text) ? output.text.join('') : output.text
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
