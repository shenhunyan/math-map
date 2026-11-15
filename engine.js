/* ==========================================================================
   诊断器 · 知识空间自适应诊断
   --------------------------------------------------------------------------
   纯逻辑，不碰 DOM。Node 用 require，浏览器挂 window.KSTDiag，
   小程序用 require('../../utils/诊断器.js')。

   两级诊断：
     1) 格级（level:'cell'）——24 个课程格，约 12 题，定位到「卡在哪一格」
     2) 点级（level:'item' + cellFilter）——进入那一格，3–4 题定位到「哪个知识点」
   格级快但粗，点级准但贵。先粗后细，总共 15 题左右。

   为什么不用「枚举可行状态 + 精确信息增益」：
   24 个格时可行状态还算得动（15 万），拆到 124 个知识点后超过 40 万且会继续爆。
   但 KST 的两条推断规则本身可靠，不枚举也能得到同样结论：
     会 B 且 A 是 B 的前置  →  一定会 A
     不会 A 且 B 依赖 A     →  一定不会 B
   传播到不动点，剩下的未知项用二分挑题。在一条链上这就是精确二分。
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KSTDiag = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KNOWN = 1, DENIED = 0;

  /* ---------- 判分 ----------
     多个可接受答案用「空格 + 斜杠 + 空格」分隔，不能用裸斜杠：
     `exact: 5/6` 里的 5/6 是分数，拆开就变成「5 也算对、6 也算对」。 */
  function splitAccept(s) {
    var raw = String(s == null ? '' : s).trim();
    if (!raw) return [];
    if (raw.indexOf(' / ') < 0 && raw.indexOf(' ／ ') < 0) return [raw];
    return raw.split(/\s+[\/／]\s+/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function parseGrade(g) {
    var m = /^(exact|choice)\s*[:：]\s*([\s\S]*)$/.exec(String(g || '').trim());
    if (!m) return { type: 'exact', accept: splitAccept(g) };
    return { type: m[1], accept: splitAccept(m[2]) };
  }

  function norm(s) {
    return String(s == null ? '' : s)
      .trim().toLowerCase()
      .replace(/[−–—]/g, '-')
      .replace(/[（]/g, '(').replace(/[）]/g, ')')
      .replace(/[，、]/g, ',')
      .replace(/[％]/g, '%')
      .replace(/[×＊]/g, '*').replace(/[÷／]/g, '/')
      .replace(/\s+/g, '');
  }

  function judge(gradeStr, input) {
    var g = typeof gradeStr === 'string' ? parseGrade(gradeStr) : gradeStr;
    var v = norm(input);
    if (!v) return false;
    for (var i = 0; i < g.accept.length; i++) {
      if (norm(g.accept[i]) === v) return true;
    }
    return false;
  }

  /* ---------- 图 ----------
     把「节点 + 依赖 + 每个节点的题」抽成一张有向图，格级和点级共用同一套推断。 */
  function buildGraph(nodes, preOf, qOf, labelOf) {
    var byId = {}, order = [];
    nodes.forEach(function (n) { byId[n.id] = n; order.push(n.id); });

    var succ = {};
    order.forEach(function (id) { succ[id] = []; });
    order.forEach(function (id) {
      (preOf(id) || []).forEach(function (p) { if (succ[p]) succ[p].push(id); });
    });

    var cA = {}, cD = {};
    function anc(id) {
      if (cA[id]) return cA[id];
      var seen = {}, st = (preOf(id) || []).slice(), out = [];
      while (st.length) {
        var k = st.pop();
        if (seen[k]) continue;
        seen[k] = 1; out.push(k);
        (preOf(k) || []).forEach(function (q) { st.push(q); });
      }
      cA[id] = out; return out;
    }
    function desc(id) {
      if (cD[id]) return cD[id];
      var seen = {}, st = (succ[id] || []).slice(), out = [];
      while (st.length) {
        var k = st.pop();
        if (seen[k]) continue;
        seen[k] = 1; out.push(k);
        (succ[k] || []).forEach(function (q) { st.push(q); });
      }
      cD[id] = out; return out;
    }

    return { byId: byId, order: order, preOf: preOf, anc: anc, desc: desc, qOf: qOf, labelOf: labelOf };
  }

  /* ---------- 引擎 ---------- */
  function create(opt) {
    var items = opt.items || [];
    var cells = opt.cells || [];
    var questions = opt.questions || [];
    var level = opt.level || 'cell';
    var filter = opt.cellFilter || null;      /* 点级时限定在某格内 */

    var cellById = {};
    cells.forEach(function (c) { cellById[c.id] = c; });

    /* 每个知识点对应的题：同一点多题时取第一道 */
    var qByItem = {};
    questions.forEach(function (q) { if (q.itemId && !qByItem[q.itemId]) qByItem[q.itemId] = q; });

    var byCell = {};
    items.forEach(function (it) { (byCell[it.cell] = byCell[it.cell] || []).push(it); });
    Object.keys(byCell).forEach(function (c) {
      byCell[c].sort(function (a, b) { return a.idx - b.idx; });
    });

    var graph, nodes;

    if (level === 'cell') {
      nodes = cells.map(function (c) { return { id: c.id }; });
      /* 格级代表题：取该格「中间」那一项。
         不能用最后一题——那通常是这一格最难的（比如一元二次的最后一题是韦达定理），
         当第一题问出来会把人吓住，而且答错也不代表整格不会。
         也不能用第一题——太基础，答对了推不出整格会。
         取中间项是唯一的折中：答错说明整格大概率不牢，答对说明至少过半。 */
      var qCell = {};
      cells.forEach(function (c) {
        var list = (byCell[c.id] || []).filter(function (x) { return !!qByItem[x.id]; });
        if (!list.length) return;
        var mid = Math.floor((list.length - 1) / 2);
        qCell[c.id] = qByItem[list[mid].id];
      });
      graph = buildGraph(nodes,
        function (id) { return (cellById[id] || {}).pre || []; },
        function (id) { return qCell[id]; },
        function (id) { return (cellById[id] || {}).name || id; });
    } else {
      var pool = items.filter(function (it) { return !filter || it.cell === filter; });
      nodes = pool.map(function (it) { return { id: it.id }; });
      var idIn = {};
      pool.forEach(function (it) { idIn[it.id] = 1; });
      var preOf = function (id) {
        var it = items.filter(function (x) { return x.id === id; })[0];
        if (!it) return [];
        /* 格内诊断：格外的前置一律当已掌握（否则整格都是未知，测不动） */
        return (it.pre || []).filter(function (p) {
          if (idIn[p]) return true;
          var t = items.filter(function (x) { return x.id === p; })[0];
          return t && t.cell === filter;
        });
      };
      graph = buildGraph(nodes, preOf,
        function (id) { return qByItem[id]; },
        function (id) {
          var it = items.filter(function (x) { return x.id === id; })[0];
          return it ? it.name : id;
        });
    }

    var state = {}, asked = {}, log = [], conflicts = 0, cursor = null;

    function set(id, v) {
      if (state[id] === v) return false;
      if (state[id] !== undefined && state[id] !== v) conflicts++;
      state[id] = v;
      return true;
    }

    function propagate() {
      var changed = true, guard = 0;
      while (changed && guard++ < 200) {
        changed = false;
        for (var i = 0; i < graph.order.length; i++) {
          var id = graph.order[i];
          if (state[id] === KNOWN) {
            var a = graph.anc(id);
            for (var j = 0; j < a.length; j++) if (set(a[j], KNOWN)) changed = true;
          } else if (state[id] === DENIED) {
            var d = graph.desc(id);
            for (var k = 0; k < d.length; k++) if (set(d[k], DENIED)) changed = true;
          }
        }
      }
    }

    /* 对每个未问节点算：答对能新确认几个、答错能新划掉几个，取 min 最大的那个。
       在链上这正好是二分。 */
    function next() {
      var best = null, bestScore = -1, bestA = 0, bestD = 0;
      for (var i = 0; i < graph.order.length; i++) {
        var id = graph.order[i];
        if (state[id] !== undefined || asked[id]) continue;
        if (!graph.qOf(id)) continue;

        var a = 1, d = 1, j;
        var an = graph.anc(id), dn = graph.desc(id);
        for (j = 0; j < an.length; j++) if (state[an[j]] === undefined) a++;
        for (j = 0; j < dn.length; j++) if (state[dn[j]] === undefined) d++;

        var ready = (graph.preOf(id) || []).every(function (p) { return state[p] === KNOWN; }) ? 0.35 : 0;
        var sc = Math.min(a, d) + ready;
        if (sc > bestScore) { bestScore = sc; best = id; bestA = a; bestD = d; }
      }
      if (!best) { cursor = null; return null; }

      asked[best] = 1;
      cursor = best;
      var q = graph.qOf(best);
      var meta = describe(best);
      return {
        nodeId: best,
        itemId: level === 'item' ? best : q.itemId,
        name: meta.name,
        cell: meta.cell,
        cellName: meta.cellName,
        stage: meta.stage,
        q: q.q, a: q.a, grade: q.grade, no: q.no,
        gainIfYes: bestA, gainIfNo: bestD
      };
    }

    /* ---------- 路径 ----------
       往回：沿着「最深的那条前置」一路回溯到根，就是这个人走过来的主线。
       往前：硬后继是真正解锁的；软后继只是建议（soft 字段），不参与判定。 */
    var depthCache = {};
    function depthOf(id) {
      if (depthCache[id] !== undefined) return depthCache[id];
      depthCache[id] = 0;
      var p = graph.preOf(id) || [], m = 0;
      for (var i = 0; i < p.length; i++) m = Math.max(m, depthOf(p[i]) + 1);
      depthCache[id] = m;
      return m;
    }

    function rootPath(id) {
      var path = [], cur = id, guard = 0;
      while (cur && guard++ < 60) {
        path.unshift(cur);
        var p = graph.preOf(cur) || [];
        if (!p.length) break;
        var best = p[0], bd = -1;
        for (var i = 0; i < p.length; i++) {
          var d = depthOf(p[i]);
          if (d > bd) { bd = d; best = p[i]; }
        }
        cur = best;
      }
      return path;
    }

    /* 直接后继（硬依赖）。图很小，每次线性扫一遍就够，不用建反表。 */
    function succOf(id) {
      var out = [];
      for (var i = 0; i < graph.order.length; i++) {
        var x = graph.order[i];
        if ((graph.preOf(x) || []).indexOf(id) >= 0) out.push(x);
      }
      return out;
    }

    /* 软后继：cells 的 soft 字段里提到 id 的那些 */
    function softSuccOf(id) {
      if (level !== 'cell') return [];
      var out = [];
      for (var i = 0; i < graph.order.length; i++) {
        var c = cellById[graph.order[i]];
        if (c && (c.soft || []).indexOf(id) >= 0) out.push(graph.order[i]);
      }
      return out;
    }

    function aheadOf(id, depth) {
      var layers = [], cur = [id], seen = {};
      seen[id] = 1;
      for (var d = 0; d < depth; d++) {
        var nxt = [];
        for (var i = 0; i < cur.length; i++) {
          var s = succOf(cur[i]);
          for (var j = 0; j < s.length; j++) {
            if (seen[s[j]]) continue;
            seen[s[j]] = 1;
            nxt.push(s[j]);
          }
        }
        if (!nxt.length) break;
        layers.push(nxt);
        cur = nxt;
      }
      return layers;
    }

    function plain(id) {
      if (level === 'cell') {
        var c = cellById[id] || {};
        return { id: id, name: c.name || id, cell: id, cellName: c.name || id, stage: c.stage || '' };
      }
      var it = items.filter(function (x) { return x.id === id; })[0] || {};
      var cc = cellById[it.cell] || {};
      return { id: id, name: it.name || id, cell: it.cell, cellName: cc.name || it.cell, stage: cc.stage || '', idx: it.idx };
    }

    function describe(id) {
      var base = plain(id);
      base.chain = rootPath(id).map(plain);
      base.ahead = aheadOf(id, 2).map(function (layer) { return layer.map(plain); });
      base.soft = softSuccOf(id).map(plain);
      base.leaf = succOf(id).length === 0;
      base.depth = depthOf(id);
      return base;
    }

    function answer(id, correct) {
      if (id == null) id = cursor;
      if (id == null) return report();
      asked[id] = 1;
      set(id, correct ? KNOWN : DENIED);
      propagate();
      log.push({ id: id, ok: !!correct });
      return report();
    }

    function report() {
      var known = [], denied = [], unknown = [], frontier = [];
      graph.order.forEach(function (id) {
        if (state[id] === KNOWN) known.push(id);
        else if (state[id] === DENIED) denied.push(id);
        else unknown.push(id);
      });

      /* 卡点：自己不会、前置全都会 */
      denied.forEach(function (id) {
        var p = graph.preOf(id) || [];
        if (p.length && p.every(function (x) { return state[x] === KNOWN; })) frontier.push(id);
      });
      denied.forEach(function (id) {
        if (!(graph.preOf(id) || []).length && frontier.indexOf(id) < 0) frontier.push(id);
      });

      var depth = {};
      function dep(id) {
        if (depth[id] !== undefined) return depth[id];
        depth[id] = 0;
        var p = graph.preOf(id) || [], m = 0;
        for (var i = 0; i < p.length; i++) m = Math.max(m, dep(p[i]) + 1);
        depth[id] = m;
        return m;
      }
      /* 先按依赖深度（浅的先补），同深度按学段（小学 → 本科）。
         frontier 内部两两不可比，所以这个顺序不是唯一解，只是「从易到难」的默认引导。 */
      var STAGE_ORDER = ['小学', '初中', '高中', '本科'];
      function stageIdx(id) {
        var c = cellById[(level === 'cell') ? id : (items.filter(function (x) { return x.id === id; })[0] || {}).cell];
        var i = c ? STAGE_ORDER.indexOf(c.stage) : -1;
        return i < 0 ? 9 : i;
      }
      frontier.sort(function (a, b) {
        var dd = dep(a) - dep(b);
        if (dd) return dd;
        return stageIdx(a) - stageIdx(b);
      });

      var canAsk = false;
      for (var i = 0; i < graph.order.length; i++) {
        var id2 = graph.order[i];
        if (state[id2] === undefined && !asked[id2] && graph.qOf(id2)) { canAsk = true; break; }
      }

      /* 学完这一项会直接解锁哪些（只算一层，静态结构，不模拟状态） */
      function unlocks(id) {
        var out = [];
        for (var k = 0; k < graph.order.length; k++) {
          var x = graph.order[k];
          if ((graph.preOf(x) || []).indexOf(id) >= 0) out.push(x);
        }
        return out;
      }

      return {
        level: level,
        asked: log.length,
        known: known.length,
        denied: denied.length,
        unknown: unknown.length,
        total: graph.order.length,
        knownIds: known,
        deniedIds: denied,
        frontier: frontier.map(function (id) {
          var d = describe(id);
          d.unlocks = unlocks(id).map(function (x) { return describe(x); });
          return d;
        }),
        next: frontier.slice(0, 3).map(function (id) { return describe(id); }),
        conflicts: conflicts,
        done: !canAsk
      };
    }

    /* 跳过：不改变掌握状态，只标记问过。
       「不知道」不是「不会」——硬判错会把学生的真实水平压下去，
       后面的推断全跟着错。所以跳过的题不产生任何结论。 */
    function skip(id) {
      if (id == null) id = cursor;
      if (id == null) return report();
      asked[id] = 1;
      log.push({ id: id, ok: null });
      return report();
    }

    return {
      level: level,
      next: next,
      answer: answer,
      skip: skip,
      report: report,
      judge: judge,
      parseGrade: parseGrade,
      describe: describe,
      state: function () { return Object.assign({}, state); },
      remaining: function () {
        var n = 0;
        graph.order.forEach(function (id) {
          if (state[id] === undefined && !asked[id] && graph.qOf(id)) n++;
        });
        return n;
      },
      /* 供 drill 使用 */
      _src: { items: items, cells: cells, questions: questions }
    };
  }

  /* 从一个格级引擎，进入某个边界格的格内诊断 */
  function drill(engine, cellId) {
    var s = engine._src;
    return create({
      items: s.items, cells: s.cells, questions: s.questions,
      level: 'item', cellFilter: cellId
    });
  }

  return { create: create, drill: drill, judge: judge, parseGrade: parseGrade };
}));
