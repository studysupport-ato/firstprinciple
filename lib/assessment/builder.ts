import { getQuestions } from "@/lib/content/access";
import type { Assessment, AssessmentBlueprintRule } from "@/lib/content/types/assessment";
import { buildBlueprintFilters } from "./selection";

export interface AssessmentRulePool {
  rule: AssessmentBlueprintRule;
  available: number;
  estimatedMarks: number;
}

export function getAssessmentRuleLabel(rule: AssessmentBlueprintRule, index: number) {
  return rule.topic || rule.subtopic || rule.lessonId || rule.chapterId || rule.type || `Rule ${index + 1}`;
}

export function getAssessmentRulePools(assessment: Assessment): AssessmentRulePool[] {
  return assessment.blueprint.rules.map((rule) => {
    const questions = getQuestions(buildBlueprintFilters(assessment, rule));
    return {
      rule,
      available: questions.length,
      estimatedMarks: questions.slice(0, rule.count).reduce((total, question) => total + question.marks, 0),
    };
  });
}

export function validateAssessmentDraft(assessment: Assessment): string[] {
  const errors: string[] = [];

  if (!assessment.id.trim()) errors.push("Assessment ID is required.");
  if (!assessment.title.trim()) errors.push("Assessment title is required.");
  if (!assessment.description.trim()) errors.push("Assessment description is required.");
  if (!assessment.courseId.trim()) errors.push("Assessment course is required.");
  if (!Number.isFinite(assessment.durationMinutes) || assessment.durationMinutes <= 0) errors.push("Duration must be greater than 0 minutes.");
  if (assessment.blueprint.rules.length === 0) errors.push("At least one blueprint rule is required.");

  const signatures = new Set<string>();
  assessment.blueprint.rules.forEach((rule, index) => {
    if (!Number.isFinite(rule.count) || rule.count <= 0) errors.push(`Rule ${index + 1}: count must be greater than 0.`);

    const signature = JSON.stringify({
      courseId: rule.courseId ?? assessment.courseId,
      chapterId: rule.chapterId ?? "",
      lessonId: rule.lessonId ?? "",
      topic: rule.topic ?? "",
      subtopic: rule.subtopic ?? "",
      difficulty: rule.difficulty ?? "",
      type: rule.type ?? "",
      tags: [...(rule.tags ?? [])].sort(),
    });

    if (signatures.has(signature)) errors.push(`Rule ${index + 1}: duplicate rule constraints.`);
    signatures.add(signature);
  });

  return errors;
}

export function getAssessmentTotalMarks(assessment: Assessment) {
  return getAssessmentRulePools(assessment).reduce((total, pool) => total + pool.estimatedMarks, 0);
}
