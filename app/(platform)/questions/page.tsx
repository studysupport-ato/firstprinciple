import { listPublishedCourses } from "@/lib/content/publishedStructure";
import { createAssessmentSupabaseRepository } from "@/lib/assessment/repository";
import { createQuestionRepository } from "@/lib/questions/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import QuestionsExperience from "./QuestionsExperience";

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const query = await searchParams;
  const preview = query.preview === "1";

  // Task 40F.6 — every student-facing value on this page is now Supabase-backed:
  // course filter, assessment filter (incl. blueprint chapter) and the questions.
  // No fixture metadata and no hardcoded chapter fallback.
  const client = await createSupabaseServerClient();

  // Task 40G.5C: reuse the page's request-scoped client so this course list is
  // constrained by the hardened published-only RLS policy.
  const courses = await listPublishedCourses(() => client);
  const initialCourseId = courses[0]?.id ?? "";

  // One bounded query for all student-visible assessments; the client filters
  // to the selected course, so switching course stays reactive without N+1.
  const assessments = await createAssessmentSupabaseRepository(() => client).listAssessments({
    visibility: "student",
    includeDraft: preview,
  });

  // Task 40G.4: bound to the authenticated server client so the questions RLS
  // policy is the enforcement boundary for this student read.
  const repository = createQuestionRepository("supabase", () => client);
  const initialQuestions = await repository.listQuestions({ visibility: "student", includeDraft: preview, courseId: initialCourseId || undefined });

  return (
    <QuestionsExperience
      initialQuestions={initialQuestions}
      initialCourseId={initialCourseId}
      courses={courses}
      assessments={assessments}
      preview={preview}
    />
  );
}
