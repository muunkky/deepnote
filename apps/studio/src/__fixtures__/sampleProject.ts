import type { ApiProject } from '@deepnote/runtime-server/types'

// Shared in-memory reference workload for the SPA component tests, typed `: ApiProject`
// — the FULL s1 envelope (path / metadata / project / openHash / capabilities), not a
// re-declared local shape (ADR-007 §6 drift-catch). The annotation is the test: if the s1
// contract changes, this literal stops compiling. Step 4 replaces it with a real fetch;
// every shell/routing test keeps consuming this same typed object until then.
//
// Three notebooks, ~20 blocks total, spanning the common block types so the placeholder
// renderer (and, later, the real registry) has a representative tree to walk. Block ids
// are stable and unique; `blocks[]` order is the persisted reading order the order-test
// asserts against.

type BlockVM = ApiProject['project']['notebooks'][number]['blocks'][number]

// Minimal, fully-typed block factory. Each block carries the persisted base fields
// (`id` / `blockGroup` / `sortingKey` / `metadata`) the contract requires; `content` is
// optional per block type. `satisfies BlockVM` keeps every literal honest against the
// imported union without widening it away.
function block(id: string, type: BlockVM['type'], content = ''): BlockVM {
  return { id, blockGroup: `g-${id}`, sortingKey: id, type, content, metadata: {} } as BlockVM
}

const analysisBlocks: BlockVM[] = [
  block('a1', 'text-cell-h1', 'Sales analysis'),
  block('a2', 'text-cell-p', 'A walk through the quarterly numbers.'),
  block('a3', 'markdown', '## Setup'),
  block('a4', 'code', 'import pandas as pd'),
  block('a5', 'code', 'df = pd.read_csv("sales.csv")'),
  block('a6', 'sql', 'SELECT region, SUM(amount) FROM sales GROUP BY region'),
  block('a7', 'separator'),
  block('a8', 'text-cell-h2', 'Revenue by region'),
  block('a9', 'visualization'),
  block('a10', 'big-number', 'Total revenue'),
  block('a11', 'text-cell-callout', 'Q4 beat target by 12%.'),
]

const explorationBlocks: BlockVM[] = [
  block('e1', 'text-cell-h1', 'Data exploration'),
  block('e2', 'markdown', 'Poke at the raw tables.'),
  block('e3', 'code', 'df.describe()'),
  block('e4', 'code', 'df.head(20)'),
  block('e5', 'image'),
  block('e6', 'text-cell-bullet', 'Outliers in the west region'),
]

const scratchBlocks: BlockVM[] = [
  block('s1', 'text-cell-h2', 'Scratch'),
  block('s2', 'code', 'x = 1 + 1'),
  block('s3', 'text-cell-todo', 'Revisit the join logic'),
]

export const sampleProject: ApiProject = {
  path: '/workspace/sample.deepnote',
  metadata: { createdAt: '2024-01-01T00:00:00.000Z' },
  project: {
    id: 'proj-sample',
    name: 'Sample analytics project',
    initNotebookId: 'nb-analysis',
    notebooks: [
      { id: 'nb-analysis', name: 'Analysis', blocks: analysisBlocks },
      { id: 'nb-exploration', name: 'Exploration', blocks: explorationBlocks },
      { id: 'nb-scratch', name: 'Scratch', blocks: scratchBlocks },
    ],
  },
  openHash: '0'.repeat(64),
  capabilities: { kernelLanguage: null, reactivity: 'disabled' },
}
