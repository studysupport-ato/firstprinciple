import CourseLibraryClient from "./CourseLibraryClient";
import { listPublishedCourses, listPublishedCourseStructureSummaries } from "@/lib/content/publishedStructure";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withServerRouteTiming } from "@/lib/performance/serverTiming";
import { isQuestionBankOnlyCourse } from "@/lib/questions/topicBanks";

export default async function CourseLibraryPage() {
  return withServerRouteTiming("course-library", async (timing) => {
    // Task 40G.5C: request-scoped client so these structure reads are subject to
    // the hardened published-only RLS policies. Works for signed-out visitors too.
    const supabase = await createSupabaseServerClient(timing);
    const client = () => supabase;

    // Question-bank-only courses (no lessons) live under Questions, not here.
    const courses = (await listPublishedCourses(client)).filter((course) => !isQuestionBankOnlyCourse(course.id));
    // Task 40F.2: authoritative published Course -> Week -> Day structure.
    // Two batched queries for all courses; no per-course N+1.
    const structure = await listPublishedCourseStructureSummaries(courses.map((course) => course.id), client);

    return <CourseLibraryClient courses={courses} structure={structure} />;
  });
}
