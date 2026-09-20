import { createSupabaseBrowserClient } from "./client";
import { getSupabasePublicConfig } from "./config";
import { createCourseStructureRepository, createDayContentRepository } from "../content/repository";

export type CourseStructureSmokeResult = {
  ok: true;
  source: "supabase";
  url: string;
  courseCount: number;
  weekCount: number;
  dayCount: number;
};

/** Read-only repository smoke test for one hosted Course -> Week -> Day slice. */
export async function smokeTestCourseStructureRepository(): Promise<CourseStructureSmokeResult> {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error("[Back2Basics with Kwamina] Supabase smoke test is unavailable: missing public Supabase configuration.");
  }

  const repository = createCourseStructureRepository("supabase");
  const courses = await repository.listCourses();
  const firstCourse = courses[0];
  if (!firstCourse) {
    return { ok: true, source: "supabase", url: config.url, courseCount: 0, weekCount: 0, dayCount: 0 };
  }

  const course = await repository.getCourse(firstCourse.id);
  if (!course) throw new Error(`Hosted course read returned no row for ${firstCourse.id}.`);

  const weeks = await repository.listWeeksForCourse(firstCourse.id);
  const firstWeek = weeks[0];
  if (!firstWeek) {
    return { ok: true, source: "supabase", url: config.url, courseCount: courses.length, weekCount: 0, dayCount: 0 };
  }

  const week = await repository.getWeek(firstCourse.id, firstWeek.id);
  if (!week) throw new Error(`Hosted week read returned no row for ${firstWeek.id}.`);

  const days = await repository.listDaysForWeek(firstCourse.id, firstWeek.id);
  const firstDay = days[0];
  if (firstDay) {
    const day = await repository.getDay(firstCourse.id, firstWeek.id, firstDay.id);
    if (!day) throw new Error(`Hosted day read returned no row for ${firstDay.id}.`);
  }

  return {
    ok: true,
    source: "supabase",
    url: config.url,
    courseCount: courses.length,
    weekCount: weeks.length,
    dayCount: days.length,
  };
}

export async function smokeTestDayContentRepository() {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error("[Back2Basics with Kwamina] Supabase smoke test is unavailable: missing public Supabase configuration.");
  }

  const repository = createDayContentRepository("supabase");
  const content = await repository.getDayContent("smoke-course-not-found", "smoke-week-not-found", "smoke-day-not-found");

  return {
    ok: true as const,
    source: "supabase" as const,
    url: config.url,
    found: content !== undefined,
    blockCount: content?.length ?? 0,
  };
}

export async function smokeTestSupabaseConnection(options: { admin?: boolean } = {}) {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error("[Back2Basics with Kwamina] Supabase smoke test is unavailable: missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }

  const client = options.admin ? (await import("./client")).createSupabaseAdminClient() : createSupabaseBrowserClient();
  const { data, error } = await client.from("courses").select("id").limit(1);

  if (error) {
    throw error;
  }

  return {
    ok: true,
    source: options.admin ? "admin" : "browser",
    url: config.url,
    rowCount: data?.length ?? 0,
    table: "courses",
  };
}
