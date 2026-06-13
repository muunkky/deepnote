# Executor directive — LUI1WEDGE / yzd78n (executor-1, step 7B: SQL/integration env parity + KD-3 lift)

## ⚠️ BRANCH OVERRIDE
This sprint runs on **`milestone/m3-local-ui`**, NOT `sprint/LUI1WEDGE`.
- Worktree base check: `git merge-base --is-ancestor milestone/m3-local-ui HEAD && echo "base ok" || echo "WRONG BASE"`.
- Merge-back target `milestone/m3-local-ui`; completion tag `LUI1WEDGE-yzd78n-done`. Commit **code only**.

## Build context
Make a SQL/integration block run through the server with the SAME integration env wiring `deepnote run`
uses, via the **KD-3 helper lift**. `read_card(yzd78n)` for the full DoD. Grounding: design doc "Phase 8:
SQL / integration parity" + KD-3, and **ADR-007 §1/§4 (the one-way arrow: `runtime-server` must NEVER
import `@deepnote/cli`)**.

**Requirements (a reviewer will check each):**
- **KD-3 long-route lift (pure relocation, no semantics change):** the integration helpers currently
  cli-private under `packages/cli/src/integrations/` — `parseIntegrationsFile` /
  `getDefaultIntegrationsFilePath` (parse-integrations.ts), `collectRequiredIntegrationIds`
  (collect-integrations.ts), `injectIntegrationEnvVars` (inject-integration-env-vars.ts) — are needed by
  BOTH `cli` and `runtime-server`. **LIFT them into a shared home both can depend on** (runtime-core or
  blocks per KD-3). Do NOT cross-import `@deepnote/cli` from `runtime-server` (that inverts the ADR-007
  arrow). Keep it a **pure move/re-home** — no behavior change — so `deepnote run`'s existing integration
  tests stay green. Update `run.ts`'s imports (35/37/38) to the new shared location.
- **Wire the server integration env** reusing the lifted helpers (same parse→collect→inject wiring
  `run.ts` does at 369/391/405).
- **Local-first (load-bearing failure mode):** any opt-in API-backed integration fetch is **OFF by
  default** — assert that by default NO outbound request fires, and one fires ONLY when a token is
  explicitly provided.
- **ADR-007 boundary capstone:** assert **no `packages/runtime-server → packages/cli` import edge**.
  NOTE: `madge`/`dependency-cruiser` are NOT installed in this repo — implement the boundary check the
  way step-2 (`87ifqe`) did its no-runtime-import invariant: a TS-compiler-API / AST test in the always-on
  `pnpm test` that scans `runtime-server` source for any `@deepnote/cli` import and fails if present (with
  a non-vacuity guard).
- **Capstone:** a SQL block executed through the server resolves its integration env to the EXACT same
  values `deepnote run` injects for the same project + integrations file (wiring shared, not
  re-implemented). Plus the cli regression (run's integration tests still green after the lift).
- README integrations-parity + local-first note.
- **`runtime-core` "no behavior change" invariant:** if you lift into runtime-core, it must be a pure
  helper relocation, not a semantics change.

## ⚠️ Sibling card note (parallel batch)
Step 7A (`sqm7ox`, `deepnote ui` alias) is running **concurrently**. It touches `packages/cli/src/cli.ts`
(registers the `ui` command) and adds a `## deepnote ui` section to `packages/cli/README.md`. You do NOT
touch the `ui`/`serve` command files. If you add to `cli/README.md`, keep it a self-contained additive
block (an integrations section) so a keep-both merge is clean. Your file moves under
`packages/cli/src/integrations/` and `run.ts` import edits do NOT overlap 7A.

## Before you finish — gates (run from repo root)
`pnpm test` (mocked, green — includes your boundary invariant + cli integration regression),
`pnpm typecheck` (both halves), `pnpm exec biome check --write` on touched packages, prettier on `.md`,
`pnpm spell-check` (from parent; add terms to `docs-dictionary.txt`). A lint/spell/format/typecheck
failure is a completion failure. Do not push or open a PR — the dispatcher owns lifecycle.
