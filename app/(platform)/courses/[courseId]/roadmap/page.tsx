import { notFound } from "next/navigation";
import RoadmapClient from "./RoadmapClient";
import { getPublishedRoadmap } from "@/lib/content/publishedStructure";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withServerRouteTiming } from "@/lib/performance/serverTiming";

export default async function RoadmapPage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ preview?: string }> }) {
  return withServerRouteTiming("course-roadmap", async (timing) => {
    const route = await params;
    const query = await searchParams;
    // Task 40G.5C: request-scoped client -> published-only RLS.
    const supabase = await createSupabaseServerClient(timing);
    const result = await getPublishedRoadmap(route.courseId, () => supabase);
    if (result.kind === "not-found") notFound();
    return <RoadmapClient course={result.value.course} weeks={result.value.weeks} daysByWeek={result.value.daysByWeek} preview={query.preview === "1"} />;
  });
}
