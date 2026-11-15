// 隐式二次曲线拟合原型：SVD/特征分解一次解，含旋转、切变、平移
// 目标：手绘点 → 一般二次曲线 Ax²+Bxy+Cy²+Dx+Ey+F=0 → 读出倾角与半轴

function jacobiEigen(Ain, n) {
  // 对称矩阵特征分解（Jacobi 旋转），返回 {values, vectors}
  const A = Ain.map(r => r.slice());
  let V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
    if (off < 1e-18) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-15) continue;
      const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) {
        const akp = A[k][p], akq = A[k][q];
        A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < n; k++) {
        const apk = A[p][k], aqk = A[q][k];
        A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < n; k++) {
        const vkp = V[k][p], vkq = V[k][q];
        V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq;
      }
    }
  }
  return { values: A.map((r, i) => r[i]), vectors: V };
}

function fitConic(pts) {
  // 设计矩阵 [x², xy, y², x, y, 1]
  const m = pts.length, n = 6;
  const M = Array.from({ length: n }, () => new Array(n).fill(0));
  for (const [x, y] of pts) {
    const row = [x * x, x * y, y * y, x, y, 1];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) M[i][j] += row[i] * row[j];
  }
  const { values, vectors } = jacobiEigen(M, n);
  let k = 0;
  for (let i = 1; i < n; i++) if (Math.abs(values[i]) < Math.abs(values[k])) k = i;
  let c = vectors.map(r => r[k]);
  // 尺度归一：让二次部分 Frobenius 范数为 1，避免系数整体缩放影响距离
  const q = Math.hypot(c[0], c[1], c[2]);
  c = c.map(v => v / q);
  // 几何距离近似所需的梯度归一（报告用）
  return { A: c[0], B: c[1], C: c[2], D: c[3], E: c[4], F: c[5] };
}

function describe(con) {
  const { A, B, C, D, E, F } = con;
  const disc = B * B - 4 * A * C;
  // 中心：解 [2A B; B 2C]·[cx,cy] = -[D,E]
  const det = 4 * A * C - B * B;
  let cx = 0, cy = 0;
  if (Math.abs(det) > 1e-12) {
    cx = (B * E - 2 * C * D) / det;
    cy = (B * D - 2 * A * E) / det;
  }
  // 二次型主轴
  const Q = [[A, B / 2], [B / 2, C]];
  const { values, vectors } = jacobiEigen(Q, 2);
  /* 主轴方向：椭圆取长轴（|λ| 小的那个），抛物线取 λ≈0 的那个 */
  let kk = Math.abs(values[0]) < Math.abs(values[1]) ? 0 : 1;
  let angle = Math.atan2(vectors[1][kk], vectors[0][kk]) * 180 / Math.PI;
  angle = ((angle % 180) + 180) % 180;   /* 方向按直线计，0–180 */
  const Fc = A * cx * cx + B * cx * cy + C * cy * cy + D * cx + E * cy + F;
  const kind = disc < -1e-9 ? 'ellipse' : (disc > 1e-9 ? 'hyperbola' : 'parabola');
  let axes = null;
  if (kind === 'ellipse') {
    const l1 = values[0], l2 = values[1];
    axes = [Math.sqrt(Math.abs(-Fc / l1)), Math.sqrt(Math.abs(-Fc / l2))].map(v => +v.toFixed(3));
  }
  return { kind, angle: +angle.toFixed(1), center: [+cx.toFixed(3), +cy.toFixed(3)], axes, maxAxis: +Math.max(...(axes || [0])).toFixed(3) };
}

function rnd(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = rnd(20261116);

function rotEllipse(cx, cy, a, b, deg, n, noise) {
  const th = deg * Math.PI / 180, pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2;
    const x0 = a * Math.cos(t), y0 = b * Math.sin(t);
    const x = cx + x0 * Math.cos(th) - y0 * Math.sin(th) + (R() - 0.5) * noise;
    const y = cy + x0 * Math.sin(th) + y0 * Math.cos(th) + (R() - 0.5) * noise;
    pts.push([x, y]);
  }
  return pts;
}

// 测试：真值 a=2.4 b=1.1 倾角 37° 中心 (0.3,-0.7)，加 1% 噪声
const truth = { a: 2.4, b: 1.1, deg: 37, c: [0.3, -0.7] };
const pts = rotEllipse(truth.c[0], truth.c[1], truth.a, truth.b, truth.deg, 60, 0.02);
const con = fitConic(pts);
const d = describe(con);
console.log('truth  : ellipse  angle=37.0  axes=[2.4, 1.1]  center=[0.3, -0.7]');
console.log('fitted :', d.kind, ' angle=' + d.angle, ' axes=' + JSON.stringify(d.axes), ' center=' + JSON.stringify(d.center));

// 再来一个旋转的抛物线（隐式二次照样能吃）
const para = [];
for (let i = -12; i <= 12; i++) {
  const t = i * 0.25, x0 = t, y0 = 0.28 * t * t;   // y = 0.28 x²
  const th = 25 * Math.PI / 180;
  para.push([x0 * Math.cos(th) - y0 * Math.sin(th) + 0.5, x0 * Math.sin(th) + y0 * Math.cos(th) - 1.2]);
}
console.log('para   :', JSON.stringify(describe(fitConic(para))));
