"""把 GitHub Release v1.5 的说明改对：补上 Zenodo 编号，并把 MIT 改成交付事实。

需要 token：写进 ../.workbuddy/secrets/github_token.txt
细粒度 token 权限只要一项：Repository permissions → Contents: Read and write。
"""
import io, json, pathlib, sys, urllib.request, urllib.error

ROOT = pathlib.Path(__file__).parent
TOK_FILE = ROOT.parent / ".workbuddy" / "secrets" / "github_token.txt"
REPO = "shenhunyan/math-map"
TAG = "v1.5"

NEW_BODY = """Single-file HTML, no dependencies, works offline.

**Licensing.** Code is AGPL-3.0-or-later from v1.6 onward (see `LICENSE`).
This v1.5 snapshot predates the license file and stated MIT at the time;
those copies stay MIT. Content is CC BY-SA 4.0, data is CC BY 4.0.

**Zenodo.** The archive of this release is deposited as **v1.5.1**:
DOI [10.5281/zenodo.24246637](https://doi.org/10.5281/zenodo.24246637)
Concept DOI (always the latest): [10.5281/zenodo.24246636](https://doi.org/10.5281/zenodo.24246636)
"""


def token():
    for ln in io.open(TOK_FILE, encoding="utf-8").read().splitlines():
        ln = ln.strip()
        if ln and not ln.startswith("#") and len(ln) >= 30:
            return ln
    raise SystemExit("token 文件里没有可用内容：" + str(TOK_FILE))


def api(method, path, data=None, tok=None):
    req = urllib.request.Request("https://api.github.com" + path, data=data, method=method)
    req.add_header("Authorization", "Bearer " + (tok or token()))
    req.add_header("Accept", "application/vnd.github+json")
    if data:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=60) as f:
        return json.loads(f.read() or b"{}")


def main():
    if not TOK_FILE.exists():
        raise SystemExit("先创建 " + str(TOK_FILE) + "，里面放一个带 Contents:write 的细粒度 token")
    rels = api("GET", f"/repos/{REPO}/releases?per_page=30")
    target = next((r for r in rels if r.get("tag_name") == TAG), None)
    if not target:
        print("没找到 tag", TAG, "；现有：", [r.get("tag_name") for r in rels])
        return
    print("找到", TAG, "| release id", target["id"], "| 原标题", target.get("name"))
    body = json.dumps({"body": NEW_BODY}).encode()
    out = api("PATCH", f"/repos/{REPO}/releases/{target['id']}", body)
    print("已更新：", out["html_url"])
    print("含 AGPL:", "AGPL" in out["body"], "| 含 MIT 声明:", "MIT" in out["body"])


if __name__ == "__main__":
    main()
