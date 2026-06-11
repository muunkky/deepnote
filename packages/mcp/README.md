# @deepnote/mcp

MCP (Model Context Protocol) server for AI-assisted Deepnote notebook creation, editing, conversion, and execution.

This server follows MCP best practices:

- **Server instructions**: Usage guidance is injected into the AI system prompt
- **MCP prompts**: Reusable workflow templates for common notebook tasks
- **Bounded toolsets**: Focused tools with strict contracts
- **Contracts first**: Explicit schemas and side effects

## Installation

```bash
# Install globally
npm install -g @deepnote/mcp

# Or run directly with npx
npx @deepnote/mcp
```

## Usage with Cursor

Add to Cursor MCP settings:

```json
{
  "mcpServers": {
    "deepnote": {
      "command": "npx",
      "args": ["@deepnote/mcp"]
    }
  }
}
```

Common settings locations:

- `~/.cursor/mcp.json`
- `~/.cursor/config/mcp.json`

## MCP Prompts

The server exposes workflow templates through MCP prompts:

| Prompt                  | Description                                                       |
| ----------------------- | ----------------------------------------------------------------- |
| `debug_execution`       | Debug notebook execution using snapshots and reruns               |
| `create_notebook`       | Create a new Deepnote notebook with recommended structure         |
| `convert_and_enhance`   | Convert from Jupyter/other formats and improve notebook structure |
| `fix_and_document`      | Fix issues and add documentation                                  |
| `block_types_reference` | Quick reference for block types and metadata                      |
| `best_practices`        | Best practices for well-structured interactive notebooks          |

## MCP Resources

The server exposes notebook resources for discovery:

| Resource URI           | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `deepnote://examples`  | Example notebooks (if available in your installation) |
| `deepnote://workspace` | All `.deepnote` files in the current workspace        |
| `deepnote://file/...`  | Individual notebook summary by absolute file path     |

## Available Tools

### Reading Tools

| Tool                | Description                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `deepnote_read`     | Read/analyze a notebook. Use `include` to request `structure`, `stats`, `lint`, `dag`, or `all` |
| `deepnote_cat`      | Show block contents with optional filters                                                       |
| `deepnote_validate` | Validate YAML + schema structure                                                                |
| `deepnote_diff`     | Compare two `.deepnote` files structurally                                                      |

### Writing Tools

| Tool                      | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `deepnote_create`         | Create a new `.deepnote` file from a specification |
| `deepnote_add_block`      | Add a block to an existing notebook                |
| `deepnote_edit_block`     | Edit a block's content and/or metadata             |
| `deepnote_remove_block`   | Remove a block by ID                               |
| `deepnote_reorder_blocks` | Reorder blocks in a notebook                       |
| `deepnote_add_notebook`   | Add a new notebook to an existing project          |

### Conversion Tools

| Tool                    | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| `deepnote_convert_to`   | Convert Jupyter/Quarto/Percent/Marimo to `.deepnote` |
| `deepnote_convert_from` | Convert `.deepnote` to Jupyter/Quarto/Percent/Marimo |

### Execution Tools

Execution is handled by a single tool:

| Tool           | Description                                   |
| -------------- | --------------------------------------------- |
| `deepnote_run` | Run all notebooks, one notebook, or one block |

Scopes:

- **Project level**: `deepnote_run` with only `path` runs all notebooks
- **Notebook level**: pass `notebook`
- **Block level**: pass `blockId` (optionally also `notebook`)

`deepnote_run` supports `.deepnote`, `.ipynb`, `.py`, and `.qmd` inputs.

#### Selecting the Python interpreter

`deepnote_run` needs a Python interpreter with `deepnote-toolkit[server]` installed.
It resolves which interpreter to use with this precedence (most specific wins):

1. The `pythonPath` argument passed to `deepnote_run` (per-invocation override).
2. The **`DEEPNOTE_PYTHON`** environment variable set on the server process.
3. Autodetected system Python (`python`, then `python3`).

`DEEPNOTE_PYTHON` (and `pythonPath`) accept any of these forms:

| Form       | Example                    |
| ---------- | -------------------------- |
| Executable | `/path/to/venv/bin/python` |
| `bin/` dir | `/path/to/venv/bin`        |
| Venv root  | `/path/to/venv`            |

Set it when launching the server so an editor/host can publish the user's
selected interpreter to both the MCP server and the CLI:

```json
{
  "mcpServers": {
    "deepnote": {
      "command": "npx",
      "args": ["@deepnote/mcp"],
      "env": {
        "DEEPNOTE_PYTHON": "/path/to/venv/bin/python"
      }
    }
  }
}
```

If neither `pythonPath` nor `DEEPNOTE_PYTHON` is provided and only a bare system
interpreter (e.g. `python` / `python3`) is found, `deepnote_run` still attempts the
run but returns a `pythonHint` field with an actionable message — a bare system
Python usually lacks `deepnote-toolkit`, so this surfaces the problem at the tool
boundary instead of as an opaque import error deep in execution.

### Snapshot Tools

Snapshots store outputs separately from source files.

| Tool                      | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `deepnote_snapshot_list`  | List snapshots for a project                   |
| `deepnote_snapshot_load`  | Load latest or specific snapshot details       |
| `deepnote_snapshot_split` | Split source and outputs into separate files   |
| `deepnote_snapshot_merge` | Merge snapshot outputs back into a source file |

## Examples

### Create a notebook

```text
Use deepnote_create with:
- outputPath: "analysis.deepnote"
- projectName: "Sales Analysis"
- notebooks:
  - name: "Notebook 1"
    blocks:
      - type: "text-cell-h1"
        content: "Sales Analysis"
      - type: "markdown"
        content: "Load data and explore trends"
```

### Add a block and run only that block

```text
1. Use deepnote_add_block with:
   - path: "analysis.deepnote"
   - block: { type: "code", content: "print('hello')" }
2. Use deepnote_run with:
   - path: "analysis.deepnote"
   - blockId: "<new block id>"
```

### Lint and dependency analysis

```text
Use deepnote_read with:
- path: "analysis.deepnote"
- include: ["lint", "dag"]
```

### Convert from Jupyter and inspect

```text
1. Use deepnote_convert_to with inputPath: "notebook.ipynb"
2. Use deepnote_read with:
   - path: "notebook.deepnote"
   - include: ["structure", "stats"]
```

### Manage outputs with snapshots

```text
# Split outputs for version control:
Use deepnote_snapshot_split with path: "analysis.deepnote"

# Inspect latest snapshot:
Use deepnote_snapshot_load with path: "analysis.deepnote"

# Restore outputs:
Use deepnote_snapshot_merge with sourcePath: "analysis.deepnote"
```

## Development

Run from the monorepo root:

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm --filter @deepnote/mcp dev

# Build
pnpm --filter @deepnote/mcp build

# Test
pnpm --filter @deepnote/mcp test
```

## License

Apache-2.0
