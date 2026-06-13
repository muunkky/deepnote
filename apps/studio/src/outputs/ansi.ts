// ANSI handling for the browser output renderer.
//
// The terminal counterpart (`packages/cli/src/output-renderer.ts`) strips ANSI/VT
// control characters from error tracebacks with `node:util`'s `stripVTControlCharacters`
// and re-applies its own colour. The SPA cannot reach for a `node:` builtin (ADR-006/007
// isolation invariant), and adding an `ansi-to-html`-class dependency is out of scope for
// a read-only viewer slice (no kernel runs here — these are persisted bytes). So we strip
// the escape sequences and render the plain text, matching the terminal's "clean the
// traceback, render the text" behaviour without a Node edge or a new dependency.
//
// The pattern is the canonical `ansi-regex` body (CSI/SGR colour codes, cursor moves, and
// the OSC string forms Jupyter tracebacks emit). It is built from ESC (0x1b) /
// BEL (0x07) escapes so the source stays clean ASCII and carries zero runtime deps.

const ESC = String.fromCharCode(0x1b)
const BEL = String.fromCharCode(0x07)
const ANSI_PATTERN = new RegExp(
  [
    // CSI ... command (colours, cursor movement)
    `${ESC}\\[[0-?]*[ -/]*[@-~]`,
    // OSC ... terminator (BEL or ESC \)
    `${ESC}\\][^${BEL}]*(?:${BEL}|${ESC}\\\\)`,
    // lone single-character escapes
    `${ESC}[@-Z\\\\-_]`,
  ].join('|'),
  'g'
)

/** Strip ANSI/VT escape sequences, leaving the human-readable text. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '')
}
