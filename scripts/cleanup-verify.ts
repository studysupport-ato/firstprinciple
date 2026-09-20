import { config } from "dotenv";
config({ path: ".env.local" });

import { getAdminCoursesAction, deleteCourseAction } from "../lib/adminContentActions";

async function cleanup() {
  const result = await getAdminCoursesAction();
  if (!result.ok) {
    console.error("Failed to fetch courses:", result.error);
    return;
  }

  const courses = result.data;
  let deleted = 0;
  for (const course of courses) {
    if (course.course.code.startsWith("VERIFY-")) {
      console.log(`Deleting test course: ${course.course.code} (${course.course.id})`);
      await deleteCourseAction(course.course.id);
      deleted++;
    }
  }
  console.log(`Cleanup complete. Deleted ${deleted} verification courses.`);
}

cleanup().catch(console.error);
