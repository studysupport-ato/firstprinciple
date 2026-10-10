import { getCourse, getCourses, getDay, getDaysByWeek, getLesson, getLessons, getWeek, getWeeks } from "./access";
import {
  getLocalLessonOverride,
  removeCourseRecord,
  removeLessonRecord,
  removeWeekRecord,
  saveCourseRecord,
  saveLessonOverride,
  saveLessonRecord,
  saveWeekRecord,
  validateBlock,
} from "./overrides";
import type { ContentStatus } from "./lifecycle";
import type { Course, Week } from "./types/course";
import type { ContentBlock, Lesson } from "./types/lesson";
import { createSupabaseBrowserClient } from "../supabase/client";
import type { Database } from "../supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CourseStructureDay = Lesson;

/** Admin-authored patch shapes: only the fields a caller explicitly supplies are written. */
export type CoursePatch = Partial<Pick<Course, "code" | "title" | "shortTitle" | "description" | "department" | "status">>;
export type WeekPatch = Partial<Pick<Week, "title" | "description" | "weekNumber" | "status" | "comingSoon">>;
export type DayPatch = Partial<
  Pick<Lesson, "chapterId" | "title" | "description" | "order" | "estimatedMinutes" | "objectives" | "blocks" | "status">
>;

export interface CourseStructureRepository {
  listCourses(): Promise<Course[]>;
  getCourse(courseId: string): Promise<Course | undefined>;
  listWeeksForCourse(courseId: string): Promise<Week[]>;
  listDaysForCourse(courseId: string): Promise<CourseStructureDay[]>;
  getWeek(courseId: string, weekId: string): Promise<Week | undefined>;
  listDaysForWeek(courseId: string, weekId: string): Promise<CourseStructureDay[]>;
  getDay(courseId: string, weekId: string, dayId: string): Promise<CourseStructureDay | undefined>;
  /** Single-row Day read by primary key (admin editor deep link). */
  getDayById(dayId: string): Promise<CourseStructureDay | undefined>;
  /** Scoped index reads for admin list pages (single query each — never N+1 per course). */
  listAllWeeks(): Promise<Week[]>;
  listAllDays(): Promise<CourseStructureDay[]>;

  // --- Task 39E admin write operations (Course -> Week -> Day) -------------
  createCourse(course: Course): Promise<Course>;
  updateCourse(courseId: string, patch: CoursePatch): Promise<Course>;
  setCourseStatus(courseId: string, status: ContentStatus): Promise<Course>;
  deleteCourse(courseId: string): Promise<void>;

  createWeek(week: Week): Promise<Week>;
  updateWeek(courseId: string, weekId: string, patch: WeekPatch): Promise<Week>;
  setWeekStatus(courseId: string, weekId: string, status: ContentStatus): Promise<Week>;
  deleteWeek(courseId: string, weekId: string): Promise<void>;

  createDay(day: Lesson): Promise<Lesson>;
  updateDay(courseId: string, weekId: string, dayId: string, patch: DayPatch): Promise<Lesson>;
  setDayStatus(courseId: string, weekId: string, dayId: string, status: ContentStatus): Promise<Lesson>;
  deleteDay(courseId: string, weekId: string, dayId: string): Promise<void>;
  /**
   * Persist an explicit Admin-defined Day sequence for one Week.
   * `orderedIds` is the full Day id list for the Week in the desired display order.
   * Implementations must rewrite positions deterministically (1..N, no duplicates)
   * without issuing N+1 reads or touching unrelated Weeks.
   */
  reorderDays(courseId: string, weekId: string, orderedIds: string[]): Promise<Lesson[]>;
  /**
   * Move an existing Day to another Week of the SAME Course (Task 40H.2),
   * appending it to the destination Week's end. Both Weeks are renumbered
   * sequentially (dense 1..N, no duplicate (week_id, order_index)); the Day id
   * and every other Day field are preserved, and dependent rows keep
   * referencing the same Day id.
   */
  moveDay(courseId: string, dayId: string, destinationWeekId: string): Promise<Lesson>;
}

const localCourseStructureRepository: CourseStructureRepository = {
  async listCourses() {
    return getCourses();
  },
  async getCourse(courseId: string) {
    return getCourse(courseId);
  },
  async listWeeksForCourse(courseId: string) {
    return getWeeks(courseId);
  },
  async listDaysForCourse(courseId: string) {
    return getLessons(courseId);
  },
  async getWeek(_courseId: string, weekId: string) {
    return getWeek(weekId);
  },
  async listDaysForWeek(courseId: string, weekId: string) {
    return getDaysByWeek(weekId).filter((day) => !courseId || day.courseId === courseId);
  },
  async getDay(courseId: string, weekId: string, dayId: string) {
    const day = getDay(dayId) ?? getLesson(dayId);
    if (!day) return undefined;
    if (courseId && day.courseId !== courseId) return undefined;
    if (day.weekId !== weekId) return undefined;
    return day;
  },
  async listAllWeeks() {
    return getWeeks();
  },
  async listAllDays() {
    return getLessons();
  },
  async getDayById(dayId: string) {
    return getDay(dayId) ?? getLesson(dayId);
  },
  async createCourse(course) {
    saveCourseRecord(course);
    return course;
  },
  async updateCourse(courseId, patch) {
    const current = getCourse(courseId);
    if (!current) throw new Error(`Unknown Course ${courseId}.`);
    const updated: Course = { ...current, ...patch, id: current.id };
    saveCourseRecord(updated);
    return updated;
  },
  async setCourseStatus(courseId, status) {
    return this.updateCourse(courseId, { status });
  },
  async deleteCourse(courseId) {
    removeCourseRecord(courseId);
  },
  async createWeek(week) {
    saveWeekRecord(week);
    return week;
  },
  async updateWeek(courseId, weekId, patch) {
    const current = getWeek(weekId) ?? getWeeks(courseId).find((week) => week.id === weekId);
    if (!current) throw new Error(`Unknown Week ${weekId}.`);
    const updated: Week = { ...current, ...patch, id: current.id, courseId: current.courseId };
    saveWeekRecord(updated);
    return updated;
  },
  async setWeekStatus(courseId, weekId, status) {
    return this.updateWeek(courseId, weekId, { status });
  },
  async deleteWeek(_courseId, weekId) {
    removeWeekRecord(weekId);
  },
  async createDay(day) {
    saveLessonRecord(day);
    return day;
  },
  async updateDay(courseId, weekId, dayId, patch) {
    const current = this.getDay(courseId, weekId, dayId);
    const resolved = await current;
    if (!resolved) throw new Error(`Unknown Day ${dayId} in the requested hierarchy.`);
    const updated: Lesson = { ...resolved, ...patch, id: resolved.id, courseId: resolved.courseId, weekId: resolved.weekId };
    saveLessonRecord(updated);
    return updated;
  },
  async setDayStatus(courseId, weekId, dayId, status) {
    return this.updateDay(courseId, weekId, dayId, { status });
  },
  async deleteDay(_courseId, _weekId, dayId) {
    removeLessonRecord(dayId);
  },
  async reorderDays(courseId, weekId, orderedIds) {
    const days = getDaysByWeek(weekId).filter((day) => !courseId || day.courseId === courseId);
    const ids = new Set(days.map((day) => day.id));
    if (orderedIds.length !== days.length || orderedIds.some((id) => !ids.has(id))) {
      throw new Error("Day reorder must include exactly the Days of this Week.");
    }
    const byId = new Map(days.map((day) => [day.id, day]));
    return orderedIds.map((id, index) => {
      const current = byId.get(id)!;
      const updated: Lesson = { ...current, order: index + 1 };
      saveLessonRecord(updated);
      return updated;
    });
  },
  async moveDay(courseId, dayId, destinationWeekId) {
    const current = getDay(dayId) ?? getLesson(dayId);
    if (!current || current.courseId !== courseId) throw new Error(`Day ${dayId} was not found in the selected course.`);
    if (current.weekId === destinationWeekId) throw new Error(`Day ${dayId} is already in Week ${destinationWeekId}.`);
    const destination = await this.getWeek(courseId, destinationWeekId);
    if (!destination || destination.courseId !== courseId) throw new Error(`Week ${destinationWeekId} was not found in Course ${courseId}.`);
    const sourceWeekId = current.weekId;
    const sourceWeek = await this.getWeek(courseId, sourceWeekId);
    if (!sourceWeek || sourceWeek.courseId !== courseId) throw new Error(`Source Week ${sourceWeekId} was not found in Course ${courseId}.`);
    const destinationDays = getDaysByWeek(destinationWeekId).filter((day) => day.courseId === courseId);
    const moved: Lesson = { ...current, weekId: destinationWeekId, order: destinationDays.length + 1 };
    saveLessonRecord(moved);
    // Renumber both Weeks sequentially after the move (dense 1..N).
    for (const weekId of [sourceWeekId, destinationWeekId]) {
      getDaysByWeek(weekId)
        .filter((day) => day.courseId === courseId)
        .slice()
        .sort((a, b) => a.order - b.order)
        .forEach((day, index) => saveLessonRecord({ ...day, order: index + 1 }));
    }
    return { ...moved, order: destinationDays.length + 1 };
  },
};

export const courseStructureLocalRepository = localCourseStructureRepository;

type SupabaseCourseRow = {
  id: string;
  code: string;
  title: string;
  short_title: string;
  description: string;
  department: string | null;
  status: string;
};

type SupabaseWeekRow = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  week_number: number;
  status: string;
  coming_soon: boolean;
};

type SupabaseDayRow = {
  id: string;
  course_id: string;
  week_id: string;
  chapter_id: string | null;
  title: string;
  description: string;
  order_index: number;
  estimated_minutes: number;
  objectives: unknown;
  content_blocks: unknown;
  status: string;
};

function mapCourseRow(row: SupabaseCourseRow): Course {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    shortTitle: row.short_title,
    description: row.description,
    department: row.department ?? undefined,
    chapterIds: [],
    weekIds: [],
    status: row.status as Course["status"],
  };
}

function mapWeekRow(row: SupabaseWeekRow): Week {
  return {
    id: row.id,
    courseId: row.course_id,
    chapterIds: [],
    title: row.title,
    description: row.description,
    weekNumber: row.week_number,
    sessionIds: [],
    status: row.status as Week["status"],
    comingSoon: row.coming_soon,
  };
}

function mapDayRow(row: SupabaseDayRow): Lesson {
  return {
    id: row.id,
    courseId: row.course_id,
    chapterId: row.chapter_id ?? "",
    weekId: row.week_id,
    title: row.title,
    description: row.description,
    order: row.order_index,
    estimatedMinutes: row.estimated_minutes,
    objectives: Array.isArray(row.objectives) ? (row.objectives as string[]) : [],
    blocks: Array.isArray(row.content_blocks) ? (row.content_blocks as Lesson["blocks"]) : [],
    status: row.status as Lesson["status"],
  };
}

/** Only the supplied Day fields reach the database (targeted updates, never a full replace). */
function dayPatchRow(patch: DayPatch) {
  const row: Record<string, unknown> = {};
  if (patch.chapterId !== undefined) row.chapter_id = patch.chapterId || null;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.order !== undefined) row.order_index = patch.order;
  if (patch.estimatedMinutes !== undefined) row.estimated_minutes = patch.estimatedMinutes;
  if (patch.objectives !== undefined) row.objectives = patch.objectives;
  if (patch.blocks !== undefined) row.content_blocks = patch.blocks;
  if (patch.status !== undefined) row.status = patch.status;
  return row;
}

/**
 * Renumber one Week's Days to a dense 1..N sequence using the same two-phase
 * negative-index staging as reorderDays/deleteDay, so UNIQUE(week_id,
 * order_index) can never collide mid-write and no unrelated Week is touched.
 * (Task 40H.2 — shared by moveDay's source/destination renumbering.)
 */
async function renumberWeekDays(client: SupabaseClient<Database>, courseId: string, weekId: string): Promise<void> {
  const { data, error } = await client.from("days").select("id, order_index").eq("course_id", courseId).eq("week_id", weekId);
  if (error) throw error;
  const rows = ((data ?? []) as { id: string; order_index: number }[]).slice().sort((a, b) => a.order_index - b.order_index);
  if (rows.length === 0) return;
  const staged = rows.map((row, index) => ({ id: row.id, order_index: -(index + 1) }));
  for (const entry of staged) {
    const { error: stageError } = await client.from("days").update({ order_index: entry.order_index } as never).eq("id", entry.id).eq("course_id", courseId).eq("week_id", weekId);
    if (stageError) throw stageError;
  }
  for (const [index, entry] of staged.entries()) {
    const { error: fixError } = await client.from("days").update({ order_index: index + 1 } as never).eq("id", entry.id).eq("course_id", courseId).eq("week_id", weekId);
    if (fixError) throw fixError;
  }
}

export function createCourseStructureSupabaseRepository(clientFactory: () => SupabaseClient<Database> = createSupabaseBrowserClient): CourseStructureRepository {
  return {
  async listCourses() {
    const client = clientFactory();
    const { data, error } = await client.from("courses").select("*").order("title", { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as SupabaseCourseRow[];
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      title: row.title,
      shortTitle: row.short_title,
      description: row.description,
      department: row.department ?? undefined,
      chapterIds: [],
      weekIds: [],
      status: row.status as Course["status"],
    }));
  },
  async getCourse(courseId: string) {
    const client = clientFactory();
    const { data, error } = await client.from("courses").select("*").eq("id", courseId).maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    const row = data as SupabaseCourseRow;
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      shortTitle: row.short_title,
      description: row.description,
      department: row.department ?? undefined,
      chapterIds: [],
      weekIds: [],
      status: row.status as Course["status"],
    };
  },
  async listWeeksForCourse(courseId: string) {
    const client = clientFactory();
    const { data, error } = await client.from("weeks").select("*").eq("course_id", courseId).order("week_number", { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as SupabaseWeekRow[];
    return rows.map((row) => ({
      id: row.id,
      courseId: row.course_id,
      chapterIds: [],
      title: row.title,
      description: row.description,
      weekNumber: row.week_number,
      sessionIds: [],
      status: row.status as Week["status"],
    }));
  },
  async listDaysForCourse(courseId: string) {
    const client = clientFactory();
    const { data, error } = await client.from("days").select("*").eq("course_id", courseId).order("week_id", { ascending: true }).order("order_index", { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as SupabaseDayRow[];
    return rows.map((row) => ({
      id: row.id,
      courseId: row.course_id,
      chapterId: row.chapter_id ?? "",
      weekId: row.week_id,
      title: row.title,
      description: row.description,
      order: row.order_index,
      estimatedMinutes: row.estimated_minutes,
      objectives: Array.isArray(row.objectives) ? (row.objectives as string[]) : [],
      blocks: Array.isArray(row.content_blocks) ? (row.content_blocks as Lesson["blocks"]) : [],
      status: row.status as Lesson["status"],
    }));
  },
  async getWeek(courseId: string, weekId: string) {
    const client = clientFactory();
    const { data, error } = await client.from("weeks").select("*").eq("course_id", courseId).eq("id", weekId).maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    const row = data as SupabaseWeekRow;
    return {
      id: row.id,
      courseId: row.course_id,
      chapterIds: [],
      title: row.title,
      description: row.description,
      weekNumber: row.week_number,
      sessionIds: [],
      status: row.status as Week["status"],
    };
  },
  async listDaysForWeek(courseId: string, weekId: string) {
    const client = clientFactory();
    const { data, error } = await client.from("days").select("*").eq("course_id", courseId).eq("week_id", weekId).order("order_index", { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as SupabaseDayRow[];
    return rows.map((row) => ({
      id: row.id,
      courseId: row.course_id,
      chapterId: row.chapter_id ?? "",
      weekId: row.week_id,
      title: row.title,
      description: row.description,
      order: row.order_index,
      estimatedMinutes: row.estimated_minutes,
      objectives: Array.isArray(row.objectives) ? (row.objectives as string[]) : [],
      blocks: Array.isArray(row.content_blocks) ? (row.content_blocks as Lesson["blocks"]) : [],
      status: row.status as Lesson["status"],
    }));
  },
  async getDay(courseId: string, weekId: string, dayId: string) {
    const client = clientFactory();
    const { data, error } = await client.from("days").select("*").eq("course_id", courseId).eq("week_id", weekId).eq("id", dayId).maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    const row = data as SupabaseDayRow;
    return {
      id: row.id,
      courseId: row.course_id,
      chapterId: row.chapter_id ?? "",
      weekId: row.week_id,
      title: row.title,
      description: row.description,
      order: row.order_index,
      estimatedMinutes: row.estimated_minutes,
      objectives: Array.isArray(row.objectives) ? (row.objectives as string[]) : [],
      blocks: Array.isArray(row.content_blocks) ? (row.content_blocks as Lesson["blocks"]) : [],
      status: row.status as Lesson["status"],
    };
  },
  async listAllWeeks() {
    const client = clientFactory();
    const { data, error } = await client.from("weeks").select("*").order("course_id", { ascending: true }).order("week_number", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as SupabaseWeekRow[]).map(mapWeekRow);
  },
  async listAllDays() {
    const client = clientFactory();
    const { data, error } = await client.from("days").select("*").order("course_id", { ascending: true }).order("week_id", { ascending: true }).order("order_index", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as SupabaseDayRow[]).map(mapDayRow);
  },
  async getDayById(dayId: string) {
    const client = clientFactory();
    const { data, error } = await client.from("days").select("*").eq("id", dayId).maybeSingle();
    if (error) throw error;
    return data ? mapDayRow(data as SupabaseDayRow) : undefined;
  },
  async createCourse(course: Course) {
    const client = clientFactory();
    const row = {
      id: course.id,
      code: course.code,
      title: course.title,
      short_title: course.shortTitle,
      description: course.description,
      department: course.department ?? null,
      status: course.status ?? "draft",
    };
    const { data, error } = await client.from("courses").insert(row as never).select("*").single();
    if (error) throw error;
    return mapCourseRow(data as SupabaseCourseRow);
  },
  async updateCourse(courseId: string, patch: CoursePatch) {
    const client = clientFactory();
    const row: Record<string, unknown> = {};
    if (patch.code !== undefined) row.code = patch.code;
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.shortTitle !== undefined) row.short_title = patch.shortTitle;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.department !== undefined) row.department = patch.department || null;
    if (patch.status !== undefined) row.status = patch.status;
    if (Object.keys(row).length === 0) throw new Error("No Course fields were supplied to update.");
    const { data, error } = await client.from("courses").update(row as never).eq("id", courseId).select("*").single();
    if (error) throw error;
    return mapCourseRow(data as SupabaseCourseRow);
  },
  async setCourseStatus(courseId: string, status: ContentStatus) {
    return this.updateCourse(courseId, { status });
  },
  async deleteCourse(courseId: string) {
    const client = clientFactory();
    const { error } = await client.from("courses").delete().eq("id", courseId);
    if (error) throw error;
  },
  async createWeek(week: Week) {
    const client = clientFactory();
    const row = {
      id: week.id,
      course_id: week.courseId,
      title: week.title,
      description: week.description,
      week_number: week.weekNumber,
      status: week.status ?? "draft",
      coming_soon: week.comingSoon ?? false,
    };
    const { data, error } = await client.from("weeks").insert(row as never).select("*").single();
    if (error) throw error;
    return mapWeekRow(data as SupabaseWeekRow);
  },
  async updateWeek(courseId: string, weekId: string, patch: WeekPatch) {
    const client = clientFactory();
    const row: Record<string, unknown> = {};
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.weekNumber !== undefined) row.week_number = patch.weekNumber;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.comingSoon !== undefined) row.coming_soon = patch.comingSoon;
    if (Object.keys(row).length === 0) throw new Error("No Week fields were supplied to update.");
    const { data, error } = await client.from("weeks").update(row as never).eq("course_id", courseId).eq("id", weekId).select("*").single();
    if (error) throw error;
    return mapWeekRow(data as SupabaseWeekRow);
  },
  async setWeekStatus(courseId: string, weekId: string, status: ContentStatus) {
    return this.updateWeek(courseId, weekId, { status });
  },
  async deleteWeek(courseId: string, weekId: string) {
    const client = clientFactory();
    const { error } = await client.from("weeks").delete().eq("course_id", courseId).eq("id", weekId);
    if (error) throw error;
  },
  async createDay(day: Lesson) {
    const client = clientFactory();
    // Default new Days to max(order_index)+1 so Ato never has to repair ordering.
    // Also repairs legacy `order: 0` collisions against UNIQUE(week_id, order_index).
    const { data: existing, error: existingError } = await client
      .from("days")
      .select("order_index")
      .eq("course_id", day.courseId)
      .eq("week_id", day.weekId);
    if (existingError) throw existingError;
    const taken = new Set(((existing ?? []) as { order_index: number }[]).map((row) => row.order_index));
    const max = [...taken].reduce((m, v) => Math.max(m, v), 0);
    const desired = Number.isFinite(day.order) && day.order > 0 && !taken.has(day.order) ? day.order : max + 1;
    const row = {
      id: day.id,
      course_id: day.courseId,
      week_id: day.weekId,
      chapter_id: day.chapterId || null,
      title: day.title,
      description: day.description,
      order_index: desired,
      estimated_minutes: day.estimatedMinutes,
      objectives: day.objectives,
      content_blocks: day.blocks,
      status: day.status ?? "draft",
    };
    const { data, error } = await client.from("days").insert(row as never).select("*").single();
    if (error) throw error;
    return mapDayRow(data as SupabaseDayRow);
  },
  async updateDay(courseId: string, weekId: string, dayId: string, patch: DayPatch) {
    const client = clientFactory();
    const row = dayPatchRow(patch);
    if (Object.keys(row).length === 0) throw new Error("No Day fields were supplied to update.");
    const { data, error } = await client
      .from("days")
      .update(row as never)
      .eq("course_id", courseId)
      .eq("week_id", weekId)
      .eq("id", dayId)
      .select("*")
      .single();
    if (error) throw error;
    return mapDayRow(data as SupabaseDayRow);
  },
  async setDayStatus(courseId: string, weekId: string, dayId: string, status: ContentStatus) {
    return this.updateDay(courseId, weekId, dayId, { status });
  },
  async deleteDay(courseId: string, weekId: string, dayId: string) {
    const client = clientFactory();
    // PHASE 7: blank-Day root cause — the Admin Week page can pass a stale
    // week_id (route weekNumber → week.id mismatch), so a scoped-only delete
    // returns zero rows while the row still exists. Resolve by primary key
    // first, then delete the owned row and renumber siblings in this Week.
    const { data: existing, error: lookupError } = await client.from("days").select("id,course_id,week_id").eq("id", dayId).maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) {
      throw new Error(`Day ${dayId} was not found in the selected course and week.`);
    }
    const row = existing as { id: string; course_id: string; week_id: string };
    if (row.course_id !== courseId) {
      throw new Error(`Day ${dayId} was not found in the selected course and week.`);
    }
    const actualWeekId = row.week_id;
    // Explicitly remove Day-owned placements/progress before deleting the Day so
    // dependent rows never block deletion on databases without CASCADE, while
    // historical practice/assessment attempts and activity events are preserved.
    const { error: placementError } = await client.from("resource_placements").delete().eq("day_id", dayId);
    if (placementError) throw placementError;
    const { error: progressError } = await client.from("student_day_progress").delete().eq("day_id", dayId);
    if (progressError) throw progressError;
    const { data, error } = await client
      .from("days")
      .delete()
      .eq("id", dayId)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error(`Day ${dayId} was not found in the selected course and week.`);
    }
    // Keep sibling positions dense (1..N) within the actual Week.
    const { data: siblings, error: siblingError } = await client
      .from("days")
      .select("id,order_index")
      .eq("course_id", courseId)
      .eq("week_id", actualWeekId)
      .order("order_index", { ascending: true });
    if (siblingError) throw siblingError;
    const rows = ((siblings ?? []) as { id: string; order_index: number }[]).sort((a, b) => a.order_index - b.order_index);
    void weekId; // accepted for API compatibility; actual week resolved from the row.
    if (rows.length > 0) {
      const staged = rows.map((sibling, index) => ({ id: sibling.id, order_index: -(index + 1) }));
      // Scoped to the owning Course + Week, mirroring reorderDays, so a sibling
      // id from another scope can never be renumbered by this call.
      const scope = (query: ReturnType<typeof client.from>) =>
        query.eq("course_id", courseId).eq("week_id", actualWeekId);
      for (const entry of staged) {
        const { error: stageError } = await scope(client.from("days").update({ order_index: entry.order_index } as never).eq("id", entry.id));
        if (stageError) throw stageError;
      }
      for (const [index, entry] of staged.entries()) {
        const { error: fixError } = await scope(client.from("days").update({ order_index: index + 1 } as never).eq("id", entry.id));
        if (fixError) throw fixError;
      }
    }
  },
  async reorderDays(courseId: string, weekId: string, orderedIds: string[]) {
    const client = clientFactory();
    // Single scoped read for the affected Week (no N+1, no unrelated Weeks).
    const { data: existing, error: existingError } = await client
      .from("days")
      .select("*")
      .eq("course_id", courseId)
      .eq("week_id", weekId);
    if (existingError) throw existingError;
    const rows = ((existing ?? []) as SupabaseDayRow[]).slice().sort((a, b) => a.order_index - b.order_index);
    const ids = new Set(rows.map((row) => row.id));
    if (orderedIds.length !== rows.length || new Set(orderedIds).size !== rows.length || orderedIds.some((id) => !ids.has(id))) {
      throw new Error("Day reorder must include exactly the Days of this Week.");
    }
    // Two-phase write avoids transient UNIQUE(week_id, order_index) collisions.
    const staged = orderedIds.map((id, index) => ({ id, order_index: -(index + 1) }));
    for (const entry of staged) {
      const { error } = await client.from("days").update({ order_index: entry.order_index } as never).eq("id", entry.id).eq("course_id", courseId).eq("week_id", weekId);
      if (error) throw error;
    }
    for (const [index, entry] of staged.entries()) {
      const { error } = await client.from("days").update({ order_index: index + 1 } as never).eq("id", entry.id).eq("course_id", courseId).eq("week_id", weekId);
      if (error) throw error;
    }
    const { data: refreshed, error: refreshError } = await client
      .from("days")
      .select("*")
      .eq("course_id", courseId)
      .eq("week_id", weekId)
      .order("order_index", { ascending: true });
    if (refreshError) throw refreshError;
    return ((refreshed ?? []) as SupabaseDayRow[]).map(mapDayRow);
  },
  async moveDay(courseId: string, dayId: string, destinationWeekId: string) {
    const client = clientFactory();
    // Resolve by primary key first (mirrors deleteDay), then re-verify the
    // Course so client-supplied ids can never move a Day the caller does not
    // own and no write happens before every id is validated server-side.
    const { data: existing, error: lookupError } = await client.from("days").select("*").eq("id", dayId).maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) throw new Error(`Day ${dayId} was not found.`);
    const day = existing as SupabaseDayRow;
    if (day.course_id !== courseId) throw new Error(`Day ${dayId} does not belong to Course ${courseId}.`);
    const sourceWeekId = day.week_id;
    if (sourceWeekId === destinationWeekId) throw new Error(`Day ${dayId} is already in Week ${destinationWeekId}.`);
    // Both Weeks must exist inside the SAME Course — a Week from another
    // Course fails this scoped read, so cross-course transfers are impossible.
    const { data: sourceWeek, error: sourceWeekError } = await client.from("weeks").select("id").eq("course_id", courseId).eq("id", sourceWeekId).maybeSingle();
    if (sourceWeekError) throw sourceWeekError;
    if (!sourceWeek) throw new Error(`Source Week ${sourceWeekId} was not found in Course ${courseId}.`);
    const { data: destinationWeek, error: destinationWeekError } = await client.from("weeks").select("id").eq("course_id", courseId).eq("id", destinationWeekId).maybeSingle();
    if (destinationWeekError) throw destinationWeekError;
    if (!destinationWeek) throw new Error(`Destination Week ${destinationWeekId} was not found in Course ${courseId}.`);
    // Destination position = append to the end of the destination Week.
    const { data: destinationDays, error: destinationError } = await client
      .from("days").select("order_index").eq("course_id", courseId).eq("week_id", destinationWeekId)
      .order("order_index", { ascending: false }).limit(1);
    if (destinationError) throw destinationError;
    const destinationRows = (destinationDays ?? []) as { order_index: number }[];
    const appendOrder = ((destinationRows[0]?.order_index as number | undefined) ?? 0) + 1;
    // Two-phase move: park the Day at a negative index inside its source Week
    // first, then jump Weeks in a single write — UNIQUE(week_id, order_index)
    // can never collide, and student progress rows follow the Day through the
    // composite FK's ON UPDATE CASCADE (20261004000000_task40h2 migration).
    const { error: parkError } = await client.from("days").update({ order_index: -1 } as never).eq("id", dayId).eq("course_id", courseId).eq("week_id", sourceWeekId);
    if (parkError) throw parkError;
    const { error: moveError } = await client.from("days").update({ week_id: destinationWeekId, order_index: appendOrder } as never).eq("id", dayId).eq("course_id", courseId).eq("week_id", sourceWeekId);
    if (moveError) throw moveError;
    // Renumber BOTH Weeks sequentially (dense 1..N, no duplicates).
    await renumberWeekDays(client, courseId, sourceWeekId);
    await renumberWeekDays(client, courseId, destinationWeekId);
    const { data: moved, error: movedError } = await client.from("days").select("*").eq("id", dayId).maybeSingle();
    if (movedError) throw movedError;
    if (!moved) throw new Error(`Day ${dayId} could not be read back after the move.`);
    return mapDayRow(moved as SupabaseDayRow);
  },
  };
}

export const courseStructureSupabaseRepository = createCourseStructureSupabaseRepository();

export type CourseStructureSource = "local" | "supabase";

export function createCourseStructureRepository(source: CourseStructureSource = "local"): CourseStructureRepository {
  return source === "supabase" ? courseStructureSupabaseRepository : courseStructureLocalRepository;
}

export interface DayContentRepository {
  getDayContent(courseId: string, weekId: string, dayId: string): Promise<ContentBlock[] | undefined>;
  saveDayContent(courseId: string, weekId: string, dayId: string, content: ContentBlock[]): Promise<void>;
}

function validateContentBlocks(content: ContentBlock[]) {
  if (!Array.isArray(content)) {
    throw new Error("Day content must be an array of content blocks.");
  }

  const errors = content.flatMap((block, index) => {
    if (!block || typeof block !== "object" || typeof block.id !== "string" || typeof block.type !== "string") {
      return [`Block ${index + 1}: malformed content block.`];
    }

    try {
      return validateBlock(block);
    } catch {
      return [`Block ${index + 1}: malformed content block.`];
    }
  });

  if (errors.length > 0) {
    throw new Error(`Invalid day content: ${errors.join("; ")}`);
  }
}

function parseContentBlocks(value: unknown): ContentBlock[] {
  if (!Array.isArray(value)) {
    throw new Error("Supabase day content is not a content block array.");
  }

  const content = value as ContentBlock[];
  validateContentBlocks(content);
  return content;
}

export const dayContentLocalRepository: DayContentRepository = {
  async getDayContent(courseId: string, weekId: string, dayId: string) {
    const day = getDay(dayId) ?? getLesson(dayId);
    if (!day || day.courseId !== courseId || day.weekId !== weekId) return undefined;
    return day.blocks;
  },
  async saveDayContent(courseId: string, weekId: string, dayId: string, content: ContentBlock[]) {
    validateContentBlocks(content);
    const day = getDay(dayId) ?? getLesson(dayId);
    if (!day || day.courseId !== courseId || day.weekId !== weekId) {
      throw new Error(`Cannot save content for unknown Day ${dayId} in the requested hierarchy.`);
    }

    const existingOverride = getLocalLessonOverride(dayId);
    saveLessonOverride({
      lessonId: dayId,
      updatedAt: new Date().toISOString(),
      status: existingOverride?.status,
      title: existingOverride?.title,
      description: existingOverride?.description,
      blocks: content,
    });
  },
};

export function createDayContentSupabaseRepository(clientFactory: () => SupabaseClient<Database> = createSupabaseBrowserClient): DayContentRepository {
  return {
  async getDayContent(courseId: string, weekId: string, dayId: string) {
    const client = clientFactory();
    const { data, error } = await client
      .from("days")
      .select("content_blocks")
      .eq("course_id", courseId)
      .eq("week_id", weekId)
      .eq("id", dayId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    const row = data as unknown as { content_blocks: unknown } | null;
    return parseContentBlocks(row?.content_blocks);
  },
  async saveDayContent(courseId: string, weekId: string, dayId: string, content: ContentBlock[]) {
    validateContentBlocks(content);
    const client = clientFactory();
    const { error } = await client
      .from("days")
      .update({ content_blocks: content as unknown as Database["public"]["Tables"]["days"]["Update"]["content_blocks"] } as never)
      .eq("course_id", courseId)
      .eq("week_id", weekId)
      .eq("id", dayId);
    if (error) throw error;
  },
  };
}

export const dayContentSupabaseRepository = createDayContentSupabaseRepository();

export type DayContentSource = "local" | "supabase";

export function createDayContentRepository(source: DayContentSource = "local"): DayContentRepository {
  return source === "supabase" ? dayContentSupabaseRepository : dayContentLocalRepository;
}
