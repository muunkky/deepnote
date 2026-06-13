# Sprint-closeout directive — LUI1WEDGE / od8esg (+ wzrodp) — the final closeout card

This is the **sprint closeout card**. Complete it (and the planning card `wzrodp`) so the dispatcher can
run Gate 0 + archive + PR. Use the gitban MCP tools. Commit nothing — the dispatcher owns commits.

## 0. Read first
- `read_card(od8esg)` in full (it has 11 `## Sprint Retrospective` items, each with a 4-row deferral grid).
- Read `.claude/skills/gitban-sprint-closeout-reviewer/SKILL.md` for the **Gate 0 cite grammar** — the
  card's upper Completion Checklist boxes you tick MUST carry `<!-- cite: <kind>:<value> -->` annotations
  that resolve against committed evidence + external state (CI/test status, no in_progress cards, roadmap
  path status). Gate 0 runs `strict_external=true` right after you finish; an ungrounded tick FAILS it.

## 1. Triage all 11 retrospective items (the core task)
For EACH item: fill its grid with **exactly one** `true`, fill `Action taken:` to match, and tick both
`Item {N} classified` / `Item {N} actioned` checkboxes. Classification rules for a CLOSING sprint:
- **NO `sprint` classification** — the sprint is closing; do not reopen it with new in-sprint cards.
- **`backlog`** — real future technical work. **Create a loose backlog card** via `create_card`
  (type matching the work, P2/P3, no sprint tag) and record its id in `Action taken`. Use this for genuine
  follow-ups that need their own review cycle: e.g. Item 1 (engine-construction-spy regression), Item 2
  (`totalBlocks` contract decision), Item 3 (dead-engine reset after kernel death — a real P3-scoped
  behavioral fix), Item 5 (parity union-of-keys hardening), and the DRY/reentrancy/drain-tuning/
  slice-gate-widening/flake-hardening items (7-11). **Group tightly-related items into one card where the
  planner already grouped them** (e.g. the KD-3 DRY trio).
- **`note-only`** — settled-by-design deferrals (the m3/s5 follow-ups: P4 coalescing, P6 running-cancel,
  `with-upstream` run scope) and already-resolved sub-items (e.g. Item 5's L2-wording, already fixed).
- **`fixed-with-note`** — ONLY genuinely trivial inline fixes (typo / stale comment / one-line lint) that
  do NOT need a review cycle. **Do NOT inline-fix behavioral runtime-server code** (totalBlocks, dead-engine
  reset, config threading, parity hardening) — those are `backlog`, not closeout hacks. If in doubt, backlog.

Be honest and conservative. It is correct to file several backlog cards — that is tracked debt, not hidden debt.

## 2. Lifecycle deliverables
- **CHANGELOG.md** — add an entry for the new `@deepnote/runtime-server` package (`GET /api/project`,
  run-over-WS run queue, atomic save) + the `deepnote serve`/`ui` commands + SQL/integration env parity.
  User-visible additive changes.
- **Roadmap** — mark the m3/s1 story (and its features under serve-api / cli-serve / wedge-slice-showcase)
  **complete**. Use `read_roadmap` to find the nodes, then `upsert_roadmap` to set status. Do not invent
  paths — read first.
- **CI gates** — confirm (in the card) the slice-integrity gate is wired: `packages/runtime-server/src/slice-integrity.test.ts`
  (from dx99dj) is an always-on `pnpm test` gate; the no-cli-import boundary AST test
  (`packages/runtime-server/src/no-cli-import.test.ts`, from yzd78n) and `api-types-no-runtime-import.test.ts`
  enforce the ADR-007 boundary. Tick the "CI Pipeline" / boundary rows accordingly.

## 3. Complete the cards
- Tick od8esg's Cleanup Checklist + Acceptance Criteria + the upper **Completion Checklist** boxes that are
  genuinely true, **each with a resolvable Gate-0 cite** (tests green, all 11 work cards done+reviewed+merged
  to `milestone/m3-local-ui`, no in_progress cards, roadmap marked complete). Do NOT tick a box you cannot
  cite. Then `complete_card(od8esg)`.
- **Also complete `wzrodp`** (the step-1 planning card): its 30-item sprint-lifecycle checklist (archive,
  CHANGELOG, milestone-complete, retrospective) is now satisfiable — tick the genuinely-done items and
  `complete_card(wzrodp)`. (It auto-blocks if completed with open boxes — that is expected; tick first.)

## 4. Do NOT
- Do NOT archive any card (the dispatcher archives at Phase 5 Step 2).
- Do NOT commit, push, or open a PR. Do NOT touch any remote.
- Do NOT run Gate 0 yourself — the dispatcher runs it after you finish.

Report: the per-item classifications (with any backlog card ids created), the CHANGELOG + roadmap edits,
and confirm od8esg + wzrodp are both `done`.
