/**
 * Canonical student progress model.
 *
 * Separates CONTENT state (what exists in the course) from STUDENT state
 * (what this student has done with that content). Progress is keyed by
 * stable content IDs so renames/reorders survive. The types are shaped to
 * map cleanly to future relational persistence (Supabase later).
 */

export const STUDENT_ID = "local-student";

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

export type DayRoadmapState = "locked" | "not_started" | "in_progress" | "completed";