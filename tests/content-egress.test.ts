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
});
