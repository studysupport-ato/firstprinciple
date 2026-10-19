import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createCourseStructureSupabaseRepository } from "../lib/content/repository";
import type { Database } from "../lib/supabase/types";

type QueryResult = { data: unknown[]; error: null };
type QueryTrace = { columns?: string; filters: Array<[string, string]>; orders: string[]; update?: unknown };

function createRepositoryFixture(rows: unknown[]) {
  const traces: QueryTrace[] = [];
  const client = {
    from(table: string) {
      assert.equal(table, "days");
      const trace: QueryTrace = { filters: [], orders: [] };
      traces.push(trace);
      const query = {
        select(columns: string) {
          trace.columns = columns;
          return query;
        },
        eq(column: string, value: string) {
          trace.filters.push([column, value]);
          return query;
        },
        order(column: string) {
          trace.orders.push(column);
          return query;
        },
        update(values: unknown) {
          trace.update = values;
          return query;
        },
        then<TResult1 = QueryResult, TResult2 = never>(
          onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          return Promise.resolve({ data: rows, error: null }).then(onfulfilled, onrejected);
        },
      };
      return query;
    },
  };
  const repository = createCourseStructureSupabaseRepository(
    () => client as unknown as SupabaseClient<Database>,
  );
  return { repository, traces };
}

const structureColumns =
  "id,course_id,week_id,chapter_id,title,description,order_index,estimated_minutes,status,coming_soon";
const row = {
  id: "lesson-1",
  course_id: "course-1",
  week_id: "week-1",
  chapter_id: "chapter-1",
  title: "Lesson",
  description: "Lesson description",
  order_index: 2,
  estimated_minutes: 30,
  status: "published",
  coming_soon: false,
};

describe("day structure projections", () => {
  it("loads a week's lesson list without objectives or content blocks", async () => {
    const { repository, traces } = createRepositoryFixture([row]);

    const days = await repository.listDaysForWeek("course-1", "week-1");

    assert.equal(traces[0].columns, structureColumns);
    assert.deepEqual(traces[0].filters, [["course_id", "course-1"], ["week_id", "week-1"]]);
    assert.deepEqual(traces[0].orders, ["order_index"]);
    assert.equal(days[0].id, "lesson-1");
    assert.deepEqual(days[0].objectives, []);
    assert.deepEqual(days[0].blocks, []);
  });

  it("loads the admin lesson directory metadata without full lesson content", async () => {
    const { repository, traces } = createRepositoryFixture([row]);

    const days = await repository.listAllDays();

    assert.equal(traces[0].columns, structureColumns);
    assert.deepEqual(traces[0].orders, ["course_id", "week_id", "order_index"]);
    assert.deepEqual(days[0].blocks, []);
    assert.deepEqual(days[0].objectives, []);
  });

  it("reorders using only IDs and positions without refetching full lessons", async () => {
    const { repository, traces } = createRepositoryFixture([{ ...row, order_index: 1 }]);

    await repository.reorderDays("course-1", "week-1", ["lesson-1"]);

    assert.equal(traces[0].columns, "id,order_index");
    assert.deepEqual(traces.slice(1).map((trace) => trace.update), [
      { order_index: -1 },
      { order_index: 1 },
    ]);
    assert.equal(traces.length, 3);
  });

  it("loads course days using DAY_STRUCTURE_COLUMNS without content_blocks or objectives", async () => {
    const { repository, traces } = createRepositoryFixture([
      { ...row, id: "lesson-1", order_index: 1 },
      { ...row, id: "lesson-2", order_index: 2 },
    ]);

    const days = await repository.listDaysForCourse("course-1");

    assert.equal(traces.length, 1);
    assert.equal(traces[0].columns, structureColumns);
    assert.deepEqual(traces[0].filters, [["course_id", "course-1"]]);
    assert.deepEqual(traces[0].orders, ["week_id", "order_index"]);
    assert.equal(days.length, 2);
    assert.equal(days[0].id, "lesson-1");
    assert.equal(days[0].order, 1);
    assert.equal(days[0].title, "Lesson");
    assert.equal(days[0].chapterId, "chapter-1");
    assert.equal(days[0].weekId, "week-1");
    assert.deepEqual(days[0].blocks, []);
    assert.deepEqual(days[0].objectives, []);
    assert.equal(days[1].id, "lesson-2");
    assert.equal(days[1].order, 2);
    assert.deepEqual(days[1].blocks, []);
    assert.deepEqual(days[1].objectives, []);
  });

  it("propagates Supabase query errors from listDaysForCourse", async () => {
    const client = {
      from(table: string) {
        assert.equal(table, "days");
        const query = {
          select() { return query; },
          eq() { return query; },
          order() { return query; },
          then<TResult1 = QueryResult, TResult2 = never>(
            _onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
            onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
          ) {
            return Promise.reject(new Error("Supabase query error: connection terminated")).then(undefined, onrejected);
          },
        };
        return query;
      },
    };
    const repository = createCourseStructureSupabaseRepository(
      () => client as unknown as SupabaseClient<Database>,
    );

    await assert.rejects(
      () => repository.listDaysForCourse("course-1"),
      /Supabase query error: connection terminated/,
    );
  });

  it("measures deterministic serialized payload size comparison between broad select(*) and metadata projection", () => {
    // Representative fixture with 5 lessons each containing interactive visualizer blocks and rich HTML
    const largeVisualizerHtml = `<div class="board-container"><script>const complexSimulationState = ${JSON.stringify(new Array(100).fill({ x: 12.5, y: 44.2, label: "Vector Node State", active: true }))};</script></div>`;
    
    const representativeDaysWithContent = Array.from({ length: 5 }, (_, i) => ({
      ...row,
      id: `lesson-${i + 1}`,
      order_index: i + 1,
      objectives: ["Understand vector basis", "Compute cross product", "Apply right-hand rule"],
      content_blocks: [
        { id: `b-${i}-1`, type: "markdown", step: 1, content: "## Lesson Introduction\nIn this lesson we study..." },
        { id: `b-${i}-2`, type: "visualizer", step: 1, source: largeVisualizerHtml },
        { id: `b-${i}-3`, type: "markdown", step: 2, content: "## Deep Dive\nNext we compute the determinants..." },
        { id: `b-${i}-4`, type: "visualizer", step: 2, source: largeVisualizerHtml },
      ],
    }));

    const broadPayload = JSON.stringify(representativeDaysWithContent);
    const broadBytes = Buffer.byteLength(broadPayload, "utf8");

    // The optimized projection returns only structure fields with empty blocks/objectives
    const structureProjectedDays = representativeDaysWithContent.map((d) => ({
      id: d.id,
      course_id: d.course_id,
      week_id: d.week_id,
      chapter_id: d.chapter_id,
      title: d.title,
      description: d.description,
      order_index: d.order_index,
      estimated_minutes: d.estimated_minutes,
      status: d.status,
      coming_soon: d.coming_soon,
    }));

    const optimizedPayload = JSON.stringify(structureProjectedDays);
    const optimizedBytes = Buffer.byteLength(optimizedPayload, "utf8");

    const reductionPercent = ((broadBytes - optimizedBytes) / broadBytes) * 100;

    assert.ok(broadBytes > optimizedBytes);
    assert.ok(reductionPercent > 80, `Expected >80% reduction on fixture with visualizers, got ${reductionPercent.toFixed(1)}%`);
  });
});

