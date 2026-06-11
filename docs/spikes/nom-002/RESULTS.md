# NOM-002 spike — recorded probe outputs (2026-06-11)

Env: system python3.11.2; venv with `deepnote-toolkit[server]` + `bash_kernel` + `jinja2`.
Kernelspecs registered in venv: `bash`, `python3`.
Reproduced independently during the NOM-002 adversarial review (same verdict).

## probe.py — default-mode server hosting (the load-bearing result)

```json
{
  "checkA_server_hosting": {
    "ok": true,
    "kernelspecs_listed": ["bash", "python3"],
    "bash_listed": true,
    "default_kernel": "python3-venv",
    "token_required": false,
    "start_kernel_http_status": 201,
    "started_kernel_exec_state": "starting",
    "start_error": null
  },
  "checkB_kernel_sanity": { "ok": true, "output": "deepnote_spike_42" },
  "verdict": "SERVER_HOSTS_FOREIGN_KERNEL: deepnote_toolkit server listed and launched the bash kernel — launch layer needs no new server; only the hardcoded kernel name is the blocker."
}
```

## probe_flag.py — `--python-kernel-only` does NOT gate the REST kernel path

```json
[
  {
    "args": ["--python-kernel-only"],
    "kernelspecs": ["bash", "python3"],
    "bash_listed": true,
    "bash_launch_status": 201
  },
  {
    "args": ["--no-python-kernel-only"],
    "kernelspecs": ["bash", "python3"],
    "bash_listed": true,
    "bash_launch_status": 201
  }
]
```

## probe_fail.py — unknown kernelspec → opaque 500; kernelspec API shape

```json
{
  "unknown_kernel_post_status": 500,
  "unknown_kernel_body": {
    "error_body": "{\"message\": \"Unhandled error\", \"reason\": null, \"traceback\": \"\"}"
  },
  "kernelspec_shape": {
    "python3": { "display_name": "Python 3 (ipykernel)", "language": "python" },
    "bash": { "display_name": "Bash", "language": "bash" }
  }
}
```

## How to re-run

```bash
python3 -m venv venv
./venv/bin/pip install "deepnote-toolkit[server]" bash_kernel jinja2
./venv/bin/python -m bash_kernel.install --sys-prefix
./venv/bin/python probe.py      # adjust VENV_PY path in the script if relocated
```
