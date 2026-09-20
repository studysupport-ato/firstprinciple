import { notFound } from "next/navigation";
import WeekClient from "./WeekClient";
import { getPublishedWeek } from "@/lib/content/publishedStructure";

export default async function WeekPage({ params }: { params: Promise<{ courseId: string; week: string }> }) {
  const route = await params;
  const result = await getPublishedWeek(route.courseId, route.week);
  if (result.kind === "not-found") notFound();
  return <WeekClient course={result.value.course} week={result.value.week} days={result.value.days} />;
}
