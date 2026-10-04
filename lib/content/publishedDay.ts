import { createCourseStructureServerRepository, createDayContentServerRepository, type ContentClientFactory } from "./serverRepository";
import type { Lesson } from "./types/lesson";

export type PublishedDayResult = { kind: "not-found" } | { kind: "success"; lesson: Lesson };

/**
 * Task 40G.5C: an explicit `clientFactory` makes this read request-scoped and
 * RLS-constrained (student server pages pass `createSupabaseServerClient`).
 * Omitting it keeps the service-role default for admin/infra/test callers.
 */
export async function getPublishedDay(courseId: string, weekReference: string | undefined, dayId: string, clientFactory?: ContentClientFactory): Promise<PublishedDayResult> {
  const structure = createCourseStructureServerRepository(clientFactory);
  const content = createDayContentServerRepository(clientFactory);
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