import json, os, subprocess, time, urllib.request, urllib.error
VENV_PY="/tmp/deepnote-spike/venv/bin/python"; port=8940; base=f"http://localhost:{port}"
def http(method,path,payload=None):
    data=json.dumps(payload).encode() if payload is not None else None
    req=urllib.request.Request(base+path,data=data,headers={"Content-Type":"application/json"},method=method)
    try:
        with urllib.request.urlopen(req,timeout=20) as r:
            b=r.read().decode(); return r.status,(json.loads(b) if b.strip() else {})
    except urllib.error.HTTPError as e:
        return e.code, {"error_body": e.read().decode()[:300]}
p=subprocess.Popen([VENV_PY,"-m","deepnote_toolkit","server","--jupyter-port",str(port),"--ls-port",str(port+1)],
                   stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env=dict(os.environ))
try:
    for _ in range(300):
        try:
            s,_=http("GET","/api")
            if s==200: break
        except Exception: pass
        time.sleep(0.2)
    # unknown kernelspec -> "missing kernel" category
    unknown=http("POST","/api/kernels",{"name":"no_such_kernel_xyz"})
    # kernelspecs payload shape (for validation / discovery)
    _,specs=http("GET","/api/kernelspecs")
    spec_shape={k:{"display_name":v.get("spec",{}).get("display_name"),"language":v.get("spec",{}).get("language")} for k,v in specs.get("kernelspecs",{}).items()}
    print(json.dumps({"unknown_kernel_post_status":unknown[0],"unknown_kernel_body":unknown[1],"kernelspec_shape":spec_shape},indent=2))
finally:
    p.terminate()
    try: p.wait(timeout=5)
    except Exception: p.kill()
