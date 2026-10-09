/**
 * Canonical student progress model.
 *
 * Separates CONTENT state (what exists in the course) from STUDENT state
 * (what this student has done with that content). Progress is keyed by
 * stable content IDs so renames/reorders survive. The types are shaped to
 * map cleanly to future relational persistence (Supabase later).
 */

export const STUDENT_ID = "local-student";

/**
 * Task 40E.1 — shared progress metric contracts.
 *
 * These were previously declared in the legacy local-storage `selectors.ts`
 * module. They are NOT legacy selector logic: they are the shapes produced by
 * the current Supabase-backed metric functions in the Dashboard and Progress
 * pages, so they were moved here to the canonical types module when that legacy
 * module was retired. Definitions are preserved verbatim.
 */
export interface PracticeStats {
  totalAttempts: number;
  correctAttempts: number;
  distinctAnswered: number;
  distinctCorrect: number;
  accuracy: number;
  problemsSolved: number;
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

export interface DailyActivityPoint {
  date: string;
  label: string;
  count: number;
}

export type DayStatus = "not_started" | "in_progress" | "completed";

export interface DayProgress {
  /** Stable content ID (lesson id). */
  dayId: string;
  status: DayStatus;
  startedAt?: string;
  completedAt?: string;
  lastVisitedAt?: string;
  /** Optional, non-invasive session duration (seconds). */
  timeSpentSeconds?: number;
}

export interface WeekProgress {
  /** Stable content ID (week id). */
  weekId: string;
  startedAt?: string;
  completedAt?: string;
  /** Keyed by dayId. */
  days: Record<string, DayProgress>;
}

export interface CourseProgress {
  /** Stable content ID (course id). */
  courseId: string;
  startedAt?: string;
  lastAccessedAt?: string;
  completedAt?: string;
  /** Keyed by weekId. */
  weeks: Record<string, WeekProgress>;
}

export type ActivityType =
  | "lesson_started"
  | "lesson_completed"
  | "practice_started"
  | "question_answered"
  | "assessment_started"
  | "assessment_submitted"
  | "course_started";

export interface ActivityEvent {
  id: string;
  studentId: string;
  courseId: string;
  type: ActivityType;
  occurredAt: string;
  /** lessonId / questionId / assessmentId */
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export type AttemptStatus = "in_progress" | "submitted";

export type AttemptAnswerValue = string | number | boolean | string[] | null;

export interface PracticeAttempt {
  id: string;
  studentId: string;
  questionId: string;
  courseId: string;
  lessonId?: string;
  answer: AttemptAnswerValue;
  isCorrect: boolean;
  marksEarned: number;
  marksAvailable: number;
  startedAt: string;
  answeredAt: string;
  metadata?: Record<string, unknown>;
}

export interface AssessmentAttempt {
  id: string;
  studentId: string;
  assessmentId: string;
  courseId: string;
  chapterId?: string;
  startedAt: string;
  submittedAt?: string;
  /** questionId -> answer value */
  answers: Record<string, AttemptAnswerValue>;
  score: number;
  percentage: number;
  marksEarned: number;
  marksAvailable: number;
  status: AttemptStatus;
}

export interface StudentProgress {
  studentId: string;
  courseProgress: Record<string, CourseProgress>;
  practiceAttempts: PracticeAttempt[];
  assessmentAttempts: AssessmentAttempt[];
  activity: ActivityEvent[];
  updatedAt: string;
}
