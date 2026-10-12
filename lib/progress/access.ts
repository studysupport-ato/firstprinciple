import { createEmptyStudentProgress, createProgressFactsRepository, localProgressRepository } from "./repository";
import type { ActivityEvent, ActivityType, AssessmentAttempt, CourseProgress, DayProgress, StudentProgress, WeekProgress, AttemptAnswerValue } from "./types";
import { createStableId } from "../ids";
import { getActiveStudentId } from "../auth/mock";
import { createSupabaseBrowserClient } from "../supabase/client";
import { getSupabaseStudentProfile, saveSupabaseStudentProfile } from "../student/supabaseProfileRepository";
import { getStudentProfile as getLocalStudentProfile, saveStudentProfile as saveLocalStudentProfile } from "../student/profileRepository";
import {
  MISSING_STUDENT_RECORD_MESSAGE,
  getSupabaseAuthUserId,
  resolveAuthenticatedReadStudentId,
} from "../student/readIdentity";

// Task 40E.2 — the module-scope `createProgressFactsRepository("local")`
// constants that lived here are removed. They were referenced only by their own
// definitions and became dead when the synchronous accessors were retired in
// 40E.1.
//
// Demo/local student isolation is NOT removed. It still works through the live
// `progressRepos(identity)` factory below, which selects the local repository
// whenever the resolved identity is `mock`, so demo writes remain isolated
// without fake Supabase records and without any RLS change.

/** Task 40B identity boundary: real Supabase users resolve via students bridge. */
export type ProgressIdentity =
  | { kind: "authenticated"; studentId: string }
  | { kind: "mock"; studentId: string };

/**
 * The cache is keyed by the Supabase Auth user id that produced it (null when
 * there is no session). Task 40D.1: a previously unkeyed cache could survive a
 * sign-out -> sign-in-as-another-user cycle inside one tab and hand the previous
 * user's student id to a write. Keying it makes the cache self-validating in the
 * same way lib/student/readIdentity already validates its own cache.
 */
let cachedIdentity: ProgressIdentity | null = null;
let cachedAuthUserId: string | null | undefined;

export function clearProgressIdentityCache() {
  cachedIdentity = null;
  cachedAuthUserId = undefined;
}

/**
 * Resolve the student identity for progress writes. Authenticated Supabase
 * users NEVER fall back to local-student/mock storage; mock/demo mode stays
 * explicit via lib/auth/mock.
 *
 * The actual `auth.users.id -> students.auth_user_id -> students.id` lookup is
 * owned by lib/student/readIdentity (Task 40C-1) so reads and writes can never
 * drift into two incompatible identity algorithms. Its module cache makes this
 * a no-op call when the identity was already resolved this session.
 */
export async function resolveProgressIdentity(): Promise<ProgressIdentity> {
  // A cached identity is only reusable when it was produced by the CURRENT
  // session. getSupabaseAuthUserId() is served from the local session cache, so
  // this costs no network round trip.
  const currentAuthUserId = await getSupabaseAuthUserId();
  if (cachedIdentity && cachedAuthUserId === currentAuthUserId) return cachedIdentity;

  let studentId: string | null = null;
  let resolutionError: unknown = null;
  try {
    studentId = await resolveAuthenticatedReadStudentId();
  } catch (error) {
    resolutionError = error;
  }

  if (!studentId) {
    // A mock/local fallback is permissible ONLY when there is genuinely no
    // Supabase session. If a session exists, surface the failure — an
    // authenticated user must never silently downgrade to mock identity.
    if (currentAuthUserId) {
      throw resolutionError ?? new Error(MISSING_STUDENT_RECORD_MESSAGE);
    }
  }

  if (studentId) {
    cachedIdentity = { kind: "authenticated", studentId };
    cachedAuthUserId = currentAuthUserId;
    return cachedIdentity;
  }

  // Genuinely no Supabase session -> explicit mock/demo mode only.
  const mockId = getActiveStudentId();
  cachedIdentity = { kind: "mock", studentId: mockId };
  cachedAuthUserId = null;
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

// Task 40E.1 — the synchronous local-document accessors below
// (getStudentProgress / getCourseProgress / getWeekProgress / getDayProgress)
// were removed with the legacy selector layer. Their only consumers were
// lib/progress/selectors.ts. Current production surfaces read Supabase-backed
// facts through lib/student/readProgress.ts and the targeted progress
// repositories instead.

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