import CourseLibraryClient from "./CourseLibraryClient";
import { listPublishedCourses } from "@/lib/content/publishedStructure";

export default async function CourseLibraryPage() {
  return <CourseLibraryClient courses={await listPublishedCourses()} />;
}
