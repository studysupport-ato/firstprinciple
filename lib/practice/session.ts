import { getStudentQuestions } from "@/lib/content/access";
import type { Difficulty } from "@/lib/content/types/question";
import { createStableId } from "@/lib/ids";
import type { Question } from "@/lib/content/types/question";

export type PracticeValue = string | number | boolean | string[] | null;

export interface PracticeAnswerRecord {
  questionId: string;
  selectedValue: PracticeValue;
  submitted: boolean;
  isCorrect: boolean | null;
  answeredAt: string | null;
}

export interface PracticeSession {
  id: string;
  questionIds: string[];
  currentIndex: number;
  answers: Record<string, PracticeAnswerRecord>;
  startedAt: string;
  completedAt: string | null;
  completed: boolean;
}

export interface PracticeSelectionOptions {
  courseId?: string;
  chapterId?: string;
  lessonId?: string;
  topic?: string;
  subtopic?: string;
  difficulty?: Difficulty;
  limit?: number;
  includeDraft?: boolean;
}

export function getPracticeQuestions({ courseId, chapterId, lessonId, topic, subtopic, difficulty, limit, includeDraft }: PracticeSelectionOptions = {}): Question[] {
  const questions = getStudentQuestions({
    courseId,
    chapterId,
    lessonId,
    topic,
    subtopic,
    difficulty,
    limit,
  }, { includeDraft });

  if (!questions.length) {
    return [];
  }

  return [...questions];
}

export function createPracticeSession(questionIds: string[]): PracticeSession {
  return {
    id: createStableId("practice-session"),
    questionIds,
    currentIndex: 0,
    answers: {},
    startedAt: new Date().toISOString(),
    completedAt: null,
    completed: false,
  };
}

function normalizeString(value: PracticeValue): string {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? "").trim().toLowerCase()).join(",");
  }

  return String(value ?? "").trim().toLowerCase();
}

function normalizeNumericValue(value: PracticeValue): number | null {
  if (Array.isArray(value)) {
    return value.length ? normalizeNumericValue(value[0]) : null;
  }

  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/,/g, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function evaluateQuestionAnswer(question: Question, providedAnswer: PracticeValue): boolean {
  const correctAnswer = question.correctAnswer;

  switch (question.type) {
    case "multiple-choice":
    case "true-false": {
      if (Array.isArray(providedAnswer)) {
        return providedAnswer.some((entry) => normalizeString(entry) === normalizeString(correctAnswer));
      }
      return normalizeString(providedAnswer) === normalizeString(correctAnswer);
    }
    case "numerical": {
      const given = normalizeNumericValue(providedAnswer);
      const expected = normalizeNumericValue(correctAnswer);
      if (given === null || expected === null) {
        return false;
      }
      return Math.abs(given - expected) < 1e-8;
    }
    case "short-answer": {
      if (Array.isArray(providedAnswer)) {
        return providedAnswer.some((entry) => normalizeString(entry) === normalizeString(correctAnswer));
      }
      if (typeof correctAnswer === "number" || typeof correctAnswer === "boolean") {
        return normalizeString(providedAnswer) === normalizeString(correctAnswer);
      }
      const given = normalizeString(providedAnswer);
      const expected = normalizeString(correctAnswer);
      return given === expected || given === expected.replace(/\s+/g, "");
    }
    default:
      if (Array.isArray(providedAnswer)) {
        return providedAnswer.some((entry) => normalizeString(entry) === normalizeString(correctAnswer));
      }
      return normalizeString(providedAnswer) === normalizeString(correctAnswer);
  }
}

export function getPracticeSummary(session: PracticeSession, questions: Question[]) {
  const correctCount = questions.reduce((count, question) => {
    const answer = session.answers[question.id];
    if (answer?.submitted && answer.isCorrect) {
      return count + 1;
    }
    return count;
  }, 0);

  return {
    correctCount,
    answeredCount: questions.filter((question) => Boolean(session.answers[question.id]?.submitted)).length,
    total: questions.length,
    percentage: questions.length ? Math.round((correctCount / questions.length) * 100) : 0,
  };
}
