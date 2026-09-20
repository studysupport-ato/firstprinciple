import { createCourseStructureServerRepository } from "./serverRepository";
import type { Course, Week } from "./types/course";
import type { Lesson } from "./types/lesson";

export type PublishedStructureResult<T> = { kind: "not-found" } | { kind: "success"; value: T };

function published<T extends { status?: string }>(value: T | undefined): value is T { return Boolean(value && value.status === "published"); }

export async function listPublishedCourses(): Promise<Course[]> { return (await createCourseStructureServerRepository().listCourses()).filter(published); }

export async function getPublishedCourse(courseId: string): Promise<PublishedStructureResult<Course>> {
  const course = await createCourseStructureServerRepository().getCourse(courseId);
  return published(course) ? { kind: "success", value: course } : { kind: "not-found" };
}

export async function getPublishedRoadmap(courseId: string): Promise<PublishedStructureResult<{ course: Course; weeks: Week[]; daysByWeek: Record<string, Lesson[]> }>> {
  const repository = createCourseStructureServerRepository();
  const course = await repository.getCourse(courseId);
  if (!published(course)) return { kind: "not-found" };
  const [rawWeeks, rawDays] = await Promise.all([repository.listWeeksForCourse(courseId), repository.listDaysForCourse(courseId)]);
  const weeks = rawWeeks.filter(published);
  const publishedWeekIds = new Set(weeks.map((week) => week.id));
  const dayEntries = rawDays.filter((day) => published(day) && publishedWeekIds.has(day.weekId)).reduce<Record<string, Lesson[]>>((groups, day) => {
    (groups[day.weekId] ??= []).push(day);
    return groups;
  }, {});
  return { kind: "success", value: { course, weeks, daysByWeek: dayEntries } };
}

export async function getPublishedWeek(courseId: string, weekReference: string): Promise<PublishedStructureResult<{ course: Course; week: Week; days: Lesson[] }>> {
  const repository = createCourseStructureServerRepository();
  const course = await repository.getCourse(courseId);
  if (!published(course)) return { kind: "not-found" };
  const weeks = await repository.listWeeksForCourse(courseId);
  const week = weeks.find((candidate) => candidate.id === weekReference || String(candidate.weekNumber) === weekReference);
  if (!published(week)) return { kind: "not-found" };
  const days = (await repository.listDaysForWeek(courseId, week.id)).filter(published);
  return { kind: "success", value: { course, week, days } };
}