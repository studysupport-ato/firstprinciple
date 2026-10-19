import { getStudentQuestions, type QuestionFilters } from "@/lib/content/access";
import type { Assessment, AssessmentBlueprintRule } from "@/lib/content/types/assessment";
import type { Question } from "@/lib/content/types/question";
import { createQuestionRepository, type QuestionSupabaseClientFactory } from "@/lib/questions/repository";

export type AssessmentSelectionErrorCode =
  | "ASSESSMENT_NOT_FOUND"
  | "INVALID_BLUEPRINT"
  | "INSUFFICIENT_QUESTION_POOL";

export class AssessmentSelectionError extends Error {
  code: AssessmentSelectionErrorCode;
  details: Record<string, unknown>;

  constructor(code: AssessmentSelectionErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "AssessmentSelectionError";
    this.code = code;
    this.details = details;
  }
}

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export function buildBlueprintFilters(assessment: Assessment, rule: AssessmentBlueprintRule): QuestionFilters {

  if (!assessment.id || !assessment.courseId) {
    throw new AssessmentSelectionError("INVALID_BLUEPRINT", "Assessment is missing identity data.", { assessmentId: assessment.id });
  }

  return {
    courseId: rule.courseId ?? assessment.courseId,
    chapterId: rule.chapterId,
    lessonId: rule.lessonId,
    topic: rule.topic,
    subtopic: rule.subtopic,
    difficulty: rule.difficulty === "mixed" ? undefined : rule.difficulty,
    type: rule.type,
    tags: rule.tags,
    tagMatch: rule.tags && rule.tags.length > 0 ? "any" : "all",
  };
}

export interface AssessmentSelectionOptions {
  includeDraft?: boolean;
}

export function selectAssessmentQuestions(assessment: Assessment, options: AssessmentSelectionOptions = {}): Question[] {
  if (!assessment.blueprint.rules.length) {
    throw new AssessmentSelectionError("INVALID_BLUEPRINT", "Assessment blueprint must contain at least one rule.", { assessmentId: assessment.id });
  }

  const selectedIds = new Set<string>();
  const uniqueIds = new Set<string>();
  const selected: Question[] = [];

  for (const rule of assessment.blueprint.rules) {
    if (!Number.isFinite(rule.count) || rule.count <= 0) {
      throw new AssessmentSelectionError("INVALID_BLUEPRINT", "Each assessment blueprint rule must specify a positive question count.", {
        assessmentId: assessment.id,
        rule,
      });
    }

    const pool = shuffleArray(getStudentQuestions(buildBlueprintFilters(assessment, rule), options).filter((question) => !selectedIds.has(question.id)));

    if (pool.length < rule.count) {
      throw new AssessmentSelectionError("INSUFFICIENT_QUESTION_POOL", "Not enough matching questions are available for this assessment rule.", {
        required: rule.count,
        available: pool.length,
        assessmentId: assessment.id,
        rule,
      });
    }

    let ruleSelected = 0;

    for (const question of pool) {
      if (uniqueIds.has(question.id)) continue;
      uniqueIds.add(question.id);
      selectedIds.add(question.id);
      selected.push(question);
      ruleSelected += 1;

      if (ruleSelected === rule.count) {
        break;
      }
    }
  }

  if (selected.length < assessment.questionCount) {
    throw new AssessmentSelectionError("INSUFFICIENT_QUESTION_POOL", "Unable to select a unique set of questions for this assessment.", {
      required: assessment.questionCount,
      available: selected.length,
      assessmentId: assessment.id,
      blueprint: assessment.blueprint,
    });
  }

  return selected;
}

export async function selectAssessmentQuestionsFromSupabase(
  assessment: Assessment,
  options: AssessmentSelectionOptions = {},
  clientFactory: QuestionSupabaseClientFactory,
): Promise<Question[]> {
  if (!assessment.blueprint.rules.length) {
    throw new AssessmentSelectionError("INVALID_BLUEPRINT", "Assessment blueprint must contain at least one rule.", { assessmentId: assessment.id });
  }

  // Task 40G.4: the caller supplies the Supabase client explicitly. The
  // student assessment page passes the authenticated server client so the
  // `public_questions_select_published` RLS policy enforces published-only
  // visibility. Blueprint/selection semantics are unchanged.
  const repository = createQuestionRepository("supabase", clientFactory);
  const selectedIds = new Set<string>();
  const uniqueIds = new Set<string>();
  const orderedSelectedIds: string[] = [];

  for (const rule of assessment.blueprint.rules) {
    if (!Number.isFinite(rule.count) || rule.count <= 0) {
      throw new AssessmentSelectionError("INVALID_BLUEPRINT", "Each assessment blueprint rule must specify a positive question count.", {
        assessmentId: assessment.id,
        rule,
      });
    }

    const pool = shuffleArray(
      (await repository.listQuestionCandidates({
        ...buildBlueprintFilters(assessment, rule),
        visibility: "student",
        includeDraft: options.includeDraft,
      })).filter((candidate) => !selectedIds.has(candidate.id)),
    );

    if (pool.length < rule.count) {
      throw new AssessmentSelectionError("INSUFFICIENT_QUESTION_POOL", "Not enough matching questions are available for this assessment rule.", {
        required: rule.count,
        available: pool.length,
        assessmentId: assessment.id,
        rule,
      });
    }

    let ruleSelected = 0;

    for (const candidate of pool) {
      if (uniqueIds.has(candidate.id)) continue;
      uniqueIds.add(candidate.id);
      selectedIds.add(candidate.id);
      orderedSelectedIds.push(candidate.id);
      ruleSelected += 1;

      if (ruleSelected === rule.count) {
        break;
      }
    }
  }

  if (orderedSelectedIds.length < assessment.questionCount) {
    throw new AssessmentSelectionError("INSUFFICIENT_QUESTION_POOL", "Unable to select a unique set of questions for this assessment.", {
      required: assessment.questionCount,
      available: orderedSelectedIds.length,
      assessmentId: assessment.id,
      blueprint: assessment.blueprint,
    });
  }

  // Stage B: Fetch full question bodies for only the selected IDs in a single batch
  const fullQuestions = await repository.listQuestions({
    ids: orderedSelectedIds,
    visibility: "student",
    includeDraft: options.includeDraft,
  });

  const questionMap = new Map<string, Question>(fullQuestions.map((q) => [q.id, q]));
  const orderedQuestions: Question[] = [];

  for (const id of orderedSelectedIds) {
    const question = questionMap.get(id);
    if (!question) {
      throw new AssessmentSelectionError("INSUFFICIENT_QUESTION_POOL", "One or more selected questions could not be retrieved from the repository.", {
        missingQuestionId: id,
        assessmentId: assessment.id,
      });
    }
    orderedQuestions.push(question);
  }

  return orderedQuestions;
}

