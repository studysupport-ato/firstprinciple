import type { Assessment } from "../types/assessment";

export const math151Assessments: Assessment[] = [
  {
    id: "math151-complex-numbers-checkpoint",
    courseId: "math-151",
    title: "Complex Numbers Checkpoint",
    description: "A short checkpoint covering the complex plane, modulus, and argument.",
    durationMinutes: 20,
    questionCount: 5,
    status: "published",
    blueprint: {
      rules: [{ difficulty: "mixed", count: 5, tags: ["complex-plane", "modulus", "argument"] }],
    },
  },
];
