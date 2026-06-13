# Sprint Summary: Altkern1-Alternative-Language-Kernels-Phase1

**Sprint Period**: None to 2026-06-11
**Duration**: 1 days
**Total Cards Completed**: 7
**Contributors**: Unassigned

## Executive Summary

Sprint ALTKERN1 delivered PRD-002 Phase 1: running a single-language non-Python notebook end-to-end via `deepnote run --kernel <name>`. The hardcoded `python3` kernel name was replaced by a kernelName threaded RuntimeConfig -> ExecutionEngine -> KernelClient.connect(), with pre-flight /api/kernelspecs validation yielding a typed KernelNotRegisteredError (never the opaque 500), graceful degradation of Python-only value-add blocks + the reactivity AST analyzer on non-Python kernels, and a failureCategory discriminant for the four failure classes. Proven by a real bash Jupyter kernel running through the built CLI and returning an image/png MIME bundle (3/3 integration e2e + a provisioned integration-kernels CI job). Existing Python notebooks behave identically. Grounded in three accepted ADRs (ADR-002/003/004), a reviewed Phase 1 design doc, and an empirical NOM-002 spike. Shipped on fork PR muunkky/deepnote#4 and showcased on upstream epic issue #154 with an explicit offer to open the upstream PR. Phase 2/3 (first-class .deepnote language field, --list-kernels discovery) intentionally deferred pending maintainer signal.

## Key Achievements

- [PASS] step-1-altkern1-sprint-planning (#a1xa1u)
- [PASS] step-2-sub-phase-1a-thread (#5wqw1l)
- [PASS] step-3a-sub-phase-1b-value-add (#41mrnp)
- [PASS] step-3b-sub-phase-1b-reactivity (#ngjse2)
- [PASS] step-4-sub-phase-1b (#qajbsg)
- [PASS] step-5-sub-phase-1c-real-kernel (#obcn7z)
- [PASS] step-4b-anchor-run-test-ts-fixture (#321p72)

## Completion Breakdown

### By Card Type
| Type | Count | Percentage |
|------|-------|------------|
| feature | 5 | 71.4% |
| chore | 1 | 14.3% |
| test | 1 | 14.3% |

### By Priority
| Priority | Count | Percentage |
|----------|-------|------------|
| P0 | 5 | 71.4% |
| P1 | 2 | 28.6% |

### By Handle
| Contributor | Cards Completed | Percentage |
|-------------|-----------------|------------|
| Unassigned | 7 | 100.0% |

## Sprint Velocity

- **Cards Completed**: 7 cards
- **Cards per Day**: 7.0 cards/day
- **Average Sprint Duration**: 1 days

## Card Details

### a1xa1u: step-1-altkern1-sprint-planning
**Type**: chore | **Priority**: P1 | **Handle**: Unassigned

> **Sprint**: ALTKERN1 | **Type**: chore | **Step**: 1 (first) > > Planning card for sprint ALTKERN1. Defines the goal, card inventory, execution sequencing, and parallelization. End state: the spr...

---
### 5wqw1l: step-2-sub-phase-1a-thread
**Type**: feature | **Priority**: P0 | **Handle**: Unassigned

> Foundational. Maps to design-doc **Sub-phase 1A**. All mocked — runs in the existing Node CI. Precedes the degradation cards (3A/3B) and the failure-category card (4). Depends on: step 1 (planning).

---
### 41mrnp: step-3a-sub-phase-1b-value-add
**Type**: feature | **Priority**: P0 | **Handle**: Unassigned

> Maps to design-doc **Sub-phase 1B** (value-add hard-fail behavior; one of the three user-visible behaviors split out of 1B per the packed-card rule). All mocked. Parallel with step 3B (no file co...

---
### ngjse2: step-3b-sub-phase-1b-reactivity
**Type**: feature | **Priority**: P0 | **Handle**: Unassigned

> Maps to design-doc **Sub-phase 1B** (reactivity-bypass behavior; the second of the three user-visible behaviors split out of 1B per the packed-card rule). All mocked. Parallel with step 3A (no fi...

---
### qajbsg: step-4-sub-phase-1b
**Type**: feature | **Priority**: P0 | **Handle**: Unassigned

> Maps to design-doc **Sub-phase 1B** (the machine-readable failure-category behavior; the third user-visible behavior split out of 1B per the packed-card rule). All mocked. Sequenced **after step ...

---
### obcn7z: step-5-sub-phase-1c-real-kernel
**Type**: feature | **Priority**: P0 | **Handle**: Unassigned

> Maps to design-doc **Sub-phase 1C** — the headline. TDD: write the failing integration test first. This card ships the sprint's headline value (a real non-Python kernel running end-to-end through...

---
### 321p72: step-4b-anchor-run-test-ts-fixture
**Type**: test | **Priority**: P1 | **Handle**: Unassigned

> **Sprint**: ALTKERN1 | **Type**: test | **Step**: 4B > > Self-healing follow-up from card `qajbsg` (step 4) review 1. Routed by the planner as a **sprint card** because the fragile fixture base u...

---

## Lessons Learned

### What Went Well 
- Empirical NOM-002 spike decisively retired the top PRD risk before any code: the deepnote-toolkit server already hosts any registered kernelspec, so the only blocker was the hardcoded python3.
- Falsifiable DoD held: a real bash kernel returning image/png through the real CLI is an unfakeable proof of the JSON-WebSocket + IOPub binary decode path.
- Threading kernelName through the existing RuntimeConfig seam (no new server/launch path) kept the change small and regression-free for Python.

### What Could Be Improved 
- The fork has GitHub Actions disabled, so the integration-kernels CI job and Gate 0's external CI probe cannot run remotely; closeout relied on local verification evidence (documented + soft-bypassed).
- Sprint closeout inherited uncommitted board state from a prior dispatch session (card->done moves never committed); reconcile-on-startup handled it but mixing board mutations across sessions is friction.

## Next Steps

- [ ] Hold Phase 2 (.deepnote `language` field + .ipynb import language-preservation) pending a maintainer response on #154 — it touches their format, so co-design rather than build unsolicited.
- [ ] Cut the clean contribution diff (contrib/<slug>, code-only) as a follow-up once #288 (interpreter-resolution) lands, so it stacks cleanly.
- [ ] Phase 3: --list-kernels discovery + install guidance (lighter, also gated on signal).

## Artifacts

- Sprint manifest: `_sprint.json`
- Archived cards: 7 markdown files
- Generated: 2026-06-11T19:16:49.004898