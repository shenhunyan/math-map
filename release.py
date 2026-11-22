"""一条命令发版：升版本号 → 构建单文件 → 打包 → 传 Zenodo → 发布。

    python release.py 1.11 "这次改了什么（一句话）"

需要 .workbuddy/secrets/zenodo_token.txt 里第一行是 token；
再用环境变量指定上一版的 deposition id：ZENODO_LAST=24410732
（第一次用时把上一版 id 写进去，之后脚本会自己读回来。）
"""
import io, json, os, re, subprocess, sys, urllib.request, zipfile, pathlib

ROOT = pathlib.Path(__file__).parent
TOKEN_FILE = ROOT.parent / ".workbuddy" / "secrets" / "zenodo_token.txt"
API = "https://zenodo.org/api"


def token():
    """取第一行像 token 的东西：跳过注释与空行，长度要够。

    之前写死"第 1 行"，而实际 token 在第 6 行，于是发版时静默 403。
    """
    for ln in io.open(TOKEN_FILE, encoding="utf-8").read().splitlines():
        ln = ln.strip()
        if ln and not ln.startswith("#") and len(ln) >= 30:
            return ln
    raise SystemExit("找不到 token：检查 " + str(TOKEN_FILE))


def req(method, url, data=None, ctype="application/json", tok=None):
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Authorization", "Bearer " + (tok or token()))
    if data:
        r.add_header("Content-Type", ctype)
    with urllib.request.urlopen(r, timeout=180) as f:
        body = f.read()
    return json.loads(body) if body else {}


def main():
    if len(sys.argv) < 2:
        print(__doc__); return
    ver = sys.argv[1]
    note = sys.argv[2] if len(sys.argv) > 2 else ""

    # 1) 升版本号
    p = ROOT / "math-map.html"
    s = io.open(p, encoding="utf-8").read()
    s = re.sub(r"<title>数学地图 · v[\d.]+</title>", f"<title>数学地图 · v{ver}</title>", s, count=1)
    io.open(p, "w", encoding="utf-8", newline="").write(s)
    print("版本号 →", ver)

    # 2) 构建单文件
    subprocess.run([sys.executable, str(ROOT / "build_single.py"), ver], check=True)

    # 3) 打包
    zpath = ROOT.parent / f"math-map_v{ver}.zip"
    subprocess.run(["git", "-C", str(ROOT), "add", "-A"], check=True)
    subprocess.run(["git", "-C", str(ROOT), "commit", "-m", f"v{ver} {note}".strip()], check=False)
    subprocess.run(["git", "-C", str(ROOT), "archive", "--format=zip", "-o", str(zpath), "HEAD"], check=True)
    print("打包", zpath.name, round(zpath.stat().st_size / 1048576, 2), "MB")

    # 4) Zenodo：建新版本
    last = os.environ.get("ZENODO_LAST") or io.open(ROOT / ".zenodo_last", encoding="utf-8").read().strip() \
        if (ROOT / ".zenodo_last").exists() else os.environ.get("ZENODO_LAST")
    if not last:
        print("缺少上一版 id：设 ZENODO_LAST=<id> 再跑一次，或先写 .zenodo_last 文件。")
        return
    nv = req("POST", f"{API}/deposit/depositions/{last}/actions/newversion")
    did = nv["id"]
    rec = req("GET", f"{API}/deposit/depositions/{did}")
    for f in rec.get("files", []):
        req("DELETE", f"{API}/deposit/depositions/{did}/files/{f['id']}")
    bucket = rec["links"]["bucket"]
    req("PUT", f"{bucket}/math-map_v{ver}.zip", data=zpath.read_bytes(),
        ctype="application/octet-stream")
    print("上传完成", did)

    # 5) 元数据 + 发布
    meta = rec["metadata"]
    keep = ["title", "upload_type", "creators", "access_right", "license", "keywords", "related_identifiers"]
    new = {k: meta[k] for k in keep if k in meta}
    new["version"] = f"v{ver}"
    new["publication_date"] = subprocess.run(["date", "+%Y-%m-%d"], capture_output=True,
                                             text=True).stdout.strip()
    new["description"] = meta.get("description", "") + f"<p><b>v{ver}</b>　{note}</p>"
    req("PUT", f"{API}/deposit/depositions/{did}", data=json.dumps({"metadata": new}).encode())
    out = req("POST", f"{API}/deposit/depositions/{did}/actions/publish")
    io.open(ROOT / ".zenodo_last", "w", encoding="utf-8").write(str(did))
    print("已发布", out.get("doi"), "| 记录", did)


if __name__ == "__main__":
    main()
