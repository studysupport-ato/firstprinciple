import { math151Assessments, math151Chapters, math151Course, math151Lessons, math151Questions, math151Weeks } from "./math151";
import {
  getAllLocalAssessmentOverrides,
  getBaseQuestion,
  getLocalChapters,
  getLocalCourses,
  getLocalLessons,
  getLocalQuestions,
  getLocalWeeks,
  getResolvedAssessment,
  getResolvedLesson,
  getResolvedQuestion,
} from "./overrides";
import type { Assessment } from "./types/assessment";
import type { Chapter, Course, Week } from "./types/course";
import type { Lesson } from "./types/lesson";
import type { Difficulty, Question, QuestionSource, QuestionStatus, QuestionType } from "./types/question";
import { isPreviewVisible, legacyStatus } from "./lifecycle";

const courses: Course[] = [math151Course];
const chapters: Chapter[] = math151Chapters;
const weeks: Week[] = math151Weeks;
const lessons: Lesson[] = math151Lessons;
const questions: Question[] = math151Questions;
const assessments: Assessment[] = math151Assessments;

export interface QuestionFilters {
  courseId?: string;
  chapterId?: string;
  lessonId?: string;
  topic?: string;
  subtopic?: string;
  difficulty?: Difficulty;
  type?: QuestionType;
  tags?: string[];
  status?: QuestionStatus;
  source?: QuestionSource;
  limit?: number;
  tagMatch?: "all" | "any";
}

export function validateQuestion(question: Question): string[] {
  const errors: string[] = [];

  if (!question.id) errors.push("Missing question id.");
  if (!question.courseId) errors.push(`Question ${question.id ?? "unknown"} is missing courseId.`);
  if (!question.chapterId) errors.push(`Question ${question.id ?? "unknown"} is missing chapterId.`);
  if (!question.lessonId) errors.push(`Question ${question.id ?? "unknown"} is missing lessonId.`);
  if (!question.prompt) errors.push(`Question ${question.id ?? "unknown"} is missing a prompt.`);
  if (!question.explanation) errors.push(`Question ${question.id ?? "unknown"} is missing an explanation.`);
  if (!question.topic) errors.push(`Question ${question.id ?? "unknown"} is missing topic.`);
  if (!question.subtopic) errors.push(`Question ${question.id ?? "unknown"} is missing subtopic.`);
  if (!question.type) errors.push(`Question ${question.id ?? "unknown"} has no question type.`);
  if (!question.difficulty) errors.push(`Question ${question.id ?? "unknown"} has no difficulty.`);
  if (!Array.isArray(question.tags) || question.tags.length === 0) errors.push(`Question ${question.id ?? "unknown"} should have at least one tag.`);
  if (question.type === "multiple-choice" && (!Array.isArray(question.options) || question.options.length < 2)) {
    errors.push(`Question ${question.id ?? "unknown"} is multiple-choice but has too few options.`);
  }
  if (question.type === "multiple-choice" && !question.options?.some((option) => option.id === question.correctAnswer)) {
    errors.push(`Question ${question.id ?? "unknown"} has a correctAnswer that does not match any option id.`);
  }

  return errors;
}

export function findDuplicateQuestionIds(questionBank: Question[] = questions): string[] {
  const counts = new Map<string, number>();

  for (const question of questionBank) {
    if (!question.id) continue;
    counts.set(question.id, (counts.get(question.id) ?? 0) + 1);
  }

  return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
}

export function validateQuestionBank(questionBank: Question[] = questions): { valid: boolean; errors: string[]; duplicateIds: string[] } {
  const duplicateIds = findDuplicateQuestionIds(questionBank);
  const errors = questionBank.flatMap((question, index) => validateQuestion(question).map((error) => `${error} [index ${index}]`));

  if (duplicateIds.length > 0) {
    errors.push(`Duplicate question ids detected: ${duplicateIds.join(", ")}.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    duplicateIds,
  };
}

const questionBankValidation = validateQuestionBank();
if (!questionBankValidation.valid) {
  console.warn("[Back2Basics with Kwamina] Question bank validation issues:", questionBankValidation.errors);
}

export function getCourses() {
  const local = getLocalCourses();
  return courses.map((course) => local.find((item) => item.id === course.id) ?? course).concat(local.filter((course) => !courses.some((baseCourse) => baseCourse.id === course.id)));
}

export function getCourse(courseId: string) {
  return getCourses().find((course) => course.id === courseId);
}

export function getStudentCourses(options: { preview?: boolean } = {}) {
  return getCourses().filter((course) => isPreviewVisible(legacyStatus(course.status), { preview: options.preview }));
}

export function getChapters(courseId?: string) {
  const local = getLocalChapters();
  const allChapters = chapters.map((chapter) => local.find((item) => item.id === chapter.id) ?? chapter).concat(local.filter((chapter) => !chapters.some((baseChapter) => baseChapter.id === chapter.id)));
  return courseId ? allChapters.filter((chapter) => chapter.courseId === courseId) : allChapters;
}

export function getChapter(chapterId: string) {
  return getChapters().find((chapter) => chapter.id === chapterId);
}

export function getWeeks(courseId?: string, chapterId?: string) {
  const local = getLocalWeeks();
  let results = weeks.map((week) => local.find((item) => item.id === week.id) ?? week).concat(local.filter((week) => !weeks.some((baseWeek) => baseWeek.id === week.id)));

  if (courseId) {
    results = results.filter((week) => week.courseId === courseId);
  }

  if (chapterId) {
    results = results.filter((week) => week.chapterIds.includes(chapterId));
  }

  return results;
}

export function getWeek(weekId: string) {
  return getWeeks().find((week) => week.id === weekId);
}

export function getStudentWeeks(courseId: string, options: { preview?: boolean } = {}) {
  return getWeeks(courseId).filter((week) => isPreviewVisible(legacyStatus(week.status), { preview: options.preview }));
}

export function getLessons(courseId?: string, chapterId?: string, weekId?: string) {
  const local = getLocalLessons();
  let results = lessons.map((lesson) => local.find((item) => item.id === lesson.id) ?? lesson).concat(local.filter((lesson) => !lessons.some((baseLesson) => baseLesson.id === lesson.id)));

  if (courseId) {
    results = results.filter((lesson) => lesson.courseId === courseId);
  }

  if (chapterId) {
    results = results.filter((lesson) => lesson.chapterId === chapterId);
  }

  if (weekId) {
    results = results.filter((lesson) => lesson.weekId === weekId);
  }

  return results.sort((a, b) => a.order - b.order);
}

export function getLesson(lessonId: string) {
  return getLessons().find((lesson) => lesson.id === lessonId);
}

export function getResolvedCourseLesson(lessonId: string) {
  return getResolvedLesson(lessonId) ?? getLesson(lessonId);
}

export function getLessonForRoute(courseId: string, chapterId: string, routeLessonId: string, options: { includeDraft?: boolean } = {}) {
  const found = getLessons().find(
    (lesson) =>
      lesson.courseId === courseId &&
      lesson.chapterId === chapterId &&
      (lesson.id === routeLessonId || lesson.id.endsWith(`-${routeLessonId}`)),
  );

  return found ? getResolvedLesson(found.id, options) ?? found : undefined;
}

export function getLessonsByWeek(weekId: string) {
  return getLessons()
    .filter((lesson) => lesson.weekId === weekId)
    .sort((a, b) => a.order - b.order)
    .map((lesson) => getResolvedLesson(lesson.id) ?? lesson);
}

/** Canonical product terminology for the legacy Lesson-as-Day records. */
export function getDaysByWeek(weekId: string) {
  return getLessonsByWeek(weekId);
}

export function getDay(dayId: string) {
  return getLesson(dayId);
}

export function getStudentDay(dayId: string, options: { preview?: boolean } = {}) {
  const day = getDay(dayId);
  return day && isPreviewVisible(legacyStatus(day.status), { preview: options.preview }) ? day : undefined;
}

export function getQuestion(questionId: string) {
  return getResolvedQuestion(questionId) ?? getBaseQuestion(questionId) ?? getLocalQuestions().find((question) => question.id === questionId) ?? questions.find((question) => question.id === questionId);
}

export function getQuestions(filters: QuestionFilters = {}): Question[] {
  const { courseId, chapterId, lessonId, topic, subtopic, difficulty, type, tags, status, source, limit, tagMatch = "all" } = filters;

  const allQuestions = [...questions, ...getLocalQuestions().filter((question) => !questions.some((baseQuestion) => baseQuestion.id === question.id))];
  let results = allQuestions.map((question) => getResolvedQuestion(question.id) ?? question).filter((question) => {
    if (courseId && question.courseId !== courseId) return false;
    if (chapterId && question.chapterId !== chapterId) return false;
    if (lessonId && question.lessonId !== lessonId) return false;
    if (topic && question.topic !== topic) return false;
    if (subtopic && question.subtopic !== subtopic) return false;
    if (difficulty && question.difficulty !== difficulty) return false;
    if (type && question.type !== type) return false;
    if (status && (question.metadata?.status ?? "published") !== status) return false;
    if (source && (question.metadata?.source ?? "authored") !== source) return false;

    if (tags && tags.length > 0) {
      const normalizedRequested = tags.map((tag) => tag.trim().toLowerCase());
      const questionTags = question.tags.map((tag) => tag.trim().toLowerCase());
      const matches = normalizedRequested.filter((tag) => questionTags.includes(tag));
      if (tagMatch === "all" && matches.length !== normalizedRequested.length) return false;
      if (tagMatch === "any" && matches.length === 0) return false;
    }

    return true;
  });

  if (limit && limit > 0) {
    results = results.slice(0, limit);
  }

  return results;
}

export interface StudentQuestionOptions {
  includeDraft?: boolean;
}

export function getStudentQuestions(filters: Omit<QuestionFilters, "status"> = {}, options: StudentQuestionOptions = {}) {
  const { limit, ...query } = filters;
  const visibleQuestions = getQuestions(query).filter((question) => {
    const status = question.metadata?.status ?? "published";
    return isPreviewVisible(status, { preview: options.includeDraft });
  });
  return limit && limit > 0 ? visibleQuestions.slice(0, limit) : visibleQuestions;
}

export function getQuestionsByCourse(courseId: string) {
  return getQuestions({ courseId });
}

export function getAssessments(courseId?: string) {
  const resolved = [
    ...assessments,
    ...Object.values(getAllLocalAssessmentOverrides())
      .filter(({ assessment }) => !assessments.some((baseAssessment) => baseAssessment.id === assessment.id))
      .map(({ assessment }) => assessment),
  ].map((assessment) => getResolvedAssessment(assessment.id) ?? assessment);

  return courseId ? resolved.filter((assessment) => assessment.courseId === courseId) : resolved;
}

export function getStudentAssessments(courseId?: string, options: { preview?: boolean } = {}) {
  return getAssessments(courseId).filter((assessment) => isPreviewVisible(legacyStatus(assessment.status), { preview: options.preview }));
}

export function getStudentAssessment(assessmentId: string, options: { preview?: boolean } = {}) {
  const assessment = getAssessment(assessmentId);
  return assessment && isPreviewVisible(legacyStatus(assessment.status), { preview: options.preview }) ? assessment : undefined;
}

export function getQuestionsByTopic(topic: string) {
  return getQuestions({ topic });
}

export function getQuestionsBySubtopic(subtopic: string) {
  return getQuestions({ subtopic });
}

export function getQuestionsByLesson(lessonId: string) {
  return getQuestions({ lessonId });
}

export function getQuestionsByChapter(chapterId: string) {
  return getQuestions({ chapterId });
}

export function getQuestionsByDifficulty(difficulty: Difficulty) {
  return getQuestions({ difficulty });
}

export function getQuestionsByTag(tag: string, tagMatch: "all" | "any" = "any") {
  return getQuestions({ tags: [tag], tagMatch });
}

export function getQuestionsByTags(tags: string[], tagMatch: "all" | "any" = "all") {
  return getQuestions({ tags, tagMatch });
}

export function getAssessment(assessmentId: string) {
  return getResolvedAssessment(assessmentId) ?? assessments.find((assessment) => assessment.id === assessmentId);
}
