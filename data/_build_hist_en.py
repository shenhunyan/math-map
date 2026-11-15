# -*- coding: utf-8 -*-
import json, re, io

SRC = r'C:/Users/Administrator/WorkBuddy/2026-10-22-19-03-23/math-map/math-map.html'
OUT = r'C:/Users/Administrator/WorkBuddy/2026-10-22-19-03-23/math-map/data/hist_en.json'

src = open(SRC, encoding='utf-8').read()
i = src.index('const T6 = [')
depth = 0
k = i + len('const T6 = [')
start = k
while True:
    ch = src[k]
    if ch == '[':
        depth += 1
    elif ch == ']':
        if depth == 0:
            break
        depth -= 1
    k += 1
body = src[start:k]
lines = [l.strip() for l in body.split('\n') if l.strip()]
assert len(lines) == 127, len(lines)

pat = re.compile(r'(?:"(yr|y|who|t|c|s)"|(yr|y|who|t|c|s))\s*:\s*(?:\'((?:[^\'\\]|\\.)*)\'|"((?:[^"\\]|\\.)*)"|(-?\d+))')
rows = []
for l in lines:
    d = {}
    for m in pat.finditer(l):
        key = m.group(1) or m.group(2)
        val = m.group(3) if m.group(3) is not None else (m.group(4) if m.group(4) is not None else m.group(5))
        d[key] = val
    assert set(d) == {'yr', 'y', 'who', 't', 'c', 's'}, d
    d['yr'] = int(d['yr'])
    rows.append(d)

TR = [
 ("Ancient Greece", "Euclid", "Elements", "Proof became the form of knowledge for the first time, rather than a rule of thumb."),
 ("Ancient Greece", "Apollonius", "Conic sections", "One plane slicing a cone collects the ellipse, the parabola and the hyperbola in a single stroke."),
 ("Islamic Golden Age", "al-Khwarizmi", "Algebra (al-jabr)", "'Transposing' and 'combining' became, for the first time, actions one could write down."),
 ("Middle Ages", "Fibonacci", "Liber Abaci", "Hindu-Arabic numerals enter Europe, and sequences appear for the first time in recursive form."),
 ("Renaissance", "Cardano", "Cubic and quartic equations", "Solution by radicals stops at degree four; beyond that, no one advanced for five hundred years."),
 ("17th century", "Descartes", "Coordinate system", "Algebra and geometry marry: figures and formulas translate into each other, the foundation of this whole map."),
 ("17th century", "Fermat", "Fermat's Last Theorem (margin note)", "A single margin note forced three centuries of algebraic number theory into existence."),
 ("17th century", "Newton", "Method of fluxions (calculus)", "Change itself becomes the object, no longer a static quantity."),
 ("17th century", "Leibniz", "Differential and integral notation", "The dy/dx and integral signs survive to this day, outliving the results themselves."),
 ("18th century", "Euler", "Zeta function and the Basel problem", "Sum of 1/n^2 = pi^2/6: the sum of reciprocal squares, and a circle appears in the answer."),
 ("18th century", "Gauss", "Fundamental theorem of algebra", "A degree-n equation has exactly n complex roots, so complex numbers are no longer 'imaginary'."),
 ("19th century", "Fourier", "Heat conduction and trigonometric series", "Any function can be split into a sum of sines, though convergence could not then be pinned down."),
 ("19th century", "Navier", "Equations of fluid motion", "First use of partial differential equations to describe a continuous medium; no general solution exists to this day."),
 ("19th century", "Abel", "Insolubility of the quintic", "Not 'not found yet' but 'does not exist': a proof that, for the first time, denied a possibility."),
 ("19th century", "Galois", "Groups and solvability of equations", "Whether an equation can be solved becomes a question about the symmetry of a group."),
 ("19th century", "Grassmann", "Exterior algebra", "Oriented area itself is treated as a number and made into something computable."),
 ("19th century", "Riemann", "Riemannian geometry", "The metric may vary from point to point, so space itself becomes a variable."),
 ("19th century", "Riemann", "Zeta hypothesis", "The distribution of the primes is pinned to a single critical line, still unproven."),
 ("19th century", "Klein", "Erlangen program", "Geometry = transformation group + invariants: nine geometries ordered in one stroke."),
 ("19th century", "Dedekind", "Dedekind cuts", "Continuity is defined as a cut, and the gaps in the real line are filled."),
 ("19th century", "Cantor", "Countable and uncountable", "Rationals can be listed, reals cannot: infinity acquires sizes for the first time."),
 ("19th century", "Poincaré", "Topology (Analysis Situs)", "Quantities unchanged under continuous deformation become a new object of study."),
 ("20th century", "Hilbert", "23 problems", "He marked out the century's directions; roughly half were later settled."),
 ("20th century", "Dirac", "Delta function", "A 'function' that is not a function forces distribution theory into being."),
 ("20th century", "Kolmogorov", "Axiomatization of probability", "Probability becomes a measure: randomness can now be computed rigorously."),
 ("20th century", "Grothendieck", "Schemes", "'Points' are replaced by prime ideals, so geometry can be done over any ring."),
 ("20th century", "Mandelbrot", "Fractals", "Dimension need not be an integer, and that piece of common sense was knocked down."),
 ("Contemporary", "Wiles", "Fermat's Last Theorem", "Three hundred and fifty-eight years on, modular forms and elliptic curves finish the margin note."),
 ("Contemporary", "Perelman", "Poincaré conjecture", "Ricci flow turns a topological problem into geometric evolution."),
 ("Ancient Babylon", "YBC 7289 tablet", "Sexagesimal approximation of the square root of 2", "Square root of 2 is about 1.41421296, more than a thousand years before Pythagoras."),
 ("Ancient Egypt", "Rhind Papyrus", "Unit fractions and geometry", "Fractions written as sums of unit fractions, the ancestor of bringing to a common denominator."),
 ("Ancient Greece", "The Pythagoreans", "Discovery of incommensurables", "The diagonal of a square is incommensurable with its side, so 'all is number' is refuted by its own theorem."),
 ("Ancient Greece", "Eudoxus", "Theory of proportion and method of exhaustion", "'Arbitrarily small' replaces 'infinitely small': the prehistoric form of the limit."),
 ("Ancient Greece", "Archimedes", "Upper and lower bounds for pi", "3.1408 < pi < 3.1429, squeezed out by inscribed and circumscribed polygons."),
 ("China", "Nine Chapters on the Mathematical Art", "Fangcheng (systems of linear equations)", "Coefficients laid out with counting rods and then eliminated: the world's earliest elimination method."),
 ("China", "Liu Hui", "Method of cutting the circle", "'The finer the cut, the less is lost': a complete statement of the idea of a limit."),
 ("China", "Zu Chongzhi", "355/113", "This fraction pins pi to six decimal places, nearly a millennium ahead of its time."),
 ("India", "Brahmagupta", "Arithmetic with zero and negative numbers", "Zero can take part in calculation for the first time, instead of merely meaning 'nothing'."),
 ("China", "Jia Xian", "Binomial coefficients arranged in a triangle", "Binomial coefficients laid out as a triangle, six hundred years before Pascal."),
 ("China", "Zhu Shijie", "Method of the four unknowns", "High-degree elimination with four unknowns; the record stood for five hundred years."),
 ("France", "Viète", "Symbolic algebra", "Letters stand for knowns and unknowns, so equations can at last be calculated with."),
 ("Scotland", "Napier", "Logarithms", "Multiplication becomes addition, and the arithmetic of navigation and astronomy shrinks sharply."),
 ("Switzerland", "Bernoulli", "Law of large numbers", "Frequency settles at probability, for the first time in the form of a theorem."),
 ("Switzerland", "Euler", "Introductio in analysin infinitorum", "e^(i pi) + 1 = 0: five constants strung together by one formula."),
 ("France", "Lambert", "pi is irrational", "Pi cannot be written as a fraction, and the proof runs through continued fractions."),
 ("Germany", "Gauss", "Disquisitiones Arithmeticae", "Congruences and quadratic reciprocity: number theory becomes a system for the first time."),
 ("France", "Cauchy", "Rigorous foundations of the limit", "'Approaches indefinitely' becomes epsilon-delta, and calculus no longer rests on intuition."),
 ("Russia", "Lobachevsky", "Non-Euclidean geometry", "Through a point off a line, infinitely many parallels: the fifth postulate is not necessary."),
 ("Ireland", "Hamilton", "Quaternions", "To describe rotations in three dimensions, multiplication gives up commutativity for the first time."),
 ("Germany", "Möbius", "One-sided surface", "A band with only one face, showing that orientability is not a topological necessity."),
 ("France", "Hermite", "e is transcendental", "e is not a root of any equation with integer coefficients."),
 ("Germany", "Lindemann", "pi is transcendental", "The impossibility of squaring the circle is thereby proved."),
 ("Germany", "Hilbert", "Grundlagen der Geometrie", "Points, lines and planes need no definition, only the satisfaction of the axioms."),
 ("France", "Lebesgue", "Measure and integral", "The range of what counts as integrable is widened, and the cracks in the Riemann integral are filled."),
 ("Netherlands", "Brouwer", "Fixed point theorem", "Map a disk continuously into itself, and some point always stays fixed."),
 ("Austria", "Gödel", "Incompleteness theorems", "In any sufficiently strong system there are true propositions that cannot be proved."),
 ("Britain", "Turing", "Computable numbers", "'Computable' is defined as what a machine can do."),
 ("United States", "Nash", "Equilibrium point", "When no one wants to change strategy unilaterally, the situation comes to rest."),
 ("United States", "Lorenz", "Deterministic chaos", "Deterministic equations can still give unpredictable trajectories."),
 ("16th century", "Simon Stevin", "De Thiende: decimal notation systematized", "Converting fractions bred errors everywhere, so he wrote decimal fractions as one notation."),
 ("17th century", "Bonaventura Cavalieri", "Geometria indivisibilibus: the method of indivisibles", "Curved figures cannot be measured directly, so he sliced them into infinitely thin pieces."),
 ("17th century", "Isaac Barrow", "Lectiones Geometricae: a general construction of tangents", "Tangents each had their own trick; he wanted one uniform construction."),
 ("17th century", "John Wallis", "Treatise of Algebra: negative numbers vindicated", "Negatives were dismissed as absurd numbers; he gave them a place on the number line."),
 ("17th century", "Michel Rolle", "Rolle's theorem", "Root finding was hopeless, so he first pinned down the stationary point between two roots."),
 ("17th century", "Guillaume de l'Hôpital", "Analyse des Infiniment Petits: the first calculus textbook", "Calculus lay scattered in letters, and he turned it into a book one could teach from."),
 ("18th century", "Brook Taylor", "Taylor series", "Function values were hard to compute, so he built the whole function from a power series."),
 ("18th century", "Leonhard Euler", "Proof that e is irrational", "A continued fraction expansion forces a contradiction: e cannot be a ratio of two integers."),
 ("18th century", "Jean d'Alembert", "Wave equation for a vibrating string", "How a string vibrates was unclear, so he wrote down a partial differential equation."),
 ("18th century", "Joseph-Louis Lagrange", "Théorie des fonctions analytiques: power series instead of limits", "Limits were unclear, so he simply bypassed them with power series."),
 ("19th century", "Jean-Robert Argand", "Planar geometric representation of complex numbers", "Imaginary numbers were thought fictitious; he drew them as points in a plane."),
 ("19th century", "Bernard Bolzano", "Rigorous proof of the intermediate value theorem", "The intermediate value theorem was only geometric intuition, and he wanted a purely analytic proof."),
 ("19th century", "Peter Gustav Lejeune Dirichlet", "Sufficient conditions for Fourier series convergence", "What a trigonometric series actually converges to: he gave a criterion one could check."),
 ("19th century", "Arthur Cayley", "Discovery of the octonions", "Quaternions had already lost commutativity; he gave up associativity as well."),
 ("19th century", "Karl Weierstrass", "A continuous nowhere differentiable function", "Functions were assumed differentiable almost everywhere, and he built the counterexample."),
 ("19th century", "Gaston Darboux", "Darboux sums and Darboux's theorem", "Integrals depend on partitions and sample points; he proved upper and lower sums must converge together."),
 ("19th century", "Ferdinand Frobenius", "Classification of real division algebras", "Were there new number systems after the quaternions? He showed only three remain."),
 ("19th century", "Gottlob Frege", "Grundlagen der Arithmetik: number reduced to logic", "Nobody could say what a number is, so he tried to derive it from logic."),
 ("19th century", "Giuseppe Peano", "Axiom system for the natural numbers", "The natural numbers were used on intuition alone; he compressed them into five axioms."),
 ("19th century", "Georg Cantor", "Diagonal proof that the reals are uncountable", "Can the reals be listed? He answered with a diagonal refutation."),
 ("19th century", "Émile Borel", "Borel measure and measurable sets", "Length fails on bizarre sets, so he first fixed which sets are measurable."),
 ("20th century", "Bertrand Russell", "Russell's paradox", "Cantor's sets embraced everything, so he asked about 'the set of all sets'."),
 ("20th century", "Maurice Fréchet", "Metric spaces", "Convergence was discussed sequence by sequence, and he wanted an abstract distance."),
 ("20th century", "Stefan Banach", "Axiomatization of Banach spaces", "Function spaces each spoke their own language, so he unified complete normed spaces."),
 ("20th century", "Paul Cohen", "Forcing: independence of the continuum hypothesis", "The continuum hypothesis hung for eighty years; he proved the axioms cannot decide it."),
 ("17th century", "Girard Desargues", "First sketch of projective geometry", "Perspective drawing wants parallels to meet at infinity, which Euclidean geometry cannot hold."),
 ("17th century", "Seki Takakazu", "Determinant algorithm", "Solving systems in several unknowns needed a formula that decides outright whether a solution exists."),
 ("18th century", "Gabriel Cramer", "Cramer's rule", "Solving linear systems, he wanted the solution written straight from the coefficient determinant."),
 ("19th century", "C. F. Gauss", "Theorema Egregium", "Mapmaking raised the question whether curvature can be measured on the surface alone."),
 ("19th century", "Ernst Kummer", "Ideal numbers", "Unique factorization fails among cyclotomic integers, so 'ideal factors' had to be supplied."),
 ("19th century", "Arthur Cayley", "Matrix algebra", "Computing a composite linear map with one table demanded matrix multiplication."),
 ("19th century", "Eugenio Beltrami", "A surface model of hyperbolic geometry", "Whether non-Euclidean geometry was consistent required a model one could see."),
 ("19th century", "Camille Jordan", "Traité des substitutions: group theory systematized", "Galois's ideas were too scattered; a systematic, teachable group theory was needed."),
 ("19th century", "Enrico Betti", "Betti numbers", "He wanted integers to count a space's holes, not merely to ask whether it is connected."),
 ("19th century", "Walther von Dyck", "Axiomatic formulation of abstract groups", "Groups exist beyond permutation groups, so a definition from the multiplication table alone was needed."),
 ("19th century", "David Hilbert", "Basis theorem", "Invariant theory produced infinitely many generators, and he had to prove finitely many suffice."),
 ("19th century", "F. G. Frobenius", "Group characters", "Finite group structure is hard to see directly, so he mapped it to matrices and computed."),
 ("20th century", "G. Ricci and T. Levi-Civita", "Absolute differential calculus (tensor analysis)", "Formulas in curved space distort under a change of coordinates; a coordinate-free notation was needed."),
 ("20th century", "Henri Poincaré", "Poincaré conjecture", "Are all closed three-manifolds spheres? Homology criteria were no longer enough."),
 ("20th century", "Emmy Noether", "Ideal theory and Noetherian rings", "Ideals in rings grew chaotic, so a condition that ascending chains must stop was needed."),
 ("20th century", "J. W. Alexander", "Knot polynomial", "Knots take endlessly many shapes, so a computable and reliable invariant was needed."),
 ("20th century", "Georges de Rham", "de Rham's theorem", "Why should what differential forms compute equal the homology of a triangulation?"),
 ("20th century", "Hassler Whitney", "Embedding theorem", "Can an abstract manifold really sit in a higher-dimensional Euclidean space? It needed proof."),
 ("20th century", "S. Eilenberg and S. Mac Lane", "Categories and natural transformations", "Homology constructions were numerous and alike, and needed a unified structural language."),
 ("20th century", "André Weil", "Weil conjectures", "The number of solutions of equations over finite fields seemed governed by some topological structure."),
 ("20th century", "Norman Steenrod", "The Topology of Fibre Bundles", "Spaces that are locally a product but globally twisted needed a unified account."),
 ("20th century", "Jean-Pierre Serre", "Theory of coherent sheaves", "Local data on a variety does not assemble into the whole, so sheaves were needed to carry it."),
 ("20th century", "John Milnor", "Exotic 7-sphere", "Does homeomorphism imply diffeomorphism? The seven-dimensional sphere gave a counterexample."),
 ("20th century", "M. Atiyah and I. Singer", "Index theorem", "Why is the analytic index of an elliptic operator always equal to its topological index?"),
 ("20th century", "Vaughan Jones", "Jones polynomial", "A quantity emerging from von Neumann algebras unexpectedly turns out to distinguish knots."),
 ("17th century", "Pascal and Fermat", "Correspondence on the problem of points", "A game stopped midway, and how to split the stakes forced probability to be computed from expectation."),
 ("17th century", "Huygens", "De Ratiociniis in Ludo Aleae", "Experience at the gaming table arranged into propositions and proofs gave probability its first textbook."),
 ("17th century", "Raphson", "Newton-Raphson method", "With no root formula available, one can only iterate along the tangent again and again."),
 ("18th century", "de Moivre", "Normal curve approximating the binomial distribution", "With many coin tosses the binomial coefficients become unmanageable, so a continuous curve approximates them."),
 ("18th century", "Bayes", "Inverse probability (published posthumously)", "From known results back to causes, a probability formula running from effect to cause was missing."),
 ("19th century", "Gauss", "Least squares and error theory", "More observations than unknowns, all contradicting one another, so one minimizes the sum of squared errors."),
 ("19th century", "Laplace", "Théorie analytique des probabilités", "To turn probability from a gambling trick into a branch of analysis, the central limit theorem took shape."),
 ("19th century", "K. Pearson", "Chi-squared test", "How large a gap between observed and expected frequencies counts as significant needed a yardstick."),
 ("20th century", "Markov", "Markov chains", "To prove the law of large numbers without independence, he built dependent random sequences."),
 ("20th century", "Gosset (Student)", "t-distribution", "Brewing tests gave samples too small for the normal approximation, so a small-sample distribution was built."),
 ("20th century", "Courant, Friedrichs and Lewy", "CFL condition", "Simulating waves by difference equations diverges with a wrong step size, so a stability criterion was needed."),
 ("20th century", "Dantzig", "Simplex method", "Allocating resources optimally under linear constraints lacked an algorithm that could actually compute."),
 ("20th century", "Shannon", "A Mathematical Theory of Communication", "To measure how much information a message carries, uncertainty was written as entropy."),
 ("20th century", "Wiener", "Cybernetics", "Gun control, nerves and machines all regulate by feedback and needed one shared language."),
 ("20th century", "Kalman", "Kalman filter", "Measurements carry noise and models are inaccurate, so how to fuse them into an optimal estimate?"),
 ("20th century", "Cooley and Tukey", "Fast Fourier transform", "An N-point transform takes N^2 operations; splitting it in half brings it down to N log N."),
 ("20th century", "Cook", "NP-completeness", "Many problems look unrelated yet are equally hard, so one 'hardest' benchmark was needed."),
 ("20th century", "IEEE", "IEEE 754 floating-point standard", "Every machine had its own floating-point format, so results changed when you changed machines."),
]

assert len(TR) == 127, len(TR)

out = []
for r, (y, who, t, s) in zip(rows, TR):
    out.append({"yr": r["yr"], "y": y, "who": who, "t": t, "c": r["c"], "s": s})

data = json.dumps(out, ensure_ascii=False, indent=1)
with io.open(OUT, 'w', encoding='utf-8', newline='\n') as f:
    f.write(data + '\n')

# checks
for n, e in enumerate(out):
    wc = len(e['s'].split())
    if wc > 25:
        print('LONG', n, wc, e['s'])
print('count', len(out))
print('first', json.dumps(out[0], ensure_ascii=False))
print('last', json.dumps(out[-1], ensure_ascii=False))
