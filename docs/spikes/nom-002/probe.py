#!/usr/bin/env python3
"""
Spike probe for PRD-002 / ADR-2: can `deepnote_toolkit server` host & launch a
NON-Python Jupyter kernel, or is it locked to python3?

Two independent checks:
  A. Server-hosting: start `python -m deepnote_toolkit server`, then via its
     Jupyter REST API (the same server @jupyterlab/services talks to) (1) list
     kernelspecs and (2) start a kernel named "bash". Proves the launch layer.
  B. Kernel sanity: start the bash kernel directly via jupyter_client and run
     `echo`. Proves bash_kernel itself works, so a negative A is the SERVER's
     fault, not the kernel's.

Emits a JSON verdict to stdout.
"""
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

VENV_PY = "/tmp/deepnote-spike/venv/bin/python"
PORT = 8899
LSPORT = 8900
BASE = f"http://localhost:{PORT}"

result = {
    "checkA_server_hosting": {},
    "checkB_kernel_sanity": {},
    "verdict": "",
}


def http(method, path, payload=None, token=None):
    url = BASE + path
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"token {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=20) as r:
        body = r.read().decode()
        return r.status, (json.loads(body) if body.strip() else {})


# ---- Check B first: does bash_kernel work at all (independent of deepnote)? ----
def check_b():
    try:
        from jupyter_client.manager import KernelManager

        km = KernelManager(kernel_name="bash")
        km.start_kernel()
        kc = km.client()
        kc.start_channels()
        kc.wait_for_ready(timeout=30)
        msg_id = kc.execute("echo deepnote_spike_$((6*7))")
        out = ""
        deadline = time.time() + 20
        while time.time() < deadline:
            try:
                msg = kc.get_iopub_msg(timeout=2)
            except Exception:
                continue
            if msg["parent_header"].get("msg_id") != msg_id:
                continue
            if msg["msg_type"] == "stream":
                out += msg["content"].get("text", "")
            if msg["msg_type"] == "status" and msg["content"]["execution_state"] == "idle":
                break
        kc.stop_channels()
        km.shutdown_kernel(now=True)
        result["checkB_kernel_sanity"] = {
            "ok": "deepnote_spike_42" in out,
            "output": out.strip(),
        }
    except Exception as e:
        result["checkB_kernel_sanity"] = {"ok": False, "error": f"{type(e).__name__}: {e}"}


# ---- Check A: deepnote_toolkit server hosting a foreign kernel ----
def check_a():
    env = dict(os.environ)
    proc = subprocess.Popen(
        [VENV_PY, "-m", "deepnote_toolkit", "server", "--jupyter-port", str(PORT), "--ls-port", str(LSPORT)],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        env=env,
    )
    server_log = []

    def drain():
        # non-blocking-ish: read whatever is buffered
        try:
            line = proc.stdout.readline()
            if line:
                server_log.append(line.rstrip())
        except Exception:
            pass

    try:
        ready = False
        for _ in range(300):  # up to ~60s
            if proc.poll() is not None:
                rest = proc.stdout.read()
                if rest:
                    server_log.append(rest)
                result["checkA_server_hosting"] = {
                    "ok": False,
                    "stage": "server_start",
                    "error": "server exited before ready",
                    "log_tail": "\n".join(server_log)[-2000:],
                }
                return
            try:
                s, _ = http("GET", "/api")
                if s == 200:
                    ready = True
                    break
            except Exception:
                pass
            drain()
            time.sleep(0.2)

        if not ready:
            result["checkA_server_hosting"] = {"ok": False, "stage": "server_ready", "error": "timeout waiting for /api"}
            return

        # Try to detect a token requirement by hitting kernelspecs
        token = None
        try:
            s, specs = http("GET", "/api/kernelspecs")
        except urllib.error.HTTPError as e:
            if e.code in (401, 403):
                # find token in log
                blob = "\n".join(server_log)
                import re

                m = re.search(r"token=([0-9a-f]+)", blob)
                token = m.group(1) if m else None
                s, specs = http("GET", "/api/kernelspecs", token=token)
            else:
                raise

        kernelspec_names = sorted(specs.get("kernelspecs", {}).keys())
        default = specs.get("default")

        # Attempt to start a bash kernel via the REST API
        start_status = None
        start_err = None
        kernel_id = None
        try:
            s2, kernel = http("POST", "/api/kernels", {"name": "bash"}, token=token)
            start_status = s2
            kernel_id = kernel.get("id")
            # give it a moment, then check it's alive (not immediately dead)
            time.sleep(2)
            s3, info = http("GET", f"/api/kernels/{kernel_id}", token=token)
            exec_state = info.get("execution_state")
            # cleanup
            try:
                http("DELETE", f"/api/kernels/{kernel_id}", token=token)
            except Exception:
                pass
        except urllib.error.HTTPError as e:
            start_status = e.code
            start_err = e.read().decode()[:500]
            exec_state = None
        except Exception as e:
            start_err = f"{type(e).__name__}: {e}"
            exec_state = None

        result["checkA_server_hosting"] = {
            "ok": bool(kernel_id) and exec_state not in (None, "dead"),
            "kernelspecs_listed": kernel_names_summary(kernelspec_names),
            "bash_listed": "bash" in kernelspec_names,
            "default_kernel": default,
            "token_required": token is not None,
            "start_kernel_http_status": start_status,
            "started_kernel_exec_state": exec_state,
            "start_error": start_err,
        }
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()


def kernel_names_summary(names):
    return names


check_b()
check_a()

a = result["checkA_server_hosting"]
b = result["checkB_kernel_sanity"]
if a.get("ok"):
    result["verdict"] = "SERVER_HOSTS_FOREIGN_KERNEL: deepnote_toolkit server listed and launched the bash kernel — launch layer needs no new server; only the hardcoded kernel name is the blocker."
elif a.get("bash_listed") and not a.get("ok"):
    result["verdict"] = "LISTS_BUT_WONT_LAUNCH: server exposes the foreign kernelspec but failed to start it — partial; investigate launch path."
elif b.get("ok") and not a.get("bash_listed"):
    result["verdict"] = "SERVER_FILTERS_KERNELS: bash kernel works standalone (Check B) but deepnote_toolkit server did not expose it — a different/again-configured launch path is needed."
else:
    result["verdict"] = "INCONCLUSIVE: see checks (possible install/env blocker)."

print(json.dumps(result, indent=2))
