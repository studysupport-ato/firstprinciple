import { notFound } from "next/navigation";
import RoadmapClient from "./RoadmapClient";
import { getPublishedRoadmap } from "@/lib/content/publishedStructure";

export default async function RoadmapPage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ preview?: string }> }) {
  const route = await params;
  const query = await searchParams;
  const result = await getPublishedRoadmap(route.courseId);
  if (result.kind === "not-found") notFound();
  return <RoadmapClient course={result.value.course} weeks={result.value.weeks} daysByWeek={result.value.daysByWeek} preview={query.preview === "1"} />;
}
