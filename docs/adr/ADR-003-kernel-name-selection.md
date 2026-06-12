# ADR-003: Select the kernel name from an explicit CLI flag over a notebook-declared language over the `python3` default, on a channel separate from `DEEPNOTE_PYTHON`

> **Status**: Accepted | **Date**: 2026-06-11 | **Deciders**: CAMERON (approved via adversarial adr-reviewer gate)

## Context

ADR-002 **decided** to add `RuntimeConfig.kernelName` (default `'python3'`) and thread it into the
`@jupyterlab/services` session-start call (`packages/runtime-core/src/kernel-client.ts:55,74-79`,
the hardcoded-name site at `:78`), pre-validated against `GET /api/kernelspecs`. That change is
**accepted but not yet implemented**: today `RuntimeConfig` has no `kernelName` field
(`packages/runtime-core/src/types.ts:3-12` carries only `pythonEnv`), `connect()` still takes no
kernel parameter (`kernel-client.ts:55`), `:78` still hardcodes `kernel: { name: 'python3' }`, and
there is no kernelspecs pre-flight anywhere in runtime-core. ADR-002 decided the **launch model** —
where the name physically enters the session and how an unknown name fails legibly — and
explicitly deferred _where the name comes from_ to a separate ADR (ADR-002 "What this ADR does not
decide"; Related Decisions → the kernel-selection source & precedence decision). This is that
decision (now ADR-003). This ADR supplies the source that will drive `kernelName` once both decisions land; the
two are unbuilt and dependency-ordered (the field and seam from ADR-002, then the source from this
ADR). Until then every run resolves to the `'python3'` default and nothing can select a non-Python
kernel.

The forces:

- **No selection input exists in the CLI today.** `packages/cli/src/cli.ts:274` defines
  `--python <path>` for the _interpreter_; there is no `--kernel` or `--language` option on the
  `run` command. The whole option block (`:274–294`) has no kernel selector. So the only thing
  that could set `kernelName` before any work is a flag that does not yet exist.

- **The notebook cannot declare its language yet.** PRD-002 confirms the `.deepnote` core schema
  has no `language` field (`packages/blocks/src/deepnote-file/deepnote-file-schema.ts:169-174`);
  it is a Phase 2 deliverable with its own placement/format decision (per-block vs per-notebook,
  the import fan-out) owned by a Phase 2 design doc. PRD-002 sequences Phase 1 selection (CLI
  flag) _before_ Phase 2 (notebook-declared field): the flag is "the only selection input
  guaranteed available before Phase 2's `language` field exists" (PRD-002 Delivery Phases / Phase
  1). This ADR therefore decides the _full_ precedence shape now, but only the CLI-flag tier is
  wired in Phase 1; the notebook-declared tier becomes live when Phase 2 lands the field.

- **ADR-001 established a precedence shape and an env channel for the orthogonal axis.**
  `selectPythonSpec` resolves the _interpreter_ as `explicit ?? process.env.DEEPNOTE_PYTHON ??
detectDefaultPython()` (`packages/runtime-core/src/python-env.ts:160-162`), a pure precedence
  selector. ADR-001's two cross-cutting decisions are relevant here: its precedence _rationale_
  (the most specific, deliberate signal for this run wins over more persistent/ambient ones) and
  its _channel discipline_ — it adopted a single env var now and **deferred** a config-file tier as
  a documented, unbuilt extension point rather than over-committing. ADR-002 frames `kernelName` as
  the exact parallel to `pythonEnv`: `pythonEnv` selects _which Python runs the toolkit server_,
  `kernelName` selects _which kernel that server launches_ — two orthogonal axes on the same
  `RuntimeConfig` seam (ADR-002 Decision point 1, Key Factor 3).

- **An override-collision seam exists between this decision and its companion.** PRD-002's Error &
  Edge Cases call out: a non-Python `--kernel` run against a notebook that declares (or defaults
  to) Python and contains Python-dependent value-add blocks — SQL, visualization, input, and agent
  blocks, several of which emit `_dntk.*` Python RPC. SQL and DataFrame blocks embed `_dntk`
  directly (`packages/blocks/src/blocks/sql-blocks.ts`, `data-frame.ts`); the visualization RPC
  (`_dntk.DeepnoteChart`) is emitted from `packages/blocks/src/python-snippets.ts:92`, consumed via
  `pythonCode.executeVisualization`; the agent handler lives at
  `packages/runtime-core/src/agent-handler.ts`. PRD-002 requires the _precedence_ and the
  _value-add-block behavior_ to be "defined together." This ADR owns one half of that — which
  selection input wins — and a companion degradation decision (ADR-004) will own the other
  half — what then happens to those blocks.

This ADR is value-neutral on the launch mechanics (ADR-002) and on degradation behavior (the
companion degradation decision); it decides only the source and precedence of the value that flows
into `RuntimeConfig.kernelName`.

## Decision

We will resolve `RuntimeConfig.kernelName` through a **single precedence chain that mirrors
ADR-001's shape**, with this order (highest first):

1. **Explicit CLI flag** (a `--kernel <name>` on `deepnote run`; the exact spelling is a
   design-doc detail). A per-invocation argument is the most specific signal for this run and wins
   over whatever the notebook declares — exactly as ADR-001's `--python` wins over the persistent
   `DEEPNOTE_PYTHON`.
2. **The notebook-declared language** (the Phase 2 `language` field, mapped to a kernel name).
   This tier is **defined now but only wired in Phase 2**, when the field exists; until then the
   chain has two live tiers (flag, default). This ADR does **not** design the `language` field's
   format, placement, or its language→kernel-name mapping — that is the Phase 2 design doc's job
   (PRD-002). It decides only that, once the field exists, it sits below the explicit flag and
   above the default.
3. **The default `'python3'`** — ADR-002's `RuntimeConfig.kernelName` default (once that field is
   implemented), guaranteeing every existing notebook resolves to `python3` exactly as today.

We will keep kernel selection on a **channel separate from `DEEPNOTE_PYTHON` / the `DEEPNOTE_*`
env tier**. Kernel selection is orthogonal to interpreter selection (ADR-002's two axes), and we
will **not** introduce a `DEEPNOTE_KERNEL` env var in this decision. A parallel env tier (e.g.
`DEEPNOTE_KERNEL`, sitting between the flag and the notebook declaration, by analogy to
`DEEPNOTE_PYTHON`) is recorded as a **deferred, documented extension point — not built** — exactly
as ADR-001 deferred its config-file tier. The kernel precedence chain is a **distinct resolver**
(a `selectKernelName`-shaped selector), not an overload of `selectPythonSpec`.

On the **override-collision seam**: when an explicit non-Python `--kernel` is set on a notebook
that declares or defaults to Python and contains Python value-add blocks, the **explicit flag wins
the selection** — `kernelName` resolves to the non-Python kernel (precedence tier 1). What then
happens to the now-orphaned Python value-add blocks (hard-fail vs. warn-and-skip) is **owned by a
companion degradation decision (ADR-004), not decided here.** This ADR states the seam and
fixes only which side of it wins selection.

This ADR decides the _source and precedence contract_. The CLI flag's exact name, the `RuntimeConfig`
plumbing, the language→kernel mapping, and the test matrix belong to the design doc.

## Rationale

### Key Factors

1. **Per-invocation override > persistent in-artifact declaration > built-in default is the same
   principle ADR-001 already validated, applied to a parallel axis.** ADR-001's precedence
   reasoning is that the most specific, deliberate signal for a given run wins over the more
   persistent default (`ADR-001` Decision, tier 1 note). The kernel axis follows the same
   principle on its own terms: a `--kernel` flag is a per-invocation override the user types for
   this run; a notebook-declared language is a persistent declaration baked into the artifact; the
   `'python3'` default is the built-in fallback. The override beats the in-file declaration beats
   the default — not because the file declaration is "ambient" (it is an explicit, version-
   controlled declaration, arguably _more_ deliberate than an env var), but because a signal scoped
   to this single run should beat a setting persisted in the file, which in turn beats the
   built-in. Because ADR-002 already established that `kernelName` is the exact parallel of
   `pythonEnv`, reusing ADR-001's precedence _principle_ (most-specific-for-this-run wins) means
   callers learn one mental model for both axes rather than two — "the thing you typed this run
   beats the thing the file says, which beats the built-in default." Inventing a different ordering
   for the kernel axis would be gratuitous divergence on a seam ADR-002 deliberately kept
   isomorphic.

2. **The CLI flag must be tier 1 because it is the only Phase 1 input — and it is the user's
   escape hatch thereafter.** Phase 1 ships before the notebook `language` field exists (PRD-002
   sequencing), so the flag is not merely _a_ source, it is the _only_ source that can drive a
   non-Python run in Phase 1; placing it anywhere but the top would mean either nothing can select
   a kernel in Phase 1 (if it sat below a not-yet-existent field) or the contract would have to be
   redesigned when Phase 2 lands. Putting it on top makes Phase 1 selection real _and_ forward-
   compatible: when Phase 2 adds the declared tier underneath, the flag's meaning ("override the
   file for this run") is unchanged. This also gives a user a deterministic way to run a notebook
   against a different kernel than it declares — the override case PRD-002 explicitly raises.

3. **Keeping kernel selection off `DEEPNOTE_PYTHON` protects a public-but-unadopted contract from
   semantic overloading, for no benefit.** ADR-001 records that `DEEPNOTE_PYTHON` has **zero
   external env-var adopters** (the `vscode-deepnote` producer wins at the explicit tier and sets
   it nowhere). PRD-002 names "bolting kernel selection onto `DEEPNOTE_PYTHON`" a Low–Medium risk
   whose harm is "muddying a public-but-unadopted contract's future semantics." The two axes are
   orthogonal (interpreter vs. kernel); collapsing them onto one env var would force every future
   reader of `DEEPNOTE_PYTHON` to disambiguate two meanings, and would make the interpreter
   contract's wire format (an executable path) and a kernel name (a kernelspec key) share one
   channel — incoherent. A _separate_ `DEEPNOTE_KERNEL` would be defensible, but Phase 1 has no
   host that needs to publish a kernel via env (the only known external producer selects neither
   via env), so building it now is speculative. Deferring it — as a documented tier, mirroring
   ADR-001's deferred config-file tier — keeps the door open without over-committing.

4. **A distinct resolver, not an overload, keeps both selection axes independently testable and
   prevents drift.** ADR-001 deliberately made `selectPythonSpec` a "pure precedence selector with
   no assembly" (`python-env.ts:152-162`) so it is trivially unit-testable. A separate
   `selectKernelName` selector for the kernel axis preserves that property: the kernel precedence
   can be unit-tested in isolation (flag > declared > default) without coupling to interpreter
   resolution, and the two cannot accidentally entangle. This directly serves PRD-002's
   "deterministic and visible / precedence documented and unit-tested" success criterion.

5. **Deciding the precedence now while wiring only the live tiers respects PRD-002's phasing
   without foreclosing Phase 2.** The full chain is stated so Phase 2's field has a defined slot
   the moment it exists; but only tiers 1 and 3 are wired in Phase 1, so this ADR commits no
   dependency on the unresolved Phase 2 schema format. The contract is forward-declared; the
   implementation is incremental — the same discipline ADR-002 used by deciding to add the
   `kernelName` field but leaving it wired to no source.

## Consequences

### Positive

- Phase 1 gets a real, deterministic selection source (the flag) and a forward-compatible
  contract: Phase 2 slots the declared tier in underneath with no contract change.
- Selection precedence is unit-testable in isolation (a pure `selectKernelName` selector), meeting
  PRD-002's "deterministic, visible, precedence documented and unit-tested" criterion.
- Python is regression-free by construction: with no flag and no declared language, the chain
  yields ADR-002's `'python3'` default, so every existing notebook is byte- and behavior-identical.
- The user retains a deliberate override (`--kernel`) to run a notebook against a kernel other than
  the one it declares — the explicit-beats-file behavior users expect from `--python`.
- `DEEPNOTE_PYTHON`'s semantics stay single-purpose; the orthogonal axes stay legible.

### Negative

- **The notebook-declared tier is specified but unverifiable in Phase 1**, because the field it
  reads does not exist yet. This ADR forward-declares a precedence slot whose only test in Phase 1
  is "flag beats default / no-flag → default"; the "flag beats declared" assertion cannot be
  written until Phase 2. _Acceptable, and disclosed_: the alternative (defer the precedence
  decision to Phase 2) would leave Phase 1's flag with no defined relationship to the future field
  and force a contract redesign.
- **No env-based selection in Phase 1.** A host that wanted to publish a kernel the way an editor
  publishes an interpreter cannot, until the deferred `DEEPNOTE_KERNEL` tier is built. _Acceptable_:
  no such host exists today (PRD-002 / ADR-001 adoption finding), and the tier is reopenable.
- **This ADR alone does not fully resolve the override collision** — it fixes which side wins
  selection but hands the resulting block behavior to the companion degradation decision. A reader
  wanting the _end-to-end_ collision behavior must read both. _Acceptable and intended_: PRD-002
  requires the two be "defined together," which is satisfied only once the companion decision is
  written; this ADR satisfies the selection half with a clean ownership split (selection vs.
  degradation) rather than one ADR straddling both concerns.

### Neutral

- Adds a second selection resolver to runtime-core's surface (`selectKernelName`-shaped),
  alongside ADR-001's `selectPythonSpec`. Both callers (CLI, MCP) can set `kernelName`, but only
  the CLI flag is wired as a source in Phase 1; MCP gains a kernel source only if/when a later
  decision wires one.
- Establishes a precedent that `RuntimeConfig` selection axes each get their own precedence
  selector mirroring ADR-001's shape, rather than one merged resolver.
- Records `DEEPNOTE_KERNEL` as a named-but-unbuilt extension point, the same pattern as ADR-001's
  deferred config-file tier.

## Alternatives Considered

### Alternative 1: CLI flag + notebook-declared language, precedence explicit > declared > default (recommended)

**Description**: Resolve `kernelName` via a dedicated selector ordered explicit CLI `--kernel` >
notebook-declared `language` (Phase 2) > `'python3'` default, on a channel separate from
`DEEPNOTE_PYTHON`, with the env tier deferred.

**Pros**:

- Mirrors ADR-001's validated "most-specific-for-this-run-wins" precedence shape and ADR-002's
  `pythonEnv` parallel, so callers learn one model.
- Gives Phase 1 a real source (the flag) and a forward-compatible slot for Phase 2's field.
- Preserves a deliberate override and keeps `DEEPNOTE_PYTHON` single-purpose.

**Cons**:

- The declared tier is specified before it can be tested (Phase 2 dependency).
- Two tiers are wired in Phase 1, one is forward-declared — a reader must understand the phasing.

**Why not chosen**: Chosen. It is the only option that makes Phase 1 selection real _and_ avoids a
contract redesign at Phase 2, while staying isomorphic to the seams ADR-001/ADR-002 established.

### Alternative 2: Notebook-declared language only (no CLI override)

**Description**: The kernel is read solely from the notebook's `language` field; there is no
`--kernel` flag. A user changes the kernel by editing the file.

**Pros**:

- Single source of truth; no precedence reconciliation to specify; the notebook is fully
  self-describing.
- No override-collision seam at all (the file always wins because it is the only input).

**Cons**:

- **Impossible in Phase 1**: the `language` field is a Phase 2 deliverable, so this option ships
  _nothing_ until Phase 2 — directly contradicting PRD-002's Phase 1 ("run one non-Python kernel
  via a CLI flag, the only source available before the field exists").
- Removes the user's escape hatch: running a notebook against a different kernel than it declares
  (e.g. to test, or to override a mis-imported language) requires editing the file every time.
- Asymmetric with ADR-001, which deliberately keeps an explicit `--python` arg above the
  file/persistent tiers; a file-only kernel axis would be the lone selection axis with no per-run
  override.

**Why not chosen**: It cannot deliver Phase 1 at all, and it strips the deliberate-override
capability ADR-001 treats as the top tier for the parallel axis.

### Alternative 3: Ride the `DEEPNOTE_*` env channel (e.g. add `DEEPNOTE_KERNEL` now, or overload `DEEPNOTE_PYTHON`)

**Description**: Carry kernel selection on the env tier — either a new `DEEPNOTE_KERNEL` slotted
into the chain like `DEEPNOTE_PYTHON`, or (worse) overload `DEEPNOTE_PYTHON` itself.

**Pros**:

- Reuses ADR-001's host→server env-publish channel, the same model MCP clients already use to
  pass an `env` block.
- A future editor/host could publish a kernel exactly as it could publish an interpreter, with no
  new mechanism.

**Cons**:

- **No host needs it in Phase 1.** ADR-001 records `DEEPNOTE_PYTHON` has zero external env-var
  adopters; the one known producer selects via the explicit tier. Building a kernel env tier now
  is speculative machinery for an unmet need — the over-commitment ADR-001 explicitly avoided.
- **Overloading `DEEPNOTE_PYTHON` is incoherent**: it would force one variable to carry an
  interpreter _path_ and a kernelspec _name_ (two wire formats, two orthogonal axes), muddying a
  public contract's semantics for every future reader — PRD-002's named Low–Medium risk.
- Even a clean separate `DEEPNOTE_KERNEL` adds a third precedence tier to specify, document, and
  test before anything consumes it.

**Why not chosen**: It pays real cost (a new or overloaded contract) for a benefit with no Phase 1
consumer. We **defer** it as a documented extension point — the same disposition ADR-001 gave its
config-file tier — so it is reopenable the moment a host that publishes a kernel via env appears,
without being built speculatively now.

### Alternative 4: Do nothing (status quo)

**Description**: Leave `RuntimeConfig.kernelName` (once ADR-002 lands it) wired to no source; it
stays at its `'python3'` default forever.

**Pros**:

- Zero work.

**Cons**:

- ADR-002 decided to add `kernelName` precisely so a source could drive it; with no source, no
  non-Python kernel can ever be selected, and PRD-002 Phase 1 delivers nothing.

**Why not chosen**: It is the gap PRD-002 and ADR-002 exist to close — a field with no source is
inert.

## Implementation Notes

- Add a `--kernel <name>` option to the `run` command alongside `--python`
  (`packages/cli/src/cli.ts:274`); thread it as the `explicit` tier into a kernel selector that
  sets `RuntimeConfig.kernelName` (once ADR-002's field is implemented). Exact flag spelling is a
  design-doc call.
- Add a dedicated, pure `selectKernelName`-shaped selector to runtime-core, mirroring
  `selectPythonSpec`'s no-assembly precedence-only shape (`python-env.ts:160-162`):
  `explicit ?? <declaredLanguage→kernelName> ?? 'python3'`. In Phase 1 the middle term is absent,
  so it reduces to `explicit ?? 'python3'`; Phase 2 supplies the declared term.
- Do **not** consult `process.env.DEEPNOTE_PYTHON` in the kernel selector, and do **not** add
  `DEEPNOTE_KERNEL` in this work. Record `DEEPNOTE_KERNEL` as a deferred tier (between flag and
  declared language) in the resolver's documentation, mirroring ADR-001's deferred config-file
  tier note.
- The language→kernel-name mapping (e.g. `julia` → which registered kernelspec) and the
  `language` field's format/placement are **not** specified here; they are Phase 2 design-doc
  inputs. The selector consumes a _resolved kernel name_, not a raw language string, at the
  declared tier.
- The override-collision behavior (what happens to Python value-add blocks when a non-Python flag
  wins) is implemented per the companion degradation decision, not here. This selector's only
  collision responsibility is to return the non-Python name when the flag is set.

## Validation

- **In-repo, must hold (Phase 1):** unit tests assert the precedence on the live tiers —
  `--kernel X` → `kernelName === X`; no flag → `kernelName === 'python3'`; the selector is a pure
  function with no env read (a test asserts setting `DEEPNOTE_PYTHON` does **not** affect the
  resolved kernel). The selected kernel is echoed in CLI output (PRD-002 "deterministic and
  visible" criterion).
- **In-repo, must hold (Phase 2, deferred assertion):** once the `language` field exists, a test
  asserts `--kernel X` on a notebook declaring `language: Y` resolves to `X` (flag beats declared),
  and a notebook declaring `language: Y` with no flag resolves to `Y`'s kernel.
- **Revisit if:** a concrete host needs to publish a kernel via the spawn environment the way an
  editor publishes an interpreter (then promote the deferred `DEEPNOTE_KERNEL` tier, slotted
  between flag and declared language); or the Phase 2 design doc adopts a per-block language model
  such that "the notebook's language" is no longer a single value (then this ADR's single-value
  "declared" tier must be re-examined against per-block resolution).
- **Honest limits:** (1) the declared tier is forward-declared and cannot be tested until Phase 2,
  so Phase 1 validates only flag-vs-default. (2) This ADR's collision decision is half of the
  end-to-end behavior; the other half (block degradation) is validated by the companion degradation
  decision, and only the two together satisfy PRD-002's "precedence and value-add behavior defined
  together" requirement. (3) This ADR does not validate that any given language string maps to a
  real kernel — that is ADR-002's pre-flight `GET /api/kernelspecs` validation (once implemented)
  plus the Phase 2 mapping.

## Related Decisions

- **ADR-001** (`docs/adr/ADR-001-shared-python-interpreter-resolution.md`) — the orthogonal
  _interpreter_ axis; this ADR mirrors its precedence shape (explicit arg > env > default) and its
  channel discipline (adopt one tier now, defer the next as a documented extension point), and
  deliberately keeps kernel selection off its `DEEPNOTE_PYTHON` channel.
- **ADR-002** (`docs/adr/ADR-002-non-python-kernel-launch-model.md`) — decided to add the
  `RuntimeConfig.kernelName` field this ADR supplies a source for (accepted, not yet implemented),
  and owns the launch/validation mechanics; ADR-002 explicitly named this NOM as the future
  "kernel-selection source & precedence" decision. The dependency runs ADR-002's field/seam →
  this ADR's source.
- **ADR-004** (`docs/adr/ADR-004-non-python-degradation-behavior.md`) — non-Python degradation behavior; the other
  Phase 1 prerequisite; owns what happens to Python value-add blocks (and reactivity) when a
  non-Python kernel is selected. This ADR owns the _selection_ side of the override collision; the
  companion decision owns the _behavior_ side. PRD-002 requires the two be defined together, so
  this selection ADR should not be promoted ahead of (or without a committed plan for) that
  companion decision.
- **PRD-002** (`docs/prds/PRD-002-alternative-language-kernels.md`) — Phase 1 names this the
  kernel-selection-source ADR and a pre-coding blocker; Phase 2 supplies the notebook `language`
  field this ADR's middle tier reads.

## References

- `packages/cli/src/cli.ts:274` — `--python` defined on `run`; no `--kernel`/`--language` today.
- `packages/runtime-core/src/python-env.ts:160-162` — ADR-001 `selectPythonSpec`, the precedence
  shape this ADR mirrors; `:210-225` — `selectPythonSpecWithHint`, the pure-selector pattern.
- `packages/runtime-core/src/kernel-client.ts:55,74-79` — the session-start seam (`:78` the
  hardcoded `'python3'`) that ADR-002 will make take `kernelName`; `connect()` at `:55` currently
  takes no kernel parameter.
- `packages/runtime-core/src/types.ts:3-12` — `RuntimeConfig` today (only `pythonEnv`); ADR-002
  decided to add `kernelName` here but it is not yet present.
- `packages/blocks/src/deepnote-file/deepnote-file-schema.ts:169-174` — code-block schema with no
  `language` field today (the Phase 2 declared-language source).
- `packages/blocks/src/blocks/sql-blocks.ts`, `data-frame.ts` — Python-dependent value-add blocks
  that embed `_dntk` RPC directly; `packages/blocks/src/python-snippets.ts:92` — visualization RPC
  (`_dntk.DeepnoteChart`), consumed via `pythonCode.executeVisualization`;
  `packages/runtime-core/src/agent-handler.ts` — agent block handler. All Python-dependent
  value-add blocks affected by the override collision.
- PRD-002 Delivery Phases (Phase 1 CLI flag, Phase 2 notebook-declared field), Error & Edge Cases
  (override collision), Open Questions ("Where does kernel selection come from…"), and Risks (the
  `DEEPNOTE_PYTHON`-overloading risk).

---

## Revision History

| Date       | Status   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-11 | Proposed | Initial proposal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-06-11 | Proposed | Disambiguated ADR-002 as accepted-but-unimplemented (no `kernelName`/kernelspecs pre-flight in tree today); reframed the degradation sibling as a planned companion decision (no NOM-004 exists) and made the "defined together" / promotion dependency explicit; re-grounded Key Factor 1 on per-invocation-override > persistent-in-artifact-declaration > default rather than the "ambient" analogy; corrected value-add-block citations (`agent-handler.ts` under `runtime-core/src/`, viz `_dntk` RPC at `python-snippets.ts:92`, direct `_dntk` only in `sql-blocks.ts`/`data-frame.ts`). |
| 2026-06-11 | Accepted | Promoted NOM-003 → ADR-003 via the draft→review→revise→verify gate: adversarial review (request-changes, 4 findings) applied; independent verify confirmed all findings resolved, citations accurate, no solutioning introduced. Accepted alongside ADR-004 (companion degradation decision).                                                                                                                                                                                                                                                                                                   |
