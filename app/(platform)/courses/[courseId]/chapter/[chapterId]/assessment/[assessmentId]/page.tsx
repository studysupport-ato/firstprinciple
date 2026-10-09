import { notFound } from "next/navigation";
import { createAssessmentSupabaseRepository } from "@/lib/assessment/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { selectAssessmentQuestionsFromSupabase } from "@/lib/assessment/selection";
import { AssessmentPageClient } from "./AssessmentPageClient";

export type AssessmentPageProps = {
  params: Promise<{ courseId: string; chapterId: string; assessmentId: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export default async function AssessmentPage({ params, searchParams }: AssessmentPageProps) {
  const route = await params;
  const query = await searchParams;
  const preview = query.preview === "1";

  // Task 40F.5 — the assessment definition and its blueprint are now read from
  // Supabase through the existing assessment repository, so an admin edit to the
  // blueprint immediately changes how student questions are selected.
  //
  // Uses the cookie-aware server client (the signed-in user's JWT, RLS-respecting)
  // rather than a service-role client. A missing or non-visible assessment is a
  // hard not-found: there is deliberately NO fallback to the Math 151 fixture.
  const client = await createSupabaseServerClient();
  const assessmentRepository = createAssessmentSupabaseRepository(() => client);
  const assessment = await assessmentRepository.getAssessment(route.assessmentId, {
    visibility: "student",
    includeDraft: preview,
  });

  if (!assessment) {
    notFound();
  }

  const initialQuestions = await selectAssessmentQuestionsFromSupabase(assessment, { includeDraft: preview }, () => client);

  if (!initialQuestions.length) {
    notFound();
  }

  return (
    <AssessmentPageClient
      initialQuestions={initialQuestions}
      courseId={route.courseId}
      chapterId={route.chapterId}
      assessmentId={route.assessmentId}
      preview={preview}
    />
  );
}
