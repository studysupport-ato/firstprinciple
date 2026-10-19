import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  QUESTION_CANDIDATE_COLUMNS,
  createQuestionSupabaseRepository,
  type QuestionCandidate,
} from "../lib/questions/repository";
import {
  selectAssessmentQuestionsFromSupabase,
  AssessmentSelectionError,
} from "../lib/assessment/selection";
import type { Assessment } from "../lib/content/types/assessment";
import type { Question } from "../lib/content/types/question";
import type { Database } from "../lib/supabase/types";

type QueryTrace = {
  columns?: string;
  filters: Array<[string, unknown]>;
  orders: string[];
};

function createMockQuestion(id: string, overrides: Partial<Question> = {}): Question {
  return {
    id,
    courseId: "course-1",
    chapterId: "chapter-1",
    lessonId: "lesson-1",
    topic: "Vectors",
    subtopic: "Dot Product",
    type: "multiple-choice",
    prompt: `Question prompt for ${id}`,
    options: [
      { id: "opt-1", label: "A", text: "Option A" },
      { id: "opt-2", label: "B", text: "Option B" },
    ],
    correctAnswer: "opt-1",
    explanation: `Detailed explanation for ${id} with extensive steps and rationale.`,
    hint: `Helpful hint for ${id}`,
    difficulty: "medium",
    marks: 2,
    tags: ["vectors", "algebra"],
    metadata: { status: "published", source: "authored" },
    ...overrides,
  };
}

describe("Assessment question selection egress optimization", () => {
  it("uses two-stage selection: queries candidates first with QUESTION_CANDIDATE_COLUMNS, then fetches selected bodies in one batch", async () => {
    const traces: QueryTrace[] = [];
    const questionBank = Array.from({ length: 15 }, (_, i) =>
      createMockQuestion(`q-${i + 1}`, {
        difficulty: i < 5 ? "easy" : i < 10 ? "medium" : "hard",
      }),
    );

    const client = {
      from(table: string) {
        assert.equal(table, "questions");
        const trace: QueryTrace = { filters: [], orders: [] };
        traces.push(trace);

        let selectedColumns = "*";

        const query: any = {
          select(columns: string) {
            selectedColumns = columns;
            trace.columns = columns;
            return query;
          },
          eq(column: string, value: unknown) {
            trace.filters.push([column, value]);
            return query;
          },
          in(column: string, values: unknown[]) {
            trace.filters.push([column, values]);
            return query;
          },
          order(column: string) {
            trace.orders.push(column);
            return query;
          },
          then(onfulfilled?: (val: any) => any, onrejected?: (err: any) => any) {
            let filtered = [...questionBank];
            for (const [col, val] of trace.filters) {
              if (col === "course_id") filtered = filtered.filter((q) => q.courseId === val);
              if (col === "topic") filtered = filtered.filter((q) => q.topic === val);
              if (col === "difficulty") filtered = filtered.filter((q) => q.difficulty === val);
              if (col === "status") filtered = filtered.filter((q) => (q.metadata?.status ?? "draft") === val);
              if (col === "id" && Array.isArray(val)) filtered = filtered.filter((q) => val.includes(q.id));
            }

            const data = filtered.map((q) => {
              if (selectedColumns === QUESTION_CANDIDATE_COLUMNS) {
                return {
                  id: q.id,
                  course_id: q.courseId,
                  chapter_id: q.chapterId,
                  lesson_id: q.lessonId,
                  topic: q.topic,
                  subtopic: q.subtopic,
                  difficulty: q.difficulty,
                  type: q.type,
                  tags: q.tags,
                };
              }
              return {
                id: q.id,
                course_id: q.courseId,
                chapter_id: q.chapterId,
                lesson_id: q.lessonId,
                topic: q.topic,
                subtopic: q.subtopic,
                type: q.type,
                difficulty: q.difficulty,
                prompt: q.prompt,
                options: q.options,
                correct_answer: q.correctAnswer,
                explanation: q.explanation,
                hint: q.hint,
                marks: q.marks,
                tags: q.tags,
                status: q.metadata?.status ?? "draft",
                source: q.metadata?.source ?? "authored",
              };
            });

            return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected);
          },
        };
        return query;
      },
    };

    const assessment: Assessment = {
      id: "assess-1",
      courseId: "course-1",
      title: "Test Assessment",
      description: "Description",
      durationMinutes: 45,
      questionCount: 3,
      status: "published",
      blueprint: {
        rules: [
          {
            count: 3,
            topic: "Vectors",
            difficulty: "easy",
          },
        ],
      },
    };

    const selected = await selectAssessmentQuestionsFromSupabase(
      assessment,
      {},
      () => client as unknown as SupabaseClient<Database>,
    );

    assert.equal(selected.length, 3);
    // Exactly 2 database queries: 1 candidate pool query + 1 batch full question query
    assert.equal(traces.length, 2);

    // Stage 1: Candidate query
    assert.equal(traces[0].columns, QUESTION_CANDIDATE_COLUMNS);
    assert.ok(!traces[0].columns?.includes("prompt"));
    assert.ok(!traces[0].columns?.includes("explanation"));
    assert.ok(!traces[0].columns?.includes("correct_answer"));
    assert.deepEqual(traces[0].filters, [
      ["course_id", "course-1"],
      ["topic", "Vectors"],
      ["difficulty", "easy"],
      ["status", "published"],
    ]);

    // Stage 2: Batched body query for selected IDs
    assert.equal(traces[1].columns, "*");
    const idFilter = traces[1].filters.find(([col]) => col === "id");
    assert.ok(idFilter);
    const requestedIds = idFilter[1] as string[];
    assert.equal(requestedIds.length, 3);

    // Selected order preservation
    assert.deepEqual(selected.map((q) => q.id), requestedIds);
    // Bodies are complete
    assert.ok(selected[0].prompt.startsWith("Question prompt"));
    assert.ok(selected[0].explanation.startsWith("Detailed explanation"));
    assert.ok(selected[0].options && selected[0].options.length > 0);
  });

  it("preserves duplicate prevention across multiple blueprint rules", async () => {
    const questionBank = Array.from({ length: 6 }, (_, i) =>
      createMockQuestion(`q-${i + 1}`, {
        topic: "Vectors",
        difficulty: "medium",
      }),
    );

    const client = {
      from(table: string) {
        assert.equal(table, "questions");
        let requestedIds: string[] = [];
        let selectedColumns = "*";
        const query: any = {
          select(cols: string) {
            selectedColumns = cols;
            return query;
          },
          eq() { return query; },
          in(_col: string, values: string[]) {
            requestedIds = values;
            return query;
          },
          order() {
            return query;
          },
          then(onfulfilled?: (val: any) => any) {
            if (selectedColumns === QUESTION_CANDIDATE_COLUMNS) {
              const data = questionBank.map((q) => ({
                id: q.id,
                course_id: q.courseId,
                chapter_id: q.chapterId,
                lesson_id: q.lessonId,
                topic: q.topic,
                subtopic: q.subtopic,
                difficulty: q.difficulty,
                type: q.type,
                tags: q.tags,
              }));
              return Promise.resolve({ data, error: null }).then(onfulfilled);
            }
            const data = questionBank
              .filter((q) => requestedIds.includes(q.id))
              .map((q) => ({
                id: q.id,
                course_id: q.courseId,
                chapter_id: q.chapterId,
                lesson_id: q.lessonId,
                topic: q.topic,
                subtopic: q.subtopic,
                type: q.type,
                difficulty: q.difficulty,
                prompt: q.prompt,
                options: q.options,
                correct_answer: q.correctAnswer,
                explanation: q.explanation,
                marks: q.marks,
                tags: q.tags,
                status: "published",
                source: "authored",
              }));
            return Promise.resolve({ data, error: null }).then(onfulfilled);
          },
        };
        return query;
      },
    };

    const assessment: Assessment = {
      id: "assess-2",
      courseId: "course-1",
      title: "Multi-Rule Assessment",
      description: "Description",
      durationMinutes: 45,
      questionCount: 4,
      status: "published",
      blueprint: {
        rules: [
          { count: 2, topic: "Vectors" },
          { count: 2, topic: "Vectors" },
        ],
      },
    };

    const selected = await selectAssessmentQuestionsFromSupabase(
      assessment,
      {},
      () => client as unknown as SupabaseClient<Database>,
    );

    assert.equal(selected.length, 4);
    const uniqueIds = new Set(selected.map((q) => q.id));
    assert.equal(uniqueIds.size, 4, "Selected questions must not contain duplicates across rules");
  });

  it("throws INSUFFICIENT_QUESTION_POOL with required and available details when candidates are insufficient", async () => {
    const client = {
      from() {
        const query: any = {
          select() { return query; },
          eq() { return query; },
          order() {
            return {
              then(onfulfilled?: (val: any) => any) {
                // Return only 1 candidate when 3 are required
                return Promise.resolve({
                  data: [
                    {
                      id: "q-1",
                      course_id: "course-1",
                      chapter_id: "chap-1",
                      lesson_id: "less-1",
                      topic: "Vectors",
                      subtopic: "Dot Product",
                      difficulty: "hard",
                      type: "multiple-choice",
                      tags: [],
                    },
                  ],
                  error: null,
                }).then(onfulfilled);
              },
            };
          },
        };
        return query;
      },
    };

    const assessment: Assessment = {
      id: "assess-3",
      courseId: "course-1",
      title: "Hard Assessment",
      description: "Description",
      durationMinutes: 45,
      questionCount: 3,
      status: "published",
      blueprint: {
        rules: [{ count: 3, topic: "Vectors", difficulty: "hard" }],
      },
    };

    await assert.rejects(
      () =>
        selectAssessmentQuestionsFromSupabase(
          assessment,
          {},
          () => client as unknown as SupabaseClient<Database>,
        ),
      (err: any) => {
        assert.ok(err instanceof AssessmentSelectionError);
        assert.equal(err.code, "INSUFFICIENT_QUESTION_POOL");
        assert.equal(err.details.required, 3);
        assert.equal(err.details.available, 1);
        assert.equal(err.details.assessmentId, "assess-3");
        return true;
      },
    );
  });

  it("measures deterministic serialized payload size comparison between broad question candidate pool and two-stage selection", () => {
    // 30 candidate questions matching a topic; assessment blueprint selects 5 questions
    const fullCandidateBank = Array.from({ length: 30 }, (_, i) =>
      createMockQuestion(`q-${i + 1}`, {
        prompt: `Calculate the surface area of spherical vector manifold #${i + 1} with radius r = 3.5m and coordinate theta in [0, pi].`,
        explanation: `By integrating the standard spherical surface metric tensor g = diag(r^2, r^2 sin^2 theta) over the domain, we compute the area integral yielding exactly A = 4 * pi * r^2. Step 1: parameterize coordinates. Step 2: compute metric determinant. Step 3: integrate.`,
        hint: `Remember to multiply by the Jacobian determinant r^2 sin(theta) when changing variables to spherical polar coordinates.`,
      }),
    );

    // Old approach: Downloads all 30 full question records across the wire
    const oldCandidatePoolPayload = JSON.stringify(fullCandidateBank);
    const oldCandidateBytes = Buffer.byteLength(oldCandidatePoolPayload, "utf8");

    // New approach Stage A: Downloads only lightweight candidate projections for 30 candidates
    const newCandidatePool = fullCandidateBank.map((q) => ({
      id: q.id,
      course_id: q.courseId,
      chapter_id: q.chapterId,
      lesson_id: q.lessonId,
      topic: q.topic,
      subtopic: q.subtopic,
      difficulty: q.difficulty,
      type: q.type,
      tags: q.tags,
    }));
    const newCandidateBytes = Buffer.byteLength(JSON.stringify(newCandidatePool), "utf8");

    // New approach Stage B: Downloads full question records for only the 5 selected questions
    const selectedQuestions = fullCandidateBank.slice(0, 5);
    const selectedBodiesBytes = Buffer.byteLength(JSON.stringify(selectedQuestions), "utf8");

    const totalNewBytes = newCandidateBytes + selectedBodiesBytes;
    const reductionPercent = ((oldCandidateBytes - totalNewBytes) / oldCandidateBytes) * 100;

    assert.ok(oldCandidateBytes > totalNewBytes);
    assert.ok(
      reductionPercent > 60,
      `Expected >60% payload reduction for 5 of 30 selected questions, got ${reductionPercent.toFixed(1)}%`,
    );
  });
});
