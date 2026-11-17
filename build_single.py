"""把 math-map/ 目录里的页面构建成根目录下的单文件版本。

数学地图依赖四个外部脚本（i18n / defs_en / hist_en / mm_strings）。
单文件版把它们内联进去，并把导航链接改指到 math-map/ 子目录，
否则放在根目录时点 Home 会报“文件不存在”。
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = HERE                    # 页面所在的 math-map/
OUT_ROOT = os.path.dirname(HERE)  # 单文件输出到上一级

INLINE = ['i18n.js', 'defs_en.js', 'hist_en.js', 'mm_strings.js']
PAGES = ['index.html', 'variations.html', 'fitting-lab.html', 'diagnose.html', 'math-map.html']


def build(version):
    src = ig = io.open(os.path.join(ROOT, 'math-map.html'), encoding='utf-8').read()
    body = src
    for name in PAGES:
        body = body.replace('href="%s"' % name, 'href="math-map/%s"' % name)
    for name in INLINE:
        p = os.path.join(ROOT, name)
        if not os.path.exists(p):
            print('  ! 缺少', name)
            continue
        code = io.open(p, encoding='utf-8').read()
        tag = '<script src="%s"></script>' % name
        if tag not in body:
            print('  ! 找不到引用', name)
            continue
        body = body.replace(tag, '<script>/* %s (inlined) */\n%s\n</script>' % (name, code), 1)
    out = os.path.join(OUT_ROOT, '数学地图_v%s.html' % version)
    io.open(out, 'w', encoding='utf-8', newline='').write(body)
    print('  %s  %.0f KB' % (os.path.basename(out), os.path.getsize(out) / 1024))
    return out


if __name__ == '__main__':
    v = sys.argv[1] if len(sys.argv) > 1 else '1.9'
    print('构建 v%s' % v)
    build(v)
