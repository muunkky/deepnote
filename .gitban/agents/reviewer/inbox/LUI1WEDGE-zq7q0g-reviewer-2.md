---
verdict: APPROVAL
card_id: zq7q0g
review_number: 2
commit: 8ab721c
date: 2026-06-12
has_backlog_items: false
---

# Review 2: step 6 — `deepnote serve` (LUI1WEDGE/zq7q0g) — B1/B2 rework

Gate 1 passed in review 1 (DoD + capstone sound, scope honest). This cycle reviews only the
rework commit `8ab721c` against the two open blockers: **B1** (false-positive loopback test,
Gate 2 → executor) and **B2** (per-package typecheck failure introduced during rework).

## B1 — RESOLVED

The review-1 blocker: the loopback test's `boundAddress` helper read the **client** socket's
`localAddress` over a loopback connection (always `127.0.0.1` regardless of the server's bind
interface), so it passed even when the server bound `0.0.0.0`.

The fix is the cleaner of the two options I proposed and is correctly implemented:

- `server.ts` adds an `addressInfo(http)` helper that reads the authoritative TCP
  `AddressInfo` from `http.address()`, and a `boundAddress(): string | null` accessor on the
  `RuntimeServer` handle returning `addressInfo(http)?.address ?? null`. It is added to the
  `RuntimeServer` interface and forwarded through **both** return paths — the session-bound
  `createServer` return (`server.ts:157`) and the no-session `httpHandle` (`server.ts:230`).
  The `onListening` port-resolution was refactored onto the same `addressInfo` helper (DRY) with
  no change to the `Promise<number>` return shape, so the ~10 `await listen(0)` call sites stay
  stable.
- `server.test.ts` replaces the client-side helper. The loopback test now asserts
  `server.boundAddress() === '127.0.0.1'`, `!== '0.0.0.0'`, and `null` after close. A new
  negative-leg test covers the omitted-host path, asserting the server-side address is the
  unspecified address (`'0.0.0.0'`/`'::'`) and NOT `127.0.0.1`.

**Independently mutation-verified.** I forced `http.listen(port, host)` → `http.listen(port,
'0.0.0.0')` and re-ran the suite: the loopback test **failed** (`Expected "127.0.0.1" Received
"0.0.0.0"`), reading the real server-side address. Reverted; working tree clean at `8ab721c`;
suite green again (4/4). The security guard is now real — the exact regression the card names as
a security failure mode would now be caught.

This also satisfies the folded-in acceptance criterion (reviewer-1 L1): both `listen` overloads
are now characterised — with-host loopback (positive + negative legs) and without-host
all-interfaces. No duplicate test; the omitted-host case is covered by the new negative-leg test
rather than the pre-existing reachability-only lifecycle test.

## B2 — RESOLVED

The rework's typecheck blocker: `serve.ts`'s `SessionLike` (`{ close() }`) was too narrow for
`createServer({ session })`, which requires the full `ServerSession`.

Fix is a strengthening, not a weakening, of the contract:
- `ServeDeps.createSession` is now typed to return `ServerSession` (imported from
  `@deepnote/runtime-server`); the redundant `SessionLike` interface is removed. `defaultServeDeps`
  returns the real `new Session()`, which satisfies `ServerSession` — no widening of
  `CreateServerOptions.session`.
- `serve.test.ts`'s fake session now satisfies `ServerSession`: `close` is the real spy, and
  `apiProject`/`startEngine`/`runProject`/`save` are guard stubs that **throw** if the thin
  action ever touches them. This keeps the mock honest — it fails loudly rather than silently
  if `serve` ever reaches past `close()`.

**Verified:** `tsc --noEmit` clean in both touched packages (`runtime-server`, `cli`, exit 0
each); full `pnpm typecheck` (the `tsc -p tsconfig.json` half) exited 0. (Note: `pnpm -r exec
tsc --noEmit` SIGKILLs in `packages/reactivity` on this constrained machine — an unrelated
resource/OOM event, not a type error; the two touched packages typecheck clean in isolation.)

## Gates re-verified at HEAD (`8ab721c`)

- `vitest run packages/runtime-server/src/server.test.ts`: **4 passed**.
- `vitest run packages/cli/src/commands/serve.test.ts`: **11 passed**.
- `biome check` on the 4 touched files: clean, no fixes.
- Capstone observable `git grep -iE 'apps/' -- packages/cli/src/commands/serve.ts`: **nothing** (PASS).
- Production `serve.ts` bind logic untouched (`BIND_HOST = '127.0.0.1'`), as the executor claimed —
  the rework changed only the server-side accessor + tests + the B2 type.

## Disposition

Both blockers genuinely closed. The loopback security guard is now mutation-proof, the typecheck
is restored, and the L1 fold-in is satisfied with no duplicate coverage. The CLI suite remains
honestly mocked; the real-socket integration smoke stays on step-5 `wd2nil` (reviewer-1 L2,
already routed). Approving.

## FOLLOW-UP

None new. Prior L1 is folded into this card and satisfied; prior L2 (step-5 `wd2nil` real-socket
loopback/off-host-unreachability guard) remains the planner's open handoff, unaffected by this
rework.
