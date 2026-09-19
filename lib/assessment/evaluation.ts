import { evaluateQuestionAnswer } from "@/lib/practice/session";
import type { Question } from "@/lib/content/types/question";
import type { AssessmentAnswerRecord } from "@/lib/assessment/session";

export interface AssessmentEvaluation {
  isCorrect: boolean;
  earnedMarks: number;
  possibleMarks: number;
}

export function evaluateAssessmentQuestion(
  question: Question,
  answer?: AssessmentAnswerRecord | null,
): AssessmentEvaluation {
  if (!answer) {
    return {
      isCorrect: false,
      earnedMarks: 0,
      possibleMarks: question.marks,
    };
  }

  const isCorrect = evaluateQuestionAnswer(question, answer.value);

  return {
    isCorrect,
    earnedMarks: isCorrect ? question.marks : 0,
    possibleMarks: question.marks,
  };
}
