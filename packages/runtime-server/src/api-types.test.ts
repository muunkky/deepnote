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

  it('every WsServerEvent member carries a runId (contract-test step 1)', () => {
    // One representative value of each union member; the `runId: RunId` field is
    // required on every one, so this fails to compile if any member drops it.
    const events: WsServerEvent[] = [
      { type: 'run-queued', runId: 1, queueDepth: 2 },
      { type: 'run-start', runId: 1, totalBlocks: 3 },
      { type: 'block-start', runId: 1, blockId: 'b1', index: 0, total: 3 },
      { type: 'output', runId: 1, blockId: 'b1', output: { output_type: 'stream', name: 'stdout', text: 'hi' } },
      { type: 'output', runId: 1, blockId: 'b1', truncated: true },
      { type: 'block-done', runId: 1, blockId: 'b1', success: true, durationMs: 5 },
      { type: 'block-done', runId: 1, blockId: 'b2', success: false, durationMs: 5, failureCategory: 'in-block' },
      { type: 'run-done', runId: 1, executedBlocks: 3, failedBlocks: 0 },
      { type: 'run-failed', runId: 1, failureCategory: 'kernel-died', message: 'dead' },
      { type: 'run-cancelled', runId: 1 },
    ]
    for (const event of events) {
      expect(event.runId satisfies RunId).toBe(1)
    }
  })

  it('the within-block back-pressure marker is { truncated: true } with no output payload (S1 regime 2)', () => {
    const marker: WsServerEvent = { type: 'output', runId: 9, blockId: 'b1', truncated: true }
    // The marker member is the one without an `output` field; narrowing on
    // `truncated` is the discriminant a consumer uses.
    if (marker.type === 'output' && marker.truncated === true) {
      expect('output' in marker).toBe(false)
    } else {
      throw new Error('expected the truncation marker shape')
    }
  })
})
