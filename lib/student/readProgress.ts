import { createProgressFactsRepository, type ActivityEvent, type AssessmentAttempt, type DayProgress, type PracticeAttempt } from "../progress";
import { resolveAuthenticatedReadStudentId } from "./readIdentity";
import { createSupabaseBrowserClient } from "../supabase/client";

/**
 * Task 40C-2 — shared Supabase-backed READ helpers for the course surfaces
 * (Course Overview, Roadmap, Week view).
 *
 * These are deliberately thin: they perform no progress calculation. Each
 * surface keeps its own existing completion arithmetic, and every surface
 * reads the SAME `student_day_progress` facts via the SAME repository, so the
 * roadmap / week / overview / lesson views cannot disagree about completion.
 *
 * Unauthenticated browsing is public: no student fact query is issued and null
 * is returned so callers render their existing logged-out state.
 */

/**
 * Student day progress for one course, keyed by dayId.
 * null when there is no authenticated session (public browsing).
 */
const dayProgressRequestsInFlight = new Map<string, Promise<Record<string, DayProgress>>>();

export async function readStudentDayProgressMap(courseId: string): Promise<Record<string, DayProgress> | null> {
  const studentId = await resolveAuthenticatedReadStudentId();
  if (!studentId) return null;

  const requestKey = `${studentId}:${courseId}`;
  const existingRequest = dayProgressRequestsInFlight.get(requestKey);
  if (existingRequest) return existingRequest;

  const request = fetchStudentDayProgressMap(studentId, courseId);
  dayProgressRequestsInFlight.set(requestKey, request);
  try {
    return await request;
  } finally {
    if (dayProgressRequestsInFlight.get(requestKey) === request) {
      dayProgressRequestsInFlight.delete(requestKey);
    }
  }
}

async function fetchStudentDayProgressMap(
  studentId: string,
  courseId: string,
): Promise<Record<string, DayProgress>> {
  // Throws if the authenticated student mapping is missing — never falls back.
  const repository = createProgressFactsRepository("supabase");
  const rows = await repository.listDayProgressForCourse(studentId, courseId);
  return Object.fromEntries(rows.map((row) => [row.dayId, row]));
}

/**
 * Task 40C-3 — day progress across SEVERAL courses in a SINGLE bounded query.
 *
 * The Course Library renders many course cards, so issuing one
 * `listDayProgressForCourse` call per course would be an N+1. Instead this
 * performs exactly one request scoped to the student (via RLS) and to the
 * displayed course ids, keeping it bounded and index-friendly against
 * `student_day_progress_student_course_idx` on (student_id, course_id).
 *
 * Rows are returned flat; callers group them by course using the day->course
 * mapping they already derive from the curriculum, never from client input.
 * Returns null when signed out, so public browsing issues no private query.
 */
export async function readStudentDayProgressForCourses(
  courseIds: string[],
): Promise<DayProgress[] | null> {
  // Throws if the authenticated student mapping is missing — never falls back.
  const studentId = await resolveAuthenticatedReadStudentId();
  if (!studentId) return null;

  const uniqueCourseIds = Array.from(new Set(courseIds)).filter(Boolean);
  if (uniqueCourseIds.length === 0) return [];

  const { data, error } = await createSupabaseBrowserClient()
    .from("student_day_progress")
    .select("*")
    .eq("student_id", studentId)
    .in("course_id", uniqueCourseIds);

  if (error) throw error;

  type DayRow = {
    day_id: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    last_visited_at: string | null;
    time_spent_seconds: number;
  };

  return ((data ?? []) as DayRow[]).map(
    (row): DayProgress => ({
      dayId: row.day_id,
      status: row.status as DayProgress["status"],
      startedAt: row.started_at ?? undefined,
      completedAt: row.completed_at ?? undefined,
      lastVisitedAt: row.last_visited_at ?? undefined,
      timeSpentSeconds: row.time_spent_seconds,
    }),
  );
}

/** Activity events inside a date window, oldest first, via cursor pagination. */
export async function readActivityForWindow(
  studentId: string,
  options: { courseId?: string; sinceIso: string; maxEvents?: number },
): Promise<ActivityEvent[]> {
  const maxEvents = options.maxEvents ?? 2000;
  const repository = createProgressFactsRepository("supabase");
  const sinceMs = Date.parse(options.sinceIso);

  const collected: ActivityEvent[] = [];
  let cursor: { occurredAt: string; id: string } | undefined;

  for (;;) {
    const page = await repository.listActivity(studentId, {
      courseId: options.courseId,
      limit: 200,
      cursor,
    });

    let reachedWindow = false;
    for (const event of page.events) {
      // listActivity is newest-first, so the first event older than the window
      // start means everything remaining is older still.
      if (Date.parse(event.occurredAt) < sinceMs) {
        reachedWindow = true;
        break;
      }
      collected.push(event);
    }

    if (reachedWindow) break;
    if (collected.length >= maxEvents) break;
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }

  return collected.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

/**
 * Task 40E.6 — the student's practice and assessment attempts, read as ONE
 * logical fact pair.
 *
 * These two reads always travel together: every consumer that needs practice
 * statistics also needs assessment scores (mastery, accuracy, assessment
 * history). Both are issued in parallel with identical scoping options so the
 * pair can never drift — for example one becoming course-scoped while the other
 * is not, which would silently skew mastery.
 *
 * `courseId` is optional by design: the Dashboard reads attempts across ALL
 * courses so a single query serves every course card, while the Progress page
 * scopes both to one course. Omitting it must stay symmetric.
 */
export async function readStudentAttemptFacts(
  studentId: string,
  options: { courseId?: string; limit?: number } = {},
): Promise<{ practiceAttempts: PracticeAttempt[]; assessmentAttempts: AssessmentAttempt[] }> {
  const repository = createProgressFactsRepository("supabase");

  const [practiceAttempts, assessmentAttempts] = await Promise.all([
    repository.listPracticeAttempts(studentId, { courseId: options.courseId, limit: options.limit }),
    repository.listAssessmentAttempts(studentId, { courseId: options.courseId, limit: options.limit }),
  ]);

  return { practiceAttempts, assessmentAttempts };
}

/**
 * Task 40E.6 — the student's most recent activity events, newest first.
 *
 * Bounded single-page read, unlike `readActivityForWindow` which paginates back
 * through a long window (used to fill the Progress heatmap). Surfaces that only
 * need "recent" events — the Dashboard's streak, recent-activity list and
 * 7-day activity strip — should use this so they do not accidentally pull an
 * unbounded history.
 */
export async function readRecentActivity(
  studentId: string,
  options: { courseId?: string; limit?: number } = {},
): Promise<ActivityEvent[]> {
  const repository = createProgressFactsRepository("supabase");
  const page = await repository.listActivity(studentId, {
    courseId: options.courseId,
    limit: options.limit,
  });
  return page.events;
}