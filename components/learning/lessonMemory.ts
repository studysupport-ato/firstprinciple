/**
 * What a student has already done in a lesson, kept on their device so that going back
 * (or coming back another day) never makes them sit through the gates again:
 *  - the furthest step they reached and the step they were last on,
 *  - the lesson tests they have finished,
 *  - the "Your turn" questions inside each board that they answered correctly.
 *
 * Everything here is best effort: when storage is unavailable the lesson simply behaves
 * as it did before (every gate shown again).
 */

const LESSON_PREFIX = "b2b-lesson-memory:v1:";
const BOARD_PREFIX = "b2b-board-answers:v1:";

export type LessonMemory = {
  /** Index of the furthest step reached. */
  max: number;
  /** Index of the step the student was last on. */
  last: number;
  /** Ids of the lesson tests (quiz blocks) finished at least once. */
  quizzes: string[];
  /** When `last` was saved (ms since 1970), to pick the newer of this and the account's copy. */
  at: number;
};

const EMPTY: LessonMemory = { max: 0, last: 0, quizzes: [], at: 0 };

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the lesson still works, it just won't remember */
  }
}

function wholeNumber(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

export function readLessonMemory(lessonId: string): LessonMemory {
  if (typeof window === "undefined") return EMPTY;
  const value = read(LESSON_PREFIX + lessonId);
  if (!value || typeof value !== "object") return EMPTY;
  const record = value as Record<string, unknown>;
  return {
    max: wholeNumber(record.max),
    last: wholeNumber(record.last),
    quizzes: Array.isArray(record.quizzes) ? record.quizzes.filter((id): id is string => typeof id === "string") : [],
    at: wholeNumber(record.at),
  };
}

export function saveLessonMemory(lessonId: string, patch: Partial<LessonMemory>) {
  if (typeof window === "undefined") return;
  const current = readLessonMemory(lessonId);
  const next: LessonMemory = {
    max: Math.max(current.max, patch.max ?? 0),
    last: patch.last ?? current.last,
    quizzes: patch.quizzes ? Array.from(new Set([...current.quizzes, ...patch.quizzes])) : current.quizzes,
    at: patch.last !== undefined ? Date.now() : current.at,
  };
  write(LESSON_PREFIX + lessonId, next);
}

/** A board's questions are keyed by "part:step" inside the board, e.g. "2:4". */
const ANSWER_KEY = /^\d{1,3}:\d{1,3}$/;

/** The key a board is remembered under. Editing the board changes its length, which starts it fresh. */
export function boardMemoryKey(blockId: string | undefined, source: string) {
  return blockId ? `${blockId}:${source.length}` : null;
}

export function readBoardAnswers(key: string | null): string[] {
  if (!key || typeof window === "undefined") return [];
  const value = read(BOARD_PREFIX + key);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && ANSWER_KEY.test(item)) : [];
}

export function saveBoardAnswer(key: string | null, answer: unknown) {
  if (!key || typeof window === "undefined" || typeof answer !== "string" || !ANSWER_KEY.test(answer)) return;
  const current = readBoardAnswers(key);
  if (current.includes(answer)) return;
  write(BOARD_PREFIX + key, [...current, answer]);
}
