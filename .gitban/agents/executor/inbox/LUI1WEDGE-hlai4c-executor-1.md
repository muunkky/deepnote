# Executor directive — LUI1WEDGE / hlai4c (executor-1, step 4A: execute-stream-ws run-queue)

## ⚠️ BRANCH OVERRIDE — read before the "Worktree branch-base check"

This sprint runs on **`milestone/m3-local-ui`**, **NOT** `sprint/LUI1WEDGE`. There is no
`sprint/LUI1WEDGE` branch — do not look for it, fetch it, or check against it.

Wherever your SKILL says `sprint/<tag>` / `sprint/LUI1WEDGE`, substitute **`milestone/m3-local-ui`**:

- **Worktree branch-base check:** run
  ```bash
  git merge-base --is-ancestor milestone/m3-local-ui HEAD && echo "base ok" || echo "WRONG BASE"
  ```
  Your worktree was forked from `milestone/m3-local-ui`'s HEAD by the `WorktreeCreate` hook, so this
  passes. Checking the default `sprint/LUI1WEDGE` ref would error and falsely report `WRONG BASE`.
- **Merge-back target**: the dispatcher merges your `worktree-agent-…` branch back into
  `milestone/m3-local-ui`. You do not merge; just commit code to your worktree branch.
- **Completion tag**: `LUI1WEDGE-hlai4c-done` — write it per the SKILL recipe.

Commit **code only / never stage `.gitban/`**; TDD.

## Build context

This is **step 4A — the biggest and riskiest card in the sprint**: the net-new single-concurrency
run-serialization queue + WS event fan-out. `read_card(hlai4c)` for the full DoD — the design doc's
"THE RUN-SERIALIZATION POLICY (R4)" section drives it verbatim. The grounding design doc is
`docs/designs/m3-s1-server-api-and-serve.md`; the card's Required Reading table lists exact
source files/lines (`execution-engine.ts` callbacks/`runProject`/break-on-failure, `kernel-client.ts`
kernel-death reject, `run.ts` KD-5 failure-category capture).

Build on the step-2 scaffold + step-3 `Session` (already on `milestone/m3-local-ui`):
`packages/runtime-server/src/` has `session.ts` (the KD-6 `loadProject`/`startEngine` split —
`startEngine` is forward-declared for you to land here), `router.ts` (framework-free `node:http`
router), `server.ts`, `api-types.ts` (canonical contract), `index.ts`.

Honour every capstone exactly: no-interleave ordering, guaranteed-terminal `run-done` on in-block
break (B1), the **M2 lint/madge invariant** (`engine.runProject` referenced ONLY by `run-queue.ts` —
wire it as a hard CI check; `madge`/`dependency-cruiser` are not installed, so implement it the way
step-2 did its no-runtime-import invariant: the TS compiler API / AST in the always-on `pnpm test`),
kernel-death terminal `run-failed`, failure-category mapping from typed instances (KD-5), enqueue
policy P1/P2/P3/P5, and both back-pressure regimes. **Do NOT** implement P4 coalescing / P6
running-cancel / `with-upstream` — those are settled m3/s5 deferrals.

## Note: you are first of the serialized step-4 pair

Step 4B (`e6e3lt`, save-api) is being run AFTER you, on top of your merge, specifically so it inherits
your `api-types.ts` / `router.ts` / `index.ts` / README shape cleanly. So: when you add the WS contract
to `api-types.ts`, the run routes + WS upgrade to `router.ts`/`server.ts`, and exports to `index.ts`,
leave those files in a clean, additive-friendly shape — 4B will append its `save` types/route/export
next to yours. You do not need to know anything about save; just don't restructure gratuitously.

## ⚠️ Before you finish — run the project's lint + spell gates

The pre-push runs `pnpm lintAndFormat && pnpm typecheck && pnpm test && pnpm spell-check`. Before you
return, run on your worktree and fix until clean:

```bash
pnpm exec biome check --write packages/runtime-server
pnpm spell-check   # add new terms to docs-dictionary.txt, NOT source
```

A lint/spell failure is a completion failure, not a follow-up. The package vitest suite is best run
with `VITEST_MAX_WORKERS=2 VITEST_TEST_TIMEOUT=30000` on this constrained box (the default 5s timeout
misses the cold-module-graph python-subprocess probe; not a logic issue).

This card is in sprint **LUI1WEDGE** — do not push a feature branch or open a PR; the dispatcher owns
sprint lifecycle.

---

## ROUTER UPDATE (review-1): APPROVAL — close out the card

The code for card hlai4c has been **approved** as of commit `955c41d`. Use the gitban tools to update
the card and complete the close-out:

- Use gitban's checkbox tools to ensure all checkboxes for completed work are checked off if not already.
- Do not mark any work as deferred. This card will be closed and archived and likely never seen again.
- Use gitban's complete-card tool to submit and validate if not already completed.

### Close-out items (no code changes)

The reviewer confirmed the following checkboxes are **honestly left unchecked** because they are not
executor deliverables for a wedge-internal package — **leave them unchecked, do not self-approve**:

- `API contract is reviewed and approved by team/stakeholders` — team/stakeholder action.
- `Performance validated against requirements` — real-kernel parity/perf is step 5's integration suite;
  the card's own Performance row is N/A.
- `Monitoring and alerts configured` / `API is deployed to production and verified working` /
  `Client communication sent` — release-owned, not deliverables for this wedge-internal package.

### Follow-ups are NOT yours to fix

The reviewer flagged three non-blocking follow-up items (L1 `run-start.totalBlocks` contract lie,
L2 dead-engine-not-reset lifecycle gap, L3 `wsLowWaterMark`/`drainPollMs` config-surface gap). These are
being routed to the **planner** as separate sprint cards. **Do NOT** attempt to fix them under this card.

Note: You are closing out this card only. The dispatcher owns sprint lifecycle — do not close, archive,
or finalize the sprint itself.
