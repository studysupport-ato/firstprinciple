import type { Chapter } from "../types/course";

export const math151Chapters: Chapter[] = [
  { id: "real-number-theory", courseId: "math-151", title: "Real Number Theory", description: "Number systems, order, and mathematical induction.", order: 1 },
  { id: "complex-numbers", courseId: "math-151", title: "Complex Numbers I", description: "The complex plane, modulus, argument, and polar form.", order: 2 },
  { id: "complex-numbers-ii", courseId: "math-151", title: "Complex Numbers II", description: "De Moivre's theorem, roots of unity, and polynomial roots.", order: 3 },
  { id: "vector-algebra", courseId: "math-151", title: "Vector Algebra I", description: "What dependence means, building vectors from others, and spotting dependence without calculating.", order: 4 },
  { id: "vector-algebra-ii", courseId: "math-151", title: "Vector Algebra II", description: "The dot, cross and scalar triple products as tests for dependence.", order: 5 },
  { id: "vector-algebra-iii", courseId: "math-151", title: "Vector Algebra III", description: "Lines and planes in space, read through dependence.", order: 6 },
  { id: "matrix-algebra", courseId: "math-151", title: "Matrix Algebra", description: "Matrices, determinants, inverses and systems of equations.", order: 7 },
  { id: "vector-algebra-iv", courseId: "math-151", title: "Vector Algebra IV", description: "Vector spaces, eigenvalues and eigenvectors.", order: 8 },
];
