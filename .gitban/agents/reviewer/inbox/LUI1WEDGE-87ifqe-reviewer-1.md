---
verdict: APPROVAL
card_id: 87ifqe
review_number: 1
commit: a654fdc..20970b6
date: 2026-06-12
has_backlog_items: true
---

# Review — 87ifqe (step-2 server-package-scaffold `@deepnote/runtime-server`)

**Verdict: APPROVAL.** This is a clean, well-reasoned scaffold that establishes the
package boundary and the ADR-007 §6 Node-free contract module exactly as specified.
Both review gates pass. The standout is a genuinely unfakeable capstone — I
reproduced it end-to-end (including a non-vacuity check) and it holds.

## Gate 1 — Completion claim: PASS

- **DoD present and strong.** Intent is a real plain-English description of what
  "working" looks like from outside (a type-only `/types` consumer compiles
  Node-free; the package builds/tests on its own) and names the concrete failure
  mode (a downstream typecheck suddenly pulling Node `http`/`ws` types). Not a
  restatement of the title.
- **Capstone is real and unfakeable.** The DoD capstone is a type-only
  `import type { … } from '@deepnote/runtime-server/types'` that must resolve the
  *built* `dist/api-types.d.ts` through the package `exports` map, PLUS a
  dependency check that `api-types.ts` has zero runtime import. This is the exact
  guard against decompose-but-don't-assemble. I verified it is non-vacuous:
  `--traceResolution` confirms `/types` resolves to `dist/api-types.d.ts` (the
  built artifact, not source), and injecting a deliberate contract violation
  (`{ type: 'nonexistent-variant' }`) made the capstone `tsc` fail with TS2322;
  reverting returned it to exit 0. It cannot be ticked by a mock.
- **Checkbox integrity verified independently.** I reproduced every claimed-green
  item rather than trusting the close-out:
  - `pnpm test` → **7 passed / 0 failed** across 3 files.
  - `pnpm build` (tsdown) → clean; emitted `dist/api-types.js` is literally
    `export {  };` (zero runtime import); `dist/api-types.cjs` has no
    `require(`/`import`.
  - `pnpm exec tsc --noEmit` → exit 0.
  - `pnpm run check:types-subpath` (capstone) → exit 0.
  - Precise frontend-coupling grep
    (`from ['"](react|react-dom|vite)['"]|@vitejs|apps/`) → nothing.
  - Cross-package type sources confirmed to exist and be exported:
    `KernelFailureCategory`/`IOutput` (runtime-core), `DeepnoteFile` (blocks).

## Gate 2 — Implementation quality: PASS

- **ADR-007 compliance is exact.** §1: a dedicated published `@deepnote/*` package
  mirroring `@deepnote/mcp` (`type:module`, tsdown, vitest, `publishConfig.access:
  public`), deps exactly `@deepnote/{blocks,reactivity,runtime-core}` (`workspace:*`)
  + `ws`, zero frontend. §6: the Node-free types entry via the `./types` subpath
  `exports` map resolving to `api-types.ts`, which declares only `type`/`interface`
  and references other modules only via `import type` — so the SPA's type graph
  never picks up Node/HTTP/`ws`. Matches the design-doc Phase 1 deliverables
  one-for-one.
- **TDD is genuine, not test-after.** The tests read as specifications: the
  no-runtime-import erasure test asserts the §6 invariant *behaviourally* (AST pass
  that every import/re-export is fully type-only, plus a transpile-erasure pass on
  both ESM+CJS emit), the lifecycle test does a real TCP connect against an
  OS-assigned port and asserts the port is refused after `close()`, and the
  contract test pins union discriminants at typecheck time. Failure/edge behaviour
  is present (refused-after-close, the erasure assertion). Not happy-path-only.
- **The madge substitution is the better long-term solution, not a lazy solve.**
  The design doc suggested a `madge`/lint check; `madge`/`dependency-cruiser` are
  not installed in this repo. The executor implemented the §6 invariant against the
  in-repo TypeScript compiler API (already a root dep): it inspects the resolved
  AST and the actual emit, so it is strictly stronger than a string-grep, adds no
  heavyweight tool to the shared toolchain, runs in the always-on `pnpm test`, and
  is reusable by the P7 slice-integrity card. The deviation is documented
  transparently in the close-out. Aligned with "no tech debt / better long-term
  solution."
- **`createServer` stub is appropriately scoped.** A lifecycle-clean `node:http`
  handle that 503s every request, accepting the step-3 option surface so the
  factory is stable from the scaffold. Real routing is explicitly steps 3/4A/4B and
  roadmapped. `ws` is declared but not yet imported — reasonable for a scaffold that
  fixes the dependency set now.
- **No DRY/security/IaC issues.** Build is IaC (tsdown.config); the `eval` warning
  during build originates in a third-party `@jupyterlab/coreutils` transitive dep,
  not in this code. Lockfile delta is minimal and correct (new importer entry only;
  `link:` to existing workspace pkgs, reused `ws`/`@types/ws` versions, no new
  external downloads).

## FOLLOW-UP

- **L1 (slice-integrity-grep-precision).** The card's literal acceptance-criteria
  grep `git grep -iE 'react|vite|apps/' -- packages/runtime-server` is documented
  as "returns nothing" but the broad word-boundary-free regex actually *matches*
  benign substrings in this package: `reactivity` (the legitimate `@deepnote/
  reactivity` dep and the `reactivity:'python'|'disabled'` capability enum) and
  `vitest` (the test runner). There is zero real frontend coupling — the precise
  import-form grep confirms it — and the executor flagged this honestly rather than
  silently rewriting the AC, which is the right call. But the *canonical CI script*
  for this check is owned by the P7 slice-integrity card, and if it ships the
  literal broad regex it will false-positive on every package that legitimately
  depends on `@deepnote/reactivity` or uses `vitest`. Failure mode: a green
  boundary gate becomes un-passable (or gets disabled) the moment it runs against
  the real serve delta. The P7 card should tighten to import-form / word-boundary
  matching (e.g. `from ['"](react|react-dom|vite)['"]`, `\breact\b`, `@vitejs`,
  `from ['"]\.\./apps`) so it tests the AC's actual *intent* (no React/Vite
  framework, no `apps/` import edge) without colliding with `reactivity`/`vitest`.
  Tag: `slice-integrity-grep-precision`.

- **L2 (declared-unused-dep).** `ws` is a declared `dependencies` entry but is not
  imported anywhere in the package yet (the stub uses only `node:http`); `@types/ws`
  is a devDependency for the same not-yet-used surface. This is intentional and
  documented (ADR-007 §1 mandates `ws` as the server-side WS lib; the scaffold fixes
  the dep set up front), so it is not a blocker. The only follow-up risk: if a lint
  rule like `depcheck`/`knip` lands before step 3 wires `ws`, it will flag `ws` and
  `@types/ws` as unused. The step-3 (execute-stream-ws) card should be the one that
  closes this by actually importing `ws` for the `/api/stream` fan-out; no action
  needed on this card. Tag: `declared-unused-dep`.

## Outstanding close-out actions

None blocking. The card's terminal-stage Completion-Checklist boxes (production
deploy, monitoring) are correctly left n/a for a non-published scaffold and belong
to the closeout/PR pipeline, not this card.
