import CourseLibraryClient from "./CourseLibraryClient";
import { listPublishedCourses, listPublishedCourseStructureSummaries } from "@/lib/content/publishedStructure";

export default async function CourseLibraryPage() {
  const courses = await listPublishedCourses();
  // Task 40F.2: authoritative published Course -> Week -> Day structure.
  // Two batched queries for all courses; no per-course N+1.
  const structure = await listPublishedCourseStructureSummaries(courses.map((course) => course.id));

  return <CourseLibraryClient courses={courses} structure={structure} />;
}
