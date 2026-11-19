import json, glob, os, re, sys
files = sorted(glob.glob(os.path.join(os.path.dirname(__file__), '_new_*.json')))
total = 0
for f in files:
    try:
        d = json.load(open(f, encoding='utf-8'))
    except Exception as e:
        print('×', os.path.basename(f), '解析失败', e); continue
    bad = []
    for i, x in enumerate(d):
        miss = [k for k in ('branch','name','def','key','src','table') if not str(x.get(k,'')).strip()]
        if miss: bad.append((i, x.get('name','?'), '缺 '+','.join(miss)))
        if len(x.get('def','')) > 160: bad.append((i, x.get('name','?'), '定义过长 %d 字' % len(x['def'])))
        if not re.search(r'(Ch|§|章|第)', str(x.get('src',''))):
            bad.append((i, x.get('name','?'), '出处未标章节'))
    total += len(d)
    print('%-22s %2d 条  %s' % (os.path.basename(f), len(d), '问题 %d' % len(bad) if bad else 'OK'))
    for b in bad: print('    -', b[1], b[2])
print('合计', total, '条')
