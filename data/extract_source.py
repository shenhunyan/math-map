"""从四个页面的源码里抽取所有含中文的字符串（HTML 文本 + JS 字符串字面量）。

不依赖浏览器、不依赖打开弹窗——弹窗内容本来就在源码的数组里。
代码碎片用几条形态规则滤掉：含分号、花括号、箭头、赋值号的一律不要。
"""
import io, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGES = ['math-map.html', 'variations.html', 'fitting-lab.html', 'diagnose.html']

HAN = re.compile(r'[\u4e00-\u9fff]')
CODEISH = re.compile(r'(=>|function\s*\(|\}\s*\)|;\s*$|\breturn\b|\bvar\s+\w+\s*=|\.\w+\(|\|\||&&)')
TAGSTRIP = re.compile(r'<[^>]+>')


def html_texts(s):
    """<script>/<style> 之外的文本节点"""
    out = []
    for m in re.finditer(r'>([^<>]+)<', s):
        t = m.group(1).strip()
        if t and HAN.search(t):
            out.append(t)
    return out


def js_strings(s):
    """单引号/双引号字面量；跳过 script 之外的调用由调用方保证"""
    out = []
    for pat in (r"'((?:[^'\\\n]|\\.){1,600})'", r'"((?:[^"\\\n]|\\.){1,600})"'):
        for m in re.finditer(pat, s):
            t = m.group(1)
            if HAN.search(t):
                out.append(t)
    return out


def clean(t):
    t = t.replace('\\n', ' ').replace('\\t', ' ').strip()
    t = TAGSTRIP.sub('', t).strip()
    if not t or not HAN.search(t):
        return None
    if CODEISH.search(t):
        return None
    if len(t) > 400:
        return None
    if re.match(r'^[\s\d\.\-—·、，。；：]+$', t):
        return None
    return t


def main():
    found = {}
    for page in PAGES:
        p = os.path.join(ROOT, page)
        if not os.path.exists(p):
            print('skip', page)
            continue
        s = io.open(p, encoding='utf-8').read()
        # 先把 script 区块切出来，其余部分取文本节点
        scripts = re.findall(r'<script[^>]*>(.*?)</script>', s, re.S)
        rest = re.sub(r'<script[^>]*>.*?</script>', ' ', s, flags=re.S)
        cand = html_texts(rest)
        for sc in scripts:
            cand += js_strings(sc)
        n0 = 0
        for t in cand:
            c = clean(t)
            if not c:
                continue
            found.setdefault(c, set()).add(page)
            n0 += 1
    keys = sorted(found)
    json.dump(keys, io.open(os.path.join(HERE, '_src_all.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=0)
    print('抽出', len(keys), '条（按页面来源去重后）')


if __name__ == '__main__':
    main()
