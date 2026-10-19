import { createSupabaseAdminClient } from "../supabase/client";
import { callPublishedDayStepRpc } from "../supabase/publishedDayStepRpc";
import type { Database } from "../supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseContentBlocks } from "./repository";
import { createCourseStructureServerRepository, type ContentClientFactory } from "./serverRepository";
import type { Lesson } from "./types/lesson";
import { withServerTimingSpan, type ServerTimingContext } from "../performance/timingSpans";

export type PublishedDayResult = { kind: "not-found" } | { kind: "success"; lesson: Lesson; unavailable?: boolean };
export type PublishedDayStep = { step: number; title: string };
export type PublishedDayStepResult =
  | { kind: "not-found" }
  | { kind: "success"; lesson: Lesson; steps: PublishedDayStep[]; testingMode: boolean };

export type { ContentClientFactory };

/**
 * Compatibility helper for callers that still need the entire published Day.
 * Student lesson routes use metadata + the step RPC instead.
 */
export async function getPublishedDay(
  courseId: string,
  weekReference: string | undefined,
  dayId: string,
  clientFactory?: ContentClientFactory,
  timing?: ServerTimingContext,
): Promise<PublishedDayResult> {
  if (!weekReference) return { kind: "not-found" };
  const factory = clientFactory ?? createSupabaseAdminClient;
  const structure = createCourseStructureServerRepository(factory, timing);
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
  if (!validation || !day) {
    return { kind: "not-found" };
  }
  const week = weeks.find((candidate) => candidate.id === day.weekId);
  const unavailable = Boolean(course?.comingSoon || week?.comingSoon || day.comingSoon);
  return { kind: "success", lesson: day, unavailable };
}

/**
 * Read only the published Day metadata before checking lesson progression.
 * This prevents a direct URL to a locked lesson from transferring its body.
 */
export async function getPublishedDayMetadata(
  courseId: string,
  weekReference: string | undefined,
  dayId: string,
  clientFactory: ContentClientFactory,
  timing?: ServerTimingContext,
): Promise<PublishedDayResult> {
  if (!weekReference) return { kind: "not-found" };

  const client = clientFactory();
  const [courseResult, weeksResult, dayResult] = await Promise.all([
    withServerTimingSpan(timing, "published_course_metadata_query_ms", () =>
      client.from("courses").select("id,status").eq("id", courseId).maybeSingle(),
    ),
    withServerTimingSpan(timing, "published_weeks_metadata_query_ms", () =>
      client.from("weeks").select("id,week_number,status").eq("course_id", courseId).order("week_number", { ascending: true }),
    ),
    withServerTimingSpan(timing, "published_day_metadata_query_ms", () =>
      client
        .from("days")
        .select("id,course_id,week_id,chapter_id,title,description,order_index,estimated_minutes,objectives,status")
        .eq("course_id", courseId)
        .eq("id", dayId)
        .maybeSingle(),
    ),
  ]);

  if (courseResult.error) throw courseResult.error;
  if (weeksResult.error) throw weeksResult.error;
  if (dayResult.error) throw dayResult.error;

  const course = courseResult.data as { id: string; status: string } | null;
  const weeks = (weeksResult.data ?? []) as Array<{ id: string; week_number: number; status: string }>;
  const day = dayResult.data as {
    id: string;
    course_id: string;
    week_id: string;
    chapter_id: string | null;
    title: string;
    description: string;
    order_index: number;
    estimated_minutes: number;
    objectives: unknown;
    status: string;
  } | null;
  const week = weeks.find((candidate) => candidate.id === weekReference || String(candidate.week_number) === weekReference);

  if (
    !course ||
    course.status !== "published" ||
    !week ||
    week.status !== "published" ||
    !day ||
    day.week_id !== week.id ||
    day.status !== "published"
  ) {
    return { kind: "not-found" };
  }

  return {
    kind: "success",
    lesson: {
      id: day.id,
      courseId: day.course_id,
      weekId: day.week_id,
      chapterId: day.chapter_id ?? "",
      title: day.title,
      description: day.description,
      order: day.order_index,
      estimatedMinutes: day.estimated_minutes,
      objectives: Array.isArray(day.objectives) ? (day.objectives as string[]) : [],
      blocks: [],
      status: day.status as Lesson["status"],
    },
  };
}

/**
 * The RPC runs with the caller's JWT and SECURITY INVOKER, and enforces the
 * published hierarchy, per-student progression, and verified testing setting.
 */
export async function getPublishedDayStep(
  courseId: string,
  weekReference: string,
  dayId: string,
  step: number | null,
  clientFactory: ContentClientFactory,
  timing?: ServerTimingContext,
): Promise<PublishedDayStepResult> {
  const client = clientFactory();
  const { data, error } = await withServerTimingSpan(timing, "published_day_step_rpc_ms", () =>
    callPublishedDayStepRpc(client, {
      p_course_id: courseId,
      p_week_reference: weekReference,
      p_day_id: dayId,
      p_step: step,
    }),
  );
  if (error) throw error;

  const row = data?.[0];
  if (!row) return { kind: "not-found" };

  const steps = parseStepMetadata(row.step_metadata);
  return {
    kind: "success",
    lesson: {
      id: row.id,
      courseId: row.course_id,
      weekId: row.week_id,
      chapterId: row.chapter_id ?? "",
      title: row.title,
      description: row.description,
      order: row.order_index,
      estimatedMinutes: row.estimated_minutes,
      objectives: Array.isArray(row.objectives) ? (row.objectives as string[]) : [],
      blocks: parseContentBlocks(row.content_blocks),
      status: row.status as Lesson["status"],
    },
    steps,
    testingMode: row.testing_mode,
  };
}

function parseStepMetadata(value: unknown): PublishedDayStep[] {
  if (!Array.isArray(value)) throw new Error("Supabase returned invalid lesson step metadata.");
  return value.map((entry, index) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof entry.step !== "number" ||
      !Number.isInteger(entry.step) ||
      typeof entry.title !== "string"
    ) {
      throw new Error(`Supabase returned invalid metadata for lesson step ${index + 1}.`);
    }
    return { step: entry.step, title: entry.title };
  });
}