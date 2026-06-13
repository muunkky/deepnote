# ALTKERN1 Dispatch Log

Sprint: ALTKERN1 — PRD-002 Phase 1 (alternative-language kernels)
Roadmap: m2/s5/alternative-kernels

## Closeout (2026-06-11)

Substantive cards (7) were dispatched and reached `done` in a prior session
(a1xa1u plan, 5wqw1l 1A, 41mrnp 1B value-add, ngjse2 1B reactivity, qajbsg 1B
failure-category, 321p72 4B fixture-anchor, obcn7z 1C integration/CI/docs). This
session ran Phase 5 closeout for the final card dn929q (step 6).

### Fixed-with-note retro items (closeout code fixes)
Dispatched one worktree executor; 3 comment/test-only commits, merged
fast-forward onto sprint/ALTKERN1 (runtime-core 278 ✓, cli 1004 ✓, typecheck +
biome clean):
- 96af4e0 — item 3: token-less-local-server comment on kernelspecs pre-flight
- b0cebce — item 4: agent-block hard-fail-before-API-key test (non-Python kernel)
- eb95f5e — item 6: enumerate individual fixture files in run.test.ts guard

Retro items 1, 2, 5 classified note-only (obcn7z owns the e2e; KD-7 timeout flag
deferral; inert _dntk preamble accepted).

### Docs / version
- e4b8ea6 — runtime-core CHANGELOG 0.6.0 + version bump (additive kernel surface)

### Roadmap
- m2/s5/alternative-kernels: 4 Phase-1 features -> done (2026-06-11). Project
  held `in_progress` (Phase 2/3 pending maintainer signal on #154).

### Gate 0
- strict_external=true -> EXTERNAL_PROBE_ERROR (external probe unwired in this
  server build; fork Actions disabled, no remote CI to probe).
- strict_external=false -> FAIL (3 missing_cite on structural Completion boxes),
  auto-blocked dn929q. Added commit: cites -> re-ran -> PASS, auto-unblocked.
- SOFT-BYPASS logged: see ALTKERN1-gate0-20260611.json. Why-unavailable recorded
  in the closeout body's Build & CI rows, which cite LOCAL verification (278+1004
  unit; 3/3 real-kernel e2e bash->image/png) instead of a remote CI run.

### Archive
- 7 cards -> archive/sprints/20260611-191611-sprint-altkern1-alternative-language-kernels-phase1
  (enhanced SUMMARY.md generated). Unrelated done card 234rnd (EXTIDCI1) left untouched.

### PR
- Process diff: muunkky/deepnote#4 (head sprint/ALTKERN1 -> base main, draft).
  Closeout commits flow into it. Clean contribution diff held as #288 follow-up.
- Showcased on upstream epic #154 (comment 4686199361) with an offer to open the
  upstream PR.
