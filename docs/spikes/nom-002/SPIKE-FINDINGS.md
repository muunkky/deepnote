# Spike findings — ADR-2 (server/launch model for non-Python kernels)

Date: 2026-06-11 · env: system python3.11.2, venv with deepnote-toolkit[server] + bash_kernel + jinja2

## Gating question

Can `python -m deepnote_toolkit server` (what runtime-core's startServer launches) HOST and
LAUNCH a non-Python Jupyter kernel, or is a new/different launch path required?

## Method

Isolated venv; installed deepnote-toolkit[server] + bash_kernel (pure-pip foreign kernel).
Registered bash + python3 kernelspecs. Probed the running server's Jupyter REST API
(the same surface @jupyterlab/services / KernelClient uses) + an independent jupyter_client run.

## Findings (decisive)

1. The toolkit server is a standard, TOKEN-LESS Jupyter Server (`/api`, `/api/kernelspecs`,
   `/api/kernels`), consistent with KernelClient connecting with no token.
2. DEFAULT mode (exactly how server-starter.ts:52 launches it — only --jupyter-port/--ls-port):
   server LISTS the foreign `bash` kernelspec and LAUNCHES it via `POST /api/kernels {name:"bash"}`
   -> HTTP 201, kernel not dead.
3. `--python-kernel-only` vs `--no-python-kernel-only`: NO effect on the REST kernel path — bash
   listed + launchable (201) in BOTH. That flag governs other (Python-centric) toolkit features,
   not the Jupyter REST launch surface runtime-core uses.
4. Check B (independent): bash_kernel executes via jupyter_client (`echo` -> "deepnote_spike_42"),
   so the server path is not masking a broken kernel.
5. Unknown kernelspec via `POST /api/kernels {name:"no_such_kernel_xyz"}` -> opaque HTTP 500
   ("Unhandled error", empty reason/traceback). => runtime must PRE-VALIDATE against
   /api/kernelspecs to yield a clean "missing kernel" error; do not rely on the server's 500.
6. `/api/kernelspecs` returns `name -> {display_name, language}` (e.g. python3->Python/python,
   bash->Bash/bash) — a rich source for `--list-kernels` discovery AND pre-flight validation.
7. `default` kernel reported as `python3-venv` (toolkit dynamically registers a venv-pointing
   python3 kernelspec); runtime connects with explicit name `python3` which is present.

## Conclusion

REUSE the existing toolkit server. No new launch path. The ONLY code blocker is the hardcoded
`kernel: { name: 'python3' }` at kernel-client.ts:78 — thread a kernel-name parameter through
`connect()`. This RETIRES the PRD's top Medium risk ("Phase 1 minimal slice doesn't actually run").
