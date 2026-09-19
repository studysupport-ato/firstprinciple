import { getChapters, getCourse, getLessons } from "@/lib/content/access";
import type { Question, QuestionType, Difficulty } from "@/lib/content/types/question";
import { createStableId } from "@/lib/ids";

export interface ParsedQuestionBatch {
  questions: Question[];
  validQuestions: Question[];
  warnings: string[];
  errors: string[];
}

const TYPE_ALIASES: Record<string, QuestionType> = {
  "multiple-choice": "multiple-choice",
  "multiple choice": "multiple-choice",
  "multiple_choice": "multiple-choice",
  mcq: "multiple-choice",
  "true-false": "true-false",
  "true false": "true-false",
  "true_false": "true-false",
  "true/false": "true-false",
  numerical: "numerical",
  numeric: "numerical",
  "short-answer": "short-answer",
  "short answer": "short-answer",
  "short_answer": "short-answer",
};

const DIFFICULTY_ALIASES: Record<string, Difficulty> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
};

function normalizeOptionId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || "a";
}

function asLines(block: string) {
  return block
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());
}

function parseFieldValue(line: string) {
  const match = line.match(/^[*#_\-\s]*[:\*]*\**?\s*([^\n:]+?)\s*[:\*]*\s*[:\-]?\s*(.+)$/i);
  if (match) {
    return { key: match[1].trim().toLowerCase(), value: match[2].trim() };
  }
  return null;
}

function parseQuestionType(raw?: string): QuestionType | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  return TYPE_ALIASES[normalized] ?? null;
}

function parseDifficulty(raw?: string): Difficulty {
  if (!raw) return "medium";
  const normalized = raw.trim().toLowerCase();
  return DIFFICULTY_ALIASES[normalized] ?? "medium";
}

function parseMarks(raw?: string) {
  if (!raw) return 1;
  const numeric = Number.parseInt(raw.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
}

function parseOptionsFromBlock(lines: string[]) {
  const options: { id: string; label: string; text: string }[] = [];
  let capturing = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^###\s*options?/i.test(trimmed) || /^\*\*\s*options?\s*:\s*$/i.test(trimmed)) {
      capturing = true;
      continue;
    }

    if (capturing && /^\s*---\s*$/.test(trimmed)) {
      break;
    }

    if (!capturing) continue;

    const match = trimmed.match(/^[-*]\s*([A-Za-z0-9])\.?\s*(?:[\-–:]|\)|\.]\s*)?(.*)$/);
    if (!match) continue;

    const id = normalizeOptionId(match[1]);
    const text = match[2].trim();
    if (!text) continue;

    const label = match[1].trim().toUpperCase();
    if (!options.some((option) => option.id === id)) {
      options.push({ id, label, text });
    }
  }

  return options;
}

function parseQuestionPrompt(lines: string[]) {
  const promptSection = lines.findIndex((line) => /^###\s*question\s*$/i.test(line.trim()));
  if (promptSection >= 0) {
    const chunks: string[] = [];
    for (let index = promptSection + 1; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (!line) continue;
      if (/^(###|\*\*|\-\s*[A-Za-z0-9]\.?|\*\s*[A-Za-z0-9]\.?)/.test(line)) {
        if (/^###\s*(options?|answer|explanation|hint)/i.test(line)) {
          break;
        }
      }
      chunks.push(line);
    }
    const value = chunks.join(" ").trim();
    if (value) return value;
  }

  const textLines = lines.filter((line) => !/^\*\*.*\*\*$/.test(line.trim()) && !/^###\s*/.test(line.trim()));
  const questionMatch = textLines.find((line) => /\?/.test(line) || !/^[-*]/.test(line.trim()));
  return questionMatch?.trim() ?? "";
}

function parseAnswer(lines: string[], type: QuestionType, options: { id: string; label: string; text: string }[]) {
  for (const line of lines) {
    const trimmed = line.trim();
    const answerHeader = trimmed.match(/^\*\*?\s*(answer|correct answer)\s*\*?\s*[:\-]\s*(.+)$/i);
    if (answerHeader) {
      const raw = answerHeader[2].trim();
      if (type === "true-false") {
        const lower = raw.toLowerCase();
        if (lower.includes("true")) return true;
        if (lower.includes("false")) return false;
      }
      if (type === "multiple-choice") {
        const optionId = normalizeOptionId(raw.replace(/^[A-Za-z]\.?\s*$/i, "$1"));
        const matched = options.find((option) => option.id === optionId || option.label.toLowerCase() === optionId.toLowerCase());
        return matched?.id ?? optionId;
      }
      if (type === "numerical") {
        const numeric = Number(raw);
        return Number.isFinite(numeric) ? numeric : raw;
      }
      return raw;
    }

    const answerLine = trimmed.match(/^\s*(?:-\s*)?(?:A|B|C|D|E|True|False|[0-9.\-]+)\.?\s*$/i);
    if (answerLine) {
      const value = trimmed.replace(/^[-*\s]+/, "").trim();
      if (type === "true-false") return value.toLowerCase().startsWith("t");
      if (type === "multiple-choice") {
        const optionId = normalizeOptionId(value);
        return options.some((option) => option.id === optionId) ? optionId : value;
      }
      if (type === "numerical") {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : value;
      }
      return value;
    }
  }

  if (type === "multiple-choice" && options.length) return options[0].id;
  if (type === "true-false") return true;
  return "";
}

function parseExplanation(lines: string[]) {
  const explanationIndex = lines.findIndex((line) => /^###\s*explanation\s*$/i.test(line.trim()));
  if (explanationIndex >= 0) {
    const next = lines.slice(explanationIndex + 1);
    const text = next
      .filter((line) => !/^###\s*(options?|answer|hint|question)\s*$/i.test(line.trim()))
      .join(" ")
      .trim();
    if (text) return text;
  }

  const matched = lines.find((line) => /^\*\*?\s*explanation\s*\*?\s*[:\-]\s*/i.test(line.trim()));
  if (matched) return matched.replace(/^\*\*?\s*explanation\s*\*?\s*[:\-]\s*/i, "").trim();

  return "";
}

function parseHint(lines: string[]) {
  const hintIndex = lines.findIndex((line) => /^###\s*hint\s*$/i.test(line.trim()));
  if (hintIndex >= 0) {
    const text = lines
      .slice(hintIndex + 1)
      .filter((line) => !/^###\s*(question|options?|answer|explanation)\s*$/i.test(line.trim()))
      .join(" ")
      .trim();
    if (text) return text;
  }

  const matched = lines.find((line) => /^\*\*?\s*hint\s*\*?\s*[:\-]\s*/i.test(line.trim()));
  if (matched) return matched.replace(/^\*\*?\s*hint\s*\*?\s*[:\-]\s*/i, "").trim();

  return undefined;
}

function parseQuestionBlock(block: string, courseId: string, fallbackChapterId: string, fallbackLessonId: string, index: number) {
  const lines = asLines(block);
  const data: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parsed = parseFieldValue(trimmed);
    if (parsed) {
      data[parsed.key] = parsed.value;
    }
  }

  const type = parseQuestionType(data.type ?? lines.find((line) => /^\*\*?\s*type\s*\*?\s*[:\-]/i.test(line.trim()))?.replace(/^.*?\*?\s*type\s*\*?\s*[:\-]\s*/i, "").trim());
  const inferredType = type ?? (parseOptionsFromBlock(lines).length >= 2 ? "multiple-choice" : "short-answer");

  const prompt = parseQuestionPrompt(lines) || `Imported question ${index + 1}`;
  const options = parseOptionsFromBlock(lines);
  const answer = parseAnswer(lines, inferredType, options);
  const explanation = parseExplanation(lines) || "No explanation was included in the source markdown.";
  const hint = parseHint(lines);
  const chapterId = fallbackChapterId;
  const lessonId = fallbackLessonId;

  const question: Question = {
    id: createStableId(courseId, `q${index + 1}`),
    courseId,
    chapterId,
    lessonId,
    topic: data.topic || "General",
    subtopic: data.subtopic || "General",
    type: inferredType,
    prompt,
    options: inferredType === "multiple-choice" && options.length ? options : undefined,
    correctAnswer: answer,
    explanation,
    hint,
    difficulty: parseDifficulty(data.difficulty),
    marks: parseMarks(data.marks),
    tags: ["imported", courseId],
    metadata: {
      source: "imported",
      status: "draft",
      author: "Admin import",
    },
  };

  return question;
}

export function parseMarkdownQuestionBatch(markdown: string, courseId: string): ParsedQuestionBatch {
  const trimmed = markdown.replace(/\r\n/g, "\n").trim();
  if (!trimmed) {
    return { questions: [], validQuestions: [], warnings: [], errors: ["No Markdown content was provided."] };
  }

  const course = getCourse(courseId);
  const chapters = getChapters(courseId);
  const lessons = getLessons(courseId);
  const fallbackChapterId = chapters[0]?.id ?? `${courseId}-chapter-1`;
  const fallbackLessonId = lessons[0]?.id ?? `${courseId}-lesson-1`;

  const sections = trimmed
    .split(/\n\s*---\s*\n|\n\s*##\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const rawQuestions = sections.length > 0 ? sections : [trimmed];
  const validQuestions: Question[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  rawQuestions.forEach((section, index) => {
    const lines = asLines(section);
    const containsQuestionLikeText = lines.some((line) => /^###\s*question\s*$/i.test(line.trim()) || /^\*\*\s*question\s*\*\*\s*$/i.test(line.trim()) || /^\d+[.)]/.test(line.trim()));

    if (!containsQuestionLikeText) {
      return;
    }

    const question = parseQuestionBlock(section, courseId, fallbackChapterId, fallbackLessonId, index);
    const localErrors: string[] = [];

    if (question.type === "multiple-choice") {
      const optionIds = new Set((question.options ?? []).map((option) => option.id));
      if ((question.options ?? []).length < 2) {
        localErrors.push(`Question ${index + 1}: multiple-choice questions require at least 2 answer options.`);
      }
      if (question.correctAnswer && !optionIds.has(String(question.correctAnswer))) {
        localErrors.push(`Question ${index + 1}: the answer does not match any option id.`);
      }
      if (!question.correctAnswer) {
        localErrors.push(`Question ${index + 1}: multiple-choice questions need a valid answer.`);
      }
    }

    if (question.type === "true-false" && typeof question.correctAnswer !== "boolean") {
      localErrors.push(`Question ${index + 1}: true/false questions must use True or False as the answer.`);
    }

    if (!question.prompt.trim()) {
      localErrors.push(`Question ${index + 1}: missing question text.`);
    }

    if (!question.topic || !question.subtopic) {
      warnings.push(`Question ${index + 1}: topic/subtopic missing; default values were used.`);
    }

    if (!question.explanation.trim()) {
      warnings.push(`Question ${index + 1}: missing explanation.`);
    }

    if (question.metadata?.status === "draft") {
      warnings.push(`Question ${index + 1}: imported as draft until reviewed.`);
    }

    if (course) {
      question.courseId = course.id;
    }

    if (localErrors.length) {
      errors.push(...localErrors);
      return;
    }

    validQuestions.push(question);
  });

  return {
    questions: validQuestions,
    validQuestions,
    warnings,
    errors,
  };
}
