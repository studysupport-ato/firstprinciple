import { createCourseStructureServerRepository, type ContentClientFactory } from "./serverRepository";
import type { Lesson } from "./types/lesson";

export type PublishedDayResult = { kind: "not-found" } | { kind: "success"; lesson: Lesson };

/**
 * Task 40G.5C: an explicit `clientFactory` makes this read request-scoped and
 * RLS-constrained (student server pages pass `createSupabaseServerClient`).
 * Omitting it keeps the service-role default for admin/infra/test callers.
 */
export async function getPublishedDay(courseId: string, weekReference: string | undefined, dayId: string, clientFactory?: ContentClientFactory): Promise<PublishedDayResult> {
  const structure = createCourseStructureServerRepository(clientFactory);
  const [course, weeks] = await Promise.all([
    structure.getCourse(courseId),
    weekReference ? structure.listWeeksForCourse(courseId) : Promise.resolve([]),
  ]);
  if (!course || !weekReference) return { kind: "not-found" };

  const week = weeks.find((candidate) => candidate.id === weekReference || String(candidate.weekNumber) === weekReference);
  const day = week
    ? await structure.getDay(courseId, week.id, dayId, { validateContent: true })
    : undefined;

  if (!course || !week || !day) return { kind: "not-found" };
  if (course.status !== "published" || week.status !== "published" || day.status !== "published") return { kind: "not-found" };

  return { kind: "success", lesson: day };
}