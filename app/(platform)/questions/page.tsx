import { listPublishedCourses } from "@/lib/content/publishedStructure";
import { listQuestionDirectorySummaries } from "@/lib/questions/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import QuestionsExperience from "./QuestionsExperience";
import { withServerRouteTiming } from "@/lib/performance/serverTiming";

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  return withServerRouteTiming("questions", async (timing) => {
    const query = await searchParams;
    const preview = query.preview === "1";

    // Student-facing question directory data is Supabase-backed. Course and
    // question visibility is enforced by the authenticated server client/RLS.
    const client = await createSupabaseServerClient(timing);

    // The directory needs only course/chapter metadata for counts and the
    // practice destination. Fetch in bounded pages without loading question
    // text, answers, explanations, or other unused fields.
    const [courses, initialQuestions] = await Promise.all([
      listPublishedCourses(() => client),
      listQuestionDirectorySummaries(() => client, { visibility: "student", includeDraft: preview }),
    ]);

    return (
      <QuestionsExperience
        initialQuestions={initialQuestions}
        courses={courses}
        preview={preview}
      />
    );
  });
}
