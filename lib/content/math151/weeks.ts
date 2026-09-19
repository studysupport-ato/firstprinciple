import type { Week } from "../types/course";

export const math151Weeks: Week[] = [
  { id: "math151-week-1", courseId: "math-151", chapterIds: ["real-number-theory"], title: "Real Number Theory", description: "Number systems, order, and mathematical induction.", weekNumber: 1, sessionIds: ["math151-real-numbers", "math151-induction", "math151-well-ordered-sets", "math151-induction-practice"] },
  { id: "math151-week-2", courseId: "math-151", chapterIds: ["complex-numbers"], title: "Complex Numbers I", description: "The complex plane, modulus, argument, and polar form.", weekNumber: 2, sessionIds: ["math151-complex-origins", "math151-argand-plane", "math151-complex-operations", "math151-polar-representation"] },
  { id: "math151-week-3", courseId: "math-151", chapterIds: ["complex-numbers-ii"], title: "Complex Numbers II", description: "De Moivre's theorem, roots of unity, and polynomial roots.", weekNumber: 3, sessionIds: ["math151-de-moivre", "math151-polar-operations", "math151-cosine-identities", "math151-roots-of-unity", "math151-complex-powers"] },
  { id: "math151-week-4", courseId: "math-151", chapterIds: ["vector-algebra"], title: "Vector Algebra I", description: "Vectors, components, dot products, projections, and cross products.", weekNumber: 4, sessionIds: ["math151-vector-basics", "math151-unit-vectors", "math151-dot-product", "math151-cross-product"] },
  { id: "math151-week-5", courseId: "math-151", chapterIds: ["vector-algebra-ii"], title: "Vector Algebra II", description: "Linear dependence, lines, planes, and mixed review.", weekNumber: 5, sessionIds: ["math151-linear-dependence", "math151-lines-planes", "math151-review"] },
];
