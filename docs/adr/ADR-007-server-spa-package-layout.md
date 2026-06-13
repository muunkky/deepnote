# ADR-007: A dedicated `packages/runtime-server` plus a path-excludable `apps/studio` SPA, so the #162 backend wedge slices clean

> **Status**: Accepted | **Date**: 2026-06-11 | **Deciders**: CAMERON

## Context

Milestone **m3** (master PRD `docs/prds/PRD-003-local-deepnote-ui.md`) delivers a locally-runnable
Deepnote UI. The PRD's first-class scope decision splits that work into two cleanly separable
layers with different homes and different upstream postures:

| Layer              | What it is                                                                               | Home                            | Upstream posture           |
| ------------------ | ---------------------------------------------------------------------------------------- | ------------------------------- | -------------------------- |
| **Backend wedge**  | `runtime-core` exposed over an HTTP + WebSocket API, plus a `deepnote serve` CLI command | `deepnote/deepnote` `packages/` | **Upstream-contributable** |
| **UI shell (SPA)** | The browser SPA (per-block renderers + editors + reactive wiring) that consumes that API | fork-only                       | **Fork showcase only**     |

This split is not cosmetic. It is forced by upstream epic
[#162](https://github.com/deepnote/deepnote/issues/162), whose "Related Work" paragraph assigns the
file format, conversion tools, and CLI to `deepnote/deepnote`, the kernel/engine to
`deepnote/deepnote-toolkit`, and **the editor integration and reactive-execution UI to a
_different_ repo, `deepnote/vscode-deepnote`**. A from-scratch web-app shell built inside
`deepnote/deepnote` directly overlaps a surface the maintainers are building elsewhere; the backend
HTTP/WS service over `runtime-core` is a natural extension of the existing `run.ts` orchestration
and sits squarely inside #162's stated CLI/runtime ownership. So the backend is offered upstream and
the SPA stays on the fork.

The fork contribution model in `.claude/CLAUDE.md` turns that posture into a concrete mechanical
requirement. Each body of work ships as **two diffs**:

- a **clean contribution diff** on `contrib/<slug>`, cut from `upstream/main`, containing **code only**
  (no `.gitban/`, no `.claude/`, no SPA) — this _is_ the upstream-ready PR; and
- a **process diff** on `sprint-record/<TAG>` — the whole monolith (board, PRD/ADR/design, _and_ the SPA).

The clean diff is built by moving **only the relevant code paths** onto a branch off `upstream/main`
(`git checkout sprint/<tag> -- <code paths>`, or cherry-picking the code commits). The slice is
therefore **path-based**: whether the contrib diff comes out clean depends entirely on whether the
backend's files and the SPA's files live in disjoint, individually-checkout-able directory trees —
and on whether the backend has any build-time or type-time dependency that would drag SPA files (or
a browser bundler) into its checkout.

Several facts about the current repo constrain the solution:

- **The workspace glob is `packages/*` only** (`pnpm-workspace.yaml`). Every workspace package today
  lives at `packages/<name>` and publishes as `@deepnote/<name>`. There is **no second app/glob tier**.
- **There is zero frontend in the monorepo.** No package depends on react, vite, express, fastify, or
  hono; CI tooling is Biome + Prettier + vitest + `tsc`. Introducing a UI framework _and_ a browser
  bundler is itself a load-bearing decision (its own ADR; see ADR-006). This ADR must not let that
  toolchain leak into the backend's build or typecheck.
- **`run.ts` is the composition reference.** It resolves the interpreter, starts the toolkit server
  (`server-starter.ts`), connects `KernelClient` to an arbitrary server URL, runs blocks through
  `ExecutionEngine`'s streaming callbacks, and does Python-only dependency analysis. The backend wedge
  is that same composition exposed as a service.
- **`@deepnote/mcp` is the precedent** for a new package that composes the runtime: it depends on
  `@deepnote/cli`, `@deepnote/runtime-core`, `@deepnote/reactivity`, and `@deepnote/blocks` via
  `workspace:*`, builds with `tsdown`, and is published from `packages/`.
- **CLI commands are wired in `packages/cli/src/cli.ts`** via `createXAction(...)` factories imported
  from `packages/cli/src/commands/`. A `deepnote serve` command follows that exact pattern, so the
  command body lives in `@deepnote/cli` and must depend on whatever package holds the server.
- **The whole toolchain is repo-wide by default, and there is no per-package isolation today.**
  Root `typecheck` runs `tsc --noEmit -p tsconfig.json && pnpm -r exec tsc --noEmit`. Critically,
  there is exactly **one** `tsconfig.json` (the root), it has **no `include` key** (only
  `"exclude": ["node_modules", "dist"]`), and there is **no per-package `tsconfig.json` anywhere**
  — so the first half, `tsc -p tsconfig.json`, globs **every** `.ts`/`.tsx` under the repo, and
  the second half runs `tsc` in every workspace package. `build` is `pnpm -r run build`;
  `biome.json` sets `includes: ["**"]`; the cspell glob is `**/*.{...,tsx,jsx,...}`. These are all
  **PR-gating CI jobs** (`.github/workflows/ci.yml`: `typecheck`, `build`, `test`,
  `lint-and-format`, `spell-check`, on `pull_request`). The consequence for _this_ layout: adding
  an `apps/*` glob does **not** by itself fence the SPA off from these jobs — on the fork's
  development branch they will sweep `apps/studio` unless explicitly configured otherwise (the
  root-`tsconfig` `include` that **ADR-006** specifies). The directory boundary makes the **slice**
  clean; it does **not** by itself make the **fork dev branch's repo-wide jobs** ignore the SPA.

The tension this ADR resolves: **the SPA, the server, and the `serve` command must co-develop in one
monorepo on the fork, yet the server + command must be extractable as a clean, code-only diff with
zero trace of the SPA or any browser toolchain.** Where each piece lives, and which way the
dependency arrows point, is what makes that extraction either a `git checkout -- <one dir>` or a
manual untangling exercise. This ADR is about **layout and dependency boundaries**, not about the
framework or bundler (ADR-006) and not about the transport protocol (the P0 transport ADR).

## Decision

We will introduce **two new code locations with a strict one-way dependency boundary** between them,
and we will widen the workspace glob to give the fork-only SPA a home that is excluded from the
upstream slice by directory:

1. **The server is a new published workspace package: `packages/runtime-server`
   (`@deepnote/runtime-server`).** It owns the HTTP + WebSocket API over `runtime-core`
   (open/list/run/stream/save), composing `ExecutionEngine`, `server-starter.ts`, interpreter/kernel
   resolution, integrations wiring, and reactivity exactly as `run.ts` does. It depends only on
   `@deepnote/runtime-core`, `@deepnote/blocks`, `@deepnote/reactivity` (all `workspace:*`) and a
   server-side HTTP/WS library. **It has zero frontend dependency** — no react, no vite, no DOM, no
   reference to the SPA. It is a Node service and a publishable npm package on its own, exactly like
   `@deepnote/mcp`.

2. **The `deepnote serve` / `deepnote ui` command lives in `packages/cli`** as
   `packages/cli/src/commands/serve.ts`, registered in `cli.ts` via a `createServeAction(...)` factory
   like every other command. It adds **one dependency: `@deepnote/runtime-server` (`workspace:*`)**.
   It does **not** depend on the SPA package. It **defaults to headless** (`deepnote serve` boots the
   server and serves the API; the upstream `--no-open` is the same behavior made explicit). The
   static-asset path the command can serve is **injected / explicitly provided** — a
   `--static-dir <path>` flag or an option on `createServeAction`, **defaulting to unset** — and is
   **never** hard-coded to `apps/studio/dist`. The sliced `serve` command therefore contains **zero**
   reference to `apps/studio`, not even a default path string: the SPA's built-assets directory is a
   value the _fork's_ launcher passes in, so the upstream slice has no `apps/` token at all (verified
   by the grep in Validation). It never imports SPA source, and it does not _name_ the SPA's build
   output either.

3. **The SPA is a new fork-only app at `apps/studio`** (`@deepnote/studio`, `"private": true`,
   never published). We add `'apps/*'` to `pnpm-workspace.yaml`. The SPA depends on
   `@deepnote/runtime-server` **for its API request/response/event types only** — imported from a
   **Node-import-free entry** (see §6), so the SPA's type universe never picks up the server's Node
   HTTP/WS imports — and on `@deepnote/blocks` for the block model, plus its own browser toolchain
   (the framework/bundler decided in ADR-006). Nothing in `packages/*` depends on anything in
   `apps/*`.

4. **The dependency direction is strictly one-way: `apps/studio` → `packages/runtime-server` →
   `packages/runtime-core`.** The SPA depends on the server's published API surface and shared types;
   the server **never** imports the SPA. `packages/cli` depends on `packages/runtime-server`; neither
   depends on `apps/*`. This makes the backend a closed subgraph under `packages/` that compiles,
   typechecks, tests, and builds with **no** `apps/` directory present.

5. **The two-diff mapping is therefore mechanical and path-based:**
   - **Clean contribution diff (`contrib/m3-serve`, code-only):** `packages/runtime-server/**`,
     the `packages/cli` `serve` additions (`commands/serve.ts` + its `cli.ts` wiring + the
     `@deepnote/runtime-server` dependency line), the `'packages/*'` workspace entry (already present),
     and shared API-type files **only**. It contains **no** `apps/` path. It builds clean off
     `upstream/main` because the backend's entire dependency closure is inside `packages/`.
   - **Process diff (`sprint-record/<TAG>`, everything):** the above _plus_ `apps/studio/**`, the
     `'apps/*'` glob addition, the SPA's bundler/CI config, the board, and the planning docs.

   The contrib slice is "everything under `packages/` for this milestone"; the SPA is excluded **by
   living in a sibling top-level tree (`apps/`) that the slice command simply never names.**

6. **The shared API-type home is decided now: a Node-import-free types entry, not a deferred
   problem.** With the root `tsconfig.json` `paths` mapping `@deepnote/* → packages/*/src/index.ts`,
   `apps/studio` importing `@deepnote/runtime-server` resolves the server's **source** `index.ts`,
   which transitively pulls the server's Node HTTP/WS imports into the SPA's type graph from day
   one — the exact "Node deps leak into the browser package" cost this ADR previously left to a
   future revisit. We resolve it as part of the layout: the server package exports its API
   **request/response/event types from a module with zero runtime imports**, and the SPA imports
   **only that module**. Concretely, the server factory and its Node-bound runtime live in a
   separate entry from the types, via either:
   - an **internal `api-types.ts`** (e.g. `packages/runtime-server/src/api-types.ts`) re-exported
     from `index.ts`, containing only `type`/`interface` declarations and importing **no** Node or
     HTTP/WS runtime — the SPA imports from this module path; or
   - a dedicated **`@deepnote/runtime-server/types` subpath export** (an `exports` map entry whose
     `types`/`import` resolve to the Node-free types module) that the SPA imports instead of the
     package root.

   Either way, **the shipped package is still the API contract** (the types live in
   `@deepnote/runtime-server`, not a separate package), **and** the SPA's type universe stays free
   of the server's Node deps — without a speculative `@deepnote/runtime-server-types` package. The
   server's _factory_ entry (which legitimately imports the HTTP/WS stack) is what `packages/cli`
   consumes; the SPA never touches it. This is the home; the `-types`-package escape hatch in
   "Revisit" only applies if the API surface later needs consumption by clients that cannot even
   resolve the server package at all.

## Rationale

The decision optimizes for the one property that the whole milestone's upstream value hinges on:
**the backend must be extractable as a clean diff with a directory-level cut, not a per-file
untangling.** Every sub-decision falls out of making that cut trivial and keeping it trivial as the
SPA grows.

### Key Factors

1. **A directory boundary is the only slice mechanism the fork model actually has.** The contrib diff
   is produced by `git checkout sprint/<tag> -- <code paths>` onto a branch off `upstream/main`. That
   command selects **paths**. If the server and SPA share a directory tree, "code only, no SPA"
   becomes a per-file judgement call that is re-litigated on every slice and will eventually leak a
   SPA file or a vite config into an upstream PR. Putting the SPA under a separate top-level `apps/`
   tree reduces the exclusion to "don't name `apps/`" — a boundary that is obvious, greppable, and
   hard to get wrong. This is the single most important property and it drives the rest.

2. **A dedicated server package keeps the backend's dependency closure inside `packages/`, so the
   _slice_ compiles and builds with no `apps/` present — but be precise about which guarantee that
   is.** Because root `typecheck` runs `tsc` across every workspace package and the build is `pnpm
-r run build`, the backend must not have a compile-time edge into the SPA. A self-contained
   `@deepnote/runtime-server` whose only workspace deps are `runtime-core`/`blocks`/`reactivity`
   guarantees the **upstream checkout** (the `contrib/*` branch, which **literally has no `apps/`
   directory**) typechecks and builds on its own, and nothing under `packages/` references `apps/`.
   `@deepnote/mcp` already proves a runtime-composing package can live and publish this way.
   **What this does _not_ claim:** on the **fork development branch**, where `apps/studio` _is_
   present, `pnpm -r run build` and `pnpm -r exec tsc --noEmit` **gain an `apps/studio` workspace
   entry**, and the root `tsc -p tsconfig.json` globs `apps/studio/**/*.tsx` — so the SPA is built,
   typechecked, and linted by the **same repo-wide jobs the backend uses there**, and a broken SPA
   reds that shared gate. That co-gating is acceptable (it catches SPA breakage early) and is kept
   green for the _backend's_ typecheck only by ADR-006's root-`tsconfig` `include`. The clean
   guarantee is the **slice** (no `apps/` at all); the fork dev branch **monorepo CI couples them**.

3. **The one-way dependency arrow is what makes "backend has zero frontend dependency"
   _enforceable_ — but the enforcement is a convention until a check lands.** If the SPA depends on
   the server's (Node-free) types and the server never imports the SPA, then by construction the
   server's transitive dependency set contains no browser code. That property is **checkable**: a
   `madge`/`dependency-cruiser` rule (or a lint constraint) _can_ assert "nothing in
   `packages/runtime-server` imports from `apps/` or from a frontend framework" as a hard CI gate.
   The honest framing: the layout makes the invariant **trivially true today and mechanically
   assertable**, but it only becomes an **enforced** invariant once a design-doc/card actually
   lands that boundary check — **until then it is a strong convention plus review discipline**, not
   a gate. The PRD's risk register names "toolchain leaks into the cleanly-sliceable backend"
   explicitly; the structural one-way edge is the mitigation that survives a growing codebase
   _where a "just be careful" convention would not_ — but only after the check is wired (see
   Implementation Notes / M1).

4. **`serve` belongs in `@deepnote/cli` because that is where #162 puts it and where the command
   registry already is.** `deepnote serve` is a sibling of `deepnote run` — same CLI, same
   `createXAction` factory pattern, same `commander` registration in `cli.ts`. Pulling the server body
   _out_ of `cli` into its own package (rather than implementing the HTTP/WS server inside
   `commands/serve.ts`) keeps the command thin (boot + port + open) and keeps the reusable, testable,
   _publishable_ service independent of the CLI's argument-parsing concerns — so the same server can
   later back the MCP server, an extension host, or a remote-kernel front (the `m2/s4`
   future-consideration) without dragging the CLI along.

5. **`apps/` is the conventional second tier and signals intent.** A `packages/` + `apps/` split is a
   near-universal monorepo convention (Turborepo, Nx, pnpm examples) that reads as "publishable
   libraries" vs. "private deployable applications." Using it tells every future reader — and every
   maintainer who sees the process diff — exactly which tree is the shareable library surface and which
   is the fork-only application, without needing a comment to explain it. It also gives the SPA's
   browser toolchain a natural place to be scoped (its own `apps/studio/vite.config.ts`,
   `tsconfig`, lint overrides) without touching the `packages/` configs the backend shares.

We are explicitly **not** extending `packages/cli` or `packages/runtime-core` to host the HTTP/WS
server (Alternatives 1 and 2 below), because doing so couples the shareable service to either the
CLI's terminal concerns or the core engine's published API surface, and weakens the very boundary the
milestone depends on. We are **not** placing the SPA under `packages/` (Alternative 3) because that
puts it inside the same glob and the same slice-by-path tree as the backend, reintroducing the
per-file untangling the whole layout exists to avoid.

## Consequences

### Positive

- **The contrib slice is a directory cut.** Producing the clean, code-only upstream diff is "take
  `packages/runtime-server` + the `cli` serve delta"; excluding the SPA is "don't take `apps/`." No
  per-file curation, repeatable every milestone (P7), and hard to leak.
- **The backend builds and typechecks with no frontend present.** The upstream branch off
  `upstream/main` has no `apps/` directory and no browser bundler; `tsc`/`tsdown`/vitest all pass on
  the backend in isolation — which is exactly the state an upstream maintainer's checkout is in.
- **"Zero frontend dependency in the backend" is a checkable invariant.** The one-way arrow lets a
  dependency-graph rule fail CI if anything under `packages/` ever imports from `apps/` or a frontend
  framework, converting the PRD risk into an enforced boundary.
- **The server is reusable beyond the CLI.** `@deepnote/runtime-server` as its own package can later
  back the MCP server, an extension webview host, or the remote-kernel front (`m2/s4`) — the PRD's
  "design the transport so it _could_ front a remote kernel" future-consideration — without a CLI
  dependency.
- **`serve` stays idiomatic.** It is one more `commands/*.ts` + `cli.ts` registration, indistinguishable
  in shape from `run`, `open`, `dag` — low cognitive cost for maintainers reviewing the wedge.

### Negative

- **A new top-level glob (`apps/*`) is a structural change to a repo that has only ever had
  `packages/*`, and it widens the repo-wide `pnpm -r` jobs on the fork dev branch.** It touches
  `pnpm-workspace.yaml`, and any tooling that assumes a single tier (path globs in CI, `tsconfig`
  references) may need a second entry. Concretely: once `'apps/*'` is added, on the **fork
  development branch** `pnpm -r run build` and `pnpm -r exec tsc --noEmit` **gain an `apps/studio`
  workspace entry** (so they build and typecheck the SPA), and `tsc -p tsconfig.json` globs
  `apps/studio/**/*.tsx` — i.e. the monorepo CI now exercises the SPA alongside the backend. This is
  the **slice-vs-monorepo** distinction in one line: the **`contrib/*` slice never contains `apps/`**,
  so `pnpm -r` there sees only backend packages and is unaffected; the **fork dev branch** has
  `apps/studio` in the tree, so `pnpm -r` (and the root `tsc`) pick it up — kept green for the
  backend's typecheck by ADR-006's root-`tsconfig` `include`. _Acceptable_ because the
  `apps/`/`packages/` split is a standard convention and the alternative (SPA under `packages/`)
  trades this one-time structural cost for a recurring per-slice tax; the `'apps/*'` glob line itself
  rides only in the process diff, never upstream.
- **Two packages where a monolithic `cli` command could have been one.** Splitting the server out of
  `commands/serve.ts` into `@deepnote/runtime-server` adds a package boundary, a `package.json`, and a
  build target. _Acceptable_ because the boundary is the point — it is what keeps the service
  publishable, reusable, and free of CLI coupling, and `@deepnote/mcp` shows the cost of one more
  runtime-composing package is well-trodden.
- **The shared API-type surface has a decided home, with a real constraint attached (§6).** The SPA
  consumes the server's types, and under the root `paths` map `@deepnote/runtime-server` resolves to
  the server's _source_ `index.ts` — so a naive "import the package root" would drag the server's Node
  HTTP/WS imports into the SPA's type graph. The decision (Decision §6) is therefore **not** "default
  to importing the package root" but specifically: export the API request/response/event types from a
  **Node-import-free module** (an internal `api-types.ts` re-exported from `index.ts`, or a
  `@deepnote/runtime-server/types` subpath export), keep the server _factory_ in a separate entry, and
  have the SPA import **only the types module**. _Acceptable_ and even desirable — the upstream-shipped
  package is still the API contract (no separate "shared" package to keep in sync), **and** the SPA's
  type universe stays free of Node deps. The cost is discipline: the server must keep its types module
  genuinely runtime-import-free (a `madge`/lint check on that module can enforce it). The thin
  `@deepnote/runtime-server-types` _package_ remains only a last-resort escape hatch (Revisit), not the
  day-one design.

### Neutral

- **`deepnote serve` may serve pre-built SPA assets at runtime — via an injected path, never a
  hard-coded `apps/studio/dist`.** The command **defaults to headless**; when the fork's launcher
  passes `--static-dir <path>` (or the equivalent `createServeAction` option), the command serves a
  static bundle from that path. This is a _runtime, path-handed_ relationship (the command is **told**
  where built assets are), **not** a source/compile dependency, and crucially **not even a default
  string** pointing at `apps/studio/dist` — so the sliced command carries **no `apps/` token at all**
  (Decision §2). It does not create a code edge from `packages/` into `apps/`. How/whether built
  assets are bundled for distribution is a P6 packaging detail, deliberately out of this ADR.
- **The SPA's framework/bundler choice (ADR-006) plugs into `apps/studio` without affecting this
  layout.** This ADR is framework-agnostic: whatever ADR-006 picks, it is scoped to `apps/studio` and
  the `packages/`-resident backend is unaffected. The two ADRs are coupled only at the seam that
  `apps/studio` is where ADR-006's toolchain lives. **Naming reconciliation:** ADR-006 originally
  proposed `apps/web` / `@deepnote/web`; it was reconciled in the adversarial-review pass to this
  ADR's canonical **`apps/studio` / `@deepnote/studio`**, and ADR-006 §3 now imports the SPA's API
  types from the Node-free entry decided in §6 here. The pair is consistent: one name, one isolation
  mechanism (ADR-006's root-`tsconfig` `include` + own `apps/studio` tsconfig), one types-home.

## Alternatives Considered

### Alternative 1: Put the HTTP/WS server inside `packages/cli` (no new server package)

**Description**: Implement the server directly under `packages/cli/src/` (e.g. `cli/src/server/` plus
`commands/serve.ts`), reusing `run.ts`'s composition in place. No `@deepnote/runtime-server` package.

**Pros**:

- Fewer packages; the server lives next to the `run.ts` code it most resembles.
- `serve` and the server it boots are in one place — no cross-package wiring.

**Cons**:

- The shareable service is now welded to the CLI's concerns (commander, chalk, terminal output config,
  exit codes). Anyone wanting the server without the CLI — the MCP server, an extension host, a remote
  front — pulls in the entire `@deepnote/cli` surface.
- The contrib slice gets murkier: `packages/cli` also contains `open` (which uploads to Cloud),
  terminal rendering, and unrelated commands. Slicing "just the serve server" out of a shared package
  is a per-file cut _inside_ a package, the exact untangling the layout is meant to eliminate.
- The PRD and roadmap describe the wedge as "a new server package" (PRD Scope: "An HTTP + WebSocket
  server package"); folding it into `cli` contradicts the stated unit of contribution.

**Why not chosen**: It couples the upstream wedge to the CLI and makes the slice a within-package
untangling rather than a directory cut — directly weakening the boundary the milestone depends on. The
small savings in package count is not worth surrendering the wedge's independence and reusability.

### Alternative 2: Add the HTTP/WS server to `packages/runtime-core`

**Description**: Extend `@deepnote/runtime-core` itself to expose an HTTP/WS server, so "the runtime
over HTTP" is literally part of the runtime package. `serve` would just call into `runtime-core`.

**Pros**:

- "Runtime over HTTP" conceptually belongs to the runtime; no new package at all.
- The composition (`ExecutionEngine` + `server-starter`) is already there — the server is a thin shell
  over code that lives in this package.

**Cons**:

- `runtime-core` is a foundational, widely-depended-on, published library (consumed by `cli`, `mcp`,
  and the external VS Code extension). Bolting a web server (HTTP framework, WS, an HTTP API contract)
  onto it forces every consumer — including ones that only want headless execution — to take on the
  server's dependencies and API-stability obligations.
- It conflates two stability surfaces: the engine's programmatic API and the wedge's HTTP API. The
  HTTP/WS contract would evolve on `runtime-core`'s release cadence and versioning, entangling two
  things that should version independently.
- It makes the wedge _harder_ to reason about as a discrete contribution: "we added a server to the
  core runtime" is a bigger, more invasive upstream ask than "we added a new server package that
  composes the runtime," even though the second is the more conservative change.

**Why not chosen**: It overloads a foundational library with an application-layer concern and an HTTP
API surface, imposing the server's weight on every `runtime-core` consumer and coupling two
independent versioning surfaces. A composing package (`@deepnote/runtime-server`) gets the same code
reuse without contaminating the core.

### Alternative 3: Keep the SPA under `packages/` (e.g. `packages/studio`)

**Description**: Place the SPA as `packages/studio` (private, unpublished) rather than introducing an
`apps/` tier. No `pnpm-workspace.yaml` glob change.

**Pros**:

- No structural change — `packages/*` already matches it; zero new glob.
- One tier to reason about; matches the repo's current single-tier shape.

**Cons**:

- The SPA now lives in the **same directory tree** the backend slices out of. The contrib cut "take
  `packages/runtime-server` + cli serve delta" still works, but the _conceptual_ boundary between
  shareable-library and fork-only-app is no longer visible in the layout — both are just `packages/*`.
  The exclusion ("don't take `packages/studio`") becomes a name to remember rather than a tree to
  ignore, and a future package added near it can blur the line.
- It puts a browser-bundler-bearing, `private` app in the same tier as publishable libraries, so the
  "everything in `packages/` is a publishable `@deepnote/*` library" invariant no longer holds —
  tooling and readers lose a useful signal.
- It forfeits the standard convention (`apps/` = deployable apps, `packages/` = libraries) that
  communicates the fork/upstream boundary for free.

**Why not chosen**: It saves one `pnpm-workspace.yaml` line at the cost of erasing the layout-level
signal that separates the upstream library surface from the fork-only app. Given the entire milestone
is organized around that separation, encoding it in the directory structure is worth the one-time glob
addition.

### Alternative 4: A separate repository for the SPA

**Description**: Develop the SPA in its own repo entirely, consuming `@deepnote/runtime-server` as a
published (or linked) dependency. The `deepnote/deepnote` fork would then contain only the backend.

**Pros**:

- Maximal separation: the upstream-targeted repo never contains a line of SPA code, so the slice is
  the whole repo.
- The SPA could evolve on its own cadence, tooling, and CI.

**Cons**:

- It breaks the milestone's core working model. `.claude/CLAUDE.md` is explicit that the whole
  lifecycle co-evolves **in one integrated monolith on the fork** (board + docs + SPA + backend on
  `sprint/<TAG>`), then slices _out_ a clean diff. A second repo means the SPA and the API it consumes
  can drift, with no single branch where the end-to-end loop is developed and tested together.
- It front-loads cross-repo release/version coordination (`runtime-server` must be published or linked
  before the SPA can build) for a fork-only showcase that has no external consumers — pure overhead.
- The process diff (the showcase of _how_ the change was reasoned, including the SPA) would no longer
  be one coherent branch.

**Why not chosen**: It optimizes for a separation the in-repo `apps/`/`packages/` split already
achieves, while sacrificing the integrated-monolith development model the fork strategy is built on. A
second repo is the right move only if the SPA ever needs an independent release life — which the PRD
explicitly says it does not (fork-only showcase, NG2).

## Implementation Notes

- **New package skeleton** mirrors `@deepnote/mcp`: `packages/runtime-server/` with `package.json`
  (`@deepnote/runtime-server`, `tsdown` build, `vitest` test, `workspace:*` deps on
  `runtime-core`/`blocks`/`reactivity`, plus a server-side HTTP/WS lib) and a `tsconfig` consistent
  with the other packages. It is `"private": false`/publishable like the other `@deepnote/*` libs (the
  upstream wedge is meant to be installable). **Split the entries per Decision §6:** put the API
  request/response/event **types** in a **Node-import-free module** (`src/api-types.ts`, only
  `type`/`interface`, no Node/HTTP/WS runtime import), and the **server factory** (which imports the
  HTTP/WS stack) in a separate module (`src/server.ts`). `src/index.ts` re-exports both for Node
  consumers like `@deepnote/cli`; expose the types either by having the SPA import `api-types.ts`
  directly or via a `@deepnote/runtime-server/types` subpath in the `exports` map — so the SPA's type
  graph never touches the Node factory. A `madge`/lint check on `api-types.ts` (no runtime imports) is
  the cheap way to keep the module honest.
- **CLI wiring**: add `packages/cli/src/commands/serve.ts` exporting `createServeAction(...)`, register
  it in `packages/cli/src/cli.ts` next to `createRunAction`, and add `@deepnote/runtime-server:
workspace:*` to `packages/cli/package.json`. Keep the command thin: resolve interpreter, pick a free
  port (`findConsecutiveAvailablePorts` already exists), boot the server. **Default headless;** the
  static-asset directory is **injected** — a `--static-dir <path>` flag / `createServeAction` option
  that **defaults to unset and is never hard-coded to `apps/studio/dist`** (Decision §2). The
  browser-opening `--open`/`ui` alias is the fork's launcher passing in that path; the sliced command
  carries no `apps/` token (not even a default string). Final `serve`/`ui` naming is the PRD's P6 open
  question; the layout is unaffected either way.
- **SPA**: `apps/studio/` (`@deepnote/studio`, `"private": true`), and add `'apps/*'` to
  `pnpm-workspace.yaml`. Its only workspace deps are `@deepnote/runtime-server` (the **Node-free types
  entry** only) and `@deepnote/blocks` (the block model); its browser toolchain is whatever ADR-006
  selects, scoped entirely within `apps/studio/`. **Pairs with ADR-006:** the root `tsconfig.json`
  gains an explicit `"include"` (excluding `apps/`) and `apps/studio` gets its own `jsx:"react-jsx"`
  tsconfig, so the repo-wide `tsc -p tsconfig.json` does not fail on the SPA's JSX once this glob is
  added — that toolchain-isolation config is ADR-006's, and it must land **with** the `'apps/*'` glob.
- **Boundary enforcement (recommended; a convention until it lands).** The one-way arrow is
  **trivially true and assertable today**, but it is only an **enforced** invariant once a dependency-
  graph check exists: add a `madge`/`dependency-cruiser` rule (or lint constraint) asserting that
  nothing under `packages/` imports from `apps/` or from a frontend framework, **and** that
  `api-types.ts` has no runtime import. Until that check is wired by a design-doc/card, the boundary
  rests on review discipline (M1) — this ADR _decides the layout_; it does not by itself install the
  gate. Detailed wiring is design-doc/card scope.
- **Slice paths for the contrib diff (P7)**: `packages/runtime-server/**`, the `serve` additions in
  `packages/cli/**`, and any shared type files — explicitly **never** `apps/**`. The exact `git
checkout -- <paths>` recipe is captured per the `.claude/CLAUDE.md` day-to-day flow.
- **Out of scope here**: the transport protocol (proxy vs. direct vs. WASM — P0 transport ADR), the
  framework/bundler (ADR-006), and how built SPA assets are packaged/served for distribution (P6).

## Validation

We will know this layout was the right call if:

- **(1) Slice integrity — the P7 contrib slice is a clean directory cut.** `git checkout
sprint/<tag> -- packages/runtime-server <cli serve paths>` onto a branch off `upstream/main`
  produces a branch that **(a)** contains no `apps/` path, **(b)** `pnpm install --frozen-lockfile &&
pnpm build && pnpm typecheck && pnpm test` all pass with **no `apps/` directory present** (true by
  construction — the slice branch has no `apps/` tree at all), and **(c)** the no-frontend grep is
  clean across the **whole serve delta, not just the server package**:
  `git grep -iE 'react|vite|apps/' -- packages/runtime-server packages/cli/src/commands/serve.ts
packages/cli/src/cli.ts packages/cli/package.json` returns nothing (in particular, `serve.ts` has no
  default `apps/studio/dist` string — Decision §2). If any of these fail, the boundary leaked and the
  layout needs revisiting.
- **(2) Monorepo invariant — on the fork dev branch _with_ `apps/studio` present, the backend's
  typecheck/build is not red by a broken SPA for the wrong reason.** Be honest about what protects it:
  the dependency edge is **one-way** (nothing under `packages/` imports `apps/`), so a broken SPA
  cannot break the backend's _compilation closure_; **but** the repo-wide jobs (`tsc -p
tsconfig.json`, `pnpm -r run build`, biome, cspell) **do** sweep `apps/studio` on the fork dev
  branch, so they would red on the SPA's JSX/errors **unless the root-`tsconfig` `include` from
  ADR-006 (Cross-ADR) is in place** for the typecheck job. This validation therefore has a **stated
  dependency on ADR-006's root-`include` change**: with it, `tsc -p tsconfig.json --listFiles` names
  zero `apps/` files and the backend typecheck stays green while `apps/studio` exists in the tree;
  the SPA's own typecheck and the build/lint/spell jobs still co-gate the SPA there, by design.
- **The dependency graph stays one-way (once the check is wired).** A `madge`/`depcruise` run shows no
  edge from `packages/` into `apps/`, no frontend-framework import in `packages/runtime-server`, and no
  runtime import in `api-types.ts`, at every milestone checkpoint (P1–P7). Until that check lands
  (M1), this is asserted by review; the first violation after it lands is the signal to revisit.
- **The server is consumed without the CLI.** By the time `m2/s4` (remote compute) or any second host
  is considered, `@deepnote/runtime-server` can be imported with no `@deepnote/cli` dependency. If it
  cannot, the CLI coupling crept back and Alternative 1's failure mode materialized.
- **The upstream offer lands as "a new server package + a serve command,"** matching the PRD success
  criterion "the backend + serve command are sliced as a clean contrib diff off `upstream/main` and
  linked on #162." A reviewer reading only the contrib diff sees a self-contained service package and a
  CLI command — no SPA, no bundler.

Revisit if: the Node-free types entry (§6) proves impossible to keep runtime-import-free — e.g. the
API surface ends up needing shared runtime helpers, not just `type`/`interface` declarations — or a
client appears that cannot resolve the `@deepnote/runtime-server` package at all (→ _then_ extract a
thin `@deepnote/runtime-server-types` package, the escape hatch §6 deliberately does not build
speculatively); or a second deployable app appears under `apps/` and the two need shared app-level
config (→ revisit the `apps/` conventions, not this boundary); or maintainers ask for the server
_inside_ `runtime-core` upstream (→ re-open Alternative 2 with their guidance).

## Related Decisions

- **PRD-003** (`docs/prds/PRD-003-local-deepnote-ui.md`) — the master PRD; the boundary table in
  "Background & Context" and the "Scope & Boundaries" section are the source of this layout decision.
  Phases P0 (this ADR), P1 (server core), P6 (CLI), P7 (decompose) and roadmap stories `m3/s1`
  (serve-api, cli-serve) and `m3/s2` (spa-foundation) are what this layout serves.
- **ADR-006** — UI framework + bundler introduction (React + Vite). Coupled to this ADR at three
  seams: (1) the toolchain lives in **`apps/studio`** — ADR-006 was reconciled in the adversarial-
  review pass from its original `apps/web`/`@deepnote/web` to this ADR's canonical
  `apps/studio`/`@deepnote/studio`; (2) ADR-006 owns the **toolchain-isolation mechanism** (the root
  `tsconfig.json` `"include"` excluding `apps/`, and `apps/studio`'s own `jsx:"react-jsx"` tsconfig)
  that keeps the repo-wide `tsc -p tsconfig.json` from failing on the SPA's JSX once this ADR's
  `apps/*` glob is added; (3) ADR-006 §3 imports the SPA's API types from the **Node-free entry**
  decided in §6 here. This ADR is framework-agnostic about _what_ plugs into the SPA tier; the pair is
  mutually consistent on name, isolation mechanism, and types-home.
- **P0 transport ADR** (forthcoming) — server architecture & browser↔kernel transport (proxy vs.
  direct vs. WASM). Orthogonal to layout: whatever the transport, the server lives in
  `packages/runtime-server`.
- **ADR-001** (`docs/adr/ADR-001-shared-python-interpreter-resolution.md`) — interpreter resolution the
  `serve` command and server reuse, and the precedent for `@deepnote/runtime-core` being consumed by
  multiple in-repo callers.

## References

- Upstream epic [deepnote/deepnote #162 — "Make Deepnote a first-class notebook runtime"](https://github.com/deepnote/deepnote/issues/162)
  — the repo partition (interactive UI → `deepnote/vscode-deepnote`; CLI/runtime → `deepnote/deepnote`)
  that forces the backend/SPA split this layout encodes.
- `.claude/CLAUDE.md` — the fork two-diff contribution strategy (clean `contrib/<slug>` code-only diff
  vs. full `sprint-record/<TAG>` process diff) and the path-based slice mechanism this layout is
  designed to make trivial.
- `packages/mcp/package.json` — the in-repo precedent for a new `@deepnote/*` package that composes the
  runtime via `workspace:*` and publishes from `packages/`.
- `packages/cli/src/cli.ts`, `packages/cli/src/commands/run.ts` — the `createXAction` command-registry
  pattern `serve` follows, and the composition reference the server reuses.
- pnpm workspaces / Turborepo / Nx `apps/` + `packages/` convention — the standard library-vs-app tier
  split this ADR adopts.

---

## Revision History

| Date       | Status   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-06-11 | Proposed | Initial proposal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-06-12 | Proposed | Adversarial-review pass (paired with ADR-006). **Cross-ADR 1:** kept canonical `apps/studio`/`@deepnote/studio`; noted ADR-006 was reconciled from `apps/web` to match. **Cross-ADR 2 / B2:** documented that the toolchain is repo-wide by default (single include-less root `tsconfig.json`, `pnpm -r`, biome `**`, cspell `**/*.tsx`), so the `apps/*` glob makes the **slice** clean but the **fork dev branch** monorepo CI co-gates SPA+backend; split Validation into (1) slice integrity and (2) monorepo invariant (the latter depending on ADR-006's root-`include`); extended the no-frontend grep to the `cli` serve delta. **Cross-ADR 3 / B3:** added Decision §6 — the API-type home is a **Node-import-free types entry** (`api-types.ts` / `runtime-server/types` subpath), not a deferred default; updated Consequences + Revisit. **S1:** `serve` defaults headless; static-asset path is **injected**, never hard-coded to `apps/studio/dist`. **S2:** tied the `apps/*` glob's `pnpm -r` effect to the slice-vs-monorepo distinction. **M1:** the madge/dependency-cruiser boundary check makes the one-way invariant _enforced_ only once a design-doc/card lands it; until then it is convention. |
