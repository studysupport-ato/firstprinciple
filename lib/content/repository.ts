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
export type WeekPatch = Partial<Pick<Week, "title" | "description" | "weekNumber" | "status">>;
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
    const row = {
      id: day.id,
      course_id: day.courseId,
      week_id: day.weekId,
      chapter_id: day.chapterId || null,
      title: day.title,
      description: day.description,
      order_index: day.order,
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
    const { error } = await client.from("days").delete().eq("course_id", courseId).eq("week_id", weekId).eq("id", dayId);
    if (error) throw error;
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
