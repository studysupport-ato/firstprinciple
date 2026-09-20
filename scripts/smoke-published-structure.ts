import { config } from "dotenv";
import { createCourseStructureRepository } from "../lib/content/repository";

config({ path: ".env.local" });

async function main() {
  const repository = createCourseStructureRepository("supabase");
  const courses = await repository.listCourses();
  const course = await repository.getCourse("smoke-course-not-found");
  const weeks = await repository.listWeeksForCourse("smoke-course-not-found");
  const week = await repository.getWeek("smoke-course-not-found", "smoke-week-not-found");
  const days = await repository.listDaysForWeek("smoke-course-not-found", "smoke-week-not-found");
  const day = await repository.getDay("smoke-course-not-found", "smoke-week-not-found", "smoke-day-not-found");

  console.log("Supabase course structure queries succeeded.");
  console.log(`courses=${courses.length}`);
  console.log(`missingCourse=${course === undefined}`);
  console.log(`weeks=${weeks.length}`);
  console.log(`missingWeek=${week === undefined}`);
  console.log(`days=${days.length}`);
  console.log(`missingDay=${day === undefined}`);
  console.log("read-only: no structure rows were inserted or modified.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Supabase published structure smoke test failed: ${message}`);
  process.exitCode = 1;
});