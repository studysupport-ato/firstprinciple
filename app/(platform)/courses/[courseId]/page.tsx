import { notFound } from "next/navigation";
import CourseOverviewClient from "./CourseOverviewClient";
import { getPublishedRoadmap } from "@/lib/content/publishedStructure";

export default async function CourseOverviewPage({ params }: { params: Promise<{ courseId: string }> }) {
  const route = await params;
  const result = await getPublishedRoadmap(route.courseId);
  if (result.kind === "not-found") notFound();
  const days = Object.values(result.value.daysByWeek).flat();
  return <CourseOverviewClient course={result.value.course} weeks={result.value.weeks} days={days} />;
}
