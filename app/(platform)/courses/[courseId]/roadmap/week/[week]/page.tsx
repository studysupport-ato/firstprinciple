import { notFound } from "next/navigation";
import WeekClient from "./WeekClient";
import { getPublishedWeek } from "@/lib/content/publishedStructure";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function WeekPage({ params, searchParams }: { params: Promise<{ courseId: string; week: string }>; searchParams: Promise<{ preview?: string }> }) {
  const route = await params;
  const query = await searchParams;
  // Task 40G.5C: request-scoped client -> published-only RLS.
  const supabase = await createSupabaseServerClient();
  const result = await getPublishedWeek(route.courseId, route.week, () => supabase);
  if (result.kind === "not-found") notFound();
  return <WeekClient course={result.value.course} week={result.value.week} days={result.value.days} preview={query.preview === "1"} />;
}
