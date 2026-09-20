import { config } from "dotenv"; config({ path: ".env.local" });
import { createCourseStructureServerRepository } from "../lib/content/serverRepository";

async function main() {
  const repo = createCourseStructureServerRepository();
  const courses = await repo.listCourses();
  const published = courses.filter(c => c.status === "published");
  if (!published[0]) { console.log("No published courses"); return; }
  const courseId = published[0].id;
  console.log("Course:", JSON.stringify(published[0]));
  const weeks = await repo.listWeeksForCourse(courseId);
  for (const w of weeks) {
    console.log("Week:", JSON.stringify(w));
    const days = await repo.listDaysForWeek(courseId, w.id);
    console.log("Days:", JSON.stringify(days.map(d => ({ id: d.id, title: d.title, status: d.status, weekId: d.weekId }))));
  }
}
main().catch(console.error);
