// 「先找最凸的点，定下旋转角，再调参」——验证这个思路
// 抛物线：顶点处曲率最大，且切线垂直于对称轴 ⇒ 法线方向就是轴的方向
// 轴定下来 → 转正 → 只剩 y = a·x² + c 两个系数，线性最小二乘一次解完

function rot(x, y, th) {
  return { x: x * Math.cos(th) - y * Math.sin(th), y: x * Math.sin(th) + y * Math.cos(th) };
}

// 离散曲率：三点外接圆半径的倒数
function curvatureAt(p0, p1, p2) {
  var a = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  var b = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  var c = Math.hypot(p2.x - p0.x, p2.y - p0.y);
  var area2 = Math.abs((p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y));
  if (area2 < 1e-12) return 0;
  return 2 * area2 / (a * b * c);
}

function smoothKappa(pts, win) {
  var k = [], i;
  for (i = 0; i < pts.length; i++) k.push(0);
  for (i = 1; i < pts.length - 1; i++) k[i] = curvatureAt(pts[i - 1], pts[i], pts[i + 1]);
  // 滑动平均，压掉手抖造成的假极值
  var out = [];
  for (i = 0; i < k.length; i++) {
    var s = 0, c = 0;
    for (var j = -win; j <= win; j++) {
      var t = i + j;
      if (t > 0 && t < k.length - 1) { s += k[t]; c++; }
    }
    out.push(c ? s / c : 0);
  }
  return out;
}

function fitParabolaByVertex(pts) {
  var k = smoothKappa(pts, 4);
  // 顶点 = 曲率最大处（排除端点）
  var best = -1, bv = -1;
  for (var i = 3; i < pts.length - 3; i++) if (k[i] > bv) { bv = k[i]; best = i; }
  if (best < 0) return null;

  // 该点切线方向（用前后各 3 点的弦）
  var p0 = pts[Math.max(0, best - 3)], p2 = pts[Math.min(pts.length - 1, best + 3)];
  var tang = Math.atan2(p2.y - p0.y, p2.x - p0.x);
  var axis = tang + Math.PI / 2;          // 对称轴方向 = 法线方向

  /* 轴初值来自曲率极值点，受噪声影响大约差几度。
     这几度会让残差涨到 5%——所以在 ±6° 内扫一遍，取残差最小的角度。
     一次拟合只要一次 2×2 求解，扫 25 个角度依然很便宜。 */
  function fitAtAxis(ax) {
    var r2 = [];
    for (var j = 0; j < pts.length; j++)
      r2.push(rot(pts[j].x - pts[best].x, pts[j].y - pts[best].y, -(ax - Math.PI / 2)));
    var sxx = 0, sxy = 0, syy = 0, sy = 0, n = r2.length, q, sxy2 = 0;
    for (q = 0; q < n; q++) {
      var xx = r2[q].x * r2[q].x;
      sxx += xx * xx; sxy += xx; syy += 1; sy += r2[q].y; sxy2 += xx * r2[q].y;
    }
    var det = sxx * syy - sxy * sxy;
    if (Math.abs(det) < 1e-12) return null;
    var a2 = (sxy2 * syy - sxy * sy) / det;
    var c2 = (sy * sxx - sxy * sxy2) / det;
    var ss = 0;
    for (q = 0; q < n; q++) { var e = r2[q].y - (a2 * r2[q].x * r2[q].x + c2); ss += e * e; }
    return { a: a2, c: c2, rms: Math.sqrt(ss / n) };
  }

  var bestFit = null, bestAx = axis;
  for (var off = -6; off <= 6.001; off += 0.5) {
    var f2 = fitAtAxis(axis + off * Math.PI / 180);
    if (f2 && (!bestFit || f2.rms < bestFit.rms)) { bestFit = f2; bestAx = axis + off * Math.PI / 180; }
  }
  for (var off2 = -0.5; off2 <= 0.5001; off2 += 0.05) {
    var f3 = fitAtAxis(bestAx + off2 * Math.PI / 180);
    if (f3 && f3.rms < bestFit.rms) { bestFit = f3; bestAx = bestAx + off2 * Math.PI / 180; }
  }
  if (!bestFit) return null;
  var a = bestFit.a, c = bestFit.c, rmsV = bestFit.rms;
  axis = bestAx;
  return { angle: axis * 180 / Math.PI, a: a, c: c, rms: rmsV, vertex: pts[best] };
  return { angle: axis * 180 / Math.PI, a: a, c: c, rms: Math.sqrt(ss / n), vertex: pts[best] };
}

// ---- 测试：先看 0°，再看 25°，分离「坐标系」与「顶点定位」两类问题
[0, 25].forEach(function (deg) {
  var truthA = 0.28, truthTh = deg * Math.PI / 180;
  var raw = [];
  for (var i = -30; i <= 30; i++) {
    var x = i * 0.12, y = truthA * x * x;
    var P = rot(x, y, truthTh);
    raw.push({ x: P.x + Math.sin(i * 9.1) * 0.006, y: P.y + Math.sin(i * 4.7) * 0.006 });
  }
  var R = fitParabolaByVertex(raw);
  console.log('旋转 ' + deg + '°:  轴 = ' + R.angle.toFixed(1) + '°（应 ' + (90 + deg).toFixed(1) +
              '°）  a = ' + R.a.toFixed(3) + '（应 0.280）  rms = ' + R.rms.toFixed(4) +
              '  顶点 (' + R.vertex.x.toFixed(2) + ', ' + R.vertex.y.toFixed(2) + ')');
});
