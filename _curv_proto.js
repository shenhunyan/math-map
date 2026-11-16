// 曲率驱动拟合原型：κ(s) 由多项式定义，两次积分得到曲线
// θ(s) = θ₀ + ∫κ ds,  x = x₀ + ∫cos θ ds,  y = y₀ + ∫sin θ ds
//
// 关键点：手绘点的弧长 s 由累积弦长直接给出，所以「谁配谁」不需要搜索——
// 这正是它比「参数族 + 仿射」省事的地方。

function integrate(kappa, th0, x0, y0, L, N) {
  var ds = L / N, pts = [], s = 0, th = th0, x = x0, y = y0;
  pts.push({ x: x, y: y, s: 0 });
  for (var i = 0; i < N; i++) {
    // 中点法，二阶精度够用且便宜
    var k1 = kappa(s), k2 = kappa(s + ds / 2);
    var thMid = th + k1 * ds / 2;
    th += k2 * ds;
    x += Math.cos(thMid) * ds;
    y += Math.sin(thMid) * ds;
    s += ds;
    pts.push({ x: x, y: y, s: s });
  }
  return pts;
}

function cumLen(pts) {
  var s = [0];
  for (var i = 1; i < pts.length; i++)
    s.push(s[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return s;
}

// 在给定弧长处插值取样，用来和目标点对齐
function atS(pts, sArr, s) {
  var lo = 0, hi = sArr.length - 1;
  if (s <= sArr[0]) return pts[0];
  if (s >= sArr[hi]) return pts[hi];
  while (hi - lo > 1) {
    var mid = (lo + hi) >> 1;
    if (sArr[mid] <= s) lo = mid; else hi = mid;
  }
  var r = (s - sArr[lo]) / (sArr[hi] - sArr[lo] || 1);
  return { x: pts[lo].x + (pts[hi].x - pts[lo].x) * r,
           y: pts[lo].y + (pts[hi].y - pts[lo].y) * r };
}

function makeCurve(p, sMax, N) {
  var a = p[0], b = p[1], c = p[2];
  var kappa = function (s) { return a + b * s + c * s * s; };
  return integrate(kappa, p[3], p[4], p[5], sMax, N);
}

function residual(p, targets, sT, N) {
  var curve = makeCurve(p, sT[sT.length - 1], N);
  var cs = cumLen(curve);
  var r = [], ss = 0;
  for (var i = 0; i < targets.length; i++) {
    var q = atS(curve, cs, sT[i]);
    r.push(q.x - targets[i].x);
    r.push(q.y - targets[i].y);
    ss += (q.x - targets[i].x) ** 2 + (q.y - targets[i].y) ** 2;
  }
  return { r: r, cost: ss };
}

// Gauss–Newton，雅可比用数值差分（只有 6 个参数，差分比手推更省事）
function fitCurvature(targets, p0, iters) {
  var sT = cumLen(targets);
  var p = p0.slice(), lambda = 1e-3, N = 400;
  var cur = residual(p, targets, sT, N).cost;
  for (var it = 0; it < iters; it++) {
    var base = residual(p, targets, sT, N).r;
    var J = [], m = base.length, n = p.length, i, j;
    for (j = 0; j < n; j++) {
      var h = 1e-6 * (Math.abs(p[j]) + 1);
      var q = p.slice(); q[j] += h;
      var rq = residual(q, targets, sT, N).r;
      var col = [];
      for (i = 0; i < m; i++) col.push((rq[i] - base[i]) / h);
      J.push(col);
    }
    // 正规方程 (JᵀJ + λI) δ = −Jᵀr
    var A = [], g = [];
    for (i = 0; i < n; i++) { A.push(new Array(n).fill(0)); g.push(0); }
    for (i = 0; i < n; i++) {
      for (j = 0; j < n; j++) {
        var s1 = 0;
        for (var k = 0; k < m; k++) s1 += J[i][k] * J[j][k];
        A[i][j] = s1;
      }
      var s2 = 0;
      for (var k2 = 0; k2 < m; k2++) s2 += J[i][k2] * base[k2];
      g[i] = -s2;
    }
    for (i = 0; i < n; i++) A[i][i] += lambda;
    var d = solveSmall(A, g);
    if (!d) break;
    var trial = p.map(function (v, idx) { return v + d[idx]; });
    var trialCost = residual(trial, targets, sT, N).cost;
    if (trialCost < cur) { p = trial; cur = trialCost; lambda = Math.max(lambda * 0.5, 1e-9); }
    else lambda *= 4;
  }
  return { p: p, cost: cur, rms: Math.sqrt(cur / targets.length) };
}

function solveSmall(A, b) {
  var n = b.length, M = A.map(function (row, i) { return row.concat([b[i]]); });
  for (var c = 0; c < n; c++) {
    var piv = c;
    for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-14) return null;
    var t = M[c]; M[c] = M[piv]; M[piv] = t;
    for (var r2 = 0; r2 < n; r2++) {
      if (r2 === c) continue;
      var f = M[r2][c] / M[c][c];
      for (var k = c; k <= n; k++) M[r2][k] -= f * M[c][k];
    }
  }
  return M.map(function (row, i) { return row[n] / row[i]; });
}

// ---- 测试：真值 κ(s) = 0.5 + 0.30s − 0.05s²，θ₀=0.40，起点 (0.2, −0.3)
var truth = [0.5, 0.30, -0.05, 0.40, 0.2, -0.3];
var curve = makeCurve(truth, 6.0, 600);
var cs = cumLen(curve);
var target = [], sT = [];
for (var i = 0; i <= 60; i++) {
  var s = 6.0 * i / 60;
  var q = atS(curve, cs, s);
  target.push({ x: q.x + (Math.sin(i * 7.7) * 0.02), y: q.y + (Math.sin(i * 3.1) * 0.02) });
  sT.push(s);
}
var start = [0.4, 0.2, -0.02, 0.3, 0.1, -0.2];   // 故意给一个不精确的初值
var res = fitCurvature(target, start, 40);
console.log('truth κ: a=0.500 b=0.300 c=-0.050  θ0=0.400  起点 (0.200, -0.300)');
console.log('fitted κ: a=' + res.p[0].toFixed(3) + ' b=' + res.p[1].toFixed(3) +
            ' c=' + res.p[2].toFixed(3) + '  θ0=' + res.p[3].toFixed(3) +
            '  起点 (' + res.p[4].toFixed(3) + ', ' + res.p[5].toFixed(3) + ')');
console.log('rms = ' + res.rms.toFixed(5) + '（点间噪声约 0.02）');
