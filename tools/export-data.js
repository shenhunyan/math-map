#!/usr/bin/env node
/* ==========================================================================
   export-data.js — 把 math-map.html 里的内容数据导出成可读的 JSON
   --------------------------------------------------------------------------
   为什么要有这一步：
   数据现在活在 math-map.html 的 CUR / DEF1–DEF5 里。想改一格的人不该为了
   改一个字段去读 360KB 的 HTML。这个脚本把它们抽出来，让人只面对 JSON。

     node tools/export-data.js

   输出：
     data/cells.json   24 个课程格（含 pre / soft / items / note）
     data/defs.json    157 条定义（keys 是知识点名）

   注意：这一步是**只读镜像**。改了 JSON 不会自动改变 HTML，
   需要维护者再同步回去（build 步骤在路线图上，还没做）。
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'math-map.html');

function main() {
  const src = fs.readFileSync(SRC, 'utf8');

  /* ---- CUR：取到 STRUCT 之前为止 ---- */
  const a = src.indexOf('const CUR = {');
  const b = src.indexOf('const STRUCT', a);
  if (a < 0 || b < 0) throw new Error('找不到 CUR 对象');
  const curCode = src.slice(a, b).replace('const CUR =', 'var CUR =');
  const CUR = new Function(curCode + '; return CUR;')();

  /* ---- DEF1..DEF5 ---- */
  const DEF = {};
  ['DEF1', 'DEF2', 'DEF3', 'DEF4', 'DEF5'].forEach(function (name) {
    const i = src.indexOf('const ' + name + ' = {');
    if (i < 0) return;
    const re = /^const [A-Z][A-Z0-9_]* = /gm;
    re.lastIndex = i + 1;
    const m = re.exec(src);
    const end = m ? m.index : src.length;
    const code = src.slice(i, end).replace('const ' + name + ' =', 'var __D =');
    const obj = new Function(code + '; return __D;')();
    Object.keys(obj).forEach(function (k) { DEF[k] = obj[k]; });
  });

  /* ---- 展平成 cells ---- */
  const STAGES = Object.keys(CUR);
  const cells = [];
  STAGES.forEach(function (stage) {
    CUR[stage].forEach(function (c) {
      cells.push({
        id: c.id || null,
        stage: stage,
        name: c.t,
        pre: c.pre || [],
        soft: c.soft || [],
        items: c.items || [],
        note: c.note || '',
        draw: typeof c.draw === 'string' ? c.draw : null
      });
    });
  });

  const outDir = path.join(ROOT, 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'cells.json'),
    JSON.stringify({ _meta: { source: 'math-map.html', count: cells.length,
      note: '只读镜像，改这里不会自动改变页面。见 CONTRIBUTING.md' }, cells: cells }, null, 2) + '\n',
    'utf8');

  fs.writeFileSync(path.join(outDir, 'defs.json'),
    JSON.stringify({ _meta: { source: 'math-map.html', count: Object.keys(DEF).length },
      defs: DEF }, null, 2) + '\n',
    'utf8');

  const withId = cells.filter(function (c) { return c.id; });
  const totalItems = cells.reduce(function (s, c) { return s + c.items.length; }, 0);
  const edges = cells.reduce(function (s, c) { return s + c.pre.length; }, 0);

  console.log('cells  ' + cells.length + ' 个（其中带 id 的 ' + withId.length + ' 个，可参与诊断）');
  const REAL = cells.reduce(function (s, c) {
    return s + c.items.filter(function (it) { return it.indexOf('（部分教材') !== 0; }).length;
  }, 0);
  console.log('items  ' + totalItems + ' 条（其中 ' + (totalItems - REAL) + ' 条是选学说明，实际知识点 ' + REAL + ' 个）');
  console.log('edges  ' + edges + ' 条先修关系');
  console.log('defs   ' + Object.keys(DEF).length + ' 条定义');
  console.log('→ data/cells.json, data/defs.json');
}

main();
