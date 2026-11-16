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

  // 转到「轴竖直」的坐标系
  var rot2 = [];
  for (var j = 0; j < pts.length; j++) rot2.push(rot(pts[j].x - pts[best].x, pts[j].y - pts[best].y, -axis));

  // y = a·x² + c  （顶点在原点，无一次项）
  var sxx = 0, sxy = 0, syy = 0, sy = 0, n = rot2.length, q;
  for (q = 0; q < n; q++) { var xx = rot2[q].x * rot2[q].x; sxx += xx * xx; sxy += xx; syy += 1; sy += rot2[q].y; }
  var sxy2 = 0;
  for (q = 0; q < n; q++) sxy2 += rot2[q].x * rot2[q].x * rot2[q].y;
  // 正规方程 [[sxx,sxy],[sxy,n]]·[a,c] = [sxy2, sy]
  var det = sxx * syy - sxy * sxy;
  if (Math.abs(det) < 1e-12) return null;
  var a = (sxy2 * syy - sxy * sy) / det;
  var c = (sy * sxx - sxy * sxy2) / det;

  // 残差
  var ss = 0;
  for (q = 0; q < n; q++) { var e = rot2[q].y - (a * rot2[q].x * rot2[q].x + c); ss += e * e; }
  return { angle: axis * 180 / Math.PI, a: a, c: c, rms: Math.sqrt(ss / n), vertex: pts[best] };
}

// ---- 测试：y = 0.28x²，整体旋转 25°，加噪声
var truthA = 0.28, truthTh = 25 * Math.PI / 180;
var raw = [];
for (var i = -30; i <= 30; i++) {
  var x = i * 0.12, y = truthA * x * x;
  var P = rot(x, y, truthTh);
  raw.push({ x: P.x + Math.sin(i * 9.1) * 0.006, y: P.y + Math.sin(i * 4.7) * 0.006 });
}
var R = fitParabolaByVertex(raw);
console.log('真值：轴倾角 115.0°（25°+90°），a = 0.280');
console.log('结果：轴倾角 ' + R.angle.toFixed(1) + '°，a = ' + R.a.toFixed(3) +
            '，rms = ' + R.rms.toFixed(4));
console.log('顶点坐标 (' + R.vertex.x.toFixed(2) + ', ' + R.vertex.y.toFixed(2) + ')');
