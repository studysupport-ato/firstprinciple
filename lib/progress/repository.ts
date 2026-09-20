import { createEmptyProgress, PROGRESS_STORAGE_KEY, readProgress, writeProgress } from "./store";
import type { ActivityEvent, AssessmentAttempt, DayProgress, PracticeAttempt, StudentProgress } from "./types";
import { createSupabaseBrowserClient } from "../supabase/client";
import type { Database } from "../supabase/types";

export interface ProgressRepository {
  read(): StudentProgress;
  write(progress: StudentProgress): StudentProgress | undefined;
  clear(): void;
}

export const localProgressRepository: ProgressRepository = {
  read: readProgress,
  write: writeProgress,
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
  },
};

export function createEmptyStudentProgress() {
  return createEmptyProgress();
}

export type ActivityCursor = { occurredAt: string; id: string };

export interface ProgressFactsRepository {
  getDayProgress(studentId: string, courseId: string, weekId: string, dayId: string): Promise<DayProgress | undefined>;
  listDayProgressForCourse(studentId: string, courseId: string): Promise<DayProgress[]>;
  upsertDayProgress(studentId: string, courseId: string, weekId: string, progress: DayProgress): Promise<DayProgress>;
  createPracticeAttempt(attempt: PracticeAttempt): Promise<PracticeAttempt>;
  getPracticeAttempt(studentId: string, attemptId: string): Promise<PracticeAttempt | undefined>;
  listPracticeAttempts(studentId: string, options?: { courseId?: string; questionId?: string; limit?: number }): Promise<PracticeAttempt[]>;
  upsertAssessmentAttempt(attempt: AssessmentAttempt): Promise<AssessmentAttempt>;
  getAssessmentAttempt(studentId: string, attemptId: string): Promise<AssessmentAttempt | undefined>;
  listAssessmentAttempts(studentId: string, options?: { courseId?: string; assessmentId?: string; status?: AssessmentAttempt["status"]; limit?: number }): Promise<AssessmentAttempt[]>;
  createActivityEvent(event: ActivityEvent): Promise<ActivityEvent>;
  listActivity(studentId: string, options?: { courseId?: string; limit?: number; cursor?: ActivityCursor }): Promise<{ events: ActivityEvent[]; nextCursor?: ActivityCursor }>;
}

function updateLocalProgress(mutator: (progress: StudentProgress) => void) {
  const progress = readProgress();
  mutator(progress);
  return writeProgress(progress) ?? progress;
}

function localDayProgress(progress: StudentProgress, courseId: string, weekId: string, dayId: string) {
  return progress.courseProgress[courseId]?.weeks[weekId]?.days[dayId];
}

export const progressFactsLocalRepository: ProgressFactsRepository = {
  async getDayProgress(studentId, courseId, weekId, dayId) {
    if (readProgress().studentId !== studentId) return undefined;
    return localDayProgress(readProgress(), courseId, weekId, dayId);
  },
  async listDayProgressForCourse(studentId, courseId) {
    const progress = readProgress();
    if (progress.studentId !== studentId) return [];
    return Object.values(progress.courseProgress[courseId]?.weeks ?? {}).flatMap((week) => Object.values(week.days));
  },
  async upsertDayProgress(studentId, courseId, weekId, day) {
    const next = updateLocalProgress((progress) => {
      progress.studentId = studentId;
      const course = progress.courseProgress[courseId] ?? { courseId, weeks: {} };
      const week = course.weeks[weekId] ?? { weekId, days: {} };
      week.days[day.dayId] = day;
      course.weeks[weekId] = week;
      progress.courseProgress[courseId] = course;
    });
    return localDayProgress(next, courseId, weekId, day.dayId) ?? day;
  },
  async createPracticeAttempt(attempt) {
    updateLocalProgress((progress) => { progress.studentId = attempt.studentId; progress.practiceAttempts.push(attempt); });
    return attempt;
  },
  async getPracticeAttempt(studentId, attemptId) {
    return readProgress().studentId === studentId ? readProgress().practiceAttempts.find((attempt) => attempt.id === attemptId) : undefined;
  },
  async listPracticeAttempts(studentId, options = {}) {
    if (readProgress().studentId !== studentId) return [];
    let attempts = readProgress().practiceAttempts.filter((attempt) => (!options.courseId || attempt.courseId === options.courseId) && (!options.questionId || attempt.questionId === options.questionId));
    return options.limit && options.limit > 0 ? attempts.slice(-options.limit).reverse() : attempts;
  },
  async upsertAssessmentAttempt(attempt) {
    const next = updateLocalProgress((progress) => {
      progress.studentId = attempt.studentId;
      const index = progress.assessmentAttempts.findIndex((entry) => entry.id === attempt.id);
      if (index === -1) progress.assessmentAttempts.push(attempt); else progress.assessmentAttempts[index] = attempt;
    });
    return next.assessmentAttempts.find((entry) => entry.id === attempt.id) ?? attempt;
  },
  async getAssessmentAttempt(studentId, attemptId) { return readProgress().studentId === studentId ? readProgress().assessmentAttempts.find((attempt) => attempt.id === attemptId) : undefined; },
  async listAssessmentAttempts(studentId, options = {}) {
    if (readProgress().studentId !== studentId) return [];
    let attempts = readProgress().assessmentAttempts.filter((attempt) => (!options.courseId || attempt.courseId === options.courseId) && (!options.assessmentId || attempt.assessmentId === options.assessmentId) && (!options.status || attempt.status === options.status));
    attempts = attempts.sort((a, b) => (b.submittedAt ?? b.startedAt).localeCompare(a.submittedAt ?? a.startedAt));
    return options.limit && options.limit > 0 ? attempts.slice(0, options.limit) : attempts;
  },
  async createActivityEvent(event) { updateLocalProgress((progress) => { progress.studentId = event.studentId; progress.activity.push(event); }); return event; },
  async listActivity(studentId, options = {}) {
    if (readProgress().studentId !== studentId) return { events: [] };
    let events = readProgress().activity.filter((event) => !options.courseId || event.courseId === options.courseId).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id));
    if (options.cursor) events = events.filter((event) => event.occurredAt < options.cursor!.occurredAt || (event.occurredAt === options.cursor!.occurredAt && event.id < options.cursor!.id));
    const page = options.limit && options.limit > 0 ? events.slice(0, options.limit) : events;
    const last = page[page.length - 1];
    return { events: page, nextCursor: last && events.length > page.length ? { occurredAt: last.occurredAt, id: last.id } : undefined };
  },
};

type DayProgressRow = Database["public"]["Tables"]["student_day_progress"]["Row"];
type PracticeAttemptRow = Database["public"]["Tables"]["practice_attempts"]["Row"];
type AssessmentAttemptRow = Database["public"]["Tables"]["assessment_attempts"]["Row"];
type ActivityEventRow = Database["public"]["Tables"]["activity_events"]["Row"];

function mapDay(row: DayProgressRow): DayProgress { return { dayId: row.day_id, status: row.status as DayProgress["status"], startedAt: row.started_at ?? undefined, completedAt: row.completed_at ?? undefined, lastVisitedAt: row.last_visited_at ?? undefined, timeSpentSeconds: row.time_spent_seconds }; }
function mapPractice(row: PracticeAttemptRow): PracticeAttempt { return { id: row.id, studentId: row.student_id, questionId: row.question_id, courseId: row.course_id, lessonId: row.lesson_id ?? undefined, answer: row.answer as PracticeAttempt["answer"], isCorrect: row.is_correct, marksEarned: row.marks_earned, marksAvailable: row.marks_available, startedAt: row.started_at ?? "", answeredAt: row.answered_at ?? "", metadata: (row.metadata ?? undefined) as PracticeAttempt["metadata"] }; }
function mapAssessment(row: AssessmentAttemptRow): AssessmentAttempt { return { id: row.id, studentId: row.student_id, assessmentId: row.assessment_id, courseId: row.course_id, chapterId: row.chapter_id ?? undefined, startedAt: row.started_at ?? "", submittedAt: row.submitted_at ?? undefined, answers: row.answers as AssessmentAttempt["answers"], score: row.score, percentage: row.percentage, marksEarned: row.marks_earned, marksAvailable: row.marks_available, status: row.status as AssessmentAttempt["status"] }; }
function mapActivity(row: ActivityEventRow): ActivityEvent { return { id: row.id, studentId: row.student_id, courseId: row.course_id, type: row.type as ActivityEvent["type"], occurredAt: row.occurred_at, entityId: row.entity_id ?? undefined, metadata: (row.metadata ?? undefined) as ActivityEvent["metadata"] }; }

export const progressFactsSupabaseRepository: ProgressFactsRepository = {
  async getDayProgress(studentId, courseId, weekId, dayId) { const { data, error } = await createSupabaseBrowserClient().from("student_day_progress").select("*").eq("student_id", studentId).eq("course_id", courseId).eq("week_id", weekId).eq("day_id", dayId).maybeSingle(); if (error) throw error; return data ? mapDay(data as DayProgressRow) : undefined; },
  async listDayProgressForCourse(studentId, courseId) { const { data, error } = await createSupabaseBrowserClient().from("student_day_progress").select("*").eq("student_id", studentId).eq("course_id", courseId).order("updated_at", { ascending: false }); if (error) throw error; return ((data ?? []) as DayProgressRow[]).map(mapDay); },
  async upsertDayProgress(studentId, courseId, weekId, progress) { const row = { student_id: studentId, day_id: progress.dayId, course_id: courseId, week_id: weekId, status: progress.status, started_at: progress.startedAt ?? null, completed_at: progress.completedAt ?? null, last_visited_at: progress.lastVisitedAt ?? null, time_spent_seconds: progress.timeSpentSeconds ?? 0 }; const { data, error } = await createSupabaseBrowserClient().from("student_day_progress").upsert(row as never, { onConflict: "student_id,day_id" }).select("*").single(); if (error) throw error; return mapDay(data as DayProgressRow); },
  async createPracticeAttempt(attempt) { const row = { id: attempt.id, student_id: attempt.studentId, question_id: attempt.questionId, course_id: attempt.courseId, lesson_id: attempt.lessonId ?? null, answer: attempt.answer, is_correct: attempt.isCorrect, marks_earned: attempt.marksEarned, marks_available: attempt.marksAvailable, started_at: attempt.startedAt, answered_at: attempt.answeredAt, metadata: attempt.metadata ?? null }; const { data, error } = await createSupabaseBrowserClient().from("practice_attempts").insert(row as never).select("*").single(); if (error) throw error; return mapPractice(data as PracticeAttemptRow); },
  async getPracticeAttempt(studentId, attemptId) { const { data, error } = await createSupabaseBrowserClient().from("practice_attempts").select("*").eq("student_id", studentId).eq("id", attemptId).maybeSingle(); if (error) throw error; return data ? mapPractice(data as PracticeAttemptRow) : undefined; },
  async listPracticeAttempts(studentId, options = {}) { let query = createSupabaseBrowserClient().from("practice_attempts").select("*").eq("student_id", studentId).order("created_at", { ascending: false }).order("id", { ascending: false }); if (options.courseId) query = query.eq("course_id", options.courseId); if (options.questionId) query = query.eq("question_id", options.questionId); if (options.limit && options.limit > 0) query = query.limit(options.limit); const { data, error } = await query; if (error) throw error; return ((data ?? []) as PracticeAttemptRow[]).map(mapPractice); },
  async upsertAssessmentAttempt(attempt) { const row = { id: attempt.id, student_id: attempt.studentId, assessment_id: attempt.assessmentId, course_id: attempt.courseId, chapter_id: attempt.chapterId ?? null, answers: attempt.answers, score: attempt.score, percentage: attempt.percentage, marks_earned: attempt.marksEarned, marks_available: attempt.marksAvailable, status: attempt.status, started_at: attempt.startedAt, submitted_at: attempt.submittedAt ?? null }; const { data, error } = await createSupabaseBrowserClient().from("assessment_attempts").upsert(row as never, { onConflict: "id" }).select("*").single(); if (error) throw error; return mapAssessment(data as AssessmentAttemptRow); },
  async getAssessmentAttempt(studentId, attemptId) { const { data, error } = await createSupabaseBrowserClient().from("assessment_attempts").select("*").eq("student_id", studentId).eq("id", attemptId).maybeSingle(); if (error) throw error; return data ? mapAssessment(data as AssessmentAttemptRow) : undefined; },
  async listAssessmentAttempts(studentId, options = {}) { let query = createSupabaseBrowserClient().from("assessment_attempts").select("*").eq("student_id", studentId).order("created_at", { ascending: false }).order("id", { ascending: false }); if (options.courseId) query = query.eq("course_id", options.courseId); if (options.assessmentId) query = query.eq("assessment_id", options.assessmentId); if (options.status) query = query.eq("status", options.status); if (options.limit && options.limit > 0) query = query.limit(options.limit); const { data, error } = await query; if (error) throw error; return ((data ?? []) as AssessmentAttemptRow[]).map(mapAssessment); },
  async createActivityEvent(event) { const row = { id: event.id, student_id: event.studentId, course_id: event.courseId, type: event.type, occurred_at: event.occurredAt, entity_id: event.entityId ?? null, metadata: event.metadata ?? null }; const { data, error } = await createSupabaseBrowserClient().from("activity_events").insert(row as never).select("*").single(); if (error) throw error; return mapActivity(data as ActivityEventRow); },
  async listActivity(studentId, options = {}) { let query = createSupabaseBrowserClient().from("activity_events").select("*").eq("student_id", studentId).order("occurred_at", { ascending: false }).order("id", { ascending: false }); if (options.courseId) query = query.eq("course_id", options.courseId); if (options.cursor) query = query.or(`occurred_at.lt.${options.cursor.occurredAt},and(occurred_at.eq.${options.cursor.occurredAt},id.lt.${options.cursor.id})`); const limit = options.limit && options.limit > 0 ? options.limit : 50; query = query.limit(limit + 1); const { data, error } = await query; if (error) throw error; const rows = (data ?? []) as ActivityEventRow[]; const page = rows.slice(0, limit).map(mapActivity); const last = page[page.length - 1]; return { events: page, nextCursor: rows.length > limit && last ? { occurredAt: last.occurredAt, id: last.id } : undefined }; },
};

export type ProgressRepositorySource = "local" | "supabase";
export function createProgressFactsRepository(source: ProgressRepositorySource = "local"): ProgressFactsRepository { return source === "supabase" ? progressFactsSupabaseRepository : progressFactsLocalRepository; }
