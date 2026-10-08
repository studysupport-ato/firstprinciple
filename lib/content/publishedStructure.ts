import { createCourseStructureServerRepository, type ContentClientFactory } from "./serverRepository";
import { createSupabaseAdminClient } from "../supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/types";
import type { Course, Week } from "./types/course";
import type { Lesson } from "./types/lesson";

export type PublishedStructureResult<T> = { kind: "not-found" } | { kind: "success"; value: T };

function published<T extends { status?: string }>(value: T | undefined): value is T { return Boolean(value && value.status === "published"); }

/**
 * Structure-only Day read for the course page, roadmap and week list.
 *
 * These surfaces display id / title / description / week / order / status and
 * nothing else, so `content_blocks` (the full lesson body, including every
 * board visualizer's HTML) and `objectives` are deliberately NOT selected.
 * A lesson's blocks are loaded only on that lesson's own page
 * (`getPublishedDay`). The returned objects keep the `Lesson` shape with empty
 * `blocks` / `objectives` so existing consumers are unchanged.
 */
const DAY_STRUCTURE_COLUMNS = "id, course_id, week_id, chapter_id, title, description, order_index, estimated_minutes, status";
type DayStructureRow = { id: string; course_id: string; week_id: string; chapter_id: string | null; title: string; description: string; order_index: number; estimated_minutes: number; status: string };

async function listDayStructure(clientFactory: ContentClientFactory | undefined, courseId: string, weekId?: string): Promise<Lesson[]> {
  const client = (clientFactory ?? createSupabaseAdminClient)();
  let query = client.from("days").select(DAY_STRUCTURE_COLUMNS).eq("course_id", courseId);
  if (weekId) query = query.eq("week_id", weekId);
  const { data, error } = await query.order("week_id", { ascending: true }).order("order_index", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as DayStructureRow[]).map((row) => ({
    id: row.id,
    courseId: row.course_id,
    chapterId: row.chapter_id ?? "",
    weekId: row.week_id,
    title: row.title,
    description: row.description,
    order: row.order_index,
    estimatedMinutes: row.estimated_minutes,
    objectives: [],
    blocks: [],
    status: row.status as Lesson["status"],
  }));
}

export async function listPublishedCourses(clientFactory?: ContentClientFactory): Promise<Course[]> { return (await createCourseStructureServerRepository(clientFactory).listCourses()).filter(published); }

export async function getPublishedCourse(courseId: string, clientFactory?: ContentClientFactory): Promise<PublishedStructureResult<Course>> {
  const course = await createCourseStructureServerRepository(clientFactory).getCourse(courseId);
  return published(course) ? { kind: "success", value: course } : { kind: "not-found" };
}

export async function getPublishedRoadmap(courseId: string, clientFactory?: ContentClientFactory): Promise<PublishedStructureResult<{ course: Course; weeks: Week[]; daysByWeek: Record<string, Lesson[]> }>> {
  const repository = createCourseStructureServerRepository(clientFactory);
  const course = await repository.getCourse(courseId);
  if (!published(course)) return { kind: "not-found" };
  const [rawWeeks, rawDays] = await Promise.all([repository.listWeeksForCourse(courseId), listDayStructure(clientFactory, courseId)]);
  const weeks = rawWeeks.filter(published).sort((first, second) => first.weekNumber - second.weekNumber);
  const publishedWeekIds = new Set(weeks.map((week) => week.id));
  const dayEntries = rawDays.filter((day) => published(day) && publishedWeekIds.has(day.weekId)).reduce<Record<string, Lesson[]>>((groups, day) => {
    (groups[day.weekId] ??= []).push(day);
    return groups;
  }, {});
  // Student order follows the Admin-defined persisted order_index (never creation order).
  for (const key of Object.keys(dayEntries)) {
    dayEntries[key] = dayEntries[key].slice().sort((first, second) => first.order - second.order || first.id.localeCompare(second.id));
  }
  return { kind: "success", value: { course, weeks, daysByWeek: dayEntries } };
}

export async function getPublishedWeek(courseId: string, weekReference: string, clientFactory?: ContentClientFactory): Promise<PublishedStructureResult<{ course: Course; week: Week; days: Lesson[] }>> {
  const repository = createCourseStructureServerRepository(clientFactory);
  const course = await repository.getCourse(courseId);
  if (!published(course)) return { kind: "not-found" };
  const weeks = await repository.listWeeksForCourse(courseId);
  const week = weeks.find((candidate) => candidate.id === weekReference || String(candidate.weekNumber) === weekReference);
  if (!published(week)) return { kind: "not-found" };
  const days = (await listDayStructure(clientFactory, courseId, week.id)).filter(published);
  return { kind: "success", value: { course, week, days } };
}

/**
 * Task 40F.2 — published course-card structure, for surfaces that render many
 * course summaries at once (Course Library, Dashboard cards).
 *
 * Publication semantics are IDENTICAL to `getPublishedRoadmap` above:
 *   published course -> published week -> published day,
 * with days ordered by the database's own week order then `order_index`
 * (never by fixture session ids or creation order). A day whose week is not
 * published is excluded, so all course cards agree with the roadmap.
 *
 * Implemented as exactly TWO batched queries for ANY number of courses
 * (weeks + days), so adding course cards never introduces an N+1.
 *
 * `clientFactory` is injected following the existing repository convention:
 * server callers get the service-role client; browser callers pass
 * `createSupabaseBrowserClient` for published (public) content.
 */
export interface PublishedCourseStructureSummary {
  weekCount: number;
  dayCount: number;
  /** Published days in published order — the authoritative resume order. */
  days: {
    dayId: string;
    title: string;
    chapterId?: string;
    weekId: string;
    weekTitle: string;
    weekNumber: number;
  }[];
}

export async function listPublishedCourseStructureSummaries(
  courseIds: string[],
  clientFactory: () => SupabaseClient<Database> = createSupabaseAdminClient,
): Promise<Record<string, PublishedCourseStructureSummary>> {
  const ids = Array.from(new Set(courseIds)).filter(Boolean);
  const summaries: Record<string, PublishedCourseStructureSummary> = {};
  for (const id of ids) summaries[id] = { weekCount: 0, dayCount: 0, days: [] };
  if (ids.length === 0) return summaries;

  const client = clientFactory();
  const [weeksResult, daysResult] = await Promise.all([
    client.from("weeks").select("id, course_id, week_number, title, status").in("course_id", ids),
    client.from("days").select("id, course_id, week_id, order_index, title, status, chapter_id").in("course_id", ids),
  ]);
  if (weeksResult.error) throw weeksResult.error;
  if (daysResult.error) throw daysResult.error;

  type WeekRow = { id: string; course_id: string; week_number: number; title: string; status: string };
  const publishedWeeks = new Map<string, WeekRow>();
  for (const week of (weeksResult.data ?? []) as WeekRow[]) {
    if (week.status !== "published") continue;
    publishedWeeks.set(week.id, week);
  }

  type DayRow = { id: string; course_id: string; week_id: string; order_index: number | null; title: string; status: string; chapter_id: string | null };
  const rows = ((daysResult.data ?? []) as DayRow[])
    .filter((day) => day.status === "published" && publishedWeeks.has(day.week_id))
    .sort((first, second) => {
      const weekDelta = (publishedWeeks.get(first.week_id)?.week_number ?? 0) - (publishedWeeks.get(second.week_id)?.week_number ?? 0);
      if (weekDelta !== 0) return weekDelta;
      const orderDelta = (first.order_index ?? 0) - (second.order_index ?? 0);
      if (orderDelta !== 0) return orderDelta;
      return first.id.localeCompare(second.id);
    });

  for (const week of publishedWeeks.values()) {
    const summary = summaries[week.course_id];
    if (summary) summary.weekCount += 1;
  }

  for (const row of rows) {
    const summary = summaries[row.course_id];
    const week = publishedWeeks.get(row.week_id);
    if (!summary || !week) continue;
    summary.dayCount += 1;
    summary.days.push({
      dayId: row.id,
      title: row.title || "Day content has not been authored yet.",
      chapterId: row.chapter_id ?? undefined,
      weekId: week.id,
      weekTitle: week.title,
      weekNumber: week.week_number,
    });
  }

  return summaries;
}
