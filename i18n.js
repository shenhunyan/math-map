/* 数学地图 · 双语数据层
   ------------------------------------------------------------------
   静态文案走 HTML 里的 .zh / .en 两个 span，由 <html class="lang-xx"> 控制显隐；
   动态内容（课程格的名字与说明）走这里的两张表。
   语言来源优先级：地址栏 ?lang= → localStorage → 默认中文。 */
(function (w) {
  var KEY = 'math-map-lang';

  var NAMES = {
    s_frac: 'Fractions and decimals',
    s_letter: 'Using letters to represent numbers',
    s_area: 'Perimeter and area',
    s_prop: 'Patterns and direct proportion',
    s_coord: 'Number pairs and coordinate systems',
    s_stat: 'Mean, median and mode',
    j_real: 'Irrational numbers and real numbers',
    j_quad: 'Quadratic equations in one unknown',
    j_pyth: 'The Pythagorean theorem',
    j_func: 'First- and second-degree functions',
    j_sys: 'Systems of linear equations in two unknowns',
    j_prob: 'Frequency and probability',
    g_cplx: 'Complex numbers and the complex plane',
    g_seq: 'Number sequences',
    g_conic: 'Conic sections',
    g_trig: 'Trigonometric functions',
    g_mat: 'Matrices and determinants (introductory)',
    g_dist: 'Distribution tables and expectation',
    b_real: 'Completeness of the real numbers and the structure of number systems',
    b_linsys: 'Structure of the solution set of linear systems',
    b_vec3: 'Analytic geometry in space',
    b_calc: 'Limits, derivatives, integrals and series',
    b_linalg: 'Linear algebra',
    b_prob: 'Probability theory and mathematical statistics'
  };

  var NOTES = {
    s_frac: 'What matters in primary school is not speed. It is knowing that every number has one fixed place on the number line, and that a fraction and a decimal are two spellings of that place.',
    s_letter: 'A balance is the original picture of an equation: add the same thing to both sides and it stays level. The chickens-and-rabbits trick and a system of equations are the same move written two ways — both count the extra legs.',
    s_area: 'Area is not a formula. It is how many unit squares it takes to cover the shape. The formula is only a fast way of counting them.',
    s_prop: 'Direct proportion is a straight line through the origin. It is the first function graph a child can actually read.',
    s_coord: 'Coordinates are the foundation of the whole map. Linear algebra, analytic geometry, function graphs — all of it grows from here.',
    s_stat: 'One set of numbers, three kinds of middle: the mean reads the total, the median reads the position, the mode reads the frequency. They agree only on symmetric data.',
    j_real: 'The gap between the rationals and the reals is not simply that there are holes. It is three separate facts: a cut with no point at it, an uncountable set, an approximation that never arrives.',
    j_quad: 'Solving the equation means finding where the curve meets the x-axis. The moment those crossings vanish, real roots become complex ones.',
    j_pyth: 'One theorem, four ways to see it: conservation of area, similar triangles, a rearranged trapezium, numerical search. Knowing two of them is what understanding means here.',
    j_func: 'Functions are the dividing line of middle school: before it you study numbers, after it you study relations.',
    j_sys: '"No solution" is not a mistake in the arithmetic. It is two parallel lines. The structure of the system decides whether a solution exists — this is where linear algebra starts.',
    j_prob: 'Toss enough times and the frequency settles near the probability. That settling is not proved until university, under the law of large numbers.',
    g_cplx: 'A complex number is not imaginary. It is a point on the plane. The price of i² = −1 is that you can no longer compare two of them.',
    g_seq: 'Arithmetic sequences are read by the first difference, geometric ones by the ratio, polynomial ones by how many differences it takes to reach a constant. That sentence is the whole classification.',
    g_conic: 'One family of curves, four languages: eccentricity gives the shape, the general form carries the discriminant, the standard form gives the position after completing the square, the parametric form shows how it moves.',
    g_trig: 'Trigonometric functions are circular motion projected onto a line. Every periodic phenomenon is described with them.',
    g_mat: 'A matrix is not a table of numbers. It is an action: it takes the whole plane and pulls it somewhere.',
    g_dist: 'Expectation is not the most likely value. It is the long-run average. The two get confused constantly.',
    b_real: 'Every extension has a price. The rationals to the reals loses countability; the reals to the complex numbers loses order. That line of prices is the hidden axis of the whole map.',
    b_linsys: 'Whether a solution exists, and how many, is decided by rank rather than by the particular numbers. This is the step from solving problems to seeing structure.',
    b_vec3: 'The cross product exists only in three dimensions. That is a privilege of 3D, and the reason it does not generalise.',
    b_calc: 'A definite integral is infinitely many infinitely thin rectangles added up. The more rectangles, the closer they hug the curve — that is what a limit looks like.',
    b_linalg: 'Eigenvectors are the directions a transformation does not turn. Find them and a complicated transformation becomes a few simple stretches.',
    b_prob: 'Central limit theorem: whatever the original distribution, adding many independent copies approaches the normal. This is why statistics works at all.'
  };


  var ITEMS = {
    "s_frac": [
      "Natural numbers, integers, fractions, decimals",
      "Position on the number line",
      "Adding fractions with the same denominator / with different denominators",
      "Fractions and division",
      "Percent, first pass"
    ],
    "s_letter": [
      "Letters for unknowns",
      "Properties of equalities",
      "Simple equations",
      "Using equations on word problems",
      "Chickens and rabbits in one cage"
    ],
    "s_area": [
      "Rectangles and squares",
      "Triangles and parallelograms",
      "Circumference and area of a circle",
      "Composite figures",
      "Unit conversion"
    ],
    "s_prop": [
      "Patterns in number sequences",
      "Direct and inverse proportion",
      "Table → graph",
      "First look at coordinates",
      "Reading a relation off a graph"
    ],
    "s_coord": [
      "Rows and columns",
      "Number pairs",
      "The Cartesian plane",
      "Translating a point",
      "Direction and distance"
    ],
    "s_stat": [
      "Tables and bar charts",
      "Mean, median and mode",
      "When to use which",
      "The effect of an outlier",
      "Grouping and reading data"
    ],
    "j_real": [
      "Rational and irrational numbers",
      "Dense but not complete",
      "Countable vs uncountable",
      "Reals and the number line, one to one",
      "Approximation and significant figures"
    ],
    "j_quad": [
      "Factoring",
      "Completing the square",
      "The quadratic formula",
      "Discriminant Δ = b²−4ac",
      "Vieta's formulas"
    ],
    "j_pyth": [
      "Congruent triangles",
      "Similar triangles",
      "Proof by rearranging areas",
      "Pythagorean triples",
      "Properties of circles"
    ],
    "j_func": [
      "Linear functions",
      "Inverse proportion",
      "Quadratic functions",
      "Opening, vertex, axis of symmetry",
      "Solving equations and inequalities graphically"
    ],
    "j_sys": [
      "Substitution",
      "Elimination",
      "The solution is where two lines meet",
      "No solution and infinitely many",
      "Word problems"
    ],
    "j_prob": [
      "Random events",
      "Estimating probability from frequency",
      "Equally likely outcomes",
      "Tree diagrams and tables",
      "Probability of simple events"
    ],
    "g_cplx": [
      "The imaginary unit i² = −1",
      "What a complex number means geometrically",
      "Arithmetic on complex numbers",
      "Modulus and conjugate",
      "Trigonometric form"
    ],
    "g_seq": [
      "Arithmetic and geometric sequences",
      "General term and sum",
      "Levels of difference",
      "Mathematical induction",
      "Binomial theorem"
    ],
    "g_conic": [
      "Ellipse",
      "Hyperbola",
      "Parabola",
      "Eccentricity and directrix",
      "Standard form and general form",
      "Parametric equations"
    ],
    "g_trig": [
      "Radians",
      "Unit circle definition",
      "Reduction formulas",
      "Sum-to-product formulas",
      "Transforming the sine curve"
    ],
    "g_mat": [
      "2×2 determinants",
      "Matrix addition and multiplication",
      "Matrices as linear transformations",
      "Inverse matrices",
      "(optional in some textbooks)"
    ],
    "g_dist": [
      "Discrete random variables",
      "Distribution tables",
      "Expectation and variance",
      "Binomial distribution",
      "First look at the normal"
    ],
    "b_real": [
      "Completeness (least upper bound)",
      "Dedekind cuts",
      "Cauchy sequences",
      "The complex field and algebraic closure",
      "Cardinality and countability",
      "Ordered fields and the loss of order"
    ],
    "b_linsys": [
      "Gaussian elimination",
      "Rank and existence of solutions",
      "Fundamental system and general solution",
      "Homogeneous and inhomogeneous",
      "Dimension of the solution space"
    ],
    "b_vec3": [
      "Coordinates in space",
      "Equations of planes and lines",
      "Dot, cross and scalar triple product",
      "Surfaces and curves",
      "Quadric surfaces"
    ],
    "b_calc": [
      "Limits and continuity",
      "Derivatives and differentials",
      "Mean value theorems",
      "Indefinite and definite integrals",
      "Multivariable calculus and multiple integrals",
      "Series and convergence tests",
      "Ordinary differential equations"
    ],
    "b_linalg": [
      "Vector spaces and subspaces",
      "Linear dependence and bases",
      "Linear maps and matrix representation",
      "Eigenvalues and eigenvectors",
      "Diagonalisation",
      "Quadratic forms and definiteness"
    ],
    "b_prob": [
      "Random variables and distribution functions",
      "Expectation, variance, covariance",
      "Law of large numbers and the central limit theorem",
      "Parameter estimation",
      "Hypothesis testing",
      "Regression"
    ]
  };

  function pick() {
    var q = null;
    try { q = new URLSearchParams(location.search).get('lang'); } catch (e) {}
    if (q === 'en' || q === 'zh') return q;
    var s = null;
    try { s = localStorage.getItem(KEY); } catch (e) {}
    return (s === 'en') ? 'en' : 'zh';
  }

  var CUR = pick();

  function applyClass(l) {
    document.documentElement.className = 'lang-' + l;
    document.documentElement.lang = (l === 'zh') ? 'zh-CN' : 'en';
  }
  applyClass(CUR);

  document.addEventListener('DOMContentLoaded', function () {
    /* 如果这份 HTML 不在 math-map/ 目录里（比如复制到别处单独打开），
       导航里的相对链接会指到不存在的文件，这里补上前缀。 */
    if (!/\/math-map\//.test(location.pathname)) {
      var as = document.querySelectorAll('nav a[href$=".html"]');
      for (var k = 0; k < as.length; k++) {
        if (as[k].getAttribute('href').indexOf('math-map/') !== 0) {
          as[k].setAttribute('href', 'math-map/' + as[k].getAttribute('href'));
        }
      }
    }
    var ins = document.querySelectorAll('[data-ph-zh]');
    for (var i = 0; i < ins.length; i++) {
      ins[i].setAttribute('placeholder',
        (CUR === 'en') ? (ins[i].getAttribute('data-ph-en') || '') : (ins[i].getAttribute('data-ph-zh') || ''));
    }
  });

  w.MM_ITEMS = function (id, zhArr) {
    return (CUR === 'en' && ITEMS[id]) ? ITEMS[id] : zhArr;
  };

  /* ---- 逐串替换：把页面里残余的中文文本节点换成英文 ----
     只做「整段完全相等」的替换，避免错切；跳过 .zh/.en 包裹的节点，
     否则切回中文时会把英文留在中文格里。 */
  function inLangSpan(node) {
    var p = node.parentNode;
    while (p && p !== document.body) {
      if (p.classList && (p.classList.contains('zh') || p.classList.contains('en'))) return true;
      p = p.parentNode;
    }
    return false;
  }

  function localize(root) {
    var D = w.MM_STR || {};
    if (!D || !Object.keys(D).length) return 0;
    var hits = 0;
    var it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        var tag = p.nodeName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CANVAS') return NodeFilter.FILTER_REJECT;
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = it.nextNode())) {
      if (inLangSpan(n)) continue;
      var raw = n.nodeValue, t = raw.trim();
      if (D[t] && D[t] !== t) { n.nodeValue = raw.replace(t, D[t]); hits++; }
    }
    var els = root.querySelectorAll('[title],[placeholder],[aria-label]');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      ['title', 'placeholder', 'aria-label'].forEach(function (a) {
        var v = e.getAttribute(a);
        if (v && D[v.trim()]) { e.setAttribute(a, D[v.trim()]); hits++; }
      });
    }
    return hits;
  }

  w.MM_LOCALIZE = localize;
  w.MM_LANG = function () { return CUR; };
  w.MM_NAME = function (id, zh) { return (CUR === 'en' && NAMES[id]) ? NAMES[id] : zh; };
  w.MM_NOTE = function (id, zh) { return (CUR === 'en' && NOTES[id]) ? NOTES[id] : zh; };
  /* 原地切换，不跳转：预览服务器不接受带查询串的地址（会 403），
     而且刷新会丢掉滚动位置和已展开的视图。 */
  w.MM_SWITCH = function (l) {
    if (l !== 'zh' && l !== 'en') return;
    CUR = l;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    applyClass(l);
    var ins = document.querySelectorAll('[data-ph-zh]');
    for (var i = 0; i < ins.length; i++) {
      ins[i].setAttribute('placeholder',
        (l === 'en') ? (ins[i].getAttribute('data-ph-en') || '') : (ins[i].getAttribute('data-ph-zh') || ''));
    }
    if (typeof w.MM_ONLANG === 'function') w.MM_ONLANG(l);
    if (l === 'en') localize(document.body);
  };
})(window);
