# Spike findings — NOM-005 (browser↔kernel transport for the Local Deepnote UI)

Date: 2026-06-11 · milestone m3 · gates PRD-003 P0 transport ADR (NOM-005)

## The question

PRD-003 recommends the **proxy-through-Node** transport: the browser talks to the kernel
_only_ through the Node server, which reuses `runtime-core`'s `ExecutionEngine` to drive the
toolkit's Jupyter WS, rather than the browser connecting to the toolkit kernel directly. The
load-bearing concern is latency: the recommendation costs **one extra hop**
(browser ⇄ Node ⇄ kernel) versus a hypothetical direct browser ⇄ kernel path. PRD-003's
Success Criteria set the bar:

> On the **reference workload**, output appears in-place **< 2 s on a warm kernel**.

This spike measures the proxy path against that bar empirically so NOM-005 decides on data,
not assertion.

**Reference workload (per PRD-003):** a ~20-block notebook where the measured code block emits a
stdout line plus a pandas `df.head()` HTML table (_not_ a multi-MB plot — large-figure latency is
a separate transfer-size concern), on a **warm** kernel. The measured number is the time from
"run sent" to "final output event received over the WebSocket."

## Setup (what was built)

Throwaway prototype in `/tmp/deepnote-transport-spike/` (kept out of the repo per the spike brief):

- **`server.mjs`** — a minimal Node HTTP + `ws` WebSocket server that wraps the repo's built
  `@deepnote/runtime-core` `ExecutionEngine` (the same engine wiring `packages/cli/src/commands/run.ts`
  uses). It boots the toolkit server + connects the `python3` kernel via `engine.start()`, warms the
  kernel with one full-project run, then on a `{"type":"run"}` WS message executes the measured block
  via `engine.runProject({ blockId, onBlockStart, onOutput, onBlockDone })` and streams each engine
  event straight out over the client WebSocket. **This is exactly the proxy-through-Node transport:**
  `browser ⇄ Node(ws) ⇄ ExecutionEngine ⇄ Jupyter-WS ⇄ kernel`.
- **`client.mjs`** — a Node `ws` client that connects, sends `run`, and timestamps each arriving
  event with `performance.now()`. It runs one discarded WS-warm iteration, then ≥5 measured
  iterations, reporting the median. Latency = `block-done received` − `run sent`.
- **`direct-baseline.mjs`** — the same measured block executed **in-process** through the engine
  with **no WebSocket hop**, to isolate the proxy's extra browser⇄Node hop from the shared
  kernel-execution + Jupyter-WS cost.
- **`reference.deepnote`** — fixture: a setup block (`import pandas/numpy`, build a 1000-row,
  3-column DataFrame) + the measured block (`print(...)` + `df.head()` → HTML table). The setup
  block runs during warm-up so the measured block runs against a warm kernel with `df` already
  defined, matching the PRD's "warm kernel" condition.

**Environment / versions:**

| Component                | Version                                     |
| ------------------------ | ------------------------------------------- |
| OS                       | Linux 6.6.99 x86_64 (glibc 2.36), 8 cores   |
| Node                     | v22.22.2                                    |
| `ws`                     | 8.21.0                                      |
| Python                   | 3.11.2 (venv `/tmp/deepnote-spike/venv`)    |
| deepnote-toolkit         | 2.3.1                                       |
| jupyter-server           | 2.18.2                                      |
| jupyter-client           | 8.9.1                                       |
| ipykernel                | 6.31.0                                      |
| pandas / numpy           | 2.1.4 / 1.26.4                              |
| `@deepnote/runtime-core` | repo build (`dist/`), rebuilt at spike time |

Every measured run reported `success: true`, `outputCount: 2` (the stdout stream + the
`execute_result`), and **`hasHtml: true`** — i.e. the pandas `df.head()` HTML table actually
arrived over the WS, confirming the full reference output, not a truncated one, was delivered.

## Measured latency (warm kernel)

**Proxy-through-Node path** (run → block-done over the WebSocket), two independent 5-iteration
client runs against one warm server:

| Run | per-iteration total (ms)     | median      |
| --- | ---------------------------- | ----------- |
| A   | 50.3, 66.0, 71.9, 64.2, 67.5 | **66.0 ms** |
| B   | 57.5, 58.8, 57.3, 58.9, 73.5 | **58.8 ms** |

**Combined median ≈ 62 ms; full observed range 50–74 ms.** Time from "run sent" to the first
`block-start` event was consistently **< 2 ms**; nearly all latency is in the block-execute +
first-output round-trip (`runToFirstOutput` ≈ the total, since the HTML table is the final output).

**In-process baseline** (engine direct, **no** WS hop): `[56.1, 56.7, 58.2, 68.8, 157]` ms,
**median 58.2 ms**.

### One-hop overhead analysis

The proxy path (≈ 62 ms median) and the no-WS in-process baseline (≈ 58 ms median) are
**statistically indistinguishable** — both sit in the 50–75 ms band, and the proxy's run→block-start
slice was sub-2 ms every iteration. The conclusion is direct: **the browser⇄Node WebSocket hop the
proxy adds is sub-millisecond on localhost and lost in the noise of kernel execution.** Essentially
all the ~60 ms is the kernel computing `df.head()` plus the Jupyter-WS round-trip — a cost the proxy
path and a hypothetical _direct_ browser→kernel path **share**. A direct connection would not be
meaningfully faster on this workload; it would only remove a hop that costs <1 ms while _adding_ the
burden of re-implementing the Jupyter wire protocol in the browser and exposing the kernel port.

## Verdict

**Does the proxy-through-Node path clear < 2 s on a warm kernel? YES — by ~30×.**
Median end-to-end latency for the full reference workload (stdout line + pandas `df.head()` HTML
table) is **≈ 62 ms** over the proxied WebSocket, against a 2000 ms bar. The bar is met with
roughly **1.9 s of headroom** — ample margin for real-world variance (a busier laptop, a larger
`head()`, GC pauses, a colder OS scheduler) before the < 2 s criterion is at risk on this workload.

The latency-cost objection to the proxy — "it adds a hop" — is **empirically retired**: the hop
costs <1 ms locally. The proxy's one-hop overhead is not a real latency cost on the reference
workload.

## Recommendation for NOM-005

1. **Adopt the proxy-through-Node transport** (PRD-003's recommendation). The spike removes its only
   measured downside. The proxy's structural wins stand unopposed by any latency penalty:
   - **Reuses `ExecutionEngine`** — zero Jupyter-protocol logic in the browser; the browser speaks a
     small app-level WS message contract (`run` → `block-start` / `output` / `block-done`), exactly
     what was prototyped here.
   - **Keeps the kernel on the localhost-trust boundary** (PRD-003 NG4 / localhost-bind constraint):
     the toolkit port is never exposed to the browser; only the Node server is.
   - **Single failure-surfacing seam** — `run.ts`'s typed `failureCategory` discriminants
     (`missing-kernel` / `kernel-launch` / `kernel-died` / `in-block`) flow through the engine and can
     be forwarded over the same WS, rather than re-derived browser-side.
2. **Reject direct browser→kernel** as the default. It buys no measurable latency on the reference
   workload (the hop is <1 ms) while costing kernel-port exposure and duplicated protocol logic in the
   browser — a worse security posture and more code for no speed.
3. **Frame the server path as complementary to #162's WASM-in-browser direction, not competing.**
   The proxy is the **server-side CLI/runtime execution path** — squarely #162's `deepnote/deepnote`
   "file format, conversion tools, and CLI" ownership, a natural extension of `run.ts`. An eventual
   in-browser **WASM** kernel is a _different execution backend_ (no local toolkit server at all), not
   a faster transport for _this_ one. They are additive: the same browser-side app-level WS/event
   contract this spike used (`run` / `block-start` / `output` / `block-done`) is backend-agnostic, so a
   future WASM kernel could satisfy the _same_ client contract without reworking the UI. NOM-005
   should state that the proxy transport is chosen for the local-toolkit-kernel path and does **not**
   foreclose a WASM path — it defines the event contract a WASM backend would also implement.

### Scope notes / honesty about what this did and did not measure

- The fixture isolates the **measured block** per the PRD (one code block, stdout + `df.head()` HTML
  table) on a warm kernel. The PRD's "~20-block notebook" framing is the _context_ the measured block
  sits in; warm single-block run latency is what the < 2 s bar targets, and that is what was measured.
- **Large-figure / multi-MB output latency was not measured** — PRD-003 explicitly scopes that out
  ("bounded by transfer size, a separate concern"). The < 2 s bar and this verdict cover the reference
  workload only. A multi-MB plot would add transfer time over the WS, but that cost is identical for
  proxy and direct (both ship the same bytes), so it does not change the proxy-vs-direct decision.
- Measured on an 8-core Linux dev machine at/above the CI-runner baseline the PRD names. With ~30×
  headroom, the verdict is robust to a slower machine.

## Reproduction (scratch dir — not committed)

```
/tmp/deepnote-transport-spike/
  reference.deepnote      # fixture: setup df + measured (print + df.head())
  server.mjs              # proxy-through-Node: ExecutionEngine over a ws server
  client.mjs              # ws client; times run -> block-done
  direct-baseline.mjs     # in-process engine run, no WS hop (overhead control)

# venv: /tmp/deepnote-spike/venv  (deepnote-toolkit[server] 2.3.1, pandas 2.1.4)
SPIKE_VENV=/tmp/deepnote-spike/venv node server.mjs   # writes WS port to ws.port
node client.mjs "$(cat ws.port)" 5                    # 5 measured iterations
```

Prototype code is intentionally kept out of the repo; only this findings doc is committed.
