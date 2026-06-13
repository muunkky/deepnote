---
verdict: APPROVAL
card_id: 5mz1md
review_number: 1
commit: 85f5b3c
date: 2026-06-13
has_backlog_items: true
---

# Review — LUIVIEW1 step 3: SPA app shell + routing (5mz1md)

## Verdict: APPROVAL

## Gate 1 — completion claim (PASS)

The DoD is well-formed and required (the card touches component public props, control
flow, and test behavior). Intent is plain-English and verifiable: open the app against an
in-memory project, see every notebook listed, click one to see its cells in saved order
with a linkable hash. The capstone is unfakeable — it asserts N real DOM entries for an
N-notebook fixture, that a click routes (active selection updates) AND mutates
`location.hash`, AND that rendered DOM order equals persisted `blocks[]` order. That is an
end-to-end assembly assertion (list + selection + routing + ordered render), not a per-part
stub, and it cannot pass by mocking. Remaining observables (hash-load selection, no-hash
default, `: ApiProject` compile-time typing, suite green) are testable and consistent with
Intent. Checkbox design proves correctness if honest. No card-structure failures.

## Gate 2 — implementation quality (PASS)

**Shell + routing.** `App.tsx` single-sources `activeNotebookId` and keeps it bidirectional
with `location.hash` cleanly: mount/hashchange derive via `resolveActiveNotebookId`; a click
sets state and writes the hash, and the resulting `hashchange` resolves back to the same id
(no loop). `resolveActiveNotebookId` implements the documented precedence (valid id →
`initNotebookId` → first) and returns `undefined` only for an empty project, which `App`
renders as an explicit empty-state pane. `hashRoute.ts` is correctly decoupled from React,
percent-encodes, and round-trips. `NotebookList` uses real focusable `<button>`s with
`aria-current="page"`; `NotebookView` maps `blocks[]` in array order with stable id keys.

**ADR compliance.** ADR-007 §6 is honored precisely: `viewModels.ts` derives
`ProjectVM`/`NotebookVM`/`BlockVM` from `import type { ApiProject } from
'@deepnote/runtime-server/types'` and never re-declares the project shape; the fixture is
annotated `: ApiProject` so a contract change becomes a compile error (verified the contract
is the Node-free `api-types.ts` entry). ADR-006 isolation holds — the SPA stays in its own
jsdom vitest project, the type edge is type-only, and the root typecheck still names zero
`apps/` files. Verified live: isolation test 3/3 green.

**TDD evidence.** Tests assert behavior off the real DOM (attributes, role queries, rendered
order) rather than component internals, and cover failure/edge cases that a test-after pass
would skip: empty project, stale/missing `initNotebookId`, percent-encoded and non-matching
hashes, browser-driven post-mount `hashchange`. This reads as contract-first.

**HMR e2e (folded-in L2 from j97w5m).** `e2e/hmr.e2e.test.ts` is a genuine proof: real Vite
dev server, real headless Chromium over a hand-rolled CDP client, a real source-file edit,
and two real assertions — the DOM reflects the edit within an HMR ceiling (measured latency
logged) AND a pre-edit `window` sentinel survives, proving a Fast-Refresh hot update rather
than a full reload. The probe is isolated from shell code and restored in `afterAll`. The
DevToolsActivePort free-port idiom and the post-SIGKILL temp-dir retry are correct for a
shared box. This satisfies the L2 criterion as a real timed edit→reflect loop, not a mock.

**Verification run during review:**
- studio jsdom suite: 14/14 green.
- studio typecheck (`tsc --noEmit -p apps/studio/tsconfig.json`): clean.
- isolation/boundary (`test-helpers/apps-studio-isolation.test.ts`): 3/3 green.
- HMR e2e: not re-run here (needs sandbox-disabled launch of a real browser — an environment
  property of the constrained box, per the dispatcher note; the close-out reports it green
  and repeatable, and the harness code is sound on inspection).

No lazy solves, no silent error swallowing, no DRY violations, no security concerns. README
and inline docs accurately describe the shell/routing model and the HMR proof (DaC satisfied).

## FOLLOW-UP

- **L1 (test-harness-framing):** `cdp.ts` `findChromeBinary()` defaults to the
  Playwright-cached Chromium path (`~/.cache/ms-playwright/chromium-1223/...`), while the
  module header states "no Playwright/Puppeteer dependency." The runtime DRIVER has no
  Playwright dep (true and valuable), but the BROWSER BINARY still comes from
  `playwright install chromium`, and the revision (`chromium-1223`) is hard-coded — a
  Playwright browser-cache bump would silently break the default lookup until someone sets
  `HMR_CHROME_BIN`. Failure mode: a future `playwright install` upgrade leaves the default
  path stale, and the HMR e2e fails to find a browser on a fresh checkout with an opaque
  "DevTools endpoint did not come up" error. Non-blocking (override exists, test is gated out
  of `pnpm test`), but worth either reconciling the wording or discovering the cached revision
  dynamically rather than pinning `chromium-1223`.

- **L2 (fixture-cast):** `__fixtures__/sampleProject.ts` constructs each block via
  `{ ... } as BlockVM`. This matches the upstream `blocks` package's own test convention
  (`... as DeepnoteBlock`) and the envelope-level `: ApiProject` annotation still provides the
  drift-catch the card targets, so it is not a blocker. Noted only because the per-block cast
  locally widens past the discriminated union — if a future block-type field becomes required,
  the cast would suppress that at the block level (the envelope annotation would still catch
  structural envelope drift). Acceptable as-is; flagging for awareness when the real renderer
  registry lands in steps 5–7D.

## Close-out actions

None outstanding for this card. Step 4 replaces the in-memory fixture with a real
`GET /api/project` fetch (already scoped, not this card's responsibility).
