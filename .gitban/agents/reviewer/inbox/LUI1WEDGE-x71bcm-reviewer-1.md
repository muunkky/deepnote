---
verdict: APPROVAL
card_id: x71bcm
review_number: 1
commit: e88fd33
date: 2026-06-12
has_backlog_items: true
---

# Review: x71bcm — step 3 `GET /api/project` open + list API (KD-6, kernel-free)

## Gate 1 — Completion claim: PASS

The card touches API contracts, control flow, data transformation, and a runtime-read config
surface, so a DoD is required. It has a strong one:

- **Intent** is concrete, plain-English, and falsifiable: "fetch the whole project … and render
  it without a kernel ever starting, exactly as if they had deserialized the file directly,"
  with named failure modes (missing blocks / dropped persisted outputs / refusing to open on a
  mis-installed kernel). A reasonable engineer can sanity-check the diff against it.
- **Capstone is real and unfakeable.** `GET /api/project` over a real fixture returns an
  `ApiProject` whose `project` + `metadata` deep-equal `deserializeDeepnoteFile(<same bytes>)`
  with persisted outputs intact and no kernel started. This is exactly the end-to-end,
  mock-proof assertion the SKILL demands — the payload must reproduce the real deserialized tree
  to pass.
- Supporting Observables (stable `openHash`, kernel-missing degrades to a flag not an open
  failure, bad path → 400) are user-observable, not implementation-detail.
- Checkbox integrity holds: the two "API contract reviewed/approved by stakeholders" boxes are
  correctly left unchecked as the reviewer gate; everything else is backed by green tests. No
  deferred in-scope work disguised as done.

## Gate 2 — Implementation quality: PASS

Read the full diff and cross-referenced ADR-001, ADR-003, ADR-007. Verified the runtime-core
imports (`selectKernelName`, `isNonPythonKernel`, `resolvePythonExecutable`, `selectPythonSpec`)
exist with the `{ explicit }` option shapes used, and re-ran the two new test files
(`VITEST_MAX_WORKERS=2 VITEST_TEST_TIMEOUT=30000`): **15/15 green**.

What's right:

- **KD-6 split is genuine.** `Session.loadProject` reads bytes → hashes → deserializes →
  resolves capabilities with **no kernel side effect**; `startEngine` is only forward-declared.
  The kernel-free guarantee is the load path's structure, not a comment.
- **TDD is evident, test-first in spirit.** Tests assert on behavior (deep-equal tree, persisted
  stream output survives, openHash equals an independent `createHash`, capability flags,
  bad/malformed path rejects, unloaded session throws). They define the contract rather than
  mirror the implementation; failure and edge cases are present, not happy-path-only.
- **Capstone is exercised twice** — once at the `Session.apiProject()` layer and once over the
  wire through a bound `createServer` driven by `fetch`. The fixture
  (`test/fixtures/open-project.deepnote`) carries a real persisted `stream`/`stdout` output, so
  the deep-equal proves persisted outputs survive — not a synthetic empty tree.
- **ADR-007 boundary respected.** `packages/runtime-server/package.json` has no `@deepnote/cli`
  dependency; the CLI's `resolveAndConvertToDeepnote` was deliberately not reused (it would
  invert the one-way `cli → runtime-server` arrow). The router is framework-free `node:http`,
  consistent with the publishable-backend constraint.
- **README is accurate and complete** — usage snippet, `200` `ApiProject` body, the `400`/`404`
  error table, and the explicit "missing kernel is not an error" KD-6 guarantee. DaC satisfied.
- The `tsconfig.json` `**/*.capstone.ts` exclude is the documented, minimal fix for a
  pre-existing scaffold glob gap (the dist-only subpath consumer is checked solely by
  `check:types-subpath`); it is not a lazy linter/type-check loosening of in-scope code.
- `reactivity: 'disabled'` hardcoded in s1 is correct and well-justified — advertising `'python'`
  before m3/s5 wires reactive execution would lie about a capability; it matches the
  `api-types` contract (`'python' | 'disabled'`).

No blockers. The bad-path 400 at the HTTP boundary only fires for an unloaded/throwing session
(the project is loaded *before* `createServer` in the real `serve` flow, so a genuinely bad path
rejects in `loadProject` at the command layer, which `session.test.ts` proves directly). That is
the correct architecture for the load-before-serve design, not a gap.

## FOLLOW-UP

- **L1 (capability-coupling-gap):** `resolveCapabilities` probes the *Python* interpreter
  unconditionally and the final ternary is `interpreterAvailable ? (nonPython ? kernelName :
  'python') : null`. For an explicit **non-Python** kernel (e.g. `--kernel bash`), a
  mis-installed *Python* interpreter would still degrade `kernelLanguage` to `null`, even though
  the bash kernel's availability has nothing to do with the Python interpreter. The bash test
  masks this by passing a resolvable `python: 'python3'`, so the broken branch is never walked.
  Failure mode: on a machine with bash present but no Python, a bash-kernel project would report
  `kernelLanguage: null` ("kernel missing") when bash is in fact available. Low blast radius in
  s1 (python-default-centric, name-based), but the probe should be gated on the kernel actually
  being Python (`!nonPython`) before it can null the flag. Candidate for a small follow-up card
  when non-Python kernels become first-class.

- **L2 (test-depth-gap):** the "opens with NO kernel started" test asserts the positive signal
  (a fully-populated payload) but cannot assert the *negative* (no `ExecutionEngine`
  constructed) because no engine exists to spy on in this phase. When `startEngine` lands
  (Phase 3), add a regression that spies on engine construction and asserts `loadProject` /
  `GET /api/project` never triggers it — so the kernel-free guarantee stays enforced after the
  engine becomes constructible.

## Outstanding close-out actions

- The two "API contract reviewed and approved by team/stakeholders" boxes are this reviewer's
  gate — approving here satisfies them. CHANGELOG is owned by the sprint closeout card per the
  card's own declaration.
