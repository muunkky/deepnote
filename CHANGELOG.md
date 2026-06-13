# Changelog

All notable user-visible changes to the Deepnote local toolchain are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

The m3/s1 upstream wedge: a headless runtime server over `runtime-core` plus a
one-command launch. Additive only — no existing command or exported signature changes.

### Added

#### `@deepnote/runtime-server` — headless HTTP + WebSocket server

A new package that fronts a single `ExecutionEngine` and exposes a local
`.deepnote` project over a stable, documented API — no UI required. It reuses
`runtime-core`'s already-headless execution, interpreter/kernel resolution, and
integrations wiring exactly as `deepnote run` composes them.

- `GET /api/project` — open a project and return its notebooks/blocks tree as a
  fully-populated `ApiProject` payload, **kernel-free**: opening and listing never
  starts a kernel or constructs an `ExecutionEngine`.
- Run-over-WebSocket — enqueue a run and stream `run-start` /
  `block-start` / `output` / `block-done` / `run-failed` events in order over a
  WebSocket, with a run-serialization queue so concurrent run requests execute one
  at a time. Failure-category discriminants (`missing-kernel` / `kernel-launch` /
  `kernel-died` / in-block) are preserved on the wire, matching `deepnote run`.
- Save API — semantic round-trip save: open → save → re-deserialize yields a
  project deep-equal to the saved one, and a second no-op save is idempotent
  (produces an empty git diff). Byte-equality is explicitly not the bar.
- `createServer(...)` host with configurable run-queue depth and WebSocket
  back-pressure (high-water mark).

#### `deepnote serve` / `deepnote ui` CLI commands

- `deepnote serve <project>.deepnote` — boot the runtime-server over a local
  project. Selects a free port (falls back to the next available port when the
  requested one is in use and reports the chosen URL), with `--open` / `--no-open`
  to control browser launch.
- `deepnote ui` — a thin alias of `serve` that defaults to opening the browser.
- SQL / integration environment parity with `deepnote run`: `serve` resolves the
  same integrations-file (`.deepnote.env.yaml`) and built-in integrations, so a
  served project runs SQL and integration blocks identically to `run`.

### Changed

- `@deepnote/cli`: registered the `serve` and `ui` commands and added a
  dependency on `@deepnote/runtime-server`.
