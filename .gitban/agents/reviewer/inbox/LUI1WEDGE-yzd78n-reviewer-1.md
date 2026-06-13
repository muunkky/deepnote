---
verdict: APPROVAL
card_id: yzd78n
review_number: 1
commit: 92dbc6b
date: 2026-06-12
has_backlog_items: true
---

# Review: step-7b-sql-integration-parity-with-run (yzd78n)

Reviewed commits `5b1897d` (lift + wiring + tests) and `92dbc6b` (docs + biome format) —
together they are this card's delivery.

## Gate 1 — Completion claim: PASS

DoD is required (function signatures, control flow, config-file read at runtime, new tests)
and present. **Intent** is concrete and outside-the-code: same connection/credentials behavior
as `deepnote run`, zero outbound integration calls by default, no `server → cli` edge — with
the three named failure modes. **Observables** are user-observable and include a real capstone
(a SQL block through the server resolves to the *exact same env values* `run` injects). Checkbox
design is sound: each box maps to a testable condition, failure modes (local-first off-by-default,
boundary edge) are covered, none are trivially-satisfiable. Checkbox integrity verified against
the diff and a live test run — nothing checked is untrue.

## Gate 2 — Implementation quality: PASS

**The lift is a genuine pure relocation.** Byte-diffed every lifted file against its
pre-lift cli original (`5b1897d~1`): `parse-integrations`, `collect-integrations`,
`integrations-file-schemas`, `env-var-refs`, `errno` differ only in import paths and added
docstrings. The one behavioral seam — `injectIntegrationEnvVars` gained an optional
`debug: DebugLogger = noopDebug` parameter (runtime-core has no terminal logger) — is correct:
the cli shim threads cli's `debug`, so `deepnote run`'s diagnostic output is unchanged, and the
env mutation is identical. cli files are thin re-export shims; every existing cli import path
keeps working with one implementation.

**Parity capstone is genuine and unfakeable.** `session-integration-env.test.ts` computes the
reference env via `resolveIntegrationEnv` (the same helpers `run.ts`'s `setupProject` calls —
confirmed by reading `run.ts:368-407`: `parse → collect → fetchAndMerge → inject`), clears
`process.env`, then opens the same project through a real `Session` and asserts identical env-var
names AND values. No mock stands in for the system under test. The `resolveIntegrationEnv`
orchestration faithfully mirrors `run`'s inline sequence, with the API fetch as the optional
`fetcher` seam.

**Local-first is properly gated and tested both ways.** `resolveIntegrationEnv` does no network
I/O; the only augmentation seam is an optional `fetcher`, and `Session.resolveIntegrationEnvForRun`
passes none. Tests spy on `globalThis.fetch` and assert it is never called by default (both in
runtime-core and runtime-server), AND assert the fetcher is invoked exactly once with the local
set + required ids when supplied. This is the load-bearing failure-mode test the card demanded.

**ADR-007 boundary enforced.** `no-cli-import.test.ts` is an AST scan (ignores strings/comments,
catches import/export/dynamic-import, value or type-only) with a non-vacuity guard, consistent
with the established `87ifqe`/step-2 pattern since madge/dependency-cruiser are not installed.
No `runtime-server → @deepnote/cli` edge. Adding `@deepnote/database-integrations` (deps: `zod`
only) to `runtime-core` introduces no cycle — verified.

**Verification run during review:**
- 17/17 new tests pass (runtime-core integrations 9, server parity 6, boundary 2).
- cli regression green: `run.test.ts` 182, `parse-integrations.test.ts` 21, `env-var-refs.test.ts` 52.
- `tsc --noEmit` clean on runtime-core, runtime-server, and cli.

**Docs (DaC).** runtime-server + runtime-core READMEs accurately describe the shared wiring,
the lift rationale (ADR-007 arrow), the boundary test, and the local-first guarantee. Accurate,
not aspirational.

No lazy solves, no overmocking that replaces the SUT, no dead code, no security concerns.

## BLOCKERS

None.

## FOLLOW-UP

- **L1 (dry-shared-constants):** `DEFAULT_INTEGRATIONS_FILE` (`.deepnote.env.yaml`) and
  `BUILTIN_INTEGRATIONS` (`{deepnote-dataframe-sql, pandas-dataframe}`) are now defined in BOTH
  `packages/cli/src/constants.ts` and `packages/runtime-core/src/integrations/constants.ts`. The
  cli keeps its own copies because many cli call sites import them (`cli.ts`, `commands/integrations.ts`,
  `utils/analysis.ts`, `commands/lint.test.ts`), while the lifted runtime-core helpers use the
  runtime-core copy. The two are byte-identical today, but they are independent sources of truth
  across the package boundary: if either drifts, `deepnote run` and the server would disagree on the
  integrations-file name or the built-in set — a parity-divergence failure mode the lift was meant to
  eliminate. Cleanest end-state: have cli `constants.ts` re-export these two from `@deepnote/runtime-core`
  (the same shim pattern already applied to `parse/collect/inject/schemas`). Non-blocking — both copies
  currently match and are tested green.

- **L2 (dry-shared-errno):** `isErrnoException` / `isErrnoENOENT` now exist in both
  `packages/cli/src/utils/file-resolver.ts` and `packages/runtime-core/src/integrations/errno.ts`.
  file-resolver retains other consumers (`dotenv.ts`, `commands/integrations.ts`) and a sibling
  `isErrnoENOTDIR`, so it could not simply move; the runtime-core copy is a small self-contained
  predicate for the lifted helpers. Same drift-risk shape as L1 but far lower stakes (a 2-line
  predicate). Optional consolidation: file-resolver could re-export `isErrno*` from runtime-core.

- **L3 (parity-orchestration-asymmetry):** `run.ts` was not refactored to call `resolveIntegrationEnv`;
  it still inlines the `parse → collect → fetch → inject` sequence (it has terminal warning-display
  concerns that don't belong in runtime-core). Parity is preserved at the *helper* level and the
  capstone bridges the two via `resolveIntegrationEnv`, so this is acceptable — but the orchestration
  itself is shared on only one side. If `run`'s sequence ever changes (e.g. ordering of collect vs
  fetch), the server's `resolveIntegrationEnv` would not automatically track it. A future card could
  have `run.ts` consume `resolveIntegrationEnv` (threading its warning callback) to make the
  orchestration single-sourced too. Non-blocking; current behavior is verified-identical.

## Close-out actions

- Card may move to `in_progress` for the close-out flow.
- L1–L3 are DRY/maintainability follow-ups for the planner to triage against the sprint card list;
  none gate this card.
