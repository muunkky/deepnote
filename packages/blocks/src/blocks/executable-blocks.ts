import type { DeepnoteBlock, ExecutableBlock } from '../deepnote-file/deepnote-file-schema'

/**
 * Block types that represent user input widgets.
 * These blocks capture user input and define variables.
 */
export const INPUT_BLOCK_TYPES = new Set([
  'input-text',
  'input-textarea',
  'input-checkbox',
  'input-select',
  'input-slider',
  'input-date',
  'input-date-range',
  'input-file',
])

const executableBlockTypes = new Set([
  'agent',
  'code',
  'sql',
  'notebook-function',
  'visualization',
  'button',
  'big-number',
  ...INPUT_BLOCK_TYPES,
])

/**
 * Executable block types that depend on Deepnote's Python value-add layer —
 * i.e. every executable type **except** plain `'code'`. These are the blocks
 * the runtime lowers to `_dntk`-prefixed Python (SQL, visualization,
 * DataFrame-formatting, inputs, buttons, big-numbers, notebook-functions,
 * agent), so they cannot run on a non-Python kernel (ADR-004 KD-4).
 *
 * Derived from {@link executableBlockTypes} minus `'code'` rather than a new
 * schema field — no schema change, and a single source of truth for "what is
 * executable". The membership of this set is cross-checked against the
 * `python-code.ts` dispatcher by a unit test so a newly added value-add type
 * cannot silently slip through the degradation guard (KD-4 drift guard).
 */
export const VALUE_ADD_BLOCK_TYPES: ReadonlySet<string> = new Set(
  [...executableBlockTypes].filter(type => type !== 'code')
)

/**
 * Type guard to check if a block is an executable block.
 * Executable blocks can have outputs and be executed by the runtime.
 */
export function isExecutableBlock(block: DeepnoteBlock): block is ExecutableBlock {
  return executableBlockTypes.has(block.type)
}

/**
 * Checks if a block type string represents an executable block.
 * Convenience function for when you only have the type string.
 */
export function isExecutableBlockType(type: string): boolean {
  return executableBlockTypes.has(type)
}

/**
 * Checks if a block type string is a Python value-add block type — one that
 * requires the Python kernel and must be hard-failed on a non-Python kernel
 * (ADR-004 Decision point 1). Returns `false` for `'code'` and any
 * non-executable type.
 */
export function isValueAddBlockType(type: string): boolean {
  return VALUE_ADD_BLOCK_TYPES.has(type)
}
