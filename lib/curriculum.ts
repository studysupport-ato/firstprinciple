import { getLessons, getWeeks } from "@/lib/content/access";
import type { Lesson, Week } from "@/lib/content/types";

export interface CurriculumDay {
  dayNumber: number;
  lessonId: string;
  title: string;
  description: string;
  lesson?: Lesson;
}

export function getCourseWeeks(courseId: string): Week[] {
  return getWeeks(courseId).sort((first, second) => first.weekNumber - second.weekNumber);
}

export function getCourseWeek(courseId: string, weekNumber: number): Week | undefined {
  return getCourseWeeks(courseId).find((week) => week.weekNumber === weekNumber);
}

export function getWeekDays(courseId: string, week: Week): CurriculumDay[] {
  const lessons = getLessons(courseId, undefined, week.id);

  return week.sessionIds.map((sessionId, index) => {
    const lesson = lessons.find((candidate) => candidate.id === sessionId);
    return {
      dayNumber: index + 1,
      lessonId: sessionId,
      title: lesson?.title ?? `Day ${index + 1}`,
      description: lesson?.description ?? "Day content has not been authored yet.",
      lesson,
    };
  });
}

export function getCourseDay(courseId: string, weekNumber: number, dayNumber: number): CurriculumDay | undefined {
  const week = getCourseWeek(courseId, weekNumber);
  if (!week) return undefined;
  return getWeekDays(courseId, week)[dayNumber - 1];
}

export function getDayContentCount(day: CurriculumDay) {
  return day.lesson?.blocks.length ?? 0;
}
