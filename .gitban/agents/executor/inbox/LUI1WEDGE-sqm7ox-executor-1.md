# Executor directive — LUI1WEDGE / sqm7ox (executor-1, step 7A: `deepnote ui` browser-launch alias)

## ⚠️ BRANCH OVERRIDE
This sprint runs on **`milestone/m3-local-ui`**, NOT `sprint/LUI1WEDGE`.
- Worktree base check: `git merge-base --is-ancestor milestone/m3-local-ui HEAD && echo "base ok" || echo "WRONG BASE"`.
- Merge-back target `milestone/m3-local-ui`; completion tag `LUI1WEDGE-sqm7ox-done`. Commit **code only**.

## Build context
Register **`deepnote ui`** as a thin alias. `read_card(sqm7ox)` for the full DoD. Grounding: design doc
"Phase 7: `deepnote ui` alias" + ADR-005 §3. `deepnote serve` (`zq7q0g`) is landed:
`packages/cli/src/commands/serve.ts` has `createServeAction`, and `cli.ts` registers `serve`.

**Requirements (a reviewer will check each):**
- `deepnote ui` registers as a **thin alias reusing `createServeAction`** with the browser-**open** default
  ON; `deepnote serve` keeps its `--no-open` (headless) default. Do NOT duplicate serve logic — wrap the
  factory (e.g. `createServeAction` with `open:true` default for `ui`).
- The browser-open targets the **LOCAL served URL** (`http://localhost:PORT`), same mechanism as serve's
  browser open.
- **Load-bearing NEGATIVE capstone:** no code path from `ui` reaches `openDeepnoteFileInCloud`
  (`run.ts:1536`, the cloud-upload path). Assert the cloud-upload is never invoked — `ui` opens the local
  URL only (the local-first guarantee). Capstone: assert the browser-open call receives the local
  `http://localhost:PORT` (not a cloud URL) for `ui`, and that `serve` does NOT open a browser by default.
- Mocked tests (suite). Register `ui` next to `serve` in `packages/cli/src/cli.ts`. Document `ui` in
  `--help` / `packages/cli/README.md`; note the final `serve`/`ui` naming is a P6 PRD open question.

## ⚠️ Sibling card note (parallel batch)
Step 7B (`yzd78n`, SQL-integration-parity) is running **concurrently** and also adds a small section to
`packages/cli/README.md`. Keep your README addition a self-contained additive block (a `## deepnote ui`
section) so a keep-both merge is clean. You do NOT touch the integration helpers or `run.ts` — that's 7B.

## Before you finish — gates (run from repo root)
`pnpm test` (mocked, green), `pnpm typecheck` (both halves), `pnpm exec biome check --write packages/cli`,
prettier on any `.md`, `pnpm spell-check` (from parent; add terms to `docs-dictionary.txt`). A
lint/spell/format/typecheck failure is a completion failure. Do not push or open a PR — the dispatcher
owns lifecycle.
