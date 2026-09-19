import { getStudentProgress } from "./access";
import { getCourseWeeks, getWeekDays } from "@/lib/curriculum";
import { getAssessment, getLesson, getQuestion } from "@/lib/content/access";
import type { CurriculumDay } from "@/lib/curriculum";
import type { Week } from "@/lib/content/types";
import type { ActivityType, DayProgress, DayRoadmapState, StudentProgress } from "./types";

/**
 * Derived metrics / selectors. UI consumes these instead of recalculating
 * progress. Completion percentages are always computed from the content graph
 * plus stored day statuses, and are clamped to 0..100.
 */

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function localDateKey(iso: string) {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDayStatus(courseId: string, weekId: string, dayId: string) {
  return getStudentProgress().courseProgress[courseId]?.weeks[weekId]?.days[dayId]?.status;
}

export function isDayComplete(courseId: string, weekId: string, dayId: string) {
  return getDayStatus(courseId, weekId, dayId) === "completed";
}

function isDayCompleteFrom(progress: StudentProgress, courseId: string, weekId: string, dayId: string) {
  return progress.courseProgress[courseId]?.weeks[weekId]?.days[dayId]?.status === "completed";
}

export interface RoadmapDay {
  day: CurriculumDay;
  state: DayRoadmapState;
}

export interface RoadmapWeek {
  week: Week;
  available: boolean;
  days: RoadmapDay[];
}

/**
 * Full course roadmap derived from progress without enforcing sequential access
 * restrictions. Progress continues to be tracked for started/completed states,
 * but completion of one Day or Week is not treated as a prerequisite for
 * opening another published Day.
 */
export function getCourseRoadmap(courseId: string): RoadmapWeek[] {
  const progress = getStudentProgress();
  const weeks = getCourseWeeks(courseId);

  return weeks.map((week) => {
    const days = getWeekDays(courseId, week);
    const roadmapDays: RoadmapDay[] = days.map((day) => {
      const status = progress.courseProgress[courseId]?.weeks[week.id]?.days[day.lessonId]?.status;
      if (status === "completed") {
        return { day, state: "completed" };
      }
      if (status === "in_progress") {
        return { day, state: "in_progress" };
      }
      return { day, state: "not_started" };
    });

    return { week, available: true, days: roadmapDays };
  });
}

export interface CourseCompletion {
  completedDays: number;
  totalDays: number;
  percent: number;
}

export function getCourseCompletion(courseId: string): CourseCompletion {
  const days = getCourseRoadmap(courseId).flatMap((entry) => entry.days);
  const completedDays = days.filter((entry) => entry.state === "completed").length;
  const totalDays = days.length;
  const percent = totalDays ? clampPercent((completedDays / totalDays) * 100) : 0;
  return { completedDays, totalDays, percent };
}

export function getWeekCompletion(courseId: string, weekId: string) {
  const entry = getCourseRoadmap(courseId).find((item) => item.week.id === weekId);
  if (!entry || !entry.days.length) return 0;
  return clampPercent((entry.days.filter((day) => day.state === "completed").length / entry.days.length) * 100);
}

export function getWeekCompleteCount(courseId: string, week: Week) {
  const days = getWeekDays(courseId, week);
  return days.filter((day) => isDayComplete(courseId, week.id, day.lessonId)).length;
}

export interface PracticeStats {
  totalAttempts: number;
  correctAttempts: number;
  distinctAnswered: number;
  distinctCorrect: number;
  accuracy: number;
  problemsSolved: number;
}

export function getPracticeStats(courseId: string): PracticeStats {
  const attempts = getStudentProgress().practiceAttempts.filter((attempt) => attempt.courseId === courseId);
  const correctAttempts = attempts.filter((attempt) => attempt.isCorrect).length;
  const distinctCorrect = new Set(attempts.filter((attempt) => attempt.isCorrect).map((attempt) => attempt.questionId)).size;
  return {
    totalAttempts: attempts.length,
    correctAttempts,
    distinctAnswered: new Set(attempts.map((attempt) => attempt.questionId)).size,
    distinctCorrect,
    accuracy: attempts.length ? clampPercent((correctAttempts / attempts.length) * 100) : 0,
    problemsSolved: distinctCorrect,
  };
}

/** Problems solved = distinct questions answered correctly at least once. */
export function getProblemsSolved(courseId: string) {
  return getPracticeStats(courseId).problemsSolved;
}

export interface TopicMasteryRow {
  topicId: string;
  topic: string;
  attempted: number;
  correct: number;
  accuracy: number;
  masteryPercent: number;
}

/**
 * Topic performance derived from actual practice attempts. accuracy =
 * correct / attempted. masteryPercent is the same honest number (or 0 when
 * there is no evidence) — deliberately NOT an arbitrary prettified score.
 */
export function getTopicMastery(courseId: string): TopicMasteryRow[] {
  const attempts = getStudentProgress().practiceAttempts.filter((attempt) => attempt.courseId === courseId);
  const buckets = new Map<string, TopicMasteryRow>();

  attempts.forEach((attempt) => {
    const question = getQuestion(attempt.questionId);
    const topicId = question?.topic ?? "unknown";
    const topic = question?.topic ?? "Other";
    const current = buckets.get(topicId) ?? { topicId, topic, attempted: 0, correct: 0, accuracy: 0, masteryPercent: 0 };
    current.attempted += 1;
    if (attempt.isCorrect) current.correct += 1;
    buckets.set(topicId, current);
  });

  return [...buckets.values()].map((row) => {
    const accuracy = row.attempted ? clampPercent((row.correct / row.attempted) * 100) : 0;
    return { ...row, accuracy, masteryPercent: accuracy };
  });
}

export interface TopicProgressRow {
  name: string;
  attempted: number;
  correct: number;
  accuracy: number;
  mastery: number;
}

/** Topic rows shaped for the Performance page. mastery = honest accuracy. */
export function getTopicProgress(courseId: string): TopicProgressRow[] {
  return getTopicMastery(courseId).map((row) => ({
    name: row.topic,
    attempted: row.attempted,
    correct: row.correct,
    accuracy: row.accuracy,
    mastery: row.masteryPercent,
  }));
}

/** Submitted assessment attempts for a course, newest first. */
export function getAssessmentScores(courseId: string) {
  return getStudentProgress()
    .assessmentAttempts.filter((attempt) => attempt.courseId === courseId && attempt.status === "submitted")
    .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
}

export interface AssessmentSummary {
  id: string;
  assessmentId: string;
  title: string;
  date: string;
  score: number;
  total: number;
  marksEarned: number;
  marksAvailable: number;
}

/** Assessment rows shaped for the Performance page, newest first. */
export function getAssessmentSummaries(courseId: string): AssessmentSummary[] {
  return getAssessmentScores(courseId).map((attempt) => {
    const assessment = getAssessment(attempt.assessmentId);
    return {
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      title: assessment?.title ?? "Assessment",
      date: attempt.submittedAt ?? attempt.startedAt,
      score: attempt.percentage,
      total: Object.keys(attempt.answers ?? {}).length,
      marksEarned: attempt.marksEarned,
      marksAvailable: attempt.marksAvailable,
    };
  });
}

function activityKind(type: string): string {
  if (type.startsWith("lesson_")) return "Lesson";
  if (type.startsWith("practice_") || type === "question_answered") return "Practice";
  if (type.startsWith("assessment_")) return "Assessment";
  return "Course";
}

export interface ActivityDisplay {
  id: string;
  /** Category label: Lesson / Practice / Assessment / Course. */
  type: string;
  title: string;
  occurredAt: string;
  /** Human-readable relative time, e.g. "2h ago". */
  time: string;
  status: string;
  entityId?: string;
}

function activityTitle(type: string, entityId?: string) {
  switch (type) {
    case "lesson_started":
    case "lesson_completed":
      return entityId ? getLesson(entityId)?.title ?? "Lesson" : "Lesson";
    case "question_answered":
      return entityId ? getQuestion(entityId)?.prompt.slice(0, 60) ?? "Practice question" : "Practice question";
    case "assessment_started":
    case "assessment_submitted":
      return entityId ? getAssessment(entityId)?.title ?? "Assessment" : "Assessment";
    case "practice_started":
      return "Practice session";
    case "course_started":
      return "Course started";
    default:
      return "Activity";
  }
}

export function getRecentActivity(courseId: string, limit = 6): ActivityDisplay[] {
  return getStudentProgress()
    .activity.filter((event) => event.courseId === courseId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit)
    .map((event) => ({
      id: event.id,
      type: activityKind(event.type),
      title: activityTitle(event.type, event.entityId),
      occurredAt: event.occurredAt,
      time: relativeTime(event.occurredAt),
      status: activityStatus(event.type),
      entityId: event.entityId,
    }));
}

function diffCalendarDays(earlier: string, later: string) {
  const a = new Date(earlier);
  const b = new Date(later);
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86400000);
}

function getLearningDateSet(): Set<string> {
  return new Set(getStudentProgress().activity.map((event) => localDateKey(event.occurredAt)));
}

export function getLastActivityDate(): string | null {
  const latest = getStudentProgress().activity
    .map((event) => event.occurredAt)
    .sort((a, b) => b.localeCompare(a))[0];
  return latest ?? null;
}

/**
 * Overall mastery for a course derived ONLY from real evidence
 * (practice accuracy + submitted assessment scores). Returns 0 when
 * there is no evidence yet — never a fabricated percentage.
 */
export function getOverallMastery(courseId: string): number {
  const stats = getPracticeStats(courseId);
  const assessments = getStudentProgress().assessmentAttempts.filter(
    (attempt) => attempt.courseId === courseId && attempt.status === "submitted"
  );
  const parts: number[] = [];
  if (stats.totalAttempts > 0) parts.push(stats.accuracy);
  if (assessments.length > 0) {
    const avg = assessments.reduce((sum, attempt) => sum + attempt.percentage, 0) / assessments.length;
    parts.push(avg);
  }
  if (!parts.length) return 0;
  return clampPercent(parts.reduce((sum, value) => sum + value, 0) / parts.length);
}

export interface ContinueLearning {
  courseId: string;
  weekId: string;
  weekTitle: string;
  weekNumber: number;
  lessonId: string;
  lessonTitle: string;
  chapterId: string;
  status: "in_progress" | "not_started";
  completedDays: number;
  totalDays: number;
  percent: number;
}

/**
 * The most relevant resumable Day: the in-progress day if one exists,
 * otherwise the first available (unlocked, incomplete) day. Null only
 * when the course is fully complete or has no authored days.
 */
export function getContinueLearning(courseId: string): ContinueLearning | null {
  const roadmap = getCourseRoadmap(courseId);
  const completion = getCourseCompletion(courseId);
  for (const entry of roadmap) {
    for (const day of entry.days) {
      if (day.state === "in_progress" || day.state === "not_started") {
        const lesson = day.day.lesson;
        if (!lesson) continue;
        return {
          courseId,
          weekId: entry.week.id,
          weekTitle: entry.week.title,
          weekNumber: entry.week.weekNumber,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          chapterId: lesson.chapterId,
          status: day.state === "in_progress" ? "in_progress" : "not_started",
          completedDays: completion.completedDays,
          totalDays: completion.totalDays,
          percent: completion.percent,
        };
      }
    }
  }
  return null;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  if (Number.isNaN(diffMs) || diffMs < 0) return "just now";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function activityStatus(type: ActivityType): string {
  switch (type) {
    case "lesson_completed":
    case "assessment_submitted":
    case "question_answered":
      return "Completed";
    default:
      return "In Progress";
  }
}

export function getLongestStreak() {
  const dates = [...getLearningDateSet()].sort();
  if (!dates.length) return 0;
  let streak = 1;
  let longest = 1;
  for (let index = 1; index < dates.length; index += 1) {
    if (diffCalendarDays(dates[index - 1], dates[index]) === 1) streak += 1;
    else streak = 1;
    longest = Math.max(longest, streak);
  }
  return longest;
}

/**
 * Current streak = consecutive active calendar days ending at the most recent
 * activity date, counted only while that date is today or yesterday. Using a
 * distinct-date set means multiple events on one day never inflate the streak.
 */
export function getCurrentStreak() {
  const dates = [...getLearningDateSet()].sort();
  if (!dates.length) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = localDateKey(today.toISOString());
  const lastActiveKey = dates[dates.length - 1];
  const distanceFromToday = diffCalendarDays(lastActiveKey, todayKey);
  if (distanceFromToday > 1) return 0;

  let streak = 1;
  for (let index = dates.length - 1; index > 0; index -= 1) {
    if (diffCalendarDays(dates[index - 1], dates[index]) === 1) streak += 1;
    else break;
  }
  return streak;
}

export interface DailyActivityPoint {
  date: string;
  label: string;
  count: number;
}

/**
 * Last N calendar days of learning activity (meaningful events only).
 * The courseId argument is accepted for API stability; when provided the
 * counts are scoped to that course, otherwise all courses are counted.
 */
export function getDailyActivity(courseId?: string, days = 7): DailyActivityPoint[] {
  const events = courseId
    ? getStudentProgress().activity.filter((event) => event.courseId === courseId)
    : getStudentProgress().activity;
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const points: DailyActivityPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    const key = localDateKey(date.toISOString());
    const count = events.filter((event) => localDateKey(event.occurredAt) === key).length;
    points.push({ date: key, label: labels[date.getDay()], count });
  }
  return points;
}