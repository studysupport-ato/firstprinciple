import { notFound } from "next/navigation";
import CourseOverviewClient from "./CourseOverviewClient";
import { getPublishedRoadmap } from "@/lib/content/publishedStructure";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CourseOverviewPage({ params }: { params: Promise<{ courseId: string }> }) {
  const route = await params;
  // Task 40G.5C: request-scoped client -> published-only RLS.
  const supabase = await createSupabaseServerClient();
  const result = await getPublishedRoadmap(route.courseId, () => supabase);
  if (result.kind === "not-found") notFound();
  const weekOrder = new Map(result.value.weeks.map((week, index) => [week.id, index] as const));
  const days = Object.values(result.value.daysByWeek)
    .flat()
    .slice()
    .sort(
      (first, second) =>
        (weekOrder.get(first.weekId) ?? 0) - (weekOrder.get(second.weekId) ?? 0) ||
        first.order - second.order ||
        first.id.localeCompare(second.id),
    );
  return <CourseOverviewClient course={result.value.course} weeks={result.value.weeks} days={days} />;
}
