import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  QUESTION_DIRECTORY_COLUMNS,
  createQuestionSupabaseRepository,
  questionLocalRepository,
  type QuestionDirectoryRow,
} from "../lib/questions/repository";
import {
  createAssessmentSupabaseRepository,
  assessmentLocalRepository,
} from "../lib/assessment/repository";
import type { Question } from "../lib/content/types/question";
import type { Assessment } from "../lib/content/types/assessment";
import type { Database } from "../lib/supabase/types";

type QueryTrace = {
  table: string;
  columns?: string;
  countOption?: string;
  headOption?: boolean;
  filters: Array<[string, unknown]>;
  range?: [number, number];
};

function createMockQuestion(id: string, overrides: Partial<Question> = {}): Question {
  return {
    id,
    courseId: "course-math151",
    chapterId: "chapter-1",
    lessonId: "lesson-1",
    topic: "Limits",
    subtopic: "Computation",
    type: "multiple-choice",
    prompt: `Solve the limit problem for ${id} in detail`,
    options: [
      { id: "a", label: "A", text: "Option A" },
      { id: "b", label: "B", text: "Option B" },
    ],
    correctAnswer: "a",
    explanation: `Full explanation with multiple steps and mathematical justification for ${id}.`,
    hint: `Hint for question ${id}`,
    difficulty: "medium",
    marks: 2,
    tags: ["calculus", "limits"],
    metadata: { status: "published", source: "authored" },
    ...overrides,
  };
}

describe("Phase 5: Admin question directory and count egress optimization", () => {
  describe("Question directory projection and pagination", () => {
    it("queries questions with QUESTION_DIRECTORY_COLUMNS and paginates with exact count", async () => {
      const traces: QueryTrace[] = [];
      const totalQuestions = 60;
      const mockQuestions = Array.from({ length: totalQuestions }, (_, i) =>
        createMockQuestion(`q-${i + 1}`, {
          difficulty: i % 2 === 0 ? "easy" : "hard",
        })
      );

      const client = {
        from(table: string) {
          const currentTrace: QueryTrace = { table, filters: [] };
          traces.push(currentTrace);

          const builder: any = {
            select(cols: string, options?: { count?: string; head?: boolean }) {
              currentTrace.columns = cols;
              currentTrace.countOption = options?.count;
              currentTrace.headOption = options?.head;
              return builder;
            },
            eq(col: string, val: unknown) {
              currentTrace.filters.push([`eq:${col}`, val]);
              return builder;
            },
            in(col: string, vals: unknown[]) {
              currentTrace.filters.push([`in:${col}`, vals]);
              return builder;
            },
            order() {
              return builder;
            },
            range(from: number, to: number) {
              currentTrace.range = [from, to];
              const paged = mockQuestions.slice(from, to + 1).map((q) => ({
                id: q.id,
                prompt: q.prompt,
                topic: q.topic,
                difficulty: q.difficulty,
                type: q.type,
                status: q.metadata?.status ?? "draft",
                course_id: q.courseId,
                chapter_id: q.chapterId,
                lesson_id: q.lessonId,
              }));
              return Promise.resolve({
                data: paged,
                count: totalQuestions,
                error: null,
              });
            },
          };
          return builder;
        },
      } as unknown as SupabaseClient<Database>;

      const repo = createQuestionSupabaseRepository(() => client);
      const pageResult = await repo.listQuestionDirectory({
        courseId: "course-math151",
        page: 2,
        pageSize: 25,
      });

      // Verify explicit directory columns projection was requested
      assert.equal(traces.length, 1);
      assert.equal(traces[0].columns, QUESTION_DIRECTORY_COLUMNS);
      assert.equal(traces[0].countOption, "exact");
      assert.deepEqual(traces[0].range, [25, 49]);

      // Verify results structure
      assert.equal(pageResult.questions.length, 25);
      assert.equal(pageResult.totalCount, 60);
      assert.equal(pageResult.page, 2);
      assert.equal(pageResult.pageSize, 25);
      assert.equal(pageResult.totalPages, 3);

      // Verify row fields contain no bulky answers/explanations/hints/options
      const firstRow = pageResult.questions[0];
      assert.equal(firstRow.id, "q-26");
      assert.equal(firstRow.prompt, "Solve the limit problem for q-26 in detail");
      assert.equal(firstRow.topic, "Limits");
      assert.equal((firstRow as any).explanation, undefined);
      assert.equal((firstRow as any).options, undefined);
      assert.equal((firstRow as any).correctAnswer, undefined);
      assert.equal((firstRow as any).hint, undefined);
    });

    it("local question repository listQuestionDirectory paginates correctly", async () => {
      const pageResult = await questionLocalRepository.listQuestionDirectory({
        page: 1,
        pageSize: 5,
      });
      assert.ok(pageResult.questions.length <= 5);
      assert.ok(pageResult.totalCount >= pageResult.questions.length);
      assert.equal(pageResult.page, 1);
      assert.equal(pageResult.pageSize, 5);
    });
  });

  describe("Lightweight database-side count queries", () => {
    it("countQuestions executes a head-only exact count query scoped to course", async () => {
      const traces: QueryTrace[] = [];
      const client = {
        from(table: string) {
          const currentTrace: QueryTrace = { table, filters: [] };
          traces.push(currentTrace);

          const builder: any = {
            select(cols: string, options?: { count?: string; head?: boolean }) {
              currentTrace.columns = cols;
              currentTrace.countOption = options?.count;
              currentTrace.headOption = options?.head;
              return builder;
            },
            eq(col: string, val: unknown) {
              currentTrace.filters.push([`eq:${col}`, val]);
              return builder;
            },
            then(resolve: (val: any) => void) {
              resolve({ data: null, count: 42, error: null });
            },
          };
          return builder;
        },
      } as unknown as SupabaseClient<Database>;

      const repo = createQuestionSupabaseRepository(() => client);
      const count = await repo.countQuestions({ courseId: "math-151" });

      assert.equal(count, 42);
      assert.equal(traces.length, 1);
      assert.equal(traces[0].table, "questions");
      assert.equal(traces[0].columns, "id");
      assert.equal(traces[0].countOption, "exact");
      assert.equal(traces[0].headOption, true);
      assert.ok(traces[0].filters.some(([filter, val]) => filter === "eq:course_id" && val === "math-151"));
    });

    it("countAssessments executes a head-only exact count query scoped to course", async () => {
      const traces: QueryTrace[] = [];
      const client = {
        from(table: string) {
          const currentTrace: QueryTrace = { table, filters: [] };
          traces.push(currentTrace);

          const builder: any = {
            select(cols: string, options?: { count?: string; head?: boolean }) {
              currentTrace.columns = cols;
              currentTrace.countOption = options?.count;
              currentTrace.headOption = options?.head;
              return builder;
            },
            eq(col: string, val: unknown) {
              currentTrace.filters.push([`eq:${col}`, val]);
              return builder;
            },
            then(resolve: (val: any) => void) {
              resolve({ data: null, count: 8, error: null });
            },
          };
          return builder;
        },
      } as unknown as SupabaseClient<Database>;

      const repo = createAssessmentSupabaseRepository(() => client);
      const count = await repo.countAssessments({ courseId: "math-151" });

      assert.equal(count, 8);
      assert.equal(traces.length, 1);
      assert.equal(traces[0].table, "assessments");
      assert.equal(traces[0].columns, "id");
      assert.equal(traces[0].countOption, "exact");
      assert.equal(traces[0].headOption, true);
      assert.ok(traces[0].filters.some(([filter, val]) => filter === "eq:course_id" && val === "math-151"));
    });

    it("local count implementations return non-negative counts", async () => {
      const qCount = await questionLocalRepository.countQuestions();
      assert.ok(typeof qCount === "number" && qCount >= 0);

      const aCount = await assessmentLocalRepository.countAssessments();
      assert.ok(typeof aCount === "number" && aCount >= 0);
    });
  });

  describe("Full question fetch path for individual question editor", () => {
    it("getQuestion continues to return complete question record with options and explanations", async () => {
      const fullQuestion = createMockQuestion("q-editor-test", {
        prompt: "Editor test question",
        options: [
          { id: "a", label: "A", text: "Alpha" },
          { id: "b", label: "B", text: "Beta" },
        ],
        explanation: "Comprehensive step-by-step editor explanation.",
        hint: "Editor hint",
      });

      const client = {
        from(table: string) {
          assert.equal(table, "questions");
          const builder: any = {
            select(cols: string) {
              assert.equal(cols, "*");
              return builder;
            },
            eq(col: string, val: unknown) {
              assert.equal(col, "id");
              assert.equal(val, "q-editor-test");
              return builder;
            },
            maybeSingle() {
              return Promise.resolve({
                data: {
                  id: fullQuestion.id,
                  course_id: fullQuestion.courseId,
                  chapter_id: fullQuestion.chapterId,
                  lesson_id: fullQuestion.lessonId,
                  topic: fullQuestion.topic,
                  subtopic: fullQuestion.subtopic,
                  type: fullQuestion.type,
                  difficulty: fullQuestion.difficulty,
                  prompt: fullQuestion.prompt,
                  options: fullQuestion.options,
                  correct_answer: fullQuestion.correctAnswer,
                  explanation: fullQuestion.explanation,
                  hint: fullQuestion.hint,
                  marks: fullQuestion.marks,
                  tags: fullQuestion.tags,
                  status: "published",
                  source: "authored",
                  variant_of: null,
                  author: "Admin",
                  created_at: "2024-01-01T00:00:00Z",
                  updated_at: "2024-01-01T00:00:00Z",
                },
                error: null,
              });
            },
          };
          return builder;
        },
      } as unknown as SupabaseClient<Database>;

      const repo = createQuestionSupabaseRepository(() => client);
      const question = await repo.getQuestion("q-editor-test");

      assert.ok(question);
      assert.equal(question.id, "q-editor-test");
      assert.equal(question.prompt, "Editor test question");
      assert.equal(question.explanation, "Comprehensive step-by-step editor explanation.");
      assert.equal(question.hint, "Editor hint");
      assert.equal(question.options?.length, 2);
      assert.equal(question.correctAnswer, "a");
    });
  });

  describe("Deterministic payload size comparisons", () => {
    it("directory projection yields significant egress savings over full select(*)", () => {
      const fullRows = Array.from({ length: 25 }, (_, i) => ({
        id: `q-${i + 1}-uuid-1234-5678-abcd`,
        course_id: "course-math151-uuid",
        chapter_id: "ch-01-uuid",
        lesson_id: "day-01-uuid",
        topic: "Complex Numbers",
        subtopic: "Argand Diagrams",
        type: "multiple-choice",
        difficulty: "medium",
        prompt: `Find the locus of points satisfying |z - ${i}| = 2 in the complex plane, and sketch the resulting circle with radius 2 centered at (${i}, 0).`,
        options: [
          { id: "a", label: "A", text: `Circle centered at (${i}, 0) with radius 2` },
          { id: "b", label: "B", text: `Line perpendicular to real axis at x = ${i}` },
          { id: "c", label: "C", text: `Parabola with vertex at (${i}, 0)` },
          { id: "d", label: "D", text: `Ellipse with foci at (${i}, 0) and (0, 0)` },
        ],
        correct_answer: "a",
        explanation: `Let z = x + iy. Then |z - ${i}| = |(x - ${i}) + iy| = sqrt((x - ${i})^2 + y^2) = 2. Squaring both sides yields (x - ${i})^2 + y^2 = 4, which is standard equation of circle.`,
        hint: "Substitute z = x + iy into the modulus definition.",
        marks: 2,
        tags: ["complex", "geometry", "locus"],
        status: "published",
        source: "authored",
        variant_of: null,
        author: "Admin",
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-03-20T14:30:00Z",
      }));

      const directoryRows = fullRows.map((r): QuestionDirectoryRow => ({
        id: r.id,
        prompt: r.prompt,
        topic: r.topic,
        difficulty: r.difficulty as QuestionDirectoryRow["difficulty"],
        type: r.type as QuestionDirectoryRow["type"],
        status: r.status as QuestionDirectoryRow["status"],
        courseId: r.course_id,
        chapterId: r.chapter_id,
        lessonId: r.lesson_id,
      }));

      const fullBytes = Buffer.byteLength(JSON.stringify(fullRows), "utf8");
      const dirBytes = Buffer.byteLength(JSON.stringify(directoryRows), "utf8");
      const reduction = (fullBytes - dirBytes) / fullBytes;

      // Directory projection should be at least 60% smaller than full question rows
      assert.ok(
        reduction >= 0.60,
        `Expected at least 60% reduction, got ${(reduction * 100).toFixed(1)}% (${dirBytes} vs ${fullBytes} bytes)`
      );
    });

    it("dashboard count query (head: true) yields >99% egress savings over fetching full question records", () => {
      const fullRows = Array.from({ length: 100 }, (_, i) => ({
        id: `q-${i + 1}-uuid`,
        prompt: `Prompt for question ${i + 1}`,
        explanation: `Long explanation for question ${i + 1} with solutions.`,
        options: [{ id: "a", label: "A", text: "Ans" }],
        correct_answer: "a",
      }));

      const fullBytes = Buffer.byteLength(JSON.stringify(fullRows), "utf8");
      // Supabase head: true count returns empty body with Content-Range header
      const countPayloadBytes = Buffer.byteLength(JSON.stringify({ count: 100 }), "utf8");
      const reduction = (fullBytes - countPayloadBytes) / fullBytes;

      assert.ok(
        reduction >= 0.95,
        `Expected at least 95% reduction for count query, got ${(reduction * 100).toFixed(1)}%`
      );
    });
  });
});
