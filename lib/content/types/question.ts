export type QuestionType = "multiple-choice" | "numerical" | "true-false" | "short-answer";
export type Difficulty = "easy" | "medium" | "hard";
export type QuestionStatus = "draft" | "published" | "archived";
export type QuestionSource = "authored" | "generated" | "imported";

export interface QuestionOption {
  id: string;
  label: string;
  text: string;
}

export interface QuestionMetadata {
  source?: QuestionSource;
  status?: QuestionStatus;
  variantOf?: string;
  author?: string;
}

export interface Question {
  id: string;
  courseId: string;
  chapterId: string;
  lessonId: string;
  topic: string;
  subtopic: string;
  type: QuestionType;
  prompt: string;
  options?: QuestionOption[];
  correctAnswer: string | number | boolean;
  explanation: string;
  hint?: string;
  difficulty: Difficulty;
  marks: number;
  tags: string[];
  metadata?: QuestionMetadata;
}
