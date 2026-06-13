/**
 * Typed kernel-failure family (ADR-002 R2 / R6, design-doc KD-8).
 *
 * Each error carries a literal `category` discriminant so both CLI failure-
 * surfacing sites can derive a stable, machine-readable `failureCategory`
 * without re-deriving the class from a stringified message (the kernel-died
 * mid-run path in particular relies on the typed instance surviving to the
 * CLI's per-block serialization boundary — see card `qajbsg`).
 */

/**
 * The four distinct kernel-failure classes. No two collapse to one value, so a
 * machine consumer (`--output json`) can tell them apart (PRD-002 R6).
 */
export type KernelFailureCategory =
  | 'missing-kernel' // KernelNotRegisteredError (pre-flight)
  | 'kernel-launch' // KernelLaunchError (POST/startNew failed)
  | 'kernel-died' // KernelDiedError (launch-time OR mid-run)
  | 'in-block' // user code raised inside an executed block

/** A single registered kernelspec, summarised from `GET /api/kernelspecs`. */
export interface KernelspecSummary {
  name: string
  displayName: string
  language: string
}

/**
 * Thrown by the pre-flight `GET /api/kernelspecs` check when an explicitly
 * requested kernel name is not registered — **before** any `POST /api/kernels`,
 * so the server's opaque `HTTP 500` never reaches the caller. Carries the
 * requested name and the installed-kernel list for an actionable message.
 */
export class KernelNotRegisteredError extends Error {
  readonly category = 'missing-kernel' as const

  constructor(
    readonly requested: string,
    readonly available: KernelspecSummary[]
  ) {
    const installed = available.length > 0 ? available.map(k => k.name).join(', ') : '(none)'
    super(`Kernel '${requested}' is not registered. Installed kernels: ${installed}`)
    this.name = 'KernelNotRegisteredError'
  }
}

/**
 * Thrown when a registered kernel fails to launch (the `SessionManager.startNew`
 * / `POST /api/kernels` call rejects). Wraps the underlying cause.
 */
export class KernelLaunchError extends Error {
  readonly category = 'kernel-launch' as const

  constructor(
    readonly kernelName: string,
    readonly cause?: unknown
  ) {
    super(`Kernel '${kernelName}' is registered but failed to launch.`)
    this.name = 'KernelLaunchError'
  }
}

/**
 * Thrown when the kernel transitions to `dead` — either while waiting for it to
 * reach idle at startup, or mid-execution while a request is pending. Replaces
 * the previous bare `Error('Kernel is dead')`. The typed instance must reach
 * the CLI's per-block serialization boundary so `kernel-died` stays distinct
 * from an `in-block` user error.
 */
export class KernelDiedError extends Error {
  readonly category = 'kernel-died' as const

  constructor(message = 'Kernel is dead') {
    super(message)
    this.name = 'KernelDiedError'
  }
}
