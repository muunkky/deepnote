import { describe, expect, it } from 'vitest'
import type { ApiProject, FailureEvent, RunId, WsClientMessage, WsServerEvent } from './api-types'

/**
 * Contract surface test: the canonical identifiers exist and have the design-doc
 * shapes (ADR-007 §6 / design-doc Interface Design). These are *type-level*
 * assertions — they compile only if the contract matches, so a drift in the union
 * members or required fields is caught at typecheck time. The runtime `expect`
 * keeps vitest from treating the file as empty and pins one representative value
 * of each union so a wholesale rename can't pass silently.
 */
describe('api-types canonical contract', () => {
  it('ApiProject carries the full GET /api/project envelope', () => {
    const project: Pick<ApiProject, 'path' | 'openHash' | 'capabilities'> = {
      path: '/abs/notebook.deepnote',
      openHash: 'sha256-deadbeef',
      capabilities: { kernelLanguage: 'python', reactivity: 'disabled' },
    }
    expect(project.capabilities.kernelLanguage).toBe('python')
    expect(project.capabilities.reactivity).toBe('disabled')
  })

  it('WsClientMessage covers run (block scope) and queued-cancel', () => {
    const run: WsClientMessage = { type: 'run', runScope: 'block', blockId: 'b1' }
    const cancel: WsClientMessage = { type: 'cancel', runId: 7 satisfies RunId }
    expect(run.type).toBe('run')
    expect(cancel.type).toBe('cancel')
  })

  it('WsServerEvent has run-done as a terminal and run-failed carries a category', () => {
    const done: WsServerEvent = { type: 'run-done', runId: 1, executedBlocks: 3, failedBlocks: 1 }
    const failed: FailureEvent = {
      type: 'run-failed',
      runId: 1,
      failureCategory: 'kernel-died',
      message: 'kernel died mid-run',
    }
    // FailureEvent is part of the WsServerEvent union.
    const asEvent: WsServerEvent = failed
    expect(done.type).toBe('run-done')
    expect(asEvent.type).toBe('run-failed')
  })
})
