import type { Chapter, Course, Week } from "./types/course";
import type { ContentBlock, Lesson } from "./types/lesson";
import type { Question } from "./types/question";

export interface ImportScanResult {
  sourceName: string;
  sourceType: "markdown" | "pdf" | "text";
  chapters: Chapter[];
  weeks: Week[];
  lessons: Lesson[];
  questions: Question[];
  warnings: string[];
  workedExamples: number;
  mathSections: number;
}

const numberWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function readNumber(value: string) {
  return Number(value) || numberWords[value.toLowerCase()] || undefined;
}

function slugify(value: string, fallback: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || fallback;
}

function stableId(...parts: string[]) {
  return parts.map((part) => slugify(part, "item")).join("-");
}

function parseWeekHeading(title: string) {
  const match = title.match(/^(?:week|wk)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s*[—:-]\s*(.*))?$/i);
  if (!match) return null;
  return { number: readNumber(match[1]) ?? 1, title: match[2]?.trim() || `Week ${readNumber(match[1]) ?? 1}` };
}

function parseDayHeading(title: string) {
  const match = title.match(/^(?:day|session|lecture)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s*[—:-]\s*(.*))?$/i);
  if (!match) return null;
  return { number: readNumber(match[1]) ?? 1, title: match[2]?.trim() || `Day ${readNumber(match[1]) ?? 1}` };
}

function questionFromLines(lines: string[], index: number, course: Course, week: Week, lesson: Lesson, sourceKey: string): Question | null {
  const promptLine = lines.find((line) => /^\s*\d+[.)]\s+/.test(line));
  if (!promptLine) return null;
  const prompt = promptLine.replace(/^\s*\d+[.)]\s+/, "").trim();
  const options = lines.flatMap((line) => {
    const match = line.match(/^\s*([A-D])[.)]\s+(.+)$/);
    return match ? [{ id: match[1].toLowerCase(), label: match[1], text: match[2].trim() }] : [];
  });
  const answer = lines.find((line) => /^\s*(answer|correct answer)\s*:/i.test(line))?.match(/:\s*([A-D])/i)?.[1]?.toLowerCase();
  const explanation = lines.find((line) => /^\s*(explanation|solution)\s*:/i.test(line))?.replace(/^\s*(explanation|solution)\s*:\s*/i, "").trim() ?? "";
  const id = stableId(course.id, "imported", sourceKey, `week-${week.weekNumber}`, `day-${lesson.order}`, `question-${index}-${prompt}`);

  return {
    id,
    courseId: course.id,
    chapterId: lesson.chapterId,
    lessonId: lesson.id,
    topic: lesson.title,
    subtopic: week.title,
    type: options.length >= 2 ? "multiple-choice" : "short-answer",
    prompt,
    options: options.length >= 2 ? options : undefined,
    correctAnswer: options.length >= 2 ? answer ?? "" : "",
    explanation: explanation || "Needs review: no explanation was provided in the source.",
    difficulty: "medium",
    marks: 1,
    tags: ["imported", stableId(week.title)],
    metadata: { source: "imported", status: answer || options.length < 2 ? "draft" : "published", author: "Local importer" },
  };
}

function toBlocks(lines: string[], sourceKey: string, lessonKey: string) {
  const blocks: ContentBlock[] = [];
  let paragraph: string[] = [];
  let blockIndex = 0;
  let mathSections = 0;
  let workedExamples = 0;

  const flushParagraph = () => {
    const body = paragraph.join(" ").trim();
    if (!body) return;
    const mathMatch = body.match(/^\$\$([\s\S]+)\$\$$|^\\\[([\s\S]+)\\\]$/);
    if (mathMatch) {
      blocks.push({ id: stableId(sourceKey, lessonKey, "math", String(blockIndex)), type: "math", step: blockIndex + 1, expression: (mathMatch[1] ?? mathMatch[2]).trim(), display: true });
      mathSections += 1;
    } else {
      blocks.push({ id: stableId(sourceKey, lessonKey, "text", String(blockIndex)), type: "text", step: blockIndex + 1, body });
    }
    blockIndex += 1;
    paragraph = [];
  };

  lines.forEach((line) => {
    const heading = line.match(/^#{3,6}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({ id: stableId(sourceKey, lessonKey, "heading", String(blockIndex)), type: "heading", step: blockIndex + 1, text: heading[1].trim(), level: 3 });
      blockIndex += 1;
      return;
    }
    if (/worked example/i.test(line)) workedExamples += 1;
    paragraph.push(line);
  });
  flushParagraph();

  return { blocks, mathSections, workedExamples };
}

export function scanMarkdown(source: string, sourceName: string, course: Course): ImportScanResult {
  const sourceKey = stableId(sourceName);
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const chapters: Chapter[] = [];
  const weeks: Week[] = [];
  const lessons: Lesson[] = [];
  const questions: Question[] = [];
  const warnings: string[] = [];
  let currentWeek: Week | null = null;
  let currentLesson: Lesson | null = null;
  let lessonLines: string[] = [];
  let questionLines: string[] = [];
  let questionIndex = 0;
  let workedExamples = 0;
  let mathSections = 0;

  const flushQuestion = () => {
    if (!currentWeek || !currentLesson || !questionLines.length) return;
    questionIndex += 1;
    const question = questionFromLines(questionLines, questionIndex, course, currentWeek, currentLesson, sourceKey);
    if (question) questions.push(question);
    questionLines = [];
  };

  const flushLesson = () => {
    if (!currentLesson || !currentWeek) return;
    flushQuestion();
    const blockResult = toBlocks(lessonLines, sourceKey, currentLesson.id);
    currentLesson.blocks = blockResult.blocks.length ? blockResult.blocks : [{ id: stableId(sourceKey, currentLesson.id, "empty"), type: "text", body: "Imported Day content requires review." }];
    lessons.push(currentLesson);
    currentWeek.sessionIds.push(currentLesson.id);
    workedExamples += blockResult.workedExamples;
    mathSections += blockResult.mathSections;
    lessonLines = [];
    currentLesson = null;
  };

  lines.forEach((line) => {
    const markdownHeading = line.match(/^#{1,6}\s+(.+)$/);
    const title = (markdownHeading?.[1] ?? line).replace(/^\d+[.:)-]?\s*/, "").trim();
    const weekHeading = title ? parseWeekHeading(title) : null;
    const dayHeading = title ? parseDayHeading(title) : null;

    if (weekHeading) {
      flushLesson();
      const chapter: Chapter = { id: stableId(course.id, sourceKey, `week-${weekHeading.number}`, "metadata"), courseId: course.id, title: weekHeading.title, description: `Imported metadata for ${weekHeading.title}.`, order: weekHeading.number };
      chapters.push(chapter);
      currentWeek = { id: stableId(course.id, sourceKey, `week-${weekHeading.number}`), courseId: course.id, chapterIds: [chapter.id], title: weekHeading.title, description: weekHeading.title, weekNumber: weekHeading.number, sessionIds: [] };
      weeks.push(currentWeek);
      return;
    }

    if (dayHeading) {
      flushLesson();
      if (!currentWeek) {
        warnings.push(`Day "${dayHeading.title}" appeared before a detected Week and was not assigned.`);
        return;
      }
      currentLesson = { id: stableId(course.id, sourceKey, `week-${currentWeek.weekNumber}`, `day-${dayHeading.number}`), courseId: course.id, chapterId: currentWeek.chapterIds[0], weekId: currentWeek.id, title: dayHeading.title, description: `Imported Day ${dayHeading.number}.`, order: dayHeading.number, estimatedMinutes: 20, objectives: [], blocks: [] };
      return;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      flushQuestion();
      if (currentLesson) questionLines.push(line);
      return;
    }
    if (questionLines.length && (/^\s*[A-D][.)]\s+/.test(line) || /^\s*(answer|correct answer|explanation|solution)\s*:/i.test(line))) {
      questionLines.push(line);
      return;
    }
    if (currentLesson && line.trim()) lessonLines.push(line);
  });

  flushLesson();
  if (!weeks.length) warnings.push("No Weeks detected. Add headings such as `## Week 1 — Foundations` before importing.");
  weeks.forEach((week) => {
    if (!week.sessionIds.length) warnings.push(`${week.title}: no Days detected.`);
  });

  return { sourceName, sourceType: "markdown", chapters, weeks, lessons, questions, warnings, workedExamples, mathSections };
}

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const buffer = await file.arrayBuffer();
  const document = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return pages.join("\n\n");
}
