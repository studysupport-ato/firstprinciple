import type { Question } from "@/lib/content/types/question";
import type { AssessmentSession } from "@/lib/assessment/session";
import { evaluateAssessmentQuestion } from "@/lib/assessment/evaluation";
import { calculateAssessmentScore } from "@/lib/assessment/scoring";

export interface AssessmentQuestionResult {
  questionId: string;
  studentAnswer: string | number | boolean | string[] | null;
  correctAnswer: Question["correctAnswer"];
  explanation: string;
  isCorrect: boolean;
  earnedMarks: number;
  possibleMarks: number;
}

export interface AssessmentResult {
  id: string;
  assessmentId: string;
  sessionId: string;
  courseId: string;
  completedAt: string;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  earnedMarks: number;
  possibleMarks: number;
  percentage: number;
  questionResults: AssessmentQuestionResult[];
}

export function generateAssessmentResult(
  session: AssessmentSession,
  questions: Question[],
  assessmentId: string,
  courseId: string,
): AssessmentResult {
  const summary = calculateAssessmentScore(session, questions);

  const questionResults: AssessmentQuestionResult[] = questions.map((question) => {
    const answer = session.answers[question.id];
    const evaluation = evaluateAssessmentQuestion(question, answer ?? null);

    return {
      questionId: question.id,
      studentAnswer: answer?.value ?? null,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      isCorrect: evaluation.isCorrect,
      earnedMarks: evaluation.earnedMarks,
      possibleMarks: evaluation.possibleMarks,
    };
  });

  return {
    id: `assessment-result-${session.id}`,
    assessmentId,
    sessionId: session.id,
    courseId,
    completedAt: session.submittedAt ?? new Date().toISOString(),
    totalQuestions: summary.questions,
    answeredQuestions: summary.answered,
    correctAnswers: summary.correct,
    incorrectAnswers: summary.incorrect,
    earnedMarks: summary.earnedMarks,
    possibleMarks: summary.possibleMarks,
    percentage: summary.percentage,
    questionResults,
  };
}
