# Executor directive — LUI1WEDGE / e6e3lt (executor-1, step 4B: save-api save-safety gate)

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
- **Completion tag**: `LUI1WEDGE-e6e3lt-done` — write it per the SKILL recipe.

Commit **code only / never stage `.gitban/`**; TDD.

## Build context

This is **step 4B — the save-safety gate**: `POST /api/project/save` with atomic temp-then-rename,
semantic round-trip + serialization idempotence, and external-change (clobber) detection. `read_card(e6e3lt)`
for the full DoD. The grounding design doc is `docs/designs/m3-s1-server-api-and-serve.md`
("Save round-trip (R6 — the save-safety gate)" + Phase 4 + KD-7); the card's Required Reading lists exact
serializer/deserializer source lines. Fidelity is **SEMANTIC, not byte-level** (the serializer
re-canonicalizes — the first save of `bash-image.deepnote` is the documented 1261→1372-byte reformat,
idempotent thereafter; pin that as expected-and-idempotent).

Build on the step-2/3/4A scaffold (all already on `milestone/m3-local-ui`):
`packages/runtime-server/src/` has `session.ts` (carries `openHash`), `router.ts` (framework-free
`node:http` router with the open + run routes), `server.ts`, `api-types.ts` (canonical contract incl.
the WS run types), `index.ts`.

## You are second of the serialized step-4 pair — build on 4A's settled surface

Step 4A (`hlai4c`) already landed and merged: it added the WS contract to `api-types.ts`, the run routes +
WS upgrade to `router.ts`/`server.ts`, and exports to `index.ts`. **Add your save work additively next to
4A's** — append the save request/response types in `api-types.ts`, register `POST /api/project/save` in
`router.ts` alongside the existing routes, export from `index.ts`, and add a README save section. Do not
restructure or revert any of 4A's run/WS code. Your net-new logic lives in `src/save.ts`.

Honour every capstone exactly: no-content-loss round-trip deep-equal, idempotence (second no-op save =
empty `git diff`), atomic temp-then-rename in the SAME dir (no `.tmp-*` left on success OR simulated
mid-write failure; original untouched on failure), and `409 { error:'external-change', currentProject,
currentHash }` with **no write** when on-disk SHA-256 ≠ `openHash`.

## ⚠️ Before you finish — run the project's lint + spell gates

The pre-push runs `pnpm lintAndFormat && pnpm typecheck && pnpm test && pnpm spell-check`. Before you
return, run on your worktree and fix until clean:

```bash
pnpm exec biome check --write packages/runtime-server
pnpm spell-check   # add new terms to docs-dictionary.txt, NOT source
```

A lint/spell failure is a completion failure, not a follow-up. The package vitest suite is best run with
`VITEST_MAX_WORKERS=2 VITEST_TEST_TIMEOUT=30000` on this constrained box (the default 5s timeout misses the
cold-module-graph python-subprocess probe; not a logic issue).

This card is in sprint **LUI1WEDGE** — do not push a feature branch or open a PR; the dispatcher owns
sprint lifecycle.
