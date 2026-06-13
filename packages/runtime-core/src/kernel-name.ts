/**
 * Default Jupyter kernelspec name. Every existing notebook resolves to this,
 * keeping the Python path byte-stable (ADR-002 / ADR-003).
 */
export const DEFAULT_KERNEL_NAME = 'python3'

export interface SelectKernelNameOptions {
  /** Highest-precedence tier: an explicit `--kernel` value for this run. */
  explicit?: string
  /**
   * Phase-2 tier (forward-declared, not wired now): the notebook-declared
   * language already mapped to a kernel name. Undefined in Phase 1.
   */
  declared?: string
}

/**
 * Returns a non-blank, trimmed signal, or `undefined` when the value is absent,
 * empty, or whitespace-only — so a blank signal falls through the precedence
 * chain instead of being treated as present. Mirrors `selectPythonSpec`'s
 * `firstNonBlank` fall-through.
 */
function firstNonBlank(value: string | undefined): string | undefined {
  if (value == null || value.trim().length === 0) {
    return undefined
  }
  return value.trim()
}

/**
 * Pure precedence selector for the kernelspec name, mirroring
 * {@link selectPythonSpec}'s no-assembly shape (ADR-003 KD-1):
 *
 * `explicit ?? declared ?? DEFAULT_KERNEL_NAME`
 *
 * The kernel axis is orthogonal to the interpreter axis. This selector reads
 * **no** environment variable — in particular it never consults
 * `DEEPNOTE_PYTHON` (that channel selects the interpreter, not the kernel). A
 * parallel `DEEPNOTE_KERNEL` env tier (sitting between `explicit` and
 * `declared`) is a **deferred, documented extension point — not built** (ADR-003),
 * exactly as ADR-001 deferred its config-file tier.
 *
 * In Phase 1 the `declared` tier is forward-declared but not wired (the
 * notebook `language` field is a Phase 2 deliverable), so the chain reduces to
 * `explicit ?? DEFAULT_KERNEL_NAME`.
 *
 * Keep this a pure precedence selector with no I/O; it is trivially
 * unit-testable.
 *
 * @param options.explicit - The explicit caller-supplied kernel name, if any.
 * @param options.declared - The notebook-declared kernel name (Phase 2), if any.
 * @returns The selected kernelspec name.
 */
export function selectKernelName({ explicit, declared }: SelectKernelNameOptions = {}): string {
  return firstNonBlank(explicit) ?? firstNonBlank(declared) ?? DEFAULT_KERNEL_NAME
}

/**
 * Decides whether the active kernel is non-Python, gating the Phase-1
 * degradation guards (ADR-004).
 *
 * In Phase 1 the decision is **name-based**: any kernel name other than the
 * `python3` default is treated as non-Python. The optional `language`
 * (the kernelspec's reported language, captured during pre-flight) is a
 * forward-looking refinement (Phase 3 `--list-kernels` discovery): when
 * present it tightens the decision (e.g. an aliased Python kernelspec whose
 * `language` is `python` is correctly treated as Python); when absent the
 * name alone decides.
 *
 * The `python3` name is always Python regardless of any supplied language.
 *
 * @param kernelName - The resolved kernelspec name.
 * @param language - Optional kernelspec language refinement.
 * @returns `true` when the kernel should be treated as non-Python.
 */
export function isNonPythonKernel(kernelName: string, language?: string): boolean {
  if (kernelName === DEFAULT_KERNEL_NAME) {
    return false // python3 fast-path
  }
  if (language) {
    return language.toLowerCase() !== 'python' // optional refinement (Phase 3+)
  }
  return true // Phase-1 load-bearing path: any explicit non-python3 name => non-Python
}
