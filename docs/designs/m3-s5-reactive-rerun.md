# Design Doc: m3/s5 — Reactive re-execution (DAG-driven downstream re-run on edit/input change)

> **Status**: 🚧 **STUB / DRAFT** — skeleton only; to be fleshed out before the `m3/s5` sprint is architected. | **ADRs**: _none yet_ (relates to ADR-004 non-Python degradation; reuses ADR-005 transport) | **PRD**: [PRD-003](../prds/PRD-003-local-deepnote-ui.md) (m3 master, Phase P5) | **Date**: 2026-06-12 | **Author**: muunkky

## Overview

This design will implement **PRD-003 Phase P5** — roadmap story [`m3/s5`](../prds/PRD-003-local-deepnote-ui.md),
"Reactive re-execution." It is the capstone of the milestone: auto re-run of downstream blocks on
edit / input change, in dependency order, against a **persistent kernel session** — mirroring Cloud's
signature reactive mode against local compute.

This is **net-new** work, not a rewrap of existing behaviour. `run.ts` today does _validation-only_
dependency analysis (it computes the DAG to validate, then runs the project once in order); s5 wires
`@deepnote/reactivity`'s `getDownstreamBlocksForBlocksIds` into a **live, ordered re-run loop** over
the long-lived s1 kernel session. The two load-bearing hazards are the **input-change re-run storm**
(a long dependent chain re-running on every slider increment against a Python kernel) and the
**Python-only** nature of the DAG analyzer.

> _This is a stub. The commit/debounce policy, the re-run scheduling against the single-concurrency
> s1 run queue, and the exact degradation surface are TBD and will be worked out here before
> sprint-card creation._

## Scope (from the roadmap)

Story `m3/s5` decomposes into one project, **`reactive-rerun` — Reactive downstream re-execution**:

- **DAG-driven downstream re-run in dependency order** — on edit, compute downstream blocks via `getDownstreamBlocksForBlocksIds` and re-run them in order against the persistent kernel session; a branch whose block raised an exception is halted (matching headless semantics).
- **Input-change propagation with commit/debounce** — re-run an input's downstream blocks on commit/debounce (slider release / short settle), **not** continuously per intermediate value.
- **Python-only degradation notice** — on a non-Python kernel (the DAG analyzer is a Python AST analyzer), degrade exactly as `run.ts` does — in-order, no dependency analysis — with a visible "reactivity disabled" notice (mirroring `REACTIVITY_PYTHON_ONLY_NOTICE`).

## Success criteria (from the roadmap)

- Reactive re-run: changing an input re-runs its downstream blocks in dependency order — the downstream chart updates without manual per-block runs.
- Re-runs fire on commit/debounce (input release or short settle), not continuously per intermediate value.
- On a non-Python kernel, reactivity degrades to in-order execution with a visible "reactivity disabled" notice rather than silently mis-ordering.
- Downstream re-runs are halted for a branch whose block raised an exception (matching headless semantics).

## Open questions (to resolve before sprint)

- **Debounce / commit policy** — exact settle window per input kind (slider vs text vs select); whether re-runs coalesce when edits arrive mid-run.
- **Scheduling against the s1 run queue** — how a reactive re-run interacts with the single-concurrency FIFO queue (cancel-in-flight vs enqueue-after); avoiding head-of-line stalls when the user keeps editing.
- **Staleness / cancellation** — superseding an in-flight downstream chain when a newer edit invalidates it.
- **Degradation detection** — where the Python-only check lives (kernel capability flag from s1) and how the notice is surfaced in the UI.
