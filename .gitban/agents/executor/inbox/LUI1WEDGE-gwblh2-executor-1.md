# Executor directive — LUI1WEDGE / gwblh2 (executor-1, step 7C: decouple cli suite-6 fixture from process.cwd)

## ⚠️ BRANCH OVERRIDE
This sprint runs on **`milestone/m3-local-ui`**, NOT `sprint/LUI1WEDGE`.
- Worktree base check: `git merge-base --is-ancestor milestone/m3-local-ui HEAD && echo "base ok" || echo "WRONG BASE"`.
- Merge-back target `milestone/m3-local-ui`; completion tag `LUI1WEDGE-gwblh2-done`. Commit **code only**.

## The fix (test-only, behavior-preserving)
`read_card(gwblh2)` for full detail. **Touch ONLY `packages/cli/src/commands/serve.test.ts`.**

`HELLO_WORLD_FILE` (line ~18) and the negative path (line ~278, `does-not-exist.deepnote`) resolve the
fixture against `process.cwd()`, so the suite only passes when vitest runs from the repo root (from any
other cwd the `runAction` harness fails with an opaque `"SIGINT handler was never registered"`). Sqm7ox
added 4 more `runAction` tests inheriting the coupling.

**Fix:** anchor both to the test file's own location, mirroring the pattern **already in this file at
line ~408**: `const here = dirname(fileURLToPath(import.meta.url))` then resolve the fixture relative to
`here` (compute the path to `<repo-root>/examples/1_hello_world.deepnote` from the test file's dir).
`fileURLToPath` is already imported (line 3); reuse `dirname`/`resolve`. Behaviour is identical from the
repo root — the only change is the suite now also passes from any cwd.

**TDD/verify:** demonstrate the failure first (run the suite from a NON-root cwd, e.g.
`cd packages/cli && pnpm exec vitest run src/commands/serve.test.ts` — observe the SIGINT failure), apply
the fix, then confirm the SAME non-root-cwd invocation passes AND the repo-root run still passes. Do NOT
weaken any assertion; the negative-path test must still assert the intended not-found behaviour.

## Before you finish — gates (run from repo root)
`pnpm test` (mocked, green — no regressions), `pnpm typecheck` (both halves), `pnpm exec biome check --write packages/cli`,
`pnpm spell-check` (from parent; add terms to `docs-dictionary.txt`). A lint/spell/format/typecheck
failure is a completion failure. Do not push or open a PR — the dispatcher owns lifecycle.
