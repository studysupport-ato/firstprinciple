import type { Assessment } from "../types/assessment";

export const math151Assessments: Assessment[] = [
  {
    id: "math151-complex-numbers-checkpoint",
    courseId: "math-151",
    title: "Complex Numbers Checkpoint",
    description: "A short checkpoint covering the complex plane, modulus, and argument.",
    durationMinutes: 20,
    questionCount: 3,
    status: "published",
    blueprint: {
      rules: [{ chapterId: "complex-numbers", difficulty: "mixed", count: 3, tags: ["complex-plane", "modulus", "argument"] }],
    },
  },
];
