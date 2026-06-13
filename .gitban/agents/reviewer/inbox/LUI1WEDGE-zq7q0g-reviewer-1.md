---
verdict: REJECTION
card_id: zq7q0g
review_number: 1
commit: 9c9f07f
date: 2026-06-12
has_backlog_items: true
---

# Review: step 6 — `deepnote serve` (LUI1WEDGE/zq7q0g)

## Gate 1 — Completion claim: PASS

The card requires a DoD (it adds a CLI command, a function signature, control flow, and a flag
surface read at runtime). The DoD is strong:

- **Intent** is plain-English, falsifiable, and names the user-observable failure modes (hang on a
  busy port, non-local bind = security regression, leaked kernel after exit).
- **Capstone** is unfakeable end-to-end: boots a server that answers `GET /api/project`, prints the
  localhost URL, and on SIGINT calls `engine.stop()` with no orphan. Not mockable as a return-shape
  assertion.
- Observables cover the failure modes (port fallback reports the bound port; loopback bind; no
  `apps/` token) and are consistent with Intent.
- The executor was honest about scope: suite 6 is mocked and the real serve smoke is explicitly
  deferred to the step-5 card (`wd2nil`), not claimed here. That is a correct decomposition, not a
  shortcut — the capstone's *real-socket* leg lives on the integration card by design.

No Gate 1 blocker. Proceeding to Gate 2.

## Gate 2 — Implementation quality

The production code is genuinely good and ADR-007-compliant:

- `serve.ts` is thin (ADR-007 §2 / design Phase 6): resolve → load session → pick port →
  `createServer({session}).listen(port, '127.0.0.1')` → log → optional open → SIGINT → `close()`.
  All server logic stays in `@deepnote/runtime-server`. Collaborators injected via `ServeDeps` for
  unit-testability; `defaultServeDeps()` wires the real implementations.
- `BIND_HOST = '127.0.0.1'`, never `0.0.0.0`. The host arg is threaded through `RuntimeServer.listen`
  so the bind decision lives in runtime-server while the thin command chooses loopback. Verified the
  production shutdown chain end-to-end: `server.close()` (server.ts:154) → `session.close()`
  (session.ts:309) → `engine.stop()`. Correct.
- Port (M1): reuses the audited `findConsecutiveAvailablePorts`, binds the first of the pair, leaves
  the adjacent port free — documented in code + README, not silently inheriting pair semantics.
- Reported URL uses the actually-bound port from `listen()` (truthful fallback). Good.
- `--static-dir` defaults unset; `git grep -iE 'apps/' -- packages/cli/src/commands/serve.ts`
  returns nothing — capstone PASS, verified at this commit.
- One dep added (`@deepnote/runtime-server: workspace:*`). cli.ts registration mirrors the existing
  `createXAction` pattern with full `--help`. Invalid `--port` is an explicit usage error (exit 2),
  not a silent fallback. Browser-launch failure is caught and does not take the server down.

The CLI mocked suite (`serve.test.ts`, 11 tests) asserts the right *action-level* behaviors: port
fallback, bound-URL truthfulness even when `listen()` resolves a different port, headless default,
`--open` launches at the URL, SIGINT → `server.close()` → `session.close()`, session threading,
flag threading, and both exit-2 paths. No issue there.

### BLOCKERS

**B1 — code-quality (Gate 2). The runtime-server `listen(port, host)` test is a false positive on
the security-critical assertion; it does not protect the loopback guarantee it claims to verify.**

`packages/runtime-server/src/server.test.ts`, test `listen(port, host) constrains the bind to that
interface`. Its `boundAddress(port)` helper opens a client connection to `127.0.0.1:port` and reads
`socket.localAddress`, then asserts `expect(address).toBe('127.0.0.1')` with the comment "the
security guarantee the serve command relies on (never 0.0.0.0)."

`socket.localAddress` is the **client** end of a loopback connection. When you connect to
`127.0.0.1`, the kernel routes over loopback and the client's local address is always `127.0.0.1` —
**regardless of which interface the server bound.** `0.0.0.0` includes loopback, so a server bound to
all interfaces is reachable on `127.0.0.1` and produces an identical client `localAddress`. The
assertion is tautological for a loopback connection and cannot distinguish a loopback-only bind from
an all-interfaces bind.

Demonstrated two ways:
1. A standalone `http.listen(0, '0.0.0.0')` server, probed by the test's exact `boundAddress`
   helper, returns `127.0.0.1` (while `server.address().address` correctly reads `0.0.0.0`).
2. Injecting the regression into the implementation — forcing `http.listen(port, '0.0.0.0')` so the
   serve `host` arg is ignored — the test suite **still reports 3 passed / 0 failed.** (Mutation
   reverted; `server.ts` is clean at HEAD.)

This is the one place in the whole diff where a real socket is bound and the loopback guarantee is
claimed to be verified at the integration level. The card's Observable "The server binds `localhost`
(asserted), never `0.0.0.0`" and Intent's "bind to a non-local address (a security regression)" both
rest on this test. As written it gives false confidence on exactly the regression the card names as a
security failure mode — a superficial test that confirms the code runs but doesn't assert the
meaningful behavior (per the SKILL's non-negotiable test principles). The CLI suite only asserts the
*argument* (`listen` was called with `'127.0.0.1'`) — it never proves the server *honors* it — so
nothing else in the diff backstops this either.

Refactor plan — assert on the authoritative server-side bound address, one of:
- Inspect the listener's own address: in `httpHandle.onListening` the bound `AddressInfo` is already
  read (`server.ts` `onListening` calls `http.address()`); expose `address.address` (e.g. have
  `listen` resolve `{ port, address }`, or add a `boundAddress`/`address()` accessor to the
  `RuntimeServer` handle) and assert it `=== '127.0.0.1'` for the loopback case and `=== '0.0.0.0'`
  (or the unspecified address) for the omitted-host lifecycle case. This makes the regression in
  the mutation test fail.
- Or prove unreachability on a non-loopback interface: bind `'127.0.0.1'`, enumerate a non-internal
  IPv4 from `os.networkInterfaces()`, and assert a connect to `that-ip:port` is refused/times out
  (skip when the host has no non-loopback IPv4). This is a truer end-to-end proof but flakier in CI;
  the server-side `address()` assertion is the cleaner fix.

Either way, add the negative leg: a test (or the same test, parametrised) that would **fail** if the
server bound `0.0.0.0`. Today none exists.

### FOLLOW-UP

- **L1 (test-depth-gap, runtime-server lifecycle test).** The pre-existing `listen(0)` lifecycle
  test inherits the same `canConnect`-over-loopback limitation: it proves the port is reachable and
  released, but not the bind interface. Not a blocker for this card (that test never claimed an
  interface guarantee), but when B1 is fixed by exposing the bound address, the omitted-host path is
  worth pinning too (assert it binds the unspecified address) so the two `listen` overloads are both
  characterised. Tag for the planner; small.

- **L2 (integration-coverage handoff, step-5 `wd2nil`).** The card legitimately defers the
  real-socket capstone (live `GET /api/project` over a real bind) to step 5. Worth ensuring step 5's
  smoke actually asserts the served process is bound to loopback and not reachable off-host — if B1
  is fixed only at the unit layer and step 5 also skips the interface check, the security boundary
  has no real-socket guard anywhere. Flag so the planner can confirm step 5 carries it.

## Disposition

Blocking on B1. The implementation is correct and the card structure is sound — this is purely a
test that doesn't prove what it asserts on a security-critical boundary. Fix is small (assert on the
server-side bound address and add the failing-on-`0.0.0.0` leg). Routing: code-quality → executor.
