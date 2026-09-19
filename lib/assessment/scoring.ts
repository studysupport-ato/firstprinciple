import type { Question } from "@/lib/content/types/question";
import type { AssessmentSession } from "@/lib/assessment/session";
import { evaluateAssessmentQuestion } from "@/lib/assessment/evaluation";

export interface AssessmentScoreSummary {
  questions: number;
  answered: number;
  correct: number;
  incorrect: number;
  earnedMarks: number;
  possibleMarks: number;
  percentage: number;
}

export function calculateAssessmentScore(
  session: AssessmentSession,
  questions: Question[],
): AssessmentScoreSummary {
  let answered = 0;
  let correct = 0;
  let incorrect = 0;
  let earnedMarks = 0;
  let possibleMarks = 0;

  for (const question of questions) {
    const answer = session.answers[question.id];
    const evaluation = evaluateAssessmentQuestion(question, answer ?? null);
    possibleMarks += evaluation.possibleMarks;

    if (answer) {
      answered += 1;
    }

    if (evaluation.isCorrect) {
      correct += 1;
      earnedMarks += evaluation.earnedMarks;
    } else if (answer) {
      incorrect += 1;
    }
  }

  const percentage = possibleMarks > 0 ? Math.round((earnedMarks / possibleMarks) * 100) : 0;

  return {
    questions: questions.length,
    answered,
    correct,
    incorrect,
    earnedMarks,
    possibleMarks,
    percentage,
  };
}
