> ✅ **POSTED** (and revised) to `muunkky/deepnote` Discussion #5 (fork dry-run showcase thread):
> https://github.com/muunkky/deepnote/discussions/5#discussioncomment-17287165
> Fork-only — nothing pushed or sent to `deepnote/deepnote`. Fork posts are pre-authorized; only upstream
> posts require explicit approval. Rewritten per Cameron's direction: reporter voice, centered on what was
> built and why, the architectural decisions and how they were implemented, addressed to the maintaining
> engineering team. This file mirrors the posted copy.

---

## m3/s1 — a headless runtime server and a one-command local launch

This sprint landed the first slice of running a Deepnote project locally: a standalone runtime server plus `deepnote serve` / `deepnote ui`. The brief was deliberately narrow — make a `.deepnote` project openable, runnable, and saveable over a local HTTP/WebSocket surface — and the governing constraint was that it had to land as a clean _addition_ to the codebase, not a change to it. Here's what was built, the decisions behind it, and how they came out in the implementation.

### The shape: a new package behind a one-way arrow

The server is a new `@deepnote/runtime-server` package, not new surface inside `cli` or `runtime-core`. The dependency arrow is one-way and enforced — `cli → runtime-server`, never the reverse, and `runtime-server` never imports `cli` (ADR-007). Concretely, the only edits to existing files are the new CLI command registration and one dependency line; there is **zero behavior change in `runtime-core`**. Everything the server does, it does by reusing existing runtime-core primitives. That invariant is what makes the slice safe to take: it's additive, and the blast radius on existing `deepnote run` behavior is by construction nil. An always-on test enforces the no-`cli`-import boundary through the TypeScript AST so it can't silently regress.

### Opening a project without starting a kernel

`GET /api/project` deserializes a `.deepnote` file and returns the full notebook/block tree with its persisted outputs **without starting a Python kernel** (KD-6). The reasoning: you shouldn't pay for a kernel just to read a notebook — a viewer needs to paint the project immediately, and only execution needs a runtime. In implementation that meant splitting the session lifecycle into `loadProject()` (pure deserialization + capability resolution, no kernel) and a lazy `startEngine()` (first run only). Capabilities (`kernelLanguage`, `reactivity`) are resolved from the existing interpreter/kernel-selection logic; a missing or mis-installed kernel surfaces as a capability flag, not an open failure. The open path is verified by deep-equaling its payload against `deserializeDeepnoteFile` on the same bytes, so the served tree is provably identical to the file.

### One kernel, many callers: serialize at the server

A local UI can fire runs concurrently, but there is exactly one kernel behind it. ADR-005 is explicit that a single shared kernel must be serialized, so rather than expose that hazard the server fronts execution with a single-concurrency FIFO **run queue**. Runs stream over `WS /api/stream`, every event tagged with a `runId`, and the queue is the _only_ caller of `engine.runProject` — enforced structurally so no code path can issue an un-serialized run. Two guarantees fell out of that design and are tested directly: every run emits exactly one terminal event (so a client can never hang on a "pending forever" run, including when a block raises), and cross-block back-pressure is handled by gating on the socket draining rather than buffering without bound.

### Save that can't silently lose work

`POST /api/project/save` writes atomically — temp file then rename, in the same directory — and refuses to clobber: it SHA-256s the on-disk bytes at open and re-checks at save, returning `409` with the current on-disk content if they diverged (KD-7). Fidelity is defined as _semantic_, not byte-level, because the serializer re-canonicalizes — so the bar the tests hold is that `deserialize(serialize(project))` deep-equals the project and that a re-save is idempotent. The result is a hard guarantee that a save never corrupts or silently overwrites a user's file.

### Integration parity without duplicating logic or inverting the arrow

A SQL/integration block has to resolve the same credentials and environment that `deepnote run` resolves, or the two execution paths quietly diverge. Those integration-env helpers were `cli`-private, and the server couldn't reach them without inverting the ADR-007 arrow — so they were _lifted_ into a shared home in `runtime-core` (KD-3), with `cli` re-exporting them. It's a pure relocation: `run`'s behavior is unchanged, and both paths now resolve integration env through one implementation rather than two. Local-first is preserved — no outbound request fires unless a token is explicitly supplied.

### Verified against a real kernel — and what that turned up

The parity claim — "the server runs your project the way `deepnote run` does" — is checked against an actual kernel, not mocks: an integration suite boots the server over a fixture, runs it, and deep-equals the streamed outputs against `deepnote run --output json` on the same file.

That suite surfaced a real bug, and a notable one: it lives in _existing_ shared code, not the new package. A hard kernel crash mid-run makes the Jupyter server **auto-restart** the kernel — the status goes `busy → autorestarting → idle` and never reports `dead` — so the abandoned execution was being surfaced as an ordinary in-block error by both the new server _and_ `deepnote run`. The fix, treating `restarting`/`autorestarting` during an active execute as a kernel death, went into the shared `kernel-client`, so it corrects the run-failure semantics for the existing CLI at the same time it does for the server.

### How it's packaged for review

The whole slice is `packages/` only — a new server library plus a thin CLI command — with no SPA, board, or planning artifacts in the diff. It builds, typechecks, and tests standalone off `main`, and an import-form integrity check keeps any frontend or `apps/` reference out of the boundary. It is structured to read as exactly the PR we would open: a self-contained, additive capability that respects the existing architecture — and, on the way in, strengthens an existing code path.
