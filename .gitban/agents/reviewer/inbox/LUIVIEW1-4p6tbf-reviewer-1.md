---
verdict: APPROVAL
card_id: 4p6tbf
review_number: 1
commit: 17c2cf2
date: 2026-06-13
has_backlog_items: false
---

# Review: LUIVIEW1 step 4 — SPA project load over s1 GET /api/project

## Gate 1 — Completion claim: PASS

The card requires a DoD (it adds a network seam, a discriminated state machine, control flow,
and component branching). The DoD is sound:

- **Intent** is plain-English and sanity-checkable: start s1, open the app, it fetches the whole
  project over HTTP and renders the shell from live data; a failure shows the s1-surfaced error
  banner instead of crashing; the project shape is the server's own contract type so the two
  cannot silently disagree.
- **Capstone observable is genuine and unfakeable in shape:** against a real *or test-double* s1
  loader, the shell fetches `GET /api/project` and renders real notebooks from the response into
  the DOM, AND a non-2xx drives the error banner (s1 message) rather than the shell. It asserts
  on observable DOM, not a return type — not tickable by one isolated unit test.
- Observables and Intent are consistent; the remaining observables (compile-time drift assertion,
  store transitions both directions, type-only import boundary, R7 split-a) are each backed by a
  concrete test or measurement.

Checkbox design proves correctness if honestly checked, and integrity holds — every checked box
is corroborated by the diff and by my own test runs below. The lifecycle boxes left unchecked
(Code Review, deploy/monitoring) are correctly reviewer/PR-owned or N/A for the fork-only
milestone.

The executor's honest scope note is accurate and within the DoD: the capstone is verified against
an injected test-double loader, which the DoD text "a real OR test-double s1 server" explicitly
permits. The fetch path itself is independently unit-tested against a stubbed `globalThis.fetch`.
This is a deliberate, documented boundary (live `deepnote serve` end-to-end is s1-gated and out of
this card's scope), not a diluted scope or a shortcut shipped as "done".

## Gate 2 — Implementation quality: PASS

Verified locally at commit 17c2cf2:

- `pnpm --filter @deepnote/studio test` → **29/29 pass** (6 files).
- `tsc --noEmit -p apps/studio/tsconfig.json` → **EXIT 0** (this compiles the load-bearing
  `fetchProject.test-d.ts` drift assertion; a return-type drift would fail it).
- `vitest run test-helpers/apps-studio-isolation.test.ts` → **3/3 pass** (zero `apps/` files in
  the root typecheck, no `packages/*` frontend dep, type-only `/types` subpath only).

Architecture and code quality:

- **fetchProject.ts** — single read-only network seam. Returns the FULL imported `ApiProject`
  envelope (no re-declared shape; the only `@deepnote/runtime-server` import is
  `import type { ApiProject } from '@deepnote/runtime-server/types'`). `ProjectLoadError` is a
  typed error carrying the s1 `{ error }` message + status, with the `Object.setPrototypeOf`
  fix so `instanceof` survives ES-target transpilation. All three failure arms (non-2xx with
  s1 message, status-fallback message, pre-response network failure with no status, unparseable
  2xx body) are handled and tested. Confirmed against `api-types.ts`: `ApiProject` is the
  documented full envelope and ADR-007 §6's "consumers import, never re-declare" invariant is
  honored — the store derives slices via indexed access (`ApiProject['project']`,
  `ApiProject['capabilities']`), not a local copy.

- **projectStore.ts** — clean `loading | loaded | error` discriminated union. `loadProjectState`
  is a pure orchestration seam (loader thunk injectable), always resolves (never rejects), and
  normalizes any non-`ProjectLoadError` throw into the typed class so the error arm is always
  typed. Active notebook resolved up front via the shared `resolveActiveNotebookId` precedence,
  so a deep-linked hash and the store agree.

- **App.tsx / Shell.tsx** — correct decomposition: `App` becomes the fetch container, `Shell` is
  the loaded view extracted verbatim (routing/selection⇆hash unchanged, confirmed by the moved
  Shell.test assertions). The mount effect uses a `cancelled` guard to drop a late resolution
  after unmount — the standard correct pattern, also correct under StrictMode double-invoke.
  a11y is real: `role="status"` loading affordance (`<output>`), `role="alert"` error banner.

- **TDD evidence** — tests define the contract and lead structure: failure/edge cases (network
  failure, unparseable body, status-fallback, error-normalization, no-`initNotebookId` fallback)
  exist alongside the happy path, not just happy-path. App tests assert observable DOM across all
  three states. The drift-catch is a compile-time type assertion, the strongest form of the
  C1/R2 invariant. Documentation (DaC) is updated and accurate in `apps/studio/README.md`.

No lazy solves, no DRY violations, no security concerns, no ADR drift. The diff delivers exactly
what the Intent paragraph promises.

## FOLLOW-UP

None. The one boundary worth naming — live-server end-to-end vs test-double loader — is explicitly
in the design's scope split (s1-gated) and the DoD's permitted alternatives, not tech debt this
diff introduces. No adjacent debt, dead code, or consumer-coverage gaps exposed.

## Outstanding close-out actions

- Tick "Code Review Approved" / unblock to in_progress for PR + closeout.
- Deploy/monitoring/stakeholder boxes are N/A for the fork-only showcase milestone.
