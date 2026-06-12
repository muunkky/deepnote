import json, os, subprocess, time, urllib.request, urllib.error
VENV_PY="/tmp/deepnote-spike/venv/bin/python"
def run(extra_args, port):
    base=f"http://localhost:{port}"
    def http(method,path,payload=None):
        data=json.dumps(payload).encode() if payload is not None else None
        req=urllib.request.Request(base+path,data=data,headers={"Content-Type":"application/json"},method=method)
        with urllib.request.urlopen(req,timeout=20) as r:
            b=r.read().decode(); return r.status,(json.loads(b) if b.strip() else {})
    p=subprocess.Popen([VENV_PY,"-m","deepnote_toolkit","server","--jupyter-port",str(port),"--ls-port",str(port+1)]+extra_args,
                       stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env=dict(os.environ))
    try:
        ok=False
        for _ in range(300):
            if p.poll() is not None: return {"args":extra_args,"error":"server exited"}
            try:
                s,_=http("GET","/api")
                if s==200: ok=True; break
            except Exception: pass
            time.sleep(0.2)
        if not ok: return {"args":extra_args,"error":"timeout"}
        _,specs=http("GET","/api/kernelspecs")
        names=sorted(specs.get("kernelspecs",{}).keys())
        bash_launch=None
        try:
            s2,k=http("POST","/api/kernels",{"name":"bash"})
            bash_launch=s2
            try: http("DELETE",f"/api/kernels/{k.get('id')}")
            except Exception: pass
        except urllib.error.HTTPError as e:
            bash_launch=f"HTTP {e.code}: {e.read().decode()[:200]}"
        except Exception as e:
            bash_launch=f"{type(e).__name__}: {e}"
        return {"args":extra_args or ["(default)"],"kernelspecs":names,"bash_listed":"bash" in names,"bash_launch_status":bash_launch}
    finally:
        p.terminate()
        try: p.wait(timeout=5)
        except Exception: p.kill()
print(json.dumps([
    run(["--python-kernel-only"], 8920),
    run(["--no-python-kernel-only"], 8930),
], indent=2))
