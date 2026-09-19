import { getAssessments, getChapters, getCourse, getLessons, getQuestionsByCourse, getWeeks, validateQuestion } from "./access";
import { validateBlock } from "./overrides";
import { getCourseLifecycleState } from "./publishing";
import { getAssetById } from "./assets";
import type { Assessment } from "./types/assessment";
import type { Course, Week } from "./types/course";
import type { Lesson } from "./types/lesson";
import type { Question } from "./types/question";

export type ContentLifecycleState = "draft" | "needs-review" | "ready" | "published";
export type CurriculumIssueSeverity = "error" | "warning" | "info";
export type CurriculumIssueScope = "course" | "week" | "day" | "content" | "question";

export interface CurriculumIssue {
  id: string;
  severity: CurriculumIssueSeverity;
  scope: CurriculumIssueScope;
  title: string;
  description: string;
  targetId?: string;
  targetType?: string;
  actionHref?: string;
}

export interface CurriculumQualityMetrics {
  weeks: number;
  completeWeeks: number;
  days: number;
  daysWithContent: number;
  contentBlocks: number;
  questions: number;
  assessments: number;
}

export interface CurriculumQualityReport {
  course: Course;
  issues: CurriculumIssue[];
  metrics: CurriculumQualityMetrics;
  errors: number;
  warnings: number;
  readiness: ContentLifecycleState;
  weeks: Array<{ week: Week; dayCount: number; readyDayCount: number; issueCount: number }>;
}

function issueId(scope: string, targetId: string | undefined, suffix: string) {
  return [scope, targetId ?? "course", suffix].join(":");
}

function addIssue(issues: CurriculumIssue[], issue: CurriculumIssue) {
  if (!issues.some((existing) => existing.id === issue.id)) issues.push(issue);
}

function checkLesson(lesson: Lesson, issues: CurriculumIssue[]) {
  const dayHref = `/admin/lessons/${lesson.id}`;
  if (!lesson.title.trim()) {
    addIssue(issues, { id: issueId("day", lesson.id, "title"), severity: "error", scope: "day", title: "Day is missing a title", description: "Add a title before this Day is considered ready.", targetId: lesson.id, targetType: "lesson", actionHref: dayHref });
  }
  if (!lesson.description.trim()) {
    addIssue(issues, { id: issueId("day", lesson.id, "description"), severity: "warning", scope: "day", title: `${lesson.title || "Day"} has no description`, description: "A short description will help students understand the session.", targetId: lesson.id, targetType: "lesson", actionHref: dayHref });
  }
  if (!lesson.blocks.length) {
    addIssue(issues, { id: issueId("day", lesson.id, "empty"), severity: "error", scope: "day", title: `${lesson.title || "Day"} has no teaching content`, description: "Add at least one content block to this Day.", targetId: lesson.id, targetType: "lesson", actionHref: dayHref });
  }
  lesson.blocks.forEach((block, index) => {
    validateBlock(block).forEach((error) => addIssue(issues, { id: issueId("content", block.id, String(index)), severity: "error", scope: "content", title: `${lesson.title || "Day"} has an invalid content block`, description: error, targetId: lesson.id, targetType: "lesson", actionHref: dayHref }));
    if ((block.type === "image" || block.type === "video") && block.assetId) {
      const asset = getAssetById(block.assetId);
      if (!asset) addIssue(issues, { id: issueId("content", block.id, "missing-asset"), severity: "error", scope: "content", title: `${lesson.title || "Day"} references a missing asset`, description: `Asset ${block.assetId} is not registered in the local media library.`, targetId: lesson.id, targetType: "lesson", actionHref: dayHref });
      else if (asset.status === "archived") addIssue(issues, { id: issueId("content", block.id, "archived-asset"), severity: "warning", scope: "content", title: `${lesson.title || "Day"} uses an archived asset`, description: `${asset.name} is archived but existing content still references it.`, targetId: lesson.id, targetType: "lesson", actionHref: "/admin/media" });
      if (block.type === "image" && !block.alt.trim() && !asset?.altText) addIssue(issues, { id: issueId("content", block.id, "alt-text"), severity: "warning", scope: "content", title: `${lesson.title || "Day"} has an image without alt text`, description: "Add meaningful alt text or intentionally leave it empty for decorative imagery.", targetId: lesson.id, targetType: "lesson", actionHref: dayHref });
    }
  });
}

function checkQuestions(courseId: string, questions: Question[], issues: CurriculumIssue[]) {
  const promptCounts = new Map<string, number>();
  questions.forEach((question) => {
    const normalizedPrompt = question.prompt.trim().toLowerCase();
    promptCounts.set(normalizedPrompt, (promptCounts.get(normalizedPrompt) ?? 0) + 1);
    const errors = validateQuestion(question);
    errors.forEach((error) => addIssue(issues, { id: issueId("question", question.id, error), severity: "warning", scope: "question", title: "Question needs review", description: error, targetId: question.id, targetType: "question", actionHref: `/admin/questions/${question.id}` }));
    if (question.metadata?.source === "imported" && question.metadata.status === "draft") {
      addIssue(issues, { id: issueId("question", question.id, "import-review"), severity: "warning", scope: "question", title: "Imported question needs review", description: "Confirm the source answer and feedback before publishing this question.", targetId: question.id, targetType: "question", actionHref: `/admin/questions/${question.id}` });
    }
    if (question.type === "multiple-choice" && (question.correctAnswer === "" || question.correctAnswer === null)) {
      addIssue(issues, { id: issueId("question", question.id, "answer"), severity: "warning", scope: "question", title: "Question has no verified answer", description: "The source did not provide a verified answer. Do not publish it until reviewed.", targetId: question.id, targetType: "question", actionHref: `/admin/questions/${question.id}` });
    }
    if (!Number.isFinite(question.marks) || question.marks <= 0) {
      addIssue(issues, { id: issueId("question", question.id, "marks"), severity: "warning", scope: "question", title: "Question has invalid marks", description: "Set a positive mark value before using this question in an assessment.", targetId: question.id, targetType: "question", actionHref: `/admin/questions/${question.id}` });
    }
  });
  promptCounts.forEach((count, prompt) => {
    if (count > 1) {
      const question = questions.find((candidate) => candidate.prompt.trim().toLowerCase() === prompt);
      if (question) addIssue(issues, { id: issueId("question", question.id, "duplicate-prompt"), severity: "warning", scope: "question", title: "Duplicate question prompt", description: `${count} questions share this prompt. Review the question bank before publishing.`, targetId: question.id, targetType: "question", actionHref: `/admin/questions/${question.id}` });
    }
  });
}

export function analyzeCourseQuality(courseId: string): CurriculumQualityReport | null {
  const course = getCourse(courseId);
  if (!course) return null;

  const issues: CurriculumIssue[] = [];
  const weeks = getWeeks(courseId).sort((first, second) => first.weekNumber - second.weekNumber);
  const lessons = getLessons(courseId);
  const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const questions = getQuestionsByCourse(courseId);
  const assessments = getAssessments(courseId);
  const weekReports: CurriculumQualityReport["weeks"] = [];
  let daysWithContent = 0;
  let contentBlocks = 0;

  if (!weeks.length) {
    addIssue(issues, { id: issueId("course", course.id, "no-weeks"), severity: "error", scope: "course", title: "No weeks have been added", description: "Add at least one Week before this course can be ready.", targetId: course.id, targetType: "course", actionHref: `/admin/courses/${course.id}` });
  }

  weeks.forEach((week) => {
    const weekIssuesBefore = issues.length;
    const duplicateReferences = new Set<string>();
    let readyDayCount = 0;
    if (!week.title.trim()) addIssue(issues, { id: issueId("week", week.id, "title"), severity: "error", scope: "week", title: "Week is missing a title", description: "Rename this Week in the curriculum editor.", targetId: week.id, targetType: "week", actionHref: `/admin/courses/${course.id}/weeks/${week.weekNumber}` });
    if (!week.sessionIds.length) addIssue(issues, { id: issueId("week", week.id, "no-days"), severity: "error", scope: "week", title: `${week.title || "Week"} has no Days`, description: "Add teaching Days to this Week before publishing the course.", targetId: week.id, targetType: "week", actionHref: `/admin/courses/${course.id}/weeks/${week.weekNumber}` });

    week.sessionIds.forEach((lessonId) => {
      if (duplicateReferences.has(lessonId)) addIssue(issues, { id: issueId("week", week.id, `duplicate-${lessonId}`), severity: "error", scope: "week", title: `${week.title || "Week"} has a duplicate Day reference`, description: `Day reference ${lessonId} appears more than once.`, targetId: week.id, targetType: "week", actionHref: `/admin/courses/${course.id}/weeks/${week.weekNumber}` });
      duplicateReferences.add(lessonId);
      const lesson = lessonsById.get(lessonId);
      if (!lesson) {
        addIssue(issues, { id: issueId("week", week.id, `missing-${lessonId}`), severity: "error", scope: "week", title: `${week.title || "Week"} has a broken Day reference`, description: `Day ${lessonId} does not resolve to a Lesson record.`, targetId: week.id, targetType: "week", actionHref: `/admin/courses/${course.id}/weeks/${week.weekNumber}` });
        return;
      }
      const beforeDayIssues = issues.length;
      checkLesson(lesson, issues);
      const hasBlockingDayIssue = issues.slice(beforeDayIssues).some((issue) => issue.severity === "error");
      if (!hasBlockingDayIssue) readyDayCount += 1;
      if (lesson.blocks.length) daysWithContent += 1;
      contentBlocks += lesson.blocks.length;
    });
    weekReports.push({ week, dayCount: week.sessionIds.length, readyDayCount, issueCount: issues.length - weekIssuesBefore });
  });

  checkQuestions(courseId, questions, issues);
  const storedState = getCourseLifecycleState(course.id)?.state;
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  const readiness: ContentLifecycleState = errors > 0 ? "needs-review" : storedState === "published" ? "published" : warnings > 0 ? "needs-review" : storedState ?? "ready";

  return {
    course,
    issues,
    metrics: { weeks: weeks.length, completeWeeks: weekReports.filter((week) => week.dayCount > 0 && week.readyDayCount === week.dayCount).length, days: weekReports.reduce((total, week) => total + week.dayCount, 0), daysWithContent, contentBlocks, questions: questions.length, assessments: assessments.length },
    errors,
    warnings,
    readiness,
    weeks: weekReports,
  };
}
