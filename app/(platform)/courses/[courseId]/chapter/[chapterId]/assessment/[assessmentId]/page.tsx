import { notFound } from "next/navigation";
import Link from "next/link";
import { createAssessmentSupabaseRepository } from "@/lib/assessment/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AssessmentSelectionError, selectAssessmentQuestionsFromSupabase } from "@/lib/assessment/selection";
import type { Question } from "@/lib/content/types/question";
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

  let initialQuestions: Question[];
  try {
    initialQuestions = await selectAssessmentQuestionsFromSupabase(assessment, { includeDraft: preview }, () => client);
  } catch (error) {
    if (!(error instanceof AssessmentSelectionError)) throw error;

    console.error("[assessment unavailable]", {
      assessmentId: assessment.id,
      code: error.code,
      details: error.details,
    });
    const required = error.details.required;
    const available = error.details.available;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F6F3] p-6">
        <section className="max-w-xl rounded-[30px] border border-[#E5E5E5] bg-white p-10 text-center shadow-sm">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#666666]">Assessment unavailable</p>
          <h1 className="mt-4 font-serif text-4xl text-[#111111]">This assessment isn’t ready yet.</h1>
          <p className="mt-4 font-sans text-sm leading-relaxed text-[#666666]">
            {error.code === "INSUFFICIENT_QUESTION_POOL"
              ? "There aren’t enough published questions matching this assessment yet. Please try again later or contact your course administrator."
              : "The assessment setup needs attention from a course administrator."}
          </p>
          {typeof required === "number" && typeof available === "number" ? (
            <p className="mt-3 font-sans text-sm text-[#666666]">
              Required matching questions: {required}. Available: {available}.
            </p>
          ) : null}
          <Link href={`/courses/${encodeURIComponent(route.courseId)}/roadmap`} className="mt-8 inline-flex items-center rounded-full bg-[#111111] px-6 py-3 font-sans text-sm font-semibold text-white transition hover:bg-[#2563EB]">
            Back to roadmap
          </Link>
        </section>
      </main>
    );
  }

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
