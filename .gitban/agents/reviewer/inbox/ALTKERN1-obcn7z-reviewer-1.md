---
verdict: APPROVAL
card_id: obcn7z
review_number: 1
commit: e27424a
date: 2026-06-11
has_backlog_items: true
---

# Review — obcn7z (Sub-phase 1C: real-kernel integration test + CI IaC + docs)

Reviewed the full 1C deliverable across `778b05b..e27424a` (8 files: `.github/workflows/ci.yml`,
`vitest.config.ts`, `vitest.integration.config.ts`, `package.json`, `cspell.json`,
`docs/running-your-own-kernel.md`, `packages/cli/test-integration/non-python-kernel.integration.test.ts`,
`packages/cli/test-integration/fixtures/bash-image.deepnote`). The review commit `e27424a` is the last
of the range (the CI job); the boundary `778b05b` belongs to prior work (run.test.ts fixture anchoring).

## Verdict: APPROVAL

### Gate 1 — completion claim: PASS

- **DoD required and present.** The card touches CI config, runtime test-collection config, test behavior,
  and docs, so a DoD is mandatory. Intent is concrete and outside-the-code (a polyglot user runs a bash
  notebook through `deepnote run --kernel bash` and gets an `image/png` back, proven in CI against a real
  Jupyter kernel). Observables are specific and testable. Intent and Observables are consistent.
- **Two strong capstones, both unfakeable.** (1) `--kernel bash <fixture>` through the REAL built CLI
  against the REAL toolkit server returns a non-`text/plain` `image/png` bundle that decodes to valid PNG
  magic bytes. (2) `--kernel no_such_kernel -o json` against the real server emits
  `failureCategory: "missing-kernel"` with the typed listing message and never an opaque 500. Neither is
  mockable — both run only in the `integration-kernels` CI job against a provisioned venv. This is exactly
  the decompose-but-don't-assemble guard the SKILL asks for.
- **Checkbox design and integrity sound.** Checkboxes map to acceptance criteria + observables, are
  concrete, and cover the failure path (missing kernel), not just the happy path.

### Gate 2 — implementation quality: PASS

Verifications I ran on the normal checkout:

- **Default-config regression:** `vitest run packages/cli/src/commands/run.test.ts` → **182/182 passed**
  under the modified `vitest.config.ts`. The `exclude` glob changes no existing test's behavior.
- **Self-skip gate:** `pnpm run test:integration` with `RUN_INTEGRATION_TESTS` unset → **3 skipped, exit 0**
  (no hard-fail), confirming the defense-in-depth runtime gate and that `describe.skip` fires on missing
  env/venv/CLI.
- **Spell-check:** `pnpm spell-check` → **560 files, 0 issues.** The diff adds exactly `bash_kernel`,
  `kernelName`, `kernelspecs`, `IJulia`, `IRkernel`; `kernelspec`/`iopub` are present in the diff context
  and not re-added — matching the design doc's exact list (KD-9 / R8).
- **Only one `*.integration.test.ts` file exists**, so the exclude glob fully covers the always-on suite.

Cross-references against source (the test asserts real, existing behavior, not internals):

- `KernelNotRegisteredError` at `packages/runtime-core/src/kernel-errors.ts:42` emits
  `Kernel '${requested}' is not registered. Installed kernels: ${installed}` — exactly the substrings the
  legibility test asserts (`no_such_kernel`, `not registered`, `python3`, `bash`).
- `failureCategory` discriminant is plumbed through `run.ts` (and unit-tested in `run.test.ts`); the
  integration test exercises it end-to-end against the real server.
- The JSON payload shape the headline test parses (`blocks[].outputs[].data['image/png']`,
  `output_type === 'stream'`, `text`) matches the `IOutput` serialization built in `kernel-client.ts`
  (`display_data`/`stream`) and surfaced via `run.ts`.
- `--python` is documented and implemented as accepting an executable, bin dir, or venv root
  (`cli.ts:274`), matching the test's `resolveVenv()` and the docs.
- Pins `deepnote-toolkit[server]==2.3.1` + `bash_kernel==0.10.0` match `docs/spikes/nom-002/RESULTS.md`.
- The regression fixture `test-fixtures/simple.deepnote` prints "Hello, World!" — the exact string asserted.

Quality of the change itself:

- **CI IaC is correct.** SHA-pinned actions, pinned toolkit/kernel versions, pip cache keyed on the pins
  (so a bump invalidates it), a 15-minute timeout, and a deliberate-bump comment on the `env:` block. This
  is the only job that provisions Python / runs real execution; the always-on mocked job is untouched
  except for the collection exclude. Reproducible and codified.
- **Config split is clean.** The default config appends to `configDefaults.exclude` rather than replacing
  it, preserving the built-in node_modules/dist excludes. The integration config is the inverse and carries
  no `bail` so all three assertions report independently.
- **Test design is honest about the live transport.** The headline assertion is generate-and-decode
  (asserts PNG magic bytes), not a label check; the legibility test explicitly asserts the absence of `500`
  and "unhandled error". Non-zero exit on missing kernel is treated as data, not a thrown error. The CLI is
  run in a temp workdir so the toolkit's snapshot persistence never dirties the repo — a thoughtful
  hermeticity touch.
- **Docs are accurate.** `docs/running-your-own-kernel.md` answers #154 with the worked bash example and an
  honest Phase-1 degradation surface (value-add hard-fail, reactivity bypass, legible missing-kernel) that
  matches the shipped behavior.

**Capstone exercise note (not a blocker):** I could not run the real-kernel suite during review (no
provisioned venv in this environment). The close-out provides specific real-run evidence — PNG magic bytes
`89504e47`, exit 2 + the typed listing message, three independent real-server runs including the exact CI
invocation (111s) — and every piece of surrounding machinery I *can* verify (regression, self-skip,
spell-check, error-message source, JSON-shape source, pins, cspell list) checks out. The capstones are
verified in CI by the `integration-kernels` job, which is the prescribed verification surface for this card.

## BLOCKERS

None.

## FOLLOW-UP

- **L1 (housekeeping / repo-hygiene):** Repo root `.venv/` is not in `.gitignore`. The CI job creates its
  own per-run venv so this is not load-bearing, but a stray local `.venv` (1.1G) provisioned by an agent
  could be accidentally staged. A one-line `.gitignore` add would close the gap. (Already noted in the
  card close-out.)
- **L2 (test-surface gap / kernel-coverage):** The integration suite proves the pure-pip `bash_kernel`
  path only. The `--kernel-timeout` / heavier-kernel behavior (IJulia/IRkernel) is never exercised — a
  future heavier-kernel integration target would cover startup-timeout and a second non-Python transport.
  (Aligns with the design-doc Phase 2/3 note; the card already flags it under Future Enhancements.)
- **L3 (ops / version-pin-cadence):** The toolkit/bash_kernel pins are recorded in the CI `env:` block
  with a deliberate-bump comment, but there is no automated signal when upstream `deepnote-toolkit`
  releases a version that changes the real-server contract the assertions depend on. A periodic
  bump-and-rerun cadence (design-doc open question) would catch contract drift before it silently rots
  the only real-execution gate.
