import { createEmptyStudentProgress, createProgressFactsRepository, localProgressRepository } from "./repository";
import type { ActivityEvent, ActivityType, AssessmentAttempt, CourseProgress, DayProgress, StudentProgress, WeekProgress, AttemptAnswerValue } from "./types";
import { createStableId } from "../ids";
import { getActiveStudentId } from "../auth/mock";
import { createSupabaseBrowserClient } from "../supabase/client";
import { getSupabaseStudentProfile, saveSupabaseStudentProfile } from "../student/supabaseProfileRepository";
import { getStudentProfile as getLocalStudentProfile, saveStudentProfile as saveLocalStudentProfile } from "../student/profileRepository";

// Use local storage for all progress to maintain demo student isolation
// without creating fake Supabase records or modifying auth RLS policies.
const dayProgressRepository = createProgressFactsRepository("local");
const practiceRepository = createProgressFactsRepository("local");
const assessmentRepository = createProgressFactsRepository("local");

/** Task 40B identity boundary: real Supabase users resolve via students bridge. */
export type ProgressIdentity =
  | { kind: "authenticated"; studentId: string }
  | { kind: "mock"; studentId: string };

let cachedIdentity: ProgressIdentity | null = null;

export function clearProgressIdentityCache() {
  cachedIdentity = null;
}

/**
 * Resolve the student identity for progress writes. Authenticated Supabase
 * users NEVER fall back to local-student/mock storage; mock/demo mode stays
 * explicit via lib/auth/mock.
 */
export async function resolveProgressIdentity(): Promise<ProgressIdentity> {
  if (cachedIdentity) return cachedIdentity;
  try {
    const client = createSupabaseBrowserClient();
    const { data } = await client.auth.getSession();
    const authUserId = data.session?.user?.id;
    if (authUserId) {
      const row = await client.from("students").select("id").eq("auth_user_id", authUserId).maybeSingle();
      const studentId = (row.data as { id: string } | null)?.id;
      if (studentId) {
        cachedIdentity = { kind: "authenticated", studentId };
        return cachedIdentity;
      }
      // Authenticated but trigger has not created the row yet: integrity error
      // surface — do NOT silently fall back to mock identity.
      throw new Error("Authenticated user has no student record.");
    }
  } catch (error) {
    // Only fall through to mock when there is genuinely no session.
    if (error instanceof Error && error.message.includes("no student record")) throw error;
  }
  const mockId = getActiveStudentId();
  cachedIdentity = { kind: "mock", studentId: mockId };
  return cachedIdentity;
}

function progressRepos(identity: ProgressIdentity) {
  return identity.kind === "authenticated" ? createProgressFactsRepository("supabase") : createProgressFactsRepository("local");
}

/** One-time explicit localStorage profile migration into Supabase (never overwrites). */
export async function migrateLocalProfileOnce(studentId: string): Promise<void> {
  try {
    const client = createSupabaseBrowserClient();
    const server = await getSupabaseStudentProfile(client, studentId);
    if (!server || server.fullName.trim()) return; // never overwrite server data
    const local = getLocalStudentProfile();
    if (local?.fullName.trim()) {
      await saveSupabaseStudentProfile(client, studentId, { fullName: local.fullName.trim(), migrateFromLocal: { fullName: local.fullName } });
    }
  } catch {
    // best-effort only
  }
}

async function saveProfileForIdentity(identity: ProgressIdentity, profile: { fullName: string; phoneNumber: string; email: string | null; profileCompleted: boolean }) {
  if (identity.kind === "authenticated") {
    const client = createSupabaseBrowserClient();
    return saveSupabaseStudentProfile(client, identity.studentId, { fullName: profile.fullName });
  }
  saveLocalStudentProfile({ studentId: identity.studentId, fullName: profile.fullName, phoneNumber: profile.phoneNumber, email: profile.email, profileCompleted: profile.profileCompleted, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
}

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

  const identity = await resolveProgressIdentity();
  const studentId = identity.studentId;
  const repo = progressRepos(identity);
  const now = new Date().toISOString();
  const existing = await repo.getDayProgress(studentId, courseId, weekId, dayId);
  const next: DayProgress = {
    dayId,
    status: "in_progress",
    startedAt: existing?.startedAt ?? now,
    completedAt: existing?.completedAt,
    lastVisitedAt: now,
    timeSpentSeconds: existing?.timeSpentSeconds ?? 0,
  };

  await repo.upsertDayProgress(studentId, courseId, weekId, next);
  await repo.createActivityEvent({
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

  const identity = await resolveProgressIdentity();
  const studentId = identity.studentId;
  const repo = progressRepos(identity);
  const now = new Date().toISOString();
  const existing = await repo.getDayProgress(studentId, courseId, weekId, dayId);
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

  await repo.upsertDayProgress(studentId, courseId, weekId, next);
  await repo.createActivityEvent({
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

  const identity = await resolveProgressIdentity();
  const studentId = identity.studentId;
  const repo = progressRepos(identity);
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
    const persisted = await repo.createPracticeAttempt(attempt);
    await repo.createActivityEvent({
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

  const identity = await resolveProgressIdentity();
  const studentId = identity.studentId;
  const repo = progressRepos(identity);
  const now = new Date().toISOString();
  await repo.createActivityEvent({
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
  const identity = await resolveProgressIdentity();
  const studentId = identity.studentId;
  const repo = progressRepos(identity);
  const attempts = await repo.listAssessmentAttempts(studentId, {
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
  return await repo.getAssessmentAttempt(studentId, latest.id) ?? latest;
}

export async function recordAssessmentStart(courseId: string, assessmentId: string, chapterId?: string, startedAt?: string) {
  if (isPreviewMode()) return undefined;

  const identity = await resolveProgressIdentity();
  const studentId = identity.studentId;
  const repo = progressRepos(identity);
  const now = startedAt ?? new Date().toISOString();
  const existingAttempts = await repo.listAssessmentAttempts(studentId, {
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

  const persisted = await repo.upsertAssessmentAttempt({
    ...nextAttempt,
    studentId,
    courseId,
    chapterId,
    startedAt: nextAttempt.startedAt ?? now,
    submittedAt: nextAttempt.submittedAt ?? undefined,
    answers: nextAttempt.answers ?? {},
  });

  await repo.createActivityEvent({
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

  const identity = await resolveProgressIdentity();
  const studentId = identity.studentId;
  const repo = progressRepos(identity);
  const now = new Date().toISOString();
  const percent = Math.max(0, Math.min(100, Math.round(input.percentage)));

  const existingAttempts = await repo.listAssessmentAttempts(studentId, {
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

  const persisted = await repo.upsertAssessmentAttempt(nextAttempt);

  await repo.createActivityEvent({
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