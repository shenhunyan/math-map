"""让 data/defs.json 与页面内联的定义保持一致。

页面里是 DEF1..DEF5 五块手写数据，data/defs.json 是给外部用的同一份内容。
两边各改各的迟早会分叉，所以约定：**defs.json 为准**，页面里缺的补进 DEF6。

    python sync_defs.py          # 把 defs.json 里页面还没有的补进 DEF6
    python sync_defs.py --check  # 只报告差异，不改文件（退出码 1 表示有差异）
"""
import io, json, re, sys

PAGE = "math-map.html"
DATA = "data/defs.json"
START = "/* ==DEF6:SYNC:START== */"
END = "/* ==DEF6:SYNC:END== */"


def load():
    d = json.load(io.open(DATA, encoding="utf-8"))["defs"]
    s = io.open(PAGE, encoding="utf-8").read()
    return d, s


def page_keys(s, upto=6):
    """内联块里出现过的键；upto=5 只算手写块，upto=6 连 DEF6 一起算"""
    keys = set()
    for i in range(1, upto + 1):   # DEF6 是同步注入的那块，也要算进来
        m = re.search(r"const DEF%d = \{(.*?)\n\};" % i, s, re.S)
        if not m:
            continue
        keys |= set(re.findall(r"^  '([^']+)':\s*\{", m.group(1), re.M))
        keys |= set(re.findall(r'^  "([^"]+)":\s*\{', m.group(1), re.M))
    return keys


def js_lit(v):
    return json.dumps(v, ensure_ascii=False)


def build_block(items):
    out = [START, "const DEF6 = {"]
    for k, v in items.items():
        out.append("  %s: { k: %s, d: %s, t: %s, s: %s }," % (
            js_lit(k), js_lit(v.get("k", "")), js_lit(v.get("d", "")),
            js_lit(v.get("t", "")), js_lit(v.get("s", []))))
    out.append("};")
    out.append(END)
    return "\n".join(out)


def main():
    check = "--check" in sys.argv
    data, page = load()
    have = page_keys(page, 5)   # 只对手写块判缺；DEF6 本身要重算，不能作为依据
    missing = {k: v for k, v in data.items() if k not in have}

    if check:
        # 检查时要连 DEF6 一起比，否则永远报"缺"
        missing = {k: v for k, v in data.items() if k not in page_keys(page, 6)}
        extra = sorted(page_keys(page, 6) - set(data))
        print("defs.json %d 条 · 页面内联 %d 条" % (len(data), len(page_keys(page, 6))))
        print("页面缺 %d 条：%s" % (len(missing), "、".join(list(missing)[:6]) or "无"))
        print("仅页面有 %d 条：%s" % (len(extra), "、".join(extra[:6]) or "无"))
        sys.exit(1 if missing else 0)

    block = build_block(missing)
    if START in page:
        page = re.sub(re.escape(START) + r".*?" + re.escape(END), block, page, flags=re.S)
    else:
        # 插在 const DEF = Object.assign 之前，并把 DEF6 加进合并
        page = page.replace("const DEF = Object.assign({}, DEF1, DEF2, DEF3, DEF4, DEF5);",
                            block + "\n\nconst DEF = Object.assign({}, DEF1, DEF2, DEF3, DEF4, DEF5, DEF6);", 1)
    io.open(PAGE, "w", encoding="utf-8", newline="").write(page)
    print("已把 %d 条补进 DEF6：%s" % (len(missing), "、".join(missing) or "无"))


if __name__ == "__main__":
    main()
