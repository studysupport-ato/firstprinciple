import type { ContentBlock, Lesson } from "./types";
import type { Assessment } from "./types/assessment";
import type { Chapter, Course, Week } from "./types/course";
import type { Question } from "./types/question";
import { math151Assessments, math151Lessons, math151Questions } from "./math151";
import type { ContentStatus } from "./lifecycle";
import { createStableId } from "../ids";

export type LessonOverride = {
  lessonId: string;
  updatedAt: string;
  status?: "draft" | "published";
  title?: string;
  description?: string;
  blocks?: ContentBlock[];
};

export type QuestionOverride = {
  questionId: string;
  updatedAt: string;
  question: Question;
};

export type AssessmentOverride = {
  assessmentId: string;
  updatedAt: string;
  status?: ContentStatus;
  assessment: Assessment;
};

const STORAGE_KEY = "first-principles-lesson-overrides-v1";
const QUESTION_STORAGE_KEY = "first-principles-question-overrides-v1";
const ASSESSMENT_STORAGE_KEY = "first-principles-assessment-overrides-v1";
const COURSE_STORAGE_KEY = "first-principles-course-records-v1";
const CHAPTER_STORAGE_KEY = "first-principles-chapter-records-v1";
const WEEK_STORAGE_KEY = "first-principles-week-records-v1";
const LESSON_RECORD_STORAGE_KEY = "first-principles-lesson-records-v1";
const QUESTION_RECORD_STORAGE_KEY = "first-principles-question-records-v1";

type LocalRecord<T> = { updatedAt: string; record: T };

function readStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readRecords<T>(key: string): Record<string, LocalRecord<T>> {
  const storage = readStorage();
  if (!storage) return {};

  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, LocalRecord<T>>) : {};
  } catch {
    console.warn(`[First Principles] Ignoring malformed content records: ${key}`);
    return {};
  }
}

function saveRecord<T extends { id: string }>(key: string, record: T) {
  const storage = readStorage();
  if (!storage) return;

  const records = readRecords<T>(key);
  records[record.id] = { updatedAt: new Date().toISOString(), record };
  storage.setItem(key, JSON.stringify(records));
}

export function getBaseLesson(lessonId: string) {
  return math151Lessons.find((lesson) => lesson.id === lessonId);
}

export function getLocalCourses(): Course[] {
  return Object.values(readRecords<Course>(COURSE_STORAGE_KEY)).map(({ record }) => record);
}

export function getLocalChapters(): Chapter[] {
  return Object.values(readRecords<Chapter>(CHAPTER_STORAGE_KEY)).map(({ record }) => record);
}

export function getLocalWeeks(): Week[] {
  return Object.values(readRecords<Week>(WEEK_STORAGE_KEY)).map(({ record }) => record);
}

export function getLocalLessons(): Lesson[] {
  return Object.values(readRecords<Lesson>(LESSON_RECORD_STORAGE_KEY)).map(({ record }) => record);
}

export function getLocalQuestions(): Question[] {
  return Object.values(readRecords<Question>(QUESTION_RECORD_STORAGE_KEY)).map(({ record }) => record);
}

export function saveCourseRecord(course: Course) {
  saveRecord(COURSE_STORAGE_KEY, course);
}

export function saveChapterRecord(chapter: Chapter) {
  saveRecord(CHAPTER_STORAGE_KEY, chapter);
}

export function saveWeekRecord(week: Week) {
  saveRecord(WEEK_STORAGE_KEY, week);
}

export function saveLessonRecord(lesson: Lesson) {
  saveRecord(LESSON_RECORD_STORAGE_KEY, lesson);
}

export function saveQuestionRecord(question: Question) {
  saveRecord(QUESTION_RECORD_STORAGE_KEY, question);
}

export function removeLessonRecord(lessonId: string) {
  const storage = readStorage();
  if (!storage) return;
  const records = readRecords<Lesson>(LESSON_RECORD_STORAGE_KEY);
  delete records[lessonId];
  storage.setItem(LESSON_RECORD_STORAGE_KEY, JSON.stringify(records));
}

export function getBaseQuestion(questionId: string) {
  return math151Questions.find((question) => question.id === questionId);
}

export function getBaseAssessment(assessmentId: string) {
  return math151Assessments.find((assessment) => assessment.id === assessmentId);
}

export function getLocalLessonOverride(lessonId: string): LessonOverride | null {
  const storage = readStorage();

  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Record<string, LessonOverride>;
    return parsed[lessonId] ?? null;
  } catch {
    return null;
  }
}

export function getAllLocalLessonOverrides(): Record<string, LessonOverride> {
  const storage = readStorage();

  if (!storage) {
    return {};
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LessonOverride>) : {};
  } catch {
    return {};
  }
}

export function getLocalQuestionOverride(questionId: string): QuestionOverride | null {
  const storage = readStorage();

  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(QUESTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, QuestionOverride>;
    return parsed[questionId] ?? null;
  } catch {
    return null;
  }
}

export function getAllLocalQuestionOverrides(): Record<string, QuestionOverride> {
  const storage = readStorage();

  if (!storage) {
    return {};
  }

  try {
    const raw = storage.getItem(QUESTION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, QuestionOverride>) : {};
  } catch {
    return {};
  }
}

export function getLocalAssessmentOverride(assessmentId: string): AssessmentOverride | null {
  const storage = readStorage();

  if (!storage) return null;

  try {
    const raw = storage.getItem(ASSESSMENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, AssessmentOverride>;
    return parsed[assessmentId] ?? null;
  } catch {
    return null;
  }
}

export function getAllLocalAssessmentOverrides(): Record<string, AssessmentOverride> {
  const storage = readStorage();

  if (!storage) return {};

  try {
    const raw = storage.getItem(ASSESSMENT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AssessmentOverride>) : {};
  } catch {
    return {};
  }
}

export function getLessonOverrideIds(): string[] {
  return Object.keys(getAllLocalLessonOverrides());
}

export function getQuestionOverrideIds(): string[] {
  return Object.keys(getAllLocalQuestionOverrides());
}

export function getAssessmentOverrideIds(): string[] {
  return Object.keys(getAllLocalAssessmentOverrides());
}

export function saveLessonOverride(override: LessonOverride) {
  const storage = readStorage();

  if (!storage) {
    return;
  }

  const all = getAllLocalLessonOverrides();
  all[override.lessonId] = override;
  storage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function saveQuestionOverride(override: QuestionOverride) {
  const storage = readStorage();

  if (!storage) {
    return;
  }

  const all = getAllLocalQuestionOverrides();
  all[override.questionId] = override;
  storage.setItem(QUESTION_STORAGE_KEY, JSON.stringify(all));
}

export function saveAssessmentOverride(override: AssessmentOverride) {
  const storage = readStorage();

  if (!storage) return;

  const all = getAllLocalAssessmentOverrides();
  all[override.assessmentId] = override;
  storage.setItem(ASSESSMENT_STORAGE_KEY, JSON.stringify(all));
}

export function removeLessonOverride(lessonId: string) {
  const storage = readStorage();

  if (!storage) {
    return;
  }

  const all = getAllLocalLessonOverrides();
  delete all[lessonId];
  storage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function removeQuestionOverride(questionId: string) {
  const storage = readStorage();

  if (!storage) {
    return;
  }

  const all = getAllLocalQuestionOverrides();
  delete all[questionId];
  storage.setItem(QUESTION_STORAGE_KEY, JSON.stringify(all));
}

export function removeAssessmentOverride(assessmentId: string) {
  const storage = readStorage();

  if (!storage) return;

  const all = getAllLocalAssessmentOverrides();
  delete all[assessmentId];
  storage.setItem(ASSESSMENT_STORAGE_KEY, JSON.stringify(all));
}

export function clearLessonOverrides() {
  const storage = readStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(STORAGE_KEY);
}

export function hasLessonOverride(lessonId: string) {
  return !!getLocalLessonOverride(lessonId);
}

export function hasQuestionOverride(questionId: string) {
  return !!getLocalQuestionOverride(questionId);
}

export function hasAssessmentOverride(assessmentId: string) {
  return !!getLocalAssessmentOverride(assessmentId);
}

export function createDefaultBlock(type: ContentBlock["type"], step = 1): ContentBlock {
  switch (type) {
    case "heading":
      return { id: createStableId("block-heading"), type: "heading", step, text: "New heading", level: 2 };
    case "text":
      return { id: createStableId("block-text"), type: "text", step, body: "Add lesson text here." };
    case "math":
      return { id: createStableId("block-math"), type: "math", step, expression: "z = a + bi", display: true };
    case "worked-example":
      return {
        id: createStableId("block-worked-example"),
        type: "worked-example",
        step,
        title: "Worked example",
        prompt: "State the reasoning clearly.",
        solution: "Provide the solution here.",
      };
    case "callout":
      return { id: createStableId("block-callout"), type: "callout", step, tone: "info", text: "Add a helpful reminder." };
    case "image":
      return { id: createStableId("block-image"), type: "image", step, src: "/hero-images/placeholder.png", alt: "Lesson illustration", caption: "Add a caption." };
    case "video":
      return { id: createStableId("block-video"), type: "video", step, src: "https://example.com/lesson-video.mp4", title: "Lesson video" };
    case "interactive":
      return {
        id: createStableId("block-interactive"),
        type: "interactive",
        step,
        provider: "geogebra",
        config: {
          visualizer: "geogebra",
          appName: "graphing",
          showToolbar: true,
          showAlgebraInput: false,
          showMenuBar: false,
          showResetIcon: true,
          height: 440,
        },
      };
    case "question":
      return { id: createStableId("block-question"), type: "question", step, questionId: "math151-argand-modulus-check" };
    case "markdown":
      return { id: createStableId("block-markdown"), type: "markdown", step, markdown: "# New lesson section\n\nWrite the lesson content here. Use $a^2 + b^2$ for inline mathematics." };
    default:
      return { id: createStableId("block-text"), type: "text", step, body: "Add lesson text here." };
  }
}

export function validateBlock(block: ContentBlock): string[] {
  const errors: string[] = [];

  if (!block.id) {
    errors.push("Block is missing an id.");
  }

  switch (block.type) {
    case "heading":
      if (!block.text.trim()) errors.push("Heading text cannot be empty.");
      break;
    case "text":
      if (!block.body.trim()) errors.push("Text content cannot be empty.");
      break;
    case "math":
      if (!block.expression.trim()) errors.push("Math expression cannot be empty.");
      break;
    case "worked-example":
      if (!block.title.trim()) errors.push("Worked example title cannot be empty.");
      if (!block.prompt.trim()) errors.push("Worked example prompt cannot be empty.");
      if (!block.solution.trim()) errors.push("Worked example solution cannot be empty.");
      break;
    case "callout":
      if (!block.text.trim()) errors.push("Callout text cannot be empty.");
      if (!block.tone) errors.push("Callout tone is required.");
      break;
    case "image":
      if (!block.src.trim()) errors.push("Image source is required.");
      if (!block.alt.trim()) errors.push("Image alt text is required.");
      break;
    case "video":
      if (!block.src.trim()) errors.push("Video source is required.");
      if (!block.title.trim()) errors.push("Video title is required.");
      break;
    case "interactive":
      if (!block.provider) errors.push("Interactive provider is required.");
      if (!block.config || Object.keys(block.config).length === 0) errors.push("Interactive config cannot be empty.");
      if (block.provider === "geogebra") {
        const geoConfig = block.config as Record<string, unknown> | undefined;
        if (geoConfig && typeof geoConfig.materialId === "string" && geoConfig.materialId.trim() === "") {
          errors.push("GeoGebra material ID cannot be empty.");
        }
        if (geoConfig && "height" in geoConfig && (typeof geoConfig.height !== "number" || !Number.isFinite(geoConfig.height) || geoConfig.height <= 0)) {
          errors.push("GeoGebra height must be a positive number.");
        }
      }
      break;
    case "question":
      if (!block.questionId.trim()) errors.push("Question reference is required.");
      break;
    case "markdown":
      if (!block.markdown.trim()) errors.push("Markdown content cannot be empty.");
      break;
    default:
      errors.push("Unsupported block type.");
  }

  return errors;
}

export function validateLessonForOverride(lesson: Partial<Lesson>): string[] {
  const errors: string[] = [];

  if (!lesson.title || !lesson.title.trim()) {
    errors.push("Lesson title is required.");
  }

  if (!lesson.description || !lesson.description.trim()) {
    errors.push("Lesson description is required.");
  }

  if (!Array.isArray(lesson.blocks)) {
    errors.push("Lesson blocks must be an array.");
    return errors;
  }

  lesson.blocks.forEach((block, index) => {
    const blockErrors = validateBlock(block);
    if (blockErrors.length > 0) {
      errors.push(`Block ${index + 1}: ${blockErrors.join("; ")}`);
    }
  });

  return errors;
}

export function buildLessonOverride(baseLesson: Lesson, draft: Partial<Lesson>): LessonOverride | null {
  const override: LessonOverride = {
    lessonId: baseLesson.id,
    updatedAt: new Date().toISOString(),
  };

  if (draft.title && draft.title.trim() !== baseLesson.title) {
    override.title = draft.title.trim();
  }

  if (draft.description && draft.description.trim() !== baseLesson.description) {
    override.description = draft.description.trim();
  }

  if (draft.blocks && JSON.stringify(draft.blocks) !== JSON.stringify(baseLesson.blocks)) {
    override.blocks = draft.blocks.map((block) => ({ ...block, step: block.step ?? 1 }));
  }

  return Object.keys(override).length > 2 ? override : null;
}

export function getResolvedLesson(lessonId: string, options: { includeDraft?: boolean } = {}): Lesson | undefined {
  const localLesson = getLocalLessons().find((lesson) => lesson.id === lessonId);
  if (localLesson) return localLesson;

  const baseLesson = getBaseLesson(lessonId);

  if (!baseLesson) {
    return undefined;
  }

  const override = getLocalLessonOverride(lessonId);

  if (!override) {
    return baseLesson;
  }

  if (override.status === "draft" && !options.includeDraft) {
    return baseLesson;
  }

  const resolvedBlocks = override.blocks ?? baseLesson.blocks;

  return {
    ...baseLesson,
    ...(override.title ? { title: override.title } : {}),
    ...(override.description ? { description: override.description } : {}),
    blocks: resolvedBlocks,
  };
}

export function getResolvedQuestion(questionId: string): Question | undefined {
  const override = getLocalQuestionOverride(questionId);
  if (override) {
    return override.question;
  }

  const baseQuestion = getBaseQuestion(questionId);
  return baseQuestion ?? undefined;
}

export function getResolvedAssessment(assessmentId: string): Assessment | undefined {
  const override = getLocalAssessmentOverride(assessmentId);
  if (override) return override.assessment;

  return getBaseAssessment(assessmentId);
}
