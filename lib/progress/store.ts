import { STUDENT_ID } from "./types";
import type { ActivityEvent, AssessmentAttempt, CourseProgress, PracticeAttempt, StudentProgress } from "./types";

/**
 * Local persistence for student state.
 *
 * Dedicated namespaced key so student progress stays separate from content,
 * asset, and admin lifecycle state. Serializes structured collections that
 * would map to relational records later.
 */

export const PROGRESS_STORAGE_KEY = "first-principles-progress-v1";

export function createEmptyProgress(): StudentProgress {
  return {
    studentId: STUDENT_ID,
    courseProgress: {},
    practiceAttempts: [],
    assessmentAttempts: [],
    activity: [],
    updatedAt: new Date().toISOString(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidAnswer(value: unknown): value is import("./types").AttemptAnswerValue {
  if (value === null) return true;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.every((entry) => typeof entry === "string");
  return false;
}

function normalizeActivity(item: unknown): ActivityEvent | null {
  if (!isRecord(item) || typeof item.id !== "string" || typeof item.type !== "string" || typeof item.occurredAt !== "string") {
    return null;
  }
  return {
    id: item.id,
    studentId: typeof item.studentId === "string" ? item.studentId : STUDENT_ID,
    courseId: typeof item.courseId === "string" ? item.courseId : "",
    type: item.type as ActivityEvent["type"],
    occurredAt: item.occurredAt,
    entityId: typeof item.entityId === "string" ? item.entityId : undefined,
    metadata: isRecord(item.metadata) ? item.metadata : undefined,
  };
}

function normalizePractice(item: unknown): PracticeAttempt | null {
  if (!isRecord(item) || typeof item.id !== "string" || typeof item.questionId !== "string" || typeof item.courseId !== "string") {
    return null;
  }
  return {
    id: item.id,
    studentId: typeof item.studentId === "string" ? item.studentId : STUDENT_ID,
    questionId: item.questionId,
    courseId: item.courseId,
    lessonId: typeof item.lessonId === "string" ? item.lessonId : undefined,
    answer: isValidAnswer(item.answer) ? item.answer : null,
    isCorrect: Boolean(item.isCorrect),
    marksEarned: typeof item.marksEarned === "number" ? item.marksEarned : 0,
    marksAvailable: typeof item.marksAvailable === "number" ? item.marksAvailable : 0,
    startedAt: typeof item.startedAt === "string" ? item.startedAt : new Date(0).toISOString(),
    answeredAt: typeof item.answeredAt === "string" ? item.answeredAt : new Date(0).toISOString(),
    metadata: isRecord(item.metadata) ? item.metadata : undefined,
  };
}

function normalizeAssessment(item: unknown): AssessmentAttempt | null {
  if (!isRecord(item) || typeof item.id !== "string" || typeof item.assessmentId !== "string" || typeof item.courseId !== "string") {
    return null;
  }
  const percent = typeof item.percentage === "number" ? Math.max(0, Math.min(100, Math.round(item.percentage))) : 0;
  return {
    id: item.id,
    studentId: typeof item.studentId === "string" ? item.studentId : STUDENT_ID,
    assessmentId: item.assessmentId,
    courseId: item.courseId,
    chapterId: typeof item.chapterId === "string" ? item.chapterId : undefined,
    startedAt: typeof item.startedAt === "string" ? item.startedAt : new Date(0).toISOString(),
    submittedAt: typeof item.submittedAt === "string" ? item.submittedAt : undefined,
    answers: isRecord(item.answers) ? (item.answers as Record<string, unknown> as AssessmentAttempt["answers"]) : {},
    score: typeof item.score === "number" ? item.score : 0,
    percentage: percent,
    marksEarned: typeof item.marksEarned === "number" ? item.marksEarned : 0,
    marksAvailable: typeof item.marksAvailable === "number" ? item.marksAvailable : 0,
    status: item.status === "submitted" || item.status === "in_progress" ? item.status : "in_progress",
  };
}

function normalizeDay(dayValue: Record<string, unknown>, dayId: string) {
  const status = dayValue.status === "completed" || dayValue.status === "in_progress" || dayValue.status === "not_started" ? dayValue.status : "not_started";
  return {
    dayId,
    status,
    startedAt: typeof dayValue.startedAt === "string" ? dayValue.startedAt : undefined,
    completedAt: typeof dayValue.completedAt === "string" ? dayValue.completedAt : undefined,
    lastVisitedAt: typeof dayValue.lastVisitedAt === "string" ? dayValue.lastVisitedAt : undefined,
    timeSpentSeconds: typeof dayValue.timeSpentSeconds === "number" && Number.isFinite(dayValue.timeSpentSeconds) ? Math.max(0, dayValue.timeSpentSeconds) : undefined,
  } as CourseProgress["weeks"][string]["days"][string];
}

/**
 * Central safety net. Coerces malformed stored shapes into a valid progress
 * document so corrupted localStorage never crashes the app or produces
 * impossible metrics.
 */
export function normalizeProgress(input: unknown): StudentProgress {
  if (!isRecord(input)) return createEmptyProgress();

  const activity: ActivityEvent[] = Array.isArray(input.activity) ? input.activity.map(normalizeActivity).filter((entry): entry is ActivityEvent => Boolean(entry)) : [];
  const practiceAttempts: PracticeAttempt[] = Array.isArray(input.practiceAttempts) ? input.practiceAttempts.map(normalizePractice).filter((entry): entry is PracticeAttempt => Boolean(entry)) : [];
  const assessmentAttempts: AssessmentAttempt[] = Array.isArray(input.assessmentAttempts) ? input.assessmentAttempts.map(normalizeAssessment).filter((entry): entry is AssessmentAttempt => Boolean(entry)) : [];

  const courseProgress: Record<string, CourseProgress> = {};
  if (isRecord(input.courseProgress)) {
    for (const [courseId, courseValue] of Object.entries(input.courseProgress)) {
      if (!isRecord(courseValue)) continue;
      const weeks: CourseProgress["weeks"] = {};
      if (isRecord(courseValue.weeks)) {
        for (const [weekId, weekValue] of Object.entries(courseValue.weeks)) {
          if (!isRecord(weekValue)) continue;
          const days: Record<string, CourseProgress["weeks"][string]["days"][string]> = {};
          if (isRecord(weekValue.days)) {
            for (const [dayId, dayValue] of Object.entries(weekValue.days)) {
              if (!isRecord(dayValue)) continue;
              days[dayId] = normalizeDay(dayValue, dayId);
            }
          }
          weeks[weekId] = {
            weekId,
            startedAt: typeof weekValue.startedAt === "string" ? weekValue.startedAt : undefined,
            completedAt: typeof weekValue.completedAt === "string" ? weekValue.completedAt : undefined,
            days,
          };
        }
      }
      courseProgress[courseId] = {
        courseId,
        startedAt: typeof courseValue.startedAt === "string" ? courseValue.startedAt : undefined,
        lastAccessedAt: typeof courseValue.lastAccessedAt === "string" ? courseValue.lastAccessedAt : undefined,
        completedAt: typeof courseValue.completedAt === "string" ? courseValue.completedAt : undefined,
        weeks,
      };
    }
  }

  return {
    studentId: typeof input.studentId === "string" ? input.studentId : STUDENT_ID,
    courseProgress,
    practiceAttempts,
    assessmentAttempts,
    activity,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : new Date().toISOString(),
  };
}

export function readProgress(): StudentProgress {
  if (typeof window === "undefined") return createEmptyProgress();
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return createEmptyProgress();
    return normalizeProgress(JSON.parse(raw));
  } catch {
    console.warn(`[First Principles] Progress storage is malformed; using an empty progress state: ${PROGRESS_STORAGE_KEY}`);
    return createEmptyProgress();
  }
}

export function writeProgress(progress: StudentProgress) {
  if (typeof window === "undefined") return undefined;
  const normalized = normalizeProgress(progress);
  normalized.updatedAt = new Date().toISOString();
  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearProgressStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
}