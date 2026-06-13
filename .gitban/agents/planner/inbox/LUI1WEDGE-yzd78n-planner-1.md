Sprint closeout card ID: od8esg
Sprint card list:
- e6e3lt (step-4b, done): save-api-semantic-round-trip-idempotence — server save API round-trip/idempotence
- hlai4c (step-4a, done): execute-stream-ws-run-serialization-queue — WS execute stream + run serialization queue
- 87ifqe (step-2, done): server-package-scaffold-runtime-server — runtime-server package scaffold
- dx99dj (step-8, todo): contrib-diff-cut-clean-slice-off-upstream-main — cut clean contrib diff off upstream/main
- gwblh2 (step-7c, todo): decouple-cli-suite-6-runaction-fixture-from-process-cwd — cli suite-6 runAction fixture decoupled from process.cwd
- k65hcx (step-9, todo): fork-showcase-post-dry-run-thread — fork showcase dry-run thread post
- od8esg (step-10, todo): lui1wedge-sprint-closeout — sprint closeout card
- sqm7ox (step-7a, in_progress): browser-launch-alias-deepnote-ui — `deepnote ui` browser-launch alias
- wd2nil (step-5, done): server-integration-tests-parity-with-deepnote-run — server integration tests parity with `deepnote run`
- wzrodp (step-1, todo): lui1wedge-sprint-planning — sprint planning (CAMERON)
- x71bcm (step-3, done): project-open-list-api-get-api-project — GET /api/project open + list API
- yzd78n (step-7b, in_progress): sql-integration-parity-with-run — SQL/integration env parity + KD-3 helper lift (this card, approved)
- zq7q0g (step-6, done): serve-command-deepnote-serve — `deepnote serve` command

The reviewer flagged 3 non-blocking items, grouped into 1 card below.
Create ONE card per group. Do not split groups into multiple cards.
The planner is responsible for deduplication against existing cards.
All cards go into the current sprint unless marked BLOCKED with a reason.

### Card 1: Single-source the lifted integration helpers across the cli ↔ runtime-core boundary (close the KD-3 DRY gap)
Sprint: LUI1WEDGE
Files touched:
- packages/cli/src/constants.ts
- packages/runtime-core/src/integrations/constants.ts
- packages/cli/src/utils/file-resolver.ts
- packages/runtime-core/src/integrations/errno.ts
- packages/cli/src/commands/run.ts
- packages/runtime-core/src/integrations/resolve-integration-env.ts (or wherever `resolveIntegrationEnv` lives)
Items:
- L1 (dry-shared-constants): `DEFAULT_INTEGRATIONS_FILE` (`.deepnote.env.yaml`) and `BUILTIN_INTEGRATIONS` (`{deepnote-dataframe-sql, pandas-dataframe}`) are now defined in BOTH `packages/cli/src/constants.ts` and `packages/runtime-core/src/integrations/constants.ts`. They are byte-identical today but are independent sources of truth across the package boundary — if either drifts, `deepnote run` and the server disagree on the integrations-file name or built-in set, the exact parity-divergence failure mode the KD-3 lift was meant to eliminate. Fix: have cli `constants.ts` re-export these two from `@deepnote/runtime-core` (same shim pattern already applied to parse/collect/inject/schemas). The many cli call sites (`cli.ts`, `commands/integrations.ts`, `utils/analysis.ts`, `commands/lint.test.ts`) keep importing from cli `constants.ts` unchanged.
- L2 (dry-shared-errno): `isErrnoException` / `isErrnoENOENT` now exist in BOTH `packages/cli/src/utils/file-resolver.ts` and `packages/runtime-core/src/integrations/errno.ts`. Same drift-risk shape as L1, far lower stakes (a 2-line predicate). file-resolver retains other consumers (`dotenv.ts`, `commands/integrations.ts`) and a sibling `isErrnoENOTDIR`, so it could not simply move; consolidate by having file-resolver re-export `isErrno*` from `@deepnote/runtime-core` (keep `isErrnoENOTDIR` local if not lifted).
- L3 (parity-orchestration-asymmetry): `run.ts` still inlines the `parse → collect → fetch → inject` sequence rather than calling the shared `resolveIntegrationEnv` — so the orchestration is single-sourced on the server side only. If `run`'s sequence changes (e.g. ordering of collect vs fetch), the server's `resolveIntegrationEnv` would not automatically track it. Fix: have `run.ts` consume `resolveIntegrationEnv`, threading its terminal warning-display callback (the concern that kept it inlined) so the orchestration is single-sourced too. Verify `deepnote run`'s existing integration tests (and the parity capstone in `session-integration-env.test.ts`) stay green — this must remain behavior-preserving.

All three items share one root cause and one fix shape (the KD-3 lift left the cli side as duplicated copies / inlined orchestration instead of re-exporting/consuming the shared runtime-core source). They are intentionally one card: completing it makes runtime-core the single source of truth for the integration constants, the errno predicates, and the env-resolution orchestration, fully realizing the parity guarantee the lift promised. Not BLOCKED — runtime-core helpers already exist and are tested green; this is consolidation work executable in this cycle.
