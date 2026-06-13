import { stripAnsi } from '../ansi'
import { coerceMultilineString } from './multiline'

// `text/plain` bundle renderer — the LAST-RESORT representation, matching the terminal
// fallback (`output-renderer.ts` prefers this; the browser demotes it below every rich
// MIME type). Rendered as preformatted text so whitespace/columns in a plain repr survive.
// ANSI escape sequences are stripped (a plain-text repr can carry colour codes) so they
// render as text rather than leaking raw escape bytes — text is escaped by React as a
// text node, so there is no injection surface here. A non-string payload renders nothing.
export function TextMime({ data }: { data: unknown }) {
  const text = coerceMultilineString(data)
  if (text == null) return null
  return <pre className='output-mime output-mime--text'>{stripAnsi(text)}</pre>
}
