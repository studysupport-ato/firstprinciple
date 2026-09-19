import { createEmptyStudentProgress, localProgressRepository } from "./repository";
import { STUDENT_ID } from "./types";
import type { ActivityEvent, ActivityType, AssessmentAttempt, CourseProgress, DayProgress, StudentProgress, WeekProgress, AttemptAnswerValue } from "./types";
import { createStableId } from "../ids";

/**
 * Progress access / service layer. The single source of truth for student
 * state. UI should call these functions rather than touching localStorage.
 *
 * Preview mode guard: all mutations are no-ops when `?preview=1` is active so
 * admin QA never contaminates the local student dataset.
 */

export function isPreviewMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("preview") === "1";
}

export function getStudentProgress(): StudentProgress {
  return localProgressRepository.read();
}

export function getCourseProgress(courseId: string): CourseProgress | undefined {
  return getStudentProgress().courseProgress[courseId];
}

export function getWeekProgress(courseId: string, weekId: string): WeekProgress | undefined {
  return getCourseProgress(courseId)?.weeks[weekId];
}

export function getDayProgress(courseId: string, weekId: string, dayId: string): DayProgress | undefined {
  return getWeekProgress(courseId, weekId)?.days[dayId];
}

function uid(prefix: string) {
  return createStableId(prefix);
}

function recordActivity(progress: StudentProgress, courseId: string, type: ActivityType, entityId?: string, metadata?: Record<string, unknown>): ActivityEvent {
  const event: ActivityEvent = {
    id: uid("activity"),
    studentId: progress.studentId,
    courseId,
    type,
    occurredAt: new Date().toISOString(),
    entityId,
    metadata,
  };
  progress.activity.push(event);
  return event;
}

/** Start a Day (open a lesson). Sets it in_progress and logs lesson_started. */
export function startDay(courseId: string, weekId: string, dayId: string) {
  if (isPreviewMode()) return;
  const progress = localProgressRepository.read();
  const now = new Date().toISOString();
  const course = progress.courseProgress[courseId] ?? { courseId, weeks: {} };
  if (!course.startedAt) course.startedAt = now;
  course.lastAccessedAt = now;

  const week = course.weeks[weekId] ?? { weekId, days: {} };
  if (!week.startedAt) week.startedAt = now;

  const day = week.days[dayId] ?? { dayId, status: "not_started" };
  if (day.status !== "completed") {
    day.status = "in_progress";
    day.lastVisitedAt = now;
  }
  if (!day.startedAt) day.startedAt = now;

  week.days[dayId] = day;
  course.weeks[weekId] = week;
  progress.courseProgress[courseId] = course;

  recordActivity(progress, courseId, "lesson_started", dayId);
  localProgressRepository.write(progress);
}

/** Complete a Day. Auto-completes the week when all its days are done. */
export function completeDay(courseId: string, weekId: string, dayId: string) {
  if (isPreviewMode()) return;
  const progress = localProgressRepository.read();
  const now = new Date().toISOString();
  const course = progress.courseProgress[courseId] ?? { courseId, weeks: {} };
  course.lastAccessedAt = now;

  const week = course.weeks[weekId] ?? { weekId, days: {} };
  const day = week.days[dayId] ?? { dayId, status: "not_started" };

  if (day.status !== "completed") {
    const sessionSeconds = day.startedAt ? Math.max(0, Math.round((Date.parse(now) - Date.parse(day.startedAt)) / 1000)) : undefined;
    day.status = "completed";
    day.completedAt = now;
    if (sessionSeconds !== undefined && sessionSeconds > 0) day.timeSpentSeconds = (day.timeSpentSeconds ?? 0) + sessionSeconds;
  }
  week.days[dayId] = day;
  if (!week.completedAt && Object.values(week.days).every((entry) => entry.status === "completed")) {
    week.completedAt = now;
  }
  course.weeks[weekId] = week;
  progress.courseProgress[courseId] = course;

  recordActivity(progress, courseId, "lesson_completed", dayId);
  localProgressRepository.write(progress);
}

export interface PracticeAttemptInput {
  questionId: string;
  courseId: string;
  lessonId?: string;
  answer: AttemptAnswerValue;
  isCorrect: boolean;
  marksEarned?: number;
  marksAvailable?: number;
  startedAt?: string;
}

/** Record one answered practice question plus a question_answered activity. */
export function recordPracticeAttempt(input: PracticeAttemptInput) {
  if (isPreviewMode()) return undefined;
  const progress = localProgressRepository.read();
  const now = new Date().toISOString();
  const attempt = {
    id: uid("practice"),
    studentId: progress.studentId,
    questionId: input.questionId,
    courseId: input.courseId,
    lessonId: input.lessonId,
    answer: input.answer,
    isCorrect: input.isCorrect,
    marksEarned: input.isCorrect ? input.marksEarned ?? 1 : 0,
    marksAvailable: input.marksAvailable ?? 1,
    startedAt: input.startedAt ?? now,
    answeredAt: now,
  };
  progress.practiceAttempts.push(attempt);
  recordActivity(progress, input.courseId, "question_answered", input.questionId, {
    isCorrect: input.isCorrect,
    lessonId: input.lessonId,
  });
  localProgressRepository.write(progress);
  return attempt;
}

export function recordPracticeStarted(courseId: string, chapterId?: string, lessonId?: string) {
  if (isPreviewMode()) return;
  const progress = localProgressRepository.read();
  recordActivity(progress, courseId, "practice_started", lessonId, { chapterId });
  localProgressRepository.write(progress);
}

/** Record assessment started (event) and create/reuse an in-progress attempt. */
export function recordAssessmentStart(courseId: string, assessmentId: string, chapterId?: string, startedAt?: string) {
  if (isPreviewMode()) return undefined;
  const progress = localProgressRepository.read();
  const now = startedAt ?? new Date().toISOString();
  let attempt = progress.assessmentAttempts.find((entry) => entry.assessmentId === assessmentId && entry.status === "in_progress");
  if (!attempt) {
    attempt = {
      id: uid("assessment"),
      studentId: progress.studentId,
      assessmentId,
      courseId,
      chapterId,
      startedAt: now,
      answers: {},
      score: 0,
      percentage: 0,
      marksEarned: 0,
      marksAvailable: 0,
      status: "in_progress",
    };
    progress.assessmentAttempts.push(attempt);
  }
  recordActivity(progress, courseId, "assessment_started", assessmentId, { chapterId });
  localProgressRepository.write(progress);
  return attempt;
}

export interface AssessmentSubmitInput {
  assessmentId: string;
  courseId: string;
  chapterId?: string;
  startedAt?: string;
  answers: Record<string, AttemptAnswerValue>;
  score: number;
  percentage: number;
  marksEarned: number;
  marksAvailable: number;
}

/** Finalize an assessment attempt plus an assessment_submitted event. */
export function recordAssessmentSubmit(input: AssessmentSubmitInput) {
  if (isPreviewMode()) return undefined;
  const progress = localProgressRepository.read();
  const now = new Date().toISOString();
  const percent = Math.max(0, Math.min(100, Math.round(input.percentage)));

  let attempt = progress.assessmentAttempts.find((entry) => entry.assessmentId === input.assessmentId && entry.status === "in_progress");
  if (attempt) {
    attempt.status = "submitted";
    attempt.submittedAt = now;
    attempt.answers = input.answers;
    attempt.score = input.score;
    attempt.percentage = percent;
    attempt.marksEarned = input.marksEarned;
    attempt.marksAvailable = input.marksAvailable;
  } else {
    attempt = {
      id: uid("assessment"),
      studentId: progress.studentId,
      assessmentId: input.assessmentId,
      courseId: input.courseId,
      chapterId: input.chapterId,
      startedAt: input.startedAt ?? now,
      submittedAt: now,
      answers: input.answers,
      score: input.score,
      percentage: percent,
      marksEarned: input.marksEarned,
      marksAvailable: input.marksAvailable,
      status: "submitted",
    };
    progress.assessmentAttempts.push(attempt);
  }

  recordActivity(progress, input.courseId, "assessment_submitted", input.assessmentId, { percentage: percent });
  localProgressRepository.write(progress);
  return attempt;
}

/** Development utility: wipe all local student progress. */
export function resetStudentProgress() {
  const fresh = createEmptyStudentProgress();
  localProgressRepository.write(fresh);
  return fresh;
}

export { STUDENT_ID };