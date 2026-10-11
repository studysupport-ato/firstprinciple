import { createCourseStructureServerRepository, type ContentClientFactory } from "./serverRepository";
import type { Lesson } from "./types/lesson";
import { withServerTimingSpan, type ServerTimingContext } from "../performance/timingSpans";

export type PublishedDayResult = { kind: "not-found" } | { kind: "success"; lesson: Lesson };

/**
 * Task 40G.5C: an explicit `clientFactory` makes this read request-scoped and
 * RLS-constrained (student server pages pass `createSupabaseServerClient`).
 * Omitting it keeps the service-role default for admin/infra/test callers.
 */
export async function getPublishedDay(
  courseId: string,
  weekReference: string | undefined,
  dayId: string,
  clientFactory?: ContentClientFactory,
  timing?: ServerTimingContext,
): Promise<PublishedDayResult> {
  if (!weekReference) return { kind: "not-found" };

  const structure = createCourseStructureServerRepository(clientFactory, timing);
  const [course, weeks, day] = await Promise.all([
    structure.getCourse(courseId),
    structure.listWeeksForCourse(courseId),
    structure.getDayForCourse(courseId, dayId, { validateContent: true }),
  ]);

  const validation = await withServerTimingSpan(timing, "publication_hierarchy_validation_ms", async () => {
    const week = weeks.find((candidate) => candidate.id === weekReference || String(candidate.weekNumber) === weekReference);
    return Boolean(
      course &&
      week &&
      day &&
      day.weekId === week.id &&
      course.status === "published" &&
      week.status === "published" &&
      day.status === "published",
    );
  });

  if (!validation || !day) return { kind: "not-found" };
  return { kind: "success", lesson: day };
}