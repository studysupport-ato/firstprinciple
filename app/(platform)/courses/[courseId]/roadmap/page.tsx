import { notFound } from "next/navigation";
import RoadmapClient from "./RoadmapClient";
import { getPublishedRoadmap } from "@/lib/content/publishedStructure";

export default async function RoadmapPage({ params }: { params: Promise<{ courseId: string }> }) {
  const route = await params;
  const result = await getPublishedRoadmap(route.courseId);
  if (result.kind === "not-found") notFound();
  return <RoadmapClient course={result.value.course} weeks={result.value.weeks} daysByWeek={result.value.daysByWeek} />;
}
