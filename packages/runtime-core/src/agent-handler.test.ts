import type { AgentBlock, DeepnoteFile, McpServerConfig } from '@deepnote/blocks'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type AgentStreamEvent,
  buildSystemPrompt,
  createBlocksWithAttachedOutputsFromCollectedOutputs,
  executeAgentBlock,
  mergeMcpConfigs,
  resolveEnvVars,
  serializeNotebookContext,
  serializeNotebookContextFromBlocks,
} from './agent-handler'

// --- Fixtured-provider harness for the executeAgentBlock tool-loop ---------
//
// `executeAgentBlock` hard-imports `ToolLoopAgent` from 'ai' and `createOpenAI`
// from '@ai-sdk/openai' with no dependency-injection seam, so to exercise the
// REAL tool-loop (not the execution-engine boundary mock) we replace those two
// modules. `ai` is only partially mocked: the real `tool` and `stepCountIs`
// helpers are preserved (the module evaluates them at import time and the loop
// passes `stepCountIs(maxTurns)` to the agent), while `ToolLoopAgent` is swapped
// for a fake whose `.stream()` returns a recorded `fullStream` + `text`. No
// network, no OPENAI_API_KEY: the recorded cassette below drives the loop end to
// end. See the `executeAgentBlock` describe block for the chosen approach and
// rationale.
const agentMocks = vi.hoisted(() => {
  // The recorded provider cassette: the `fullStream` parts a single agent turn
  // emits, plus the final assistant text. Mutated per-test before invoking.
  const cassette: { fullStream: unknown[]; text: string } = { fullStream: [], text: '' }
  // Captures the settings the production code passed to `new ToolLoopAgent(...)`
  // so tests can assert model/turn-cap wiring (stopWhen via stepCountIs).
  const captured: { settings: Record<string, unknown> | null } = { settings: null }

  class FakeToolLoopAgent {
    constructor(settings: Record<string, unknown>) {
      captured.settings = settings
    }
    async stream(_opts: unknown) {
      const parts = cassette.fullStream
      return {
        async *[Symbol.asyncIterator]() {},
        fullStream: (async function* () {
          for (const part of parts) {
            yield part
          }
        })(),
        text: Promise.resolve(cassette.text),
      }
    }
  }

  return { cassette, captured, FakeToolLoopAgent }
})

vi.mock('ai', async importOriginal => {
  const actual = await importOriginal<typeof import('ai')>()
  return {
    ...actual,
    ToolLoopAgent: agentMocks.FakeToolLoopAgent,
  }
})

// `executeAgentBlock` calls `createOpenAI({...})` at the top of the function and
// then `openai(modelName)` / `openai.chat(modelName)`. Stub it so no real client
// is constructed and no key/network is touched; the model object is opaque to the
// loop (it only flows into the agent settings, which our fake ignores).
vi.mock('@ai-sdk/openai', () => {
  const openai = Object.assign((modelName: string) => ({ modelId: modelName }), {
    chat: (modelName: string) => ({ modelId: modelName, api: 'chat' }),
  })
  return {
    createOpenAI: () => openai,
  }
})

describe('resolveEnvVars', () => {
  let prevTestHost: string | undefined
  let prevTestPort: string | undefined

  beforeEach(() => {
    prevTestHost = process.env.TEST_HOST
    prevTestPort = process.env.TEST_PORT
    process.env.TEST_HOST = 'localhost'
    process.env.TEST_PORT = '5432'
  })

  afterEach(() => {
    if (prevTestHost === undefined) {
      delete process.env.TEST_HOST
    } else {
      process.env.TEST_HOST = prevTestHost
    }
    if (prevTestPort === undefined) {
      delete process.env.TEST_PORT
    } else {
      process.env.TEST_PORT = prevTestPort
    }
  })

  it('returns undefined for undefined input', () => {
    expect(resolveEnvVars(undefined)).toBeUndefined()
  })

  it('returns empty object for empty input', () => {
    expect(resolveEnvVars({})).toEqual({})
  })

  it('passes through literal values unchanged', () => {
    expect(resolveEnvVars({ KEY: 'value', OTHER: '123' })).toEqual({ KEY: 'value', OTHER: '123' })
  })

  it('resolves env var references from process.env', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: testing env var resolution
    const result = resolveEnvVars({ HOST: '${TEST_HOST}', PORT: '${TEST_PORT}' })
    expect(result).toEqual({ HOST: 'localhost', PORT: '5432' })
  })

  it('resolves missing env vars to empty string', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: testing env var resolution
    const result = resolveEnvVars({ MISSING: '${NONEXISTENT_VAR_XYZ}' })
    expect(result).toEqual({ MISSING: '' })
  })

  it('resolves mixed literal and env var values', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: testing env var resolution
    const result = resolveEnvVars({ URL: 'http://${TEST_HOST}:${TEST_PORT}/db' })
    expect(result).toEqual({ URL: 'http://localhost:5432/db' })
  })
})

function makeFile(overrides?: {
  blocks?: DeepnoteFile['project']['notebooks'][0]['blocks']
  notebookName?: string
  settings?: DeepnoteFile['project']['settings']
}): DeepnoteFile {
  return {
    metadata: { createdAt: '2026-01-01T00:00:00Z' },
    project: {
      id: 'test',
      name: 'Test',
      notebooks: [
        {
          id: 'nb1',
          name: overrides?.notebookName ?? 'Notebook 1',
          blocks: overrides?.blocks ?? [],
        },
      ],
      settings: overrides?.settings,
    },
    version: '1.0.0',
  }
}

describe('serializeNotebookContext', () => {
  it('returns "Empty notebook." for invalid notebook index', () => {
    const file = makeFile()
    expect(serializeNotebookContext(file, 99, new Map())).toBe('Empty notebook.')
  })

  it('includes notebook name in header', () => {
    const file = makeFile({ notebookName: 'My Analysis' })
    const result = serializeNotebookContext(file, 0, new Map())
    expect(result).toContain('# Notebook: My Analysis')
  })

  it('serializes block content in code fences', () => {
    const file = makeFile({
      blocks: [
        {
          id: 'block1234abcd',
          blockGroup: 'bg1',
          sortingKey: 'a0',
          type: 'code',
          content: 'print("hello")',
          metadata: {},
          executionCount: null,
          outputs: [],
        },
      ],
    })
    const result = serializeNotebookContext(file, 0, new Map())
    expect(result).toContain('## Block [code] (id: block123)')
    expect(result).toContain('```')
    expect(result).toContain('print("hello")')
  })

  it('serializes stream output', () => {
    const file = makeFile({
      blocks: [
        {
          id: 'block1234abcd',
          blockGroup: 'bg1',
          sortingKey: 'a0',
          type: 'code',
          content: 'print("hi")',
          metadata: {},
          executionCount: 1,
          outputs: [],
        },
      ],
    })
    const outputs = new Map<string, { outputs: unknown[]; executionCount: number | null }>()
    outputs.set('block1234abcd', {
      outputs: [{ output_type: 'stream', name: 'stdout', text: 'hi\n' }],
      executionCount: 1,
    })
    const result = serializeNotebookContext(file, 0, outputs)
    expect(result).toContain('### Output:')
    expect(result).toContain('hi\n')
  })

  it('serializes execute_result with text/plain', () => {
    const file = makeFile({
      blocks: [
        {
          id: 'exec-result-1234',
          blockGroup: 'bg1',
          sortingKey: 'a0',
          type: 'code',
          content: '42',
          metadata: {},
          executionCount: 1,
          outputs: [],
        },
      ],
    })
    const outputs = new Map<string, { outputs: unknown[]; executionCount: number | null }>()
    outputs.set('exec-result-1234', {
      outputs: [{ output_type: 'execute_result', data: { 'text/plain': '42' } }],
      executionCount: 1,
    })
    const result = serializeNotebookContext(file, 0, outputs)
    expect(result).toContain('42')
  })

  it('serializes display_data with text/html as placeholder', () => {
    const file = makeFile({
      blocks: [
        {
          id: 'html-block-12345',
          blockGroup: 'bg1',
          sortingKey: 'a0',
          type: 'code',
          content: 'display(html)',
          metadata: {},
          executionCount: 1,
          outputs: [],
        },
      ],
    })
    const outputs = new Map<string, { outputs: unknown[]; executionCount: number | null }>()
    outputs.set('html-block-12345', {
      outputs: [{ output_type: 'display_data', data: { 'text/html': '<table>...</table>' } }],
      executionCount: 1,
    })
    const result = serializeNotebookContext(file, 0, outputs)
    expect(result).toContain('[HTML output]')
  })

  it('serializes image output as placeholder', () => {
    const file = makeFile({
      blocks: [
        {
          id: 'img-block-123456',
          blockGroup: 'bg1',
          sortingKey: 'a0',
          type: 'code',
          content: 'plt.show()',
          metadata: {},
          executionCount: 1,
          outputs: [],
        },
      ],
    })
    const outputs = new Map<string, { outputs: unknown[]; executionCount: number | null }>()
    outputs.set('img-block-123456', {
      outputs: [{ output_type: 'display_data', data: { 'image/png': 'base64data...' } }],
      executionCount: 1,
    })
    const result = serializeNotebookContext(file, 0, outputs)
    expect(result).toContain('[Image output]')
  })

  it('serializes error output', () => {
    const file = makeFile({
      blocks: [
        {
          id: 'err-block-123456',
          blockGroup: 'bg1',
          sortingKey: 'a0',
          type: 'code',
          content: '1/0',
          metadata: {},
          executionCount: 1,
          outputs: [],
        },
      ],
    })
    const outputs = new Map<string, { outputs: unknown[]; executionCount: number | null }>()
    outputs.set('err-block-123456', {
      outputs: [{ output_type: 'error', ename: 'ZeroDivisionError', evalue: 'division by zero' }],
      executionCount: 1,
    })
    const result = serializeNotebookContext(file, 0, outputs)
    expect(result).toContain('Error: ZeroDivisionError: division by zero')
  })

  it('handles blocks without content', () => {
    const file = makeFile({
      blocks: [
        {
          id: 'no-content-12345',
          blockGroup: 'bg1',
          sortingKey: 'a0',
          type: 'markdown',
          metadata: {},
        },
      ],
    })
    const result = serializeNotebookContext(file, 0, new Map())
    expect(result).toContain('## Block [markdown]')
    expect(result).not.toContain('```')
  })

  it('does not serialize saved block outputs when collectedOutputs has no matching entry', () => {
    const file = makeFile({
      blocks: [
        {
          id: 'saved-only-1234',
          blockGroup: 'bg1',
          sortingKey: 'a0',
          type: 'code',
          content: 'print("stale")',
          metadata: {},
          executionCount: 1,
          outputs: [{ output_type: 'stream', name: 'stdout', text: 'stale saved output\n' }],
        },
      ],
    })
    const result = serializeNotebookContext(file, 0, new Map())
    expect(result).not.toContain('### Output:')
    expect(result).not.toContain('stale saved output')
  })

  it('serializes only collected outputs when block has stale saved outputs', () => {
    const file = makeFile({
      blocks: [
        {
          id: 'collected-block-12',
          blockGroup: 'bg1',
          sortingKey: 'a0',
          type: 'code',
          content: 'print("fresh")',
          metadata: {},
          executionCount: 1,
          outputs: [{ output_type: 'stream', name: 'stdout', text: 'stale saved output\n' }],
        },
      ],
    })
    const collected = new Map<string, { outputs: unknown[]; executionCount: number | null }>()
    collected.set('collected-block-12', {
      outputs: [{ output_type: 'stream', name: 'stdout', text: 'fresh output\n' }],
      executionCount: 2,
    })
    const result = serializeNotebookContext(file, 0, collected)
    expect(result).toContain('### Output:')
    expect(result).toContain('fresh output')
    expect(result).not.toContain('stale saved output')
  })

  it('with partial collectedOutputs only serializes collected outputs and ignores saved outputs from other blocks', () => {
    const file = makeFile({
      blocks: [
        {
          id: 'collected-block-12',
          blockGroup: 'bg1',
          sortingKey: 'a0',
          type: 'code',
          content: 'print("a")',
          metadata: {},
          executionCount: 1,
          outputs: [],
        },
        {
          id: 'skipped-saved-12',
          blockGroup: 'bg2',
          sortingKey: 'a1',
          type: 'code',
          content: 'print("b")',
          metadata: {},
          executionCount: 1,
          outputs: [{ output_type: 'stream', name: 'stdout', text: 'stale b output\n' }],
        },
      ],
    })
    const collected = new Map<string, { outputs: unknown[]; executionCount: number | null }>()
    collected.set('collected-block-12', {
      outputs: [{ output_type: 'stream', name: 'stdout', text: 'fresh a output\n' }],
      executionCount: 2,
    })
    const result = serializeNotebookContext(file, 0, collected)
    expect(result).toContain('fresh a output')
    expect(result).not.toContain('stale b output')
  })
})

describe('serializeNotebookContextFromBlocks', () => {
  it('serializes block.outputs directly so non-runtime callers can include saved outputs', () => {
    const result = serializeNotebookContextFromBlocks({
      notebookName: 'Saved Notebook',
      blocks: [
        {
          id: 'saved-block-1234',
          blockGroup: 'bg1',
          sortingKey: 'a0',
          type: 'code',
          content: 'print("saved")',
          metadata: {},
          executionCount: 1,
          outputs: [{ output_type: 'stream', name: 'stdout', text: 'saved-output-text\n' }],
        },
      ],
    })
    expect(result).toContain('# Notebook: Saved Notebook')
    expect(result).toContain('### Output:')
    expect(result).toContain('saved-output-text')
  })
})

describe('createBlocksWithAttachedOutputsFromCollectedOutputs', () => {
  it('strips saved outputs from executable blocks without a matching collected entry', () => {
    const result = createBlocksWithAttachedOutputsFromCollectedOutputs({
      blocks: [
        {
          id: 'saved-only-1234',
          blockGroup: 'bg1',
          sortingKey: 'a0',
          type: 'code',
          content: 'x = 1',
          metadata: {},
          executionCount: 1,
          outputs: [{ output_type: 'stream', name: 'stdout', text: 'stale\n' }],
        },
      ],
      collectedOutputs: new Map(),
    })
    expect(result[0]).toMatchObject({ id: 'saved-only-1234', outputs: [] })
  })

  it('attaches collected outputs when the block has a matching entry', () => {
    const collected = new Map<string, { outputs: unknown[]; executionCount: number | null }>()
    collected.set('block-1234abcd56', {
      outputs: [{ output_type: 'stream', name: 'stdout', text: 'fresh\n' }],
      executionCount: 7,
    })
    const result = createBlocksWithAttachedOutputsFromCollectedOutputs({
      blocks: [
        {
          id: 'block-1234abcd56',
          blockGroup: 'bg1',
          sortingKey: 'a0',
          type: 'code',
          content: 'print("hi")',
          metadata: {},
          executionCount: null,
          outputs: [],
        },
      ],
      collectedOutputs: collected,
    })
    expect(result[0]).toMatchObject({
      id: 'block-1234abcd56',
      outputs: [{ output_type: 'stream', name: 'stdout', text: 'fresh\n' }],
    })
  })

  it('leaves non-executable blocks (no outputs field) untouched', () => {
    const block = {
      id: 'md-block-12345',
      blockGroup: 'bg1',
      sortingKey: 'a0',
      type: 'markdown' as const,
      content: '# Heading',
      metadata: {},
    }
    const result = createBlocksWithAttachedOutputsFromCollectedOutputs({
      blocks: [block],
      collectedOutputs: new Map(),
    })
    expect(result[0]).toBe(block)
    expect('outputs' in result[0]).toBe(false)
  })
})

describe('buildSystemPrompt', () => {
  it('includes notebook context', () => {
    const prompt = buildSystemPrompt('# Notebook: Test\n\nsome context')
    expect(prompt).toContain('# Notebook: Test')
    expect(prompt).toContain('some context')
  })

  it('includes standard instructions', () => {
    const prompt = buildSystemPrompt('')
    expect(prompt).toContain('add_code_block')
    expect(prompt).toContain('add_markdown_block')
    expect(prompt).toContain('data science assistant')
  })

  it('omits integrations section when no integrations provided', () => {
    const prompt = buildSystemPrompt('context')
    expect(prompt).not.toContain('Available database integrations')
  })

  it('omits integrations section when empty array provided', () => {
    const prompt = buildSystemPrompt('context', [])
    expect(prompt).not.toContain('Available database integrations')
  })

  it('includes integrations section when integrations are present', () => {
    const integrations = [
      { id: 'pg-1', name: 'Production Postgres', type: 'pgsql' },
      { id: 'sf-1', name: 'Snowflake DW', type: 'snowflake' },
    ]
    const prompt = buildSystemPrompt('context', integrations)
    expect(prompt).toContain('## Available database integrations')
    expect(prompt).toContain('"Production Postgres" (pgsql, id: pg-1)')
    expect(prompt).toContain('"Snowflake DW" (snowflake, id: sf-1)')
    expect(prompt).toContain('dntk.execute_sql')
  })
})

describe('mergeMcpConfigs', () => {
  const serverA: McpServerConfig = { name: 'server-a', command: 'cmd-a' }
  const serverB: McpServerConfig = { name: 'server-b', command: 'cmd-b', args: ['--flag'] }

  it('returns empty array when both inputs are empty', () => {
    expect(mergeMcpConfigs([], [])).toEqual([])
  })

  it('returns project servers when block servers are empty', () => {
    expect(mergeMcpConfigs([serverA, serverB], [])).toEqual([serverA, serverB])
  })

  it('returns block servers when project servers are empty', () => {
    expect(mergeMcpConfigs([], [serverA])).toEqual([serverA])
  })

  it('block servers override project servers with the same name', () => {
    const blockOverride: McpServerConfig = { name: 'server-a', command: 'override-cmd' }
    const result = mergeMcpConfigs([serverA, serverB], [blockOverride])
    expect(result).toHaveLength(2)
    expect(result.find(s => s.name === 'server-a')?.command).toBe('override-cmd')
    expect(result.find(s => s.name === 'server-b')?.command).toBe('cmd-b')
  })

  it('merges unique servers from both sources', () => {
    const serverC: McpServerConfig = { name: 'server-c', command: 'cmd-c' }
    const result = mergeMcpConfigs([serverA], [serverC])
    expect(result).toHaveLength(2)
    expect(result.map(s => s.name).sort()).toEqual(['server-a', 'server-c'])
  })
})

// =============================================================================
// executeAgentBlock — the live tool-loop (S6INREPO step 2B / card 1yecdf)
// =============================================================================
//
// COVERAGE APPROACH (recorded/fixtured provider — the card's first option):
// We invoke `executeAgentBlock` DIRECTLY against a recorded provider stream
// rather than skipping an integration test. `executeAgentBlock` has no DI seam
// (it hard-imports `ToolLoopAgent`/`createOpenAI`), so per the card we use
// `vi.mock` to inject the recorded stream: `ai` is partially mocked
// (`ToolLoopAgent` -> fake, real `tool`/`stepCountIs` preserved) and
// `@ai-sdk/openai` is stubbed. The fake agent's `.stream()` replays a recorded
// cassette of `fullStream` parts, so the REAL loop body at agent-handler.ts:215
// runs and we assert the stream -> tool-call mapping end to end.
//
// RATIONALE for recorded-over-skipped: the loop's logic worth protecting is the
// `fullStream` part -> `onAgentEvent` mapping (text-delta / reasoning-delta /
// tool-call / tool-result). A recorded cassette exercises that mapping
// deterministically with zero network and NO OPENAI_API_KEY, which a skipped
// test would not. The only thing not covered here is real provider wire-format
// drift, which is the explicitly out-of-scope live-keyed E2E residual.

function makeAgentBlock(overrides?: Partial<AgentBlock>): AgentBlock {
  return {
    id: 'agent-block-1',
    type: 'agent',
    content: 'Load the dataset and summarize it.',
    blockGroup: 'bg1',
    sortingKey: 'a0',
    metadata: { deepnote_agent_model: 'auto' },
    ...overrides,
  } as AgentBlock
}

describe('executeAgentBlock', () => {
  // Snapshot env we touch so tests stay isolated and order-independent.
  let prevApiKey: string | undefined
  let prevModel: string | undefined
  let prevBaseUrl: string | undefined

  beforeEach(() => {
    prevApiKey = process.env.OPENAI_API_KEY
    prevModel = process.env.OPENAI_MODEL
    prevBaseUrl = process.env.OPENAI_BASE_URL
    // The whole point: the loop must run with NO real key in CI.
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_MODEL
    delete process.env.OPENAI_BASE_URL
    agentMocks.cassette.fullStream = []
    agentMocks.cassette.text = ''
    agentMocks.captured.settings = null
  })

  afterEach(() => {
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
    restore('OPENAI_API_KEY', prevApiKey)
    restore('OPENAI_MODEL', prevModel)
    restore('OPENAI_BASE_URL', prevBaseUrl)
  })

  function makeContext(overrides?: Partial<Parameters<typeof executeAgentBlock>[1]>) {
    return {
      openAiToken: 'fixture-token-not-a-real-key',
      mcpServers: [],
      notebookContext: '# Notebook: Test\n\n(empty)',
      addAndExecuteCodeBlock: vi.fn(async (_args: { code: string }) => 'fixture code output'),
      addMarkdownBlock: vi.fn(async (_args: { content: string }) => 'fixture markdown output'),
      ...overrides,
    } as Parameters<typeof executeAgentBlock>[1]
  }

  // Scenario 1 (Capstone) + Scenario 3 (no API key) -------------------------
  it('maps a recorded fullStream to add_code_block/add_markdown_block tool events and returns the final text (no OPENAI_API_KEY required)', async () => {
    expect(process.env.OPENAI_API_KEY).toBeUndefined()

    // Recorded cassette: one agent turn that reasons, calls add_code_block,
    // gets its output, calls add_markdown_block, then emits the summary text.
    agentMocks.cassette.fullStream = [
      { type: 'reasoning-delta', text: 'I should load the data first.' },
      { type: 'tool-call', toolName: 'add_code_block', input: { code: 'import pandas as pd' } },
      { type: 'tool-result', toolName: 'add_code_block', output: 'fixture code output' },
      { type: 'tool-call', toolName: 'add_markdown_block', input: { content: '## Summary' } },
      { type: 'tool-result', toolName: 'add_markdown_block', output: 'fixture markdown output' },
      { type: 'text-delta', text: 'Loaded the dataset and ' },
      { type: 'text-delta', text: 'wrote a summary.' },
    ]
    agentMocks.cassette.text = 'Loaded the dataset and wrote a summary.'

    const events: AgentStreamEvent[] = []
    const result = await executeAgentBlock(makeAgentBlock(), makeContext({ onAgentEvent: e => void events.push(e) }))

    // The loop maps each fullStream part to the right AgentStreamEvent shape.
    expect(events).toEqual([
      { type: 'reasoning_delta', text: 'I should load the data first.' },
      { type: 'tool_called', toolName: 'add_code_block' },
      { type: 'tool_output', toolName: 'add_code_block', output: 'fixture code output' },
      { type: 'tool_called', toolName: 'add_markdown_block' },
      { type: 'tool_output', toolName: 'add_markdown_block', output: 'fixture markdown output' },
      { type: 'text_delta', text: 'Loaded the dataset and ' },
      { type: 'text_delta', text: 'wrote a summary.' },
    ])

    // The final assistant text is surfaced from streamResult.text.
    expect(result.finalOutput).toBe('Loaded the dataset and wrote a summary.')
  })

  it('stringifies non-string tool-result output before emitting tool_output', async () => {
    agentMocks.cassette.fullStream = [
      { type: 'tool-call', toolName: 'add_code_block', input: { code: 'x = 1' } },
      // Some tools return structured output; the loop JSON-stringifies it.
      { type: 'tool-result', toolName: 'add_code_block', output: { rows: 3, ok: true } },
    ]
    agentMocks.cassette.text = ''

    const events: AgentStreamEvent[] = []
    await executeAgentBlock(makeAgentBlock(), makeContext({ onAgentEvent: e => void events.push(e) }))

    expect(events).toEqual([
      { type: 'tool_called', toolName: 'add_code_block' },
      { type: 'tool_output', toolName: 'add_code_block', output: JSON.stringify({ rows: 3, ok: true }) },
    ])
  })

  // Scenario 1 edge: empty/null stream terminates cleanly --------------------
  it('returns empty finalOutput and emits no events when the stream is empty', async () => {
    agentMocks.cassette.fullStream = []
    agentMocks.cassette.text = ''

    const events: AgentStreamEvent[] = []
    const result = await executeAgentBlock(makeAgentBlock(), makeContext({ onAgentEvent: e => void events.push(e) }))

    expect(events).toEqual([])
    expect(result.finalOutput).toBe('')
  })

  it('does not throw when no onAgentEvent callback is provided', async () => {
    agentMocks.cassette.fullStream = [{ type: 'text-delta', text: 'hello' }]
    agentMocks.cassette.text = 'hello'

    const result = await executeAgentBlock(makeAgentBlock(), makeContext({ onAgentEvent: undefined }))
    expect(result.finalOutput).toBe('hello')
  })

  // Scenario 2: model precedence + maxTurns wiring (behavior-verified) -------
  describe('model precedence and turn cap', () => {
    it('uses block.metadata.deepnote_agent_model when it is not "auto"', async () => {
      const block = makeAgentBlock({ metadata: { deepnote_agent_model: 'gpt-4o-mini' } })
      await executeAgentBlock(block, makeContext())
      expect(agentMocks.captured.settings?.model).toMatchObject({ modelId: 'gpt-4o-mini' })
    })

    it('falls back to OPENAI_MODEL env when metadata model is "auto"', async () => {
      process.env.OPENAI_MODEL = 'gpt-4o'
      await executeAgentBlock(makeAgentBlock(), makeContext())
      expect(agentMocks.captured.settings?.model).toMatchObject({ modelId: 'gpt-4o' })
    })

    it('falls back to the gpt-5 literal when metadata is "auto" and OPENAI_MODEL is unset', async () => {
      expect(process.env.OPENAI_MODEL).toBeUndefined()
      await executeAgentBlock(makeAgentBlock(), makeContext())
      expect(agentMocks.captured.settings?.model).toMatchObject({ modelId: 'gpt-5' })
    })

    it('uses the openai.chat() variant when OPENAI_BASE_URL is set (compatible provider)', async () => {
      process.env.OPENAI_BASE_URL = 'https://compat.example/v1'
      await executeAgentBlock(makeAgentBlock(), makeContext())
      expect(agentMocks.captured.settings?.model).toMatchObject({ api: 'chat' })
    })

    it('caps the loop at maxTurns=10 via stepCountIs (stopWhen wired to the agent)', async () => {
      // `stepCountIs(10)` is the real helper (only ToolLoopAgent is mocked): it returns
      // a predicate `({ steps }) => steps.length === 10`. We assert the captured
      // `stopWhen` actually fires at 10 steps and NOT at 9 — proving the cap VALUE is
      // 10, not merely that some stop condition was wired. A regression to any other
      // cap (or `toBeDefined`-only wiring) fails this.
      await executeAgentBlock(makeAgentBlock(), makeContext())

      const stopWhen = agentMocks.captured.settings?.stopWhen as (arg: { steps: unknown[] }) => boolean
      expect(typeof stopWhen).toBe('function')

      const stepsOfLength = (n: number) => ({ steps: Array.from({ length: n }, () => ({})) })
      expect(stopWhen(stepsOfLength(9))).toBe(false)
      expect(stopWhen(stepsOfLength(10))).toBe(true)
      expect(stopWhen(stepsOfLength(11))).toBe(false)
    })
  })
})
