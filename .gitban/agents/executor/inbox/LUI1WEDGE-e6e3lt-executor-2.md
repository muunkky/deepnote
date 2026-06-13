# Executor directive — LUI1WEDGE / e6e3lt (executor-2, save-endpoint hardening reopen)

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
- **Completion tag**: `LUI1WEDGE-e6e3lt-done` — write it per the SKILL recipe.

Commit **code only / never stage `.gitban/`**; TDD.

## This is a REOPEN — three checkboxes under "Reviewer cycle 1 — save-endpoint hardening"

`e6e3lt` (the save-safety gate) was approved at `d890e4d` then reopened. **Read the card's
`## Reviewer cycle 1 — save-endpoint hardening (reopened by planner)` section** — it is the
authoritative spec with the exact line numbers. Do NOT re-do the already-approved work (the atomic
write, round-trip, idempotence, 409 detection, and the 58/58 suite are committed and good). Touch
**only** `packages/runtime-server/src/{router,save,session}.ts` and
`packages/runtime-server/src/router-save.test.ts`.

The three items, in priority order:

- **L1 (primary — must fix, it blocks step 5).** `handleSave` validates the body only shallowly, so a
  body with a valid `openHash` but a structurally-invalid `project` reaches `serializeDeepnoteFile`,
  throws a zod error, and is mapped to **500** (leaking the internal error) instead of the design
  doc's **400**. Parse-then-validate `project` against the canonical `deepnoteFileSchema` *before* the
  write and return **400** on schema failure. Add a `router-save.test.ts` case: a partially-constructed
  `DeepnoteFile` body → **400** with **no write** to disk. **TDD: write that failing test first.**
  This is a real correctness fix — step 5 (`wd2nil`) asserts status-code parity with `deepnote run`,
  and the wrong error class would red those parity tests. NOTE: L1 is the route's error *class* only —
  it is NOT the open→save contract gap tracked in backlog `ad6kmb`; do not touch `ApiProject`.
- **L2 (low-priority robustness).** `session.ts` hashes the raw Buffer; `save.ts` re-hashes
  `current.toString('utf8')`. They diverge only on invalid-UTF-8 on-disk bytes (fail-safe false 409,
  never a clobber). Either hash both sides over the raw Buffer to remove the asymmetry, OR leave as-is
  with an explanatory code comment — your judgment; the checkbox is satisfied either way as long as the
  decision is deliberate and documented.
- **L3 (cosmetic).** Annotate the inline 409 (`SaveConflictResponse`) and 200 (`SaveProjectResponse`)
  wire bodies in `handleSave` with their canonical `api-types.ts` interfaces so future contract drift
  is a compile error.

Keep the existing 58/58 suite green; re-run the package suite + `biome check` + `tsc --noEmit` after.
Tick the three reopen checkboxes only for work durably committed on your worktree branch.

**OUT OF SCOPE:** backlog `ad6kmb` (open→save `ApiProject` contract gap) — do not touch `ApiProject` or
the open side.

## ⚠️ Before you finish — run the project's lint + spell gates

```bash
pnpm exec biome check --write packages/runtime-server
pnpm spell-check   # add new terms to docs-dictionary.txt, NOT source
```

A lint/spell failure is a completion failure. The package vitest suite is best run with
`VITEST_MAX_WORKERS=2 VITEST_TEST_TIMEOUT=30000` on this constrained box.

This card is in sprint **LUI1WEDGE** — do not push a feature branch or open a PR; the dispatcher owns
sprint lifecycle.

---

## ✅ APPROVAL — close out this card (router-2, post-review)

The rework above (L1/L2/L3) is **complete and APPROVED** as of commit `31f9a87`
(Gate 1 PASS, Gate 2 PASS — review `.gitban/agents/reviewer/inbox/LUI1WEDGE-e6e3lt-reviewer-2.md`).
The reviewer verified: full runtime-server suite **59/59 PASS** (incl. the new L1 400-no-write case),
`biome check` clean, `tsc --noEmit` clean, ADR-007 runtime-import invariant still green. **No blockers,
no follow-up items.** Proceed to close-out:

## Card Close-out tasks
- Use gitban's checkbox tools to ensure all checkboxes on the card are checked off for completed work
  if not already (including the three L1/L2/L3 reopen checkboxes, which are now durably committed).
- Do not mark any work as deferred. This card will be closed and archived and likely never seen again.
- Use gitban's complete card tool to submit and validate if not already completed.
- **Close-out items: None.** The three cycle-1 follow-ups (L1 input-validation 400, L2 hash-encoding
  symmetric raw-Buffer fix, L3 wire-body contract types) are all resolved by `31f9a87` and verified
  PASS. The pre-existing backlog item `ad6kmb` (open→save `ApiProject` reconstruction gap) remains
  correctly OUT OF SCOPE and is already tracked in the backlog — do NOT pull it into this card.
- If the worktree's cspell `Files checked: 0` glob quirk persists at closeout, re-verify spell-check
  from the parent repo; the additions use only established project vocabulary
  (`deepnoteFileSchema`, `openHash`, `sha256`, idempotent).

Note: You are closing out **this card only**. The dispatcher owns sprint lifecycle — do not close,
archive, or finalize the sprint itself.
