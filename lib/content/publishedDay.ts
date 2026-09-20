import { createCourseStructureServerRepository, createDayContentServerRepository } from "./serverRepository";
import type { Lesson } from "./types/lesson";

export type PublishedDayResult = { kind: "not-found" } | { kind: "success"; lesson: Lesson };

export async function getPublishedDay(courseId: string, weekReference: string | undefined, dayId: string): Promise<PublishedDayResult> {
  const structure = createCourseStructureServerRepository();
  const content = createDayContentServerRepository();
  const course = await structure.getCourse(courseId);
  if (!course || !weekReference) return { kind: "not-found" };

  const weeks = await structure.listWeeksForCourse(courseId);
  const week = weeks.find((candidate) => candidate.id === weekReference || String(candidate.weekNumber) === weekReference);
  const day = week ? await structure.getDay(courseId, week.id, dayId) : undefined;

  if (!course || !week || !day) return { kind: "not-found" };
  if (course.status !== "published" || week.status !== "published" || day.status !== "published") return { kind: "not-found" };

  const blocks = await content.getDayContent(courseId, week.id, dayId);
  if (blocks === undefined) return { kind: "not-found" };
  return { kind: "success", lesson: { ...day, blocks } };
}