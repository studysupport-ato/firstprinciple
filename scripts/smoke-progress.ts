import { config } from "dotenv";

config({ path: ".env.local" });

import { createProgressFactsRepository } from "../lib/progress/repository";

async function main() {
  const repository = createProgressFactsRepository("supabase");
  const studentId = "smoke-student-not-found";
  const dayProgress = await repository.listDayProgressForCourse(studentId, "smoke-course-not-found");
  const practiceAttempts = await repository.listPracticeAttempts(studentId, { limit: 1 });
  const assessmentAttempts = await repository.listAssessmentAttempts(studentId, { limit: 1 });
  const activity = await repository.listActivity(studentId, { limit: 1 });

  console.log("Supabase connection/query succeeded.");
  console.log(`dayProgress=${dayProgress.length}`);
  console.log(`practiceAttempts=${practiceAttempts.length}`);
  console.log(`assessmentAttempts=${assessmentAttempts.length}`);
  console.log(`activity=${activity.events.length}`);
  console.log("write paths skipped: read-only smoke test; no student or attempt rows were created.");
}

main().catch((error) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null
        ? JSON.stringify(error)
        : String(error);
  console.error(`Supabase progress smoke test failed: ${message}`);
  process.exitCode = 1;
});