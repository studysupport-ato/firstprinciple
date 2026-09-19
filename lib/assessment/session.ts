export type AssessmentStatus = "not-started" | "in-progress" | "submitted" | "completed";
import { createStableId } from "@/lib/ids";
export type AssessmentAnswerValue = string | number | boolean | string[] | null;

export interface AssessmentAnswerRecord {
  questionId: string;
  value: AssessmentAnswerValue;
  answeredAt: string;
}

export interface AssessmentSession {
  id: string;
  assessmentId: string;
  courseId: string;
  chapterId?: string;
  questionIds: string[];
  currentIndex: number;
  answers: Record<string, AssessmentAnswerRecord>;
  startedAt: string;
  submittedAt: string | null;
  status: AssessmentStatus;
}

export function createAssessmentSession(
  assessmentId: string,
  courseId: string,
  questionIds: string[],
  chapterId?: string,
): AssessmentSession {
  return {
    id: createStableId("assessment-session", assessmentId),
    assessmentId,
    courseId,
    chapterId,
    questionIds,
    currentIndex: 0,
    answers: {},
    startedAt: new Date().toISOString(),
    submittedAt: null,
    status: "not-started",
  };
}

export function setSessionAnswer(
  session: AssessmentSession,
  questionId: string,
  value: AssessmentAnswerValue,
): AssessmentSession {
  if (session.status === "submitted" || session.status === "completed") {
    return session;
  }

  return {
    ...session,
    status: "in-progress",
    answers: {
      ...session.answers,
      [questionId]: {
        questionId,
        value,
        answeredAt: new Date().toISOString(),
      },
    },
  };
}

export function advanceAssessmentQuestion(session: AssessmentSession, direction: -1 | 1): AssessmentSession {
  if (session.questionIds.length === 0) {
    return session;
  }

  const nextIndex = Math.max(0, Math.min(session.questionIds.length - 1, session.currentIndex + direction));

  return {
    ...session,
    currentIndex: nextIndex,
  };
}

export function submitAssessmentSession(session: AssessmentSession): AssessmentSession {
  if (session.status === "submitted" || session.status === "completed") {
    return session;
  }

  return {
    ...session,
    status: "submitted",
    submittedAt: new Date().toISOString(),
  };
}

export function getCurrentQuestionId(session: AssessmentSession): string | null {
  if (!session.questionIds.length) return null;
  return session.questionIds[Math.min(session.currentIndex, session.questionIds.length - 1)] ?? null;
}
