import type { Week } from "../types/course";

export const math151Weeks: Week[] = [
  { id: "math151-week-1", courseId: "math-151", chapterIds: ["real-number-theory"], title: "Real Number Theory", description: "Number systems, order, and mathematical induction.", weekNumber: 1, sessionIds: ["math151-real-numbers"] },
  { id: "math151-week-2", courseId: "math-151", chapterIds: ["complex-numbers"], title: "Complex Numbers I", description: "The complex plane, modulus, argument, and polar form.", weekNumber: 2, sessionIds: ["math151-argand-plane"] },
  { id: "math151-week-3", courseId: "math-151", chapterIds: ["complex-numbers-ii"], title: "Complex Numbers II", description: "De Moivre's theorem, roots of unity, and polynomial roots.", weekNumber: 3, sessionIds: [] },
  { id: "math151-week-4", courseId: "math-151", chapterIds: ["vector-algebra"], title: "Vector Algebra I", description: "What dependence means, building vectors from others, and spotting dependence without calculating.", weekNumber: 4, sessionIds: [] },
  { id: "math151-week-5", courseId: "math-151", chapterIds: ["vector-algebra-ii"], title: "Vector Algebra II", description: "The dot, cross and scalar triple products as tests for dependence.", weekNumber: 5, sessionIds: ["math151-cross-product"] },
  { id: "math151-week-6", courseId: "math-151", chapterIds: ["vector-algebra-iii"], title: "Vector Algebra III", description: "Lines and planes in space, read through dependence.", weekNumber: 6, sessionIds: [] },
  { id: "math151-week-7", courseId: "math-151", chapterIds: ["matrix-algebra"], title: "Matrix Algebra", description: "Matrices, determinants, inverses and systems of equations.", weekNumber: 7, sessionIds: [] },
  { id: "math151-week-8", courseId: "math-151", chapterIds: ["vector-algebra-iv"], title: "Vector Algebra IV", description: "Vector spaces, eigenvalues and eigenvectors.", weekNumber: 8, sessionIds: [] },
];
