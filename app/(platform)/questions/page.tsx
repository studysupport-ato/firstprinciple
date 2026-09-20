import { getCourses } from "@/lib/content/access";
import { createQuestionRepository } from "@/lib/questions/repository";
import QuestionsExperience from "./QuestionsExperience";

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const query = await searchParams;
  const preview = query.preview === "1";
  const courses = getCourses();
  const initialCourseId = courses[0]?.id ?? "";
  const repository = createQuestionRepository("supabase");
  const initialQuestions = await repository.listQuestions({ visibility: "student", includeDraft: preview, courseId: initialCourseId || undefined });

  return <QuestionsExperience initialQuestions={initialQuestions} initialCourseId={initialCourseId} preview={preview} />;
}
