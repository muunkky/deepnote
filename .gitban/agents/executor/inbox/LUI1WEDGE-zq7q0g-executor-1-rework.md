# Executor rework directive — LUI1WEDGE / zq7q0g (review 1, Gate 2 REJECTION)

Use the project venv for any Python commands if needed.

The code for gitban card `zq7q0g` (step 6 — `deepnote serve`) was **REJECTED at Gate 2 (code-quality)**
at commit `9c9f07f`. Review report:
`.gitban/agents/reviewer/inbox/LUI1WEDGE-zq7q0g-reviewer-1.md`.

## Branch / worktree reminder
This sprint runs on **`milestone/m3-local-ui`**, NOT `sprint/LUI1WEDGE` (see the original
`LUI1WEDGE-zq7q0g-executor-1.md` directive for the branch-base override). Commit **code only** — never
stage `.gitban/`. Completion tag: `LUI1WEDGE-zq7q0g-done`. The card is in sprint LUI1WEDGE — do not push
a branch or open a PR; the dispatcher owns sprint lifecycle.

## What's wrong
The production code is correct and the card structure is sound. The rejection is a single test that does
not prove the security-critical loopback guarantee it claims to verify. Fix the test, re-run the suite,
re-verify the card's observables, then re-submit for review.

===BEGIN REFACTORING INSTRUCTIONS===

**B1 — code-quality (Gate 2). The runtime-server `listen(port, host)` test is a false positive on the
security-critical loopback assertion; it does not protect the loopback guarantee it claims to verify.**

File: `packages/runtime-server/src/server.test.ts`, test `listen(port, host) constrains the bind to that
interface`.

The problem: its `boundAddress(port)` helper opens a *client* connection to `127.0.0.1:port` and reads
`socket.localAddress`, then asserts `expect(address).toBe('127.0.0.1')` with the comment "the security
guarantee the serve command relies on (never 0.0.0.0)."

`socket.localAddress` is the **client** end of a loopback connection. When you connect to `127.0.0.1`,
the kernel routes over loopback and the client's local address is always `127.0.0.1` — **regardless of
which interface the server bound.** `0.0.0.0` includes loopback, so a server bound to all interfaces is
reachable on `127.0.0.1` and produces an identical client `localAddress`. The assertion is tautological
for a loopback connection and cannot distinguish a loopback-only bind from an all-interfaces bind.

The reviewer demonstrated this two ways:
1. A standalone `http.listen(0, '0.0.0.0')` server probed by the test's exact `boundAddress` helper
   returns `127.0.0.1` (while `server.address().address` correctly reads `0.0.0.0`).
2. Mutating the implementation to `http.listen(port, '0.0.0.0')` (ignoring the serve `host` arg) — the
   test suite **still reports passing.**

This is the one place in the diff where a real socket is bound and the loopback guarantee is claimed to
be verified at the integration level. The card's Observable "The server binds `localhost` (asserted),
never `0.0.0.0`" and Intent's "bind to a non-local address (a security regression)" both rest on this
test. As written it gives false confidence on exactly the regression the card names as a security
failure mode.

**Mandatory fix — assert on the authoritative server-side bound address (the preferred, cleaner fix):**
- In `httpHandle.onListening` the bound `AddressInfo` is already read (`server.ts` `onListening` calls
  `http.address()`). Expose `address.address` — e.g. have `listen` resolve `{ port, address }`, or add a
  `boundAddress`/`address()` accessor to the `RuntimeServer` handle — and assert it `=== '127.0.0.1'`
  for the loopback case.
- Add the **negative leg**: a test (or the same test, parametrised) that asserts the server-side bound
  address for the omitted-host case is `'0.0.0.0'` (or the unspecified address), so the suite would
  **fail** if the loopback bind silently became `0.0.0.0`. Verify by temporarily mutating the
  implementation to bind `0.0.0.0` and confirming the test fails (then revert the mutation).

(The reviewer noted an alternative end-to-end proof — bind `'127.0.0.1'`, enumerate a non-internal IPv4
from `os.networkInterfaces()`, and assert a connect to `that-ip:port` is refused — but flagged it as
flakier in CI. The server-side `address()` assertion is the required fix; the unreachability probe is
optional and not a substitute for it.)

===END REFACTORING INSTRUCTIONS===

## Re-submission steps
- Apply the fix above. Do NOT rewrite the production `serve.ts` bind logic — the reviewer verified it is
  correct end-to-end. Only change `server.ts`'s `listen` return shape / add an accessor as needed to
  expose the server-side bound address, plus the test.
- Re-run the full affected suite (`pnpm exec vitest run` for cli + runtime-server, best with
  `VITEST_MAX_WORKERS=2 VITEST_TEST_TIMEOUT=30000` on this box) and confirm green, including the new
  negative leg.
- Re-run `pnpm typecheck`, `pnpm exec biome check --write` on touched packages, and prettier/spell on any
  touched Markdown. A lint/spell/format failure is a completion failure, not a follow-up.
- Verify the card's observables still hold (the no-`apps/`-token grep, the bound-port truthfulness).
- Commit the fix on the worktree branch, re-write the completion tag, and leave the card for re-review.
