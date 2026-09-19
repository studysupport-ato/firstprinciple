import type { Difficulty } from "./question";
import type { QuestionType } from "./question";
import type { ContentStatus } from "../lifecycle";

export interface AssessmentBlueprintRule {
  courseId?: string;
  chapterId?: string;
  lessonId?: string;
  topic?: string;
  subtopic?: string;
  difficulty?: Difficulty | "mixed";
  type?: QuestionType;
  tags?: string[];
  count: number;
}

export interface AssessmentBlueprint {
  rules: AssessmentBlueprintRule[];
}

export interface Assessment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  durationMinutes: number;
  questionCount: number;
  blueprint: AssessmentBlueprint;
  /** Legacy seed assessments without this field are treated as published. */
  status?: ContentStatus;
}
