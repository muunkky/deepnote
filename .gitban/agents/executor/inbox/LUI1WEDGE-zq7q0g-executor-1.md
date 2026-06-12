# Executor directive — LUI1WEDGE / zq7q0g (executor-1, step 6: `deepnote serve` command)

## ⚠️ BRANCH OVERRIDE — read before the "Worktree branch-base check"

This sprint runs on **`milestone/m3-local-ui`**, **NOT** `sprint/LUI1WEDGE`. There is no
`sprint/LUI1WEDGE` branch — do not look for it, fetch it, or check against it.

Wherever your SKILL says `sprint/<tag>` / `sprint/LUI1WEDGE`, substitute **`milestone/m3-local-ui`**:

- **Worktree branch-base check:** run
  ```bash
  git merge-base --is-ancestor milestone/m3-local-ui HEAD && echo "base ok" || echo "WRONG BASE"
  ```
  Your worktree was forked from `milestone/m3-local-ui`'s HEAD by the `WorktreeCreate` hook, so this
  passes. Checking the default `sprint/LUI1WEDGE` ref would error and falsely report `WRONG BASE`.
- **Merge-back target**: the dispatcher merges your `worktree-agent-…` branch back into
  `milestone/m3-local-ui`. You do not merge; just commit code to your worktree branch.
- **Completion tag**: `LUI1WEDGE-zq7q0g-done` — write it per the SKILL recipe.

Commit **code only / never stage `.gitban/`**; TDD.

## Build context

Build the `deepnote serve` CLI command. `read_card(zq7q0g)` for the full DoD/AC. The grounding docs are
`docs/designs/m3-s1-server-api-and-serve.md` ("Phase 6: `deepnote serve` command", "Port selection (M1)")
and **ADR-007 §2**. The Required Reading table lists exact source lines (`run.ts` `createRunAction`
factory pattern, `cli.ts` registration site, `server-starter.ts` `findConsecutiveAvailablePorts`).

The server package (`@deepnote/runtime-server`) is fully built and on `milestone/m3-local-ui`:
`createServer({ session, ... })` boots open + run (WS) + save. Your command just wires it up.

**Non-negotiable requirements (from the card AC + ADR-007 §2 — a reviewer will check each):**
- `createServeAction` is **thin** in `packages/cli/src/commands/serve.ts`: resolve file path → pick a
  port → `createServer({...}).listen(port)` → log the ready URL → optionally open browser → wire
  `SIGINT` → `server.close()` → `session.close()` (which calls `engine.stop()`). All server logic stays
  in `@deepnote/runtime-server`; do not reimplement it in the CLI.
- Flags: `--port`, `--no-open`. **Binds `localhost`, NEVER `0.0.0.0`** (assert this — it's a security
  regression otherwise). Clear startup/ready/stop logging.
- `--static-dir <path>` option **EXISTS but defaults UNSET** and is **NEVER** hard-coded to
  `apps/studio/dist`. **The sliced `serve.ts` must carry NO `apps/` token** —
  `git grep -iE 'apps/' -- packages/cli/src/commands/serve.ts` must return nothing (this is a DoD
  capstone and is enforced repo-wide by the step-8 slice-integrity card).
- Add exactly one dep to `packages/cli`: `@deepnote/runtime-server` (`workspace:*`).
- **Port decision (M1) — state it explicitly in code + a comment/docs:** `findConsecutiveAvailablePorts`
  returns the FIRST of a consecutive PAIR (it steps `attempt*2`). serve needs ONE port — either use the
  first and document that the adjacent port is intentionally left free, OR add a single-port helper. Do
  NOT silently inherit pair semantics.
- Register `serve` next to `run` in `packages/cli/src/cli.ts`.

**Scope boundary:** the serve **smoke / integration test** is step 5 (`wd2nil`), NOT this card. Your
tests are the **mocked** suite 6 (port-fallback, `--no-open` headless, `localhost`-not-`0.0.0.0`,
SIGINT→`engine.stop()` via spy, the no-`apps/`-token grep). Do not write real-kernel integration tests
here.

## ⚠️ Before you finish — run the project's lint + spell gates

The pre-push runs `pnpm lintAndFormat && pnpm typecheck && pnpm test && pnpm spell-check`. Before you
return, run on your worktree and fix until clean — **including prettier on any Markdown you touch**
(a prior card's push was blocked by an unformatted README; `prettier:check` covers `**/*.{md,yml,yaml}`):

```bash
pnpm exec biome check --write packages/cli
pnpm exec prettier --write <any .md/.yml you changed>
pnpm spell-check   # add new terms to docs-dictionary.txt, NOT source
```

A lint/spell/format failure is a completion failure, not a follow-up. The suite is best run with
`VITEST_MAX_WORKERS=2 VITEST_TEST_TIMEOUT=30000` on this constrained box.

This card is in sprint **LUI1WEDGE** — do not push a feature branch or open a PR; the dispatcher owns
sprint lifecycle.
