import type { Chapter } from "../types/course";

export const math151Chapters: Chapter[] = [
  { id: "real-number-theory", courseId: "math-151", title: "Real Number Theory", description: "Number systems, order, and mathematical induction.", order: 1 },
  { id: "complex-numbers", courseId: "math-151", title: "Complex Numbers I", description: "The complex plane, modulus, argument, and polar form.", order: 2 },
  { id: "complex-numbers-ii", courseId: "math-151", title: "Complex Numbers II", description: "De Moivre's theorem, roots of unity, and polynomial roots.", order: 3 },
  { id: "vector-algebra", courseId: "math-151", title: "Vector Algebra I", description: "Vectors, components, dot products, projections, and cross products.", order: 4 },
  { id: "vector-algebra-ii", courseId: "math-151", title: "Vector Algebra II", description: "Linear dependence, lines, planes, and mixed review.", order: 5 },
];
