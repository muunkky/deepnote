---
verdict: APPROVAL
card_id: x71bcm
review_number: 2
commit: b10b73c
date: 2026-06-12
has_backlog_items: false
---

# Review — LUI1WEDGE / x71bcm cycle 2 (L1 reopen: capability-coupling-gap)

**Verdict: APPROVAL.** Gate 1 (re-verify reopen structure) PASS, Gate 2 (code quality) PASS.

## Scope of this review

This is a re-review of the L1 reopen only. The endpoint/session/router/fixture/README and
all cycle-1 tests were approved in cycle 1 and are untouched by `b10b73c` (diff confirms:
`session.ts` +22/-7 in `resolveCapabilities` only, `session.test.ts` +17 one new test). No
scope drift — the executor held the line on L1 exactly.

## Gate 1 — reopen structure (PASS)

The reopen section added three fix checkboxes that are testable conditions (gate the probe on
`!nonPython`; add the masked-branch regression; existing capability tests stay green), not
restatements. All three are checked with truthful evidence — verified against the passing
suite below, not taken on faith. L2 is correctly excluded and parked on closeout card `od8esg`
pending step 4A (`hlai4c`). DoD/capstone from cycle 1 remain intact and unweakened.

## Gate 2 — the fix (PASS)

**Root cause, correctly addressed (no lazy solve).** The cycle-1 ternary
`interpreterAvailable ? (nonPython ? kernelName : 'python') : null` coupled the non-Python
kernel's `kernelLanguage` to Python interpreter resolution: an unresolvable Python nulled the
flag even for `--kernel bash`. The fix early-returns `{ kernelLanguage: kernelName, reactivity:
'disabled' }` for `nonPython` *before* any Python probe, and the Python path now plainly reads
`interpreterAvailable ? 'python' : null`. This is the orthogonality the doc comment and ADR-003
(kernel axis) / ADR-001 (interpreter axis) already asserted — the code now matches the stated
contract rather than working around it. Verified `isNonPythonKernel('python3') === false` and
`isNonPythonKernel('bash') === true` (runtime-core `kernel-name.test.ts`), so the python3
default still correctly takes the probe path and only the non-Python branch changed.

**TDD — genuine regression, not test-after.** The new test passes `kernel: 'bash'` +
`python: '/definitely/not/a/python/interpreter'` and asserts `kernelLanguage === 'bash'`. This
is exactly the branch the cycle-1 bash test masked (it passed a resolvable `python3`). Pre-fix
this assertion yields `null` (red); post-fix it yields `'bash'` (green) — a true guard against
regression of this coupling. It also re-asserts the KD-6 invariant (`project.notebooks.length >
0`: open never fails on a missing interpreter). Behaviour-level assertion, not internals.

**DaC.** The doc comments were rewritten to match the new control flow (the non-Python rationale
moved into the early-return block; the Python-path comment now scopes itself to the Python case).
Documentation and code are consistent.

**Verification.** Ran `vitest run src/session.test.ts` on the parent tree: 11/11 green
(was 10 in cycle 1; +1 regression). Matches the executor's claimed 23/23 package total.

## FOLLOW-UP

None new. L2 (engine-construction-spy regression) remains correctly deferred to closeout card
`od8esg` pending step 4A. No further debt exposed by this diff.

## Outstanding close-out actions

- Executor: check the L1 reopen fix checkboxes if not already, and complete the card. The two
  "API contract approved by stakeholders" reviewer-gate boxes are satisfied by this approval.
