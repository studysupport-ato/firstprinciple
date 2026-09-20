import { notFound } from "next/navigation";
import { getStudentAssessment } from "@/lib/content/access";
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
  const assessment = getStudentAssessment(route.assessmentId, { preview });

  if (!assessment) {
    notFound();
  }

  const initialQuestions = await selectAssessmentQuestionsFromSupabase(assessment, { includeDraft: preview });

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
