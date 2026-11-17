"""把五批译文合成一张字典，写进 mm_strings.js。
用法：python data/merge_strings.py
"""
import io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FILES = ['_mm_part1_en.json', '_mm_part2_en.json', '_mm_part3_en.json',
         '_var_fit_en.json', '_diag_en.json',
         '_mm_a_en.json', '_mm_b_en.json',
         '_var_1_en.json', '_var_2_en.json', '_var_3_en.json', '_var_4_en.json',
         '_fit_en.json', '_diag2_en.json', '_var_rest_en.json']

merged = {}
report = []
for f in FILES:
    p = os.path.join(HERE, f)
    if not os.path.exists(p):
        report.append((f, 'missing'))
        continue
    try:
        d = json.load(open(p, encoding='utf-8'))
    except Exception as e:
        report.append((f, 'bad json: %s' % e))
        continue
    n = 0
    for k, v in d.items():
        if not isinstance(v, str) or not v.strip():
            continue
        if k in merged and merged[k] != v:
            n += 1
            continue
        merged[k] = v
        n += 1
    report.append((f, n))

# 再补一份「去标签」的键：段落里带 <b> 时，元素级匹配用的是纯文本
import re, html as _html
plain = {}
for k, v in merged.items():
    if '<' in k:
        kk = _html.unescape(re.sub(r'<[^>]+>', '', k)).strip()
        vv = _html.unescape(re.sub(r'<[^>]+>', '', v)).strip()
        if kk and kk not in merged and kk not in plain:
            plain[kk] = vv
merged.update(plain)

body = json.dumps(merged, ensure_ascii=False, separators=(',', ':'))
out = os.path.join(ROOT, 'mm_strings.js')
io.open(out, 'w', encoding='utf-8', newline='').write(
    "/* 逐串替换字典：页面上整段文本节点与这里的中文完全相等时，换成英文。\n"
    "   由 data/merge_strings.py 生成，不要手改。 */\n"
    "window.MM_STR = " + body + ";\n")

for f, n in report:
    print('%-24s %s' % (f, n))
print('merged %d entries, %d bytes' % (len(merged), len(body)))
