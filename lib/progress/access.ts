import { createEmptyStudentProgress, createProgressFactsRepository, localProgressRepository } from "./repository";
import type { ActivityEvent, ActivityType, AssessmentAttempt, CourseProgress, DayProgress, StudentProgress, WeekProgress, AttemptAnswerValue } from "./types";
import { createStableId } from "../ids";
import { getActiveStudentId } from "../auth/mock";

// Use local storage for all progress to maintain demo student isolation
// without creating fake Supabase records or modifying auth RLS policies.
const dayProgressRepository = createProgressFactsRepository("local");
const practiceRepository = createProgressFactsRepository("local");
const assessmentRepository = createProgressFactsRepository("local");

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
export async function startDay(courseId: string, weekId: string, dayId: string) {
  if (isPreviewMode()) return;

  const studentId = getActiveStudentId();
  const now = new Date().toISOString();
  const existing = await dayProgressRepository.getDayProgress(studentId, courseId, weekId, dayId);
  const next: DayProgress = {
    dayId,
    status: "in_progress",
    startedAt: existing?.startedAt ?? now,
    completedAt: existing?.completedAt,
    lastVisitedAt: now,
    timeSpentSeconds: existing?.timeSpentSeconds ?? 0,
  };

  await dayProgressRepository.upsertDayProgress(studentId, courseId, weekId, next);
  await dayProgressRepository.createActivityEvent({
    id: uid("activity"),
    studentId,
    courseId,
    type: "lesson_started",
    occurredAt: now,
    entityId: dayId,
  });
}

/** Complete a Day. Auto-completes the week when all its days are done. */
export async function completeDay(courseId: string, weekId: string, dayId: string) {
  if (isPreviewMode()) return;

  const studentId = getActiveStudentId();
  const now = new Date().toISOString();
  const existing = await dayProgressRepository.getDayProgress(studentId, courseId, weekId, dayId);
  const startedAt = existing?.startedAt ?? now;
  const previousSeconds = existing?.timeSpentSeconds ?? 0;
  const elapsedSeconds = Math.max(0, Math.round((Date.parse(now) - Date.parse(startedAt)) / 1000));

  const next: DayProgress = {
    dayId,
    status: "completed",
    startedAt,
    completedAt: now,
    lastVisitedAt: now,
    timeSpentSeconds: previousSeconds + elapsedSeconds,
  };

  await dayProgressRepository.upsertDayProgress(studentId, courseId, weekId, next);
  await dayProgressRepository.createActivityEvent({
    id: uid("activity"),
    studentId,
    courseId,
    type: "lesson_completed",
    occurredAt: now,
    entityId: dayId,
  });
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
export async function recordPracticeAttempt(input: PracticeAttemptInput) {
  if (isPreviewMode()) return undefined;

  const studentId = getActiveStudentId();
  const now = new Date().toISOString();
  const attempt = {
    id: uid("practice"),
    studentId,
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

  try {
    const persisted = await practiceRepository.createPracticeAttempt(attempt);
    await practiceRepository.createActivityEvent({
      id: uid("activity"),
      studentId,
      courseId: input.courseId,
      type: "question_answered",
      occurredAt: now,
      entityId: input.questionId,
      metadata: { isCorrect: input.isCorrect, lessonId: input.lessonId },
    });
    return persisted;
  } catch (error) {
    console.error("[Practice attempts] Local persistence failed.", error);
    throw error;
  }
}

export async function recordPracticeStarted(courseId: string, chapterId?: string, lessonId?: string) {
  if (isPreviewMode()) return;

  const studentId = getActiveStudentId();
  const now = new Date().toISOString();
  await practiceRepository.createActivityEvent({
    id: uid("activity"),
    studentId,
    courseId,
    type: "practice_started",
    occurredAt: now,
    entityId: lessonId,
    metadata: { chapterId },
  });
}

/** Record assessment started (event) and create/reuse an in-progress attempt. */
export async function getPersistedAssessmentAttempt(assessmentId: string, courseId?: string) {
  const studentId = getActiveStudentId();
  const attempts = await assessmentRepository.listAssessmentAttempts(studentId, {
    assessmentId,
    courseId,
    limit: 20,
  });

  const submittedAttempts = attempts.filter((attempt) => attempt.status === "submitted");
  const inProgressAttempts = attempts.filter((attempt) => attempt.status === "in_progress");

  const latestSubmitted = submittedAttempts.sort((a, b) => {
    const aTime = a.submittedAt ?? a.startedAt;
    const bTime = b.submittedAt ?? b.startedAt;
    return (bTime ?? "").localeCompare(aTime ?? "");
  })[0];

  const latestInProgress = inProgressAttempts.sort((a, b) => {
    const aTime = a.submittedAt ?? a.startedAt;
    const bTime = b.submittedAt ?? b.startedAt;
    return (bTime ?? "").localeCompare(aTime ?? "");
  })[0];

  const latest = latestSubmitted ?? latestInProgress;
  if (!latest) return undefined;
  return await assessmentRepository.getAssessmentAttempt(studentId, latest.id) ?? latest;
}

export async function recordAssessmentStart(courseId: string, assessmentId: string, chapterId?: string, startedAt?: string) {
  if (isPreviewMode()) return undefined;

  const studentId = getActiveStudentId();
  const now = startedAt ?? new Date().toISOString();
  const existingAttempts = await assessmentRepository.listAssessmentAttempts(studentId, {
    assessmentId,
    status: "in_progress",
    limit: 1,
  });

  const nextAttempt = existingAttempts[0] ?? {
    id: uid("assessment"),
    studentId,
    assessmentId,
    courseId,
    chapterId,
    startedAt: now,
    answers: {},
    score: 0,
    percentage: 0,
    marksEarned: 0,
    marksAvailable: 0,
    status: "in_progress" as const,
  };

  const persisted = await assessmentRepository.upsertAssessmentAttempt({
    ...nextAttempt,
    studentId,
    courseId,
    chapterId,
    startedAt: nextAttempt.startedAt ?? now,
    submittedAt: nextAttempt.submittedAt ?? undefined,
    answers: nextAttempt.answers ?? {},
  });

  await assessmentRepository.createActivityEvent({
    id: uid("activity"),
    studentId,
    courseId,
    type: "assessment_started",
    occurredAt: now,
    entityId: assessmentId,
    metadata: { chapterId },
  });

  return persisted;
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
export async function recordAssessmentSubmit(input: AssessmentSubmitInput) {
  if (isPreviewMode()) return undefined;

  const studentId = getActiveStudentId();
  const now = new Date().toISOString();
  const percent = Math.max(0, Math.min(100, Math.round(input.percentage)));

  const existingAttempts = await assessmentRepository.listAssessmentAttempts(studentId, {
    assessmentId: input.assessmentId,
    status: "in_progress",
    limit: 1,
  });

  const existingAttempt = existingAttempts[0];
  const nextAttempt: import("./types").AssessmentAttempt = existingAttempt ? {
    ...existingAttempt,
    studentId,
    courseId: input.courseId,
    chapterId: input.chapterId ?? existingAttempt.chapterId,
    startedAt: existingAttempt.startedAt ?? input.startedAt ?? now,
    submittedAt: now,
    answers: input.answers,
    score: input.score,
    percentage: percent,
    marksEarned: input.marksEarned,
    marksAvailable: input.marksAvailable,
    status: "submitted",
  } : {
    id: uid("assessment"),
    studentId,
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

  const persisted = await assessmentRepository.upsertAssessmentAttempt(nextAttempt);

  await assessmentRepository.createActivityEvent({
    id: uid("activity"),
    studentId,
    courseId: input.courseId,
    type: "assessment_submitted",
    occurredAt: now,
    entityId: input.assessmentId,
    metadata: { percentage: percent },
  });

  return persisted;
}

/** Development utility: wipe all local student progress. */
export function resetStudentProgress() {
  const fresh = createEmptyStudentProgress();
  localProgressRepository.write(fresh);
  return fresh;
}