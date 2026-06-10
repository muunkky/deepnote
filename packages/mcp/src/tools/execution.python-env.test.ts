import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Capture the config handed to ExecutionEngine's constructor, and stub out the
// real Python-spawning engine so these tests never touch a real interpreter.
// `selectPythonSpec` / `isBareSystemPython` / `detectDefaultPython` are kept REAL
// so we exercise the shared precedence chain (arg > DEEPNOTE_PYTHON > autodetect).
// We can't deterministically stub the autodetect branch — `selectPythonSpec`
// calls `detectDefaultPython` via an intra-module reference, which a module mock
// of the export wouldn't intercept — so the autodetect tests assert against the
// host's real `detectDefaultPython()` value instead of a hardcoded literal.
const mockConstructor = vi.fn()
const mockStart = vi.fn().mockResolvedValue(undefined)
const mockStop = vi.fn().mockResolvedValue(undefined)
const mockRunProject = vi.fn()

vi.mock('@deepnote/runtime-core', async importOriginal => {
  const actual = await importOriginal<typeof import('@deepnote/runtime-core')>()
  return {
    ...actual,
    ExecutionEngine: class MockExecutionEngine {
      start = mockStart
      stop = mockStop
      runProject = mockRunProject
      constructor(config: { pythonEnv: string; workingDirectory: string }) {
        mockConstructor(config)
      }
    },
  }
})

const { handleExecutionTool } = await import('./execution')
const { handleWritingTool } = await import('./writing')
const { detectDefaultPython } = await import('@deepnote/runtime-core')

// The bare system python the host autodetects to ('python' or 'python3'). It is a
// bare command, so the bare-python hint must fire when it is the resolved spec.
const AUTODETECTED_PYTHON = detectDefaultPython()

function extractResult(response: { content: Array<{ type: string; text: string }> }): Record<string, unknown> {
  return JSON.parse(response.content[0].text)
}

describe('deepnote_run Python interpreter resolution', () => {
  let tempDir: string
  let testNotebookPath: string
  let originalDeepnotePython: string | undefined

  beforeEach(async () => {
    originalDeepnotePython = process.env.DEEPNOTE_PYTHON
    delete process.env.DEEPNOTE_PYTHON

    mockConstructor.mockClear()
    mockStart.mockClear()
    mockStop.mockClear()
    mockRunProject.mockReset()
    // A minimal successful project run so handleRun reaches the response.
    mockRunProject.mockResolvedValue({
      totalBlocks: 1,
      executedBlocks: 1,
      failedBlocks: 0,
      totalDurationMs: 1,
    })

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-python-env-test-'))
    testNotebookPath = path.join(tempDir, 'test.deepnote')
    await handleWritingTool('deepnote_create', {
      outputPath: testNotebookPath,
      projectName: 'Test Project',
      notebooks: [
        {
          name: 'Notebook',
          blocks: [{ type: 'code', content: 'print("hello world")' }],
        },
      ],
    })
  })

  afterEach(async () => {
    if (originalDeepnotePython === undefined) {
      delete process.env.DEEPNOTE_PYTHON
    } else {
      process.env.DEEPNOTE_PYTHON = originalDeepnotePython
    }
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('spec passthrough to ExecutionEngine', () => {
    it('passes DEEPNOTE_PYTHON to ExecutionEngine when no pythonPath is given (capstone)', async () => {
      const venvPython = '/opt/venvs/proj/bin/python'
      process.env.DEEPNOTE_PYTHON = venvPython

      await handleExecutionTool('deepnote_run', { path: testNotebookPath })

      expect(mockConstructor).toHaveBeenCalledWith(expect.objectContaining({ pythonEnv: venvPython }))
    })

    it('prefers the explicit pythonPath argument over DEEPNOTE_PYTHON (precedence: arg wins)', async () => {
      process.env.DEEPNOTE_PYTHON = '/opt/venvs/env-default/bin/python'
      const explicit = '/opt/venvs/explicit/bin/python'

      await handleExecutionTool('deepnote_run', { path: testNotebookPath, pythonPath: explicit })

      expect(mockConstructor).toHaveBeenCalledWith(expect.objectContaining({ pythonEnv: explicit }))
    })

    it('falls back to autodetect when neither pythonPath nor DEEPNOTE_PYTHON is set', async () => {
      await handleExecutionTool('deepnote_run', { path: testNotebookPath })

      expect(mockConstructor).toHaveBeenCalledWith(expect.objectContaining({ pythonEnv: AUTODETECTED_PYTHON }))
    })

    it('passes the resolved spec for single-block runs too', async () => {
      const venvPython = '/opt/venvs/proj/bin/python'
      process.env.DEEPNOTE_PYTHON = venvPython
      const file = JSON.parse(
        (
          (await handleExecutionTool('deepnote_run', { path: testNotebookPath, dryRun: true })) as {
            content: Array<{ text: string }>
          }
        ).content[0].text
      ) as { executionOrder: Array<{ id: string }> }
      const blockId = file.executionOrder[0].id

      await handleExecutionTool('deepnote_run', { path: testNotebookPath, blockId })

      expect(mockConstructor).toHaveBeenCalledWith(expect.objectContaining({ pythonEnv: venvPython }))
    })
  })

  describe('bare-system-python hint', () => {
    it('returns an actionable hint when only bare system python resolves and no override given (capstone)', async () => {
      const response = (await handleExecutionTool('deepnote_run', { path: testNotebookPath })) as {
        content: Array<{ type: string; text: string }>
      }
      const result = extractResult(response)

      // The bare autodetect spec is what reached ExecutionEngine...
      expect(mockConstructor).toHaveBeenCalledWith(expect.objectContaining({ pythonEnv: AUTODETECTED_PYTHON }))
      // ...and the actionable hint is surfaced at the tool boundary.
      expect(typeof result.pythonHint).toBe('string')
      expect(result.pythonHint).toContain('system interpreter')
      expect(result.pythonHint).toContain('DEEPNOTE_PYTHON')
      expect(result.pythonHint).toContain('deepnote-toolkit')
    })

    it('does NOT fire the hint when pythonPath is an explicit override', async () => {
      const response = (await handleExecutionTool('deepnote_run', {
        path: testNotebookPath,
        pythonPath: '/opt/venvs/proj/bin/python',
      })) as { content: Array<{ type: string; text: string }> }
      const result = extractResult(response)

      expect(result.pythonHint).toBeUndefined()
    })

    it('does NOT fire the hint when DEEPNOTE_PYTHON is set to a bare command (explicit env override)', async () => {
      // Even though the spec is bare, the user explicitly chose it via env — no hint.
      process.env.DEEPNOTE_PYTHON = 'python'

      const response = (await handleExecutionTool('deepnote_run', { path: testNotebookPath })) as {
        content: Array<{ type: string; text: string }>
      }
      const result = extractResult(response)

      expect(result.pythonHint).toBeUndefined()
    })

    it('does NOT fire the hint when DEEPNOTE_PYTHON points at a real venv', async () => {
      process.env.DEEPNOTE_PYTHON = '/opt/venvs/proj/bin/python'

      const response = (await handleExecutionTool('deepnote_run', { path: testNotebookPath })) as {
        content: Array<{ type: string; text: string }>
      }
      const result = extractResult(response)

      expect(result.pythonHint).toBeUndefined()
    })

    it('surfaces the hint on single-block runs too', async () => {
      const plan = JSON.parse(
        (
          (await handleExecutionTool('deepnote_run', { path: testNotebookPath, dryRun: true })) as {
            content: Array<{ text: string }>
          }
        ).content[0].text
      ) as { executionOrder: Array<{ id: string }> }
      const blockId = plan.executionOrder[0].id

      const response = (await handleExecutionTool('deepnote_run', { path: testNotebookPath, blockId })) as {
        content: Array<{ type: string; text: string }>
      }
      const result = extractResult(response)

      expect(typeof result.pythonHint).toBe('string')
      expect(result.pythonHint).toContain('system interpreter')
    })
  })
})
