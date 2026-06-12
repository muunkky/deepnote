# Executor directive — LUI1WEDGE / zq7q0g (executor-2, B1 rework)

## ⚠️ BRANCH OVERRIDE — read before the "Worktree branch-base check"

This sprint runs on **`milestone/m3-local-ui`**, **NOT** `sprint/LUI1WEDGE`. There is no
`sprint/LUI1WEDGE` branch.

- **Worktree branch-base check:** run
  ```bash
  git merge-base --is-ancestor milestone/m3-local-ui HEAD && echo "base ok" || echo "WRONG BASE"
  ```
  Your worktree was forked from `milestone/m3-local-ui`'s HEAD. Checking the default `sprint/LUI1WEDGE`
  ref would error and falsely report `WRONG BASE` — do not do that.
- **Merge-back target**: the dispatcher merges your `worktree-agent-…` branch into `milestone/m3-local-ui`.
- **Completion tag**: `LUI1WEDGE-zq7q0g-done`.

Commit **code only / never stage `.gitban/`**; TDD.

## This is a Gate-2 REJECTION rework — fix B1 only

`zq7q0g` (`deepnote serve`, step 6) was approved on structure but **REJECTED at Gate 2** at commit
`9c9f07f`. **Read the full rework spec in `.gitban/agents/executor/inbox/LUI1WEDGE-zq7q0g-executor-1-rework.md`**
and the reviewer report `.gitban/agents/reviewer/inbox/LUI1WEDGE-zq7q0g-reviewer-1.md` — they are the
authoritative spec.

**B1 (the only blocker):** the `server.test.ts` test `listen(port, host) constrains the bind to that
interface` is a **false positive on the security-critical loopback assertion**. Its `boundAddress` helper
reads the *client-side* `socket.localAddress` over a loopback connection — always `127.0.0.1` regardless
of which interface the server bound — so the test passes even when the server binds `0.0.0.0`. The
reviewer proved this by mutation.

**Mandatory fix (per the rework directive):**
- Assert on the **authoritative server-side bound address** (`AddressInfo.address` already read in
  `httpHandle.onListening`). Expose it — resolve `listen` to `{ port, address }` or add a
  `boundAddress`/`address()` accessor on the `RuntimeServer` handle — and assert it `=== '127.0.0.1'`
  for the loopback case.
- Add the **negative leg**: assert the server-side bound address for the omitted-host case is `'0.0.0.0'`
  (or the unspecified address), so the suite **fails** if the loopback bind silently became `0.0.0.0`.
  Verify by temporarily mutating the impl to bind `0.0.0.0` and confirming the test fails, then revert.

**Do NOT** rewrite the production `serve.ts` bind logic — the reviewer verified it is correct end-to-end.
Touch only `server.ts` (return-shape / accessor to expose the server-side bound address) and the test
(`server.test.ts`). The serve command's loopback behaviour itself is right; only its *test* is unsound.

## Before you finish — gates

Re-run cli + runtime-server suites from the **repo root** (`npx vitest run <files>` or `pnpm test`) — NOT
from inside a package dir (some cli tests resolve `examples/*.deepnote` against `process.cwd()` and only
pass from root). Best with `VITEST_MAX_WORKERS=2 VITEST_TEST_TIMEOUT=30000`. Then `pnpm typecheck`,
`pnpm exec biome check --write` on touched packages, and prettier/spell on any touched Markdown. Verify
the card observables still hold (no-`apps/`-token grep, bound-port truthfulness). A lint/spell/format
failure is a completion failure.

This card is in sprint **LUI1WEDGE** — do not push a branch or open a PR; the dispatcher owns lifecycle.
