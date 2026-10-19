import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublishedDay, getPublishedDayMetadata, getPublishedDayStep } from "../lib/content/publishedDay";
import { callPublishedDayStepRpc } from "../lib/supabase/publishedDayStepRpc";
import type { Database } from "../lib/supabase/types";
import { isAuthorizedLessonAdmin } from "../lib/lessonUnlock";

describe("Lesson-step flow & egress optimization", () => {
  describe("getPublishedDay (anonymous free lesson path)", () => {
    it("returns full lesson content for valid published lesson without calling step RPC", async () => {
      const mockClient = {
        from(table: string) {
          const createQuery = () => ({
            select() {
              return createQuery();
            },
            eq() {
              return createQuery();
            },
            order() {
              return Promise.resolve({
                data: table === "courses"
                  ? [{ id: "c1", title: "Course 1", status: "published" }]
                  : table === "weeks"
                  ? [{ id: "w1", course_id: "c1", week_number: 1, title: "Week 1", status: "published" }]
                  : [],
                error: null,
              });
            },
            maybeSingle() {
              return Promise.resolve({
                data: table === "courses"
                  ? { id: "c1", title: "Course 1", status: "published" }
                  : {
                      id: "d1",
                      course_id: "c1",
                      week_id: "w1",
                      chapter_id: "ch1",
                      title: "Day 1",
                      description: "Desc",
                      order_index: 1,
                      estimated_minutes: 20,
                      objectives: [],
                      content_blocks: [
                        { id: "b1", type: "heading", step: 1, text: "Intro", level: 1 },
                        { id: "b2", type: "text", step: 2, body: "Step 2 content" },
                      ],
                      status: "published",
                    },
                error: null,
              });
            },
          });
          return createQuery();
        },
      } as unknown as SupabaseClient<Database>;

      const result = await getPublishedDay("c1", "w1", "d1", () => mockClient);
      assert.equal(result.kind, "success");
      if (result.kind === "success") {
        assert.equal(result.lesson.id, "d1");
        assert.equal(result.lesson.blocks.length, 2);
      }
    });

    it("returns not-found if weekReference is undefined", async () => {
      const result = await getPublishedDay("c1", undefined, "d1");
      assert.equal(result.kind, "not-found");
    });
  });

  describe("getPublishedDayMetadata (authenticated egress optimization)", () => {
    it("fetches metadata only without loading content blocks", async () => {
      const selectedColumns: Record<string, string> = {};

      const mockClient = {
        from(table: string) {
          const createQuery = (currentTable: string) => ({
            select(columns: string) {
              selectedColumns[currentTable] = columns;
              return createQuery(currentTable);
            },
            eq() {
              return createQuery(currentTable);
            },
            order() {
              return Promise.resolve({
                data: [{ id: "w1", week_number: 1, status: "published" }],
                error: null,
              });
            },
            maybeSingle() {
              if (currentTable === "courses") {
                return Promise.resolve({ data: { id: "c1", status: "published" }, error: null });
              }
              return Promise.resolve({
                data: {
                  id: "d1",
                  course_id: "c1",
                  week_id: "w1",
                  chapter_id: "ch1",
                  title: "Day 1",
                  description: "Desc",
                  order_index: 1,
                  estimated_minutes: 20,
                  objectives: ["Obj 1"],
                  status: "published",
                },
                error: null,
              });
            },
          });
          return createQuery(table);
        },
      } as unknown as SupabaseClient<Database>;

      const result = await getPublishedDayMetadata("c1", "w1", "d1", () => mockClient);
      assert.equal(result.kind, "success");
      if (result.kind === "success") {
        assert.equal(result.lesson.id, "d1");
        assert.deepEqual(result.lesson.blocks, []);
        assert.deepEqual(result.lesson.objectives, ["Obj 1"]);
      }
      assert.ok(selectedColumns.days);
      assert.ok(!selectedColumns.days.includes("content_blocks"), "Metadata query must not request content_blocks column");
    });

    it("returns not-found when published hierarchy check fails", async () => {
      const mockClient = {
        from(table: string) {
          const createQuery = (currentTable: string) => ({
            select() {
              return createQuery(currentTable);
            },
            eq() {
              return createQuery(currentTable);
            },
            order() {
              return Promise.resolve({
                data: [{ id: "w1", week_number: 1, status: "published" }],
                error: null,
              });
            },
            maybeSingle() {
              if (currentTable === "courses") {
                return Promise.resolve({ data: { id: "c1", status: "published" }, error: null });
              }
              return Promise.resolve({
                data: {
                  id: "d1",
                  course_id: "c1",
                  week_id: "w1",
                  status: "draft", // not published
                },
                error: null,
              });
            },
          });
          return createQuery(table);
        },
      } as unknown as SupabaseClient<Database>;

      const result = await getPublishedDayMetadata("c1", "w1", "d1", () => mockClient);
      assert.equal(result.kind, "not-found");
    });
  });

  describe("getPublishedDayStep & typed RPC adapter", () => {
    it("calls get_published_day_step RPC and parses steps metadata and initial step content", async () => {
      let rpcName = "";
      let rpcArgs: unknown;

      const mockClient = {
        rpc(name: string, args: unknown) {
          rpcName = name;
          rpcArgs = args;
          return Promise.resolve({
            data: [
              {
                id: "d1",
                course_id: "c1",
                week_id: "w1",
                chapter_id: "ch1",
                title: "Day 1",
                description: "Desc",
                order_index: 1,
                estimated_minutes: 20,
                objectives: [],
                status: "published",
                testing_mode: false,
                step_metadata: [
                  { step: 1, title: "Introduction" },
                  { step: 2, title: "Deep Dive" },
                ],
                content_blocks: [
                  { id: "b1", type: "heading", step: 1, text: "Introduction", level: 1 },
                ],
              },
            ],
            error: null,
          });
        },
      } as unknown as SupabaseClient<Database>;

      const result = await getPublishedDayStep("c1", "w1", "d1", null, () => mockClient);
      assert.equal(rpcName, "get_published_day_step");
      assert.deepEqual(rpcArgs, {
        p_course_id: "c1",
        p_week_reference: "w1",
        p_day_id: "d1",
        p_step: null,
      });

      assert.equal(result.kind, "success");
      if (result.kind === "success") {
        assert.equal(result.steps.length, 2);
        assert.equal(result.steps[0].title, "Introduction");
        assert.equal(result.lesson.blocks.length, 1);
        assert.equal(result.testingMode, false);
      }
    });

    it("passes specific step number when fetching on-demand steps", async () => {
      let rpcArgs: unknown;
      const mockClient = {
        rpc(_name: string, args: unknown) {
          rpcArgs = args;
          return Promise.resolve({
            data: [
              {
                id: "d1",
                course_id: "c1",
                week_id: "w1",
                chapter_id: "ch1",
                title: "Day 1",
                description: "Desc",
                order_index: 1,
                estimated_minutes: 20,
                objectives: [],
                status: "published",
                testing_mode: true,
                step_metadata: [],
                content_blocks: [
                  { id: "b2", type: "text", step: 2, body: "Step 2 details" },
                ],
              },
            ],
            error: null,
          });
        },
      } as unknown as SupabaseClient<Database>;

      const result = await getPublishedDayStep("c1", "w1", "d1", 2, () => mockClient);
      assert.deepEqual(rpcArgs, {
        p_course_id: "c1",
        p_week_reference: "w1",
        p_day_id: "d1",
        p_step: 2,
      });
      assert.equal(result.kind, "success");
      if (result.kind === "success") {
        assert.equal(result.testingMode, true);
        assert.equal(result.lesson.blocks.length, 1);
        assert.equal(result.lesson.blocks[0].id, "b2");
      }
    });

    it("returns not-found if RPC returns empty (e.g. locked lesson or unauthorized)", async () => {
      const mockClient = {
        rpc() {
          return Promise.resolve({ data: [], error: null });
        },
      } as unknown as SupabaseClient<Database>;

      const result = await getPublishedDayStep("c1", "w1", "d1", null, () => mockClient);
      assert.equal(result.kind, "not-found");
    });
  });

  describe("Typed RPC adapter function directly", () => {
    it("calls client.rpc with correct name and parameters", async () => {
      let called = false;
      const mockClient = {
        rpc(name: string, args: unknown) {
          called = true;
          assert.equal(name, "get_published_day_step");
          assert.deepEqual(args, {
            p_course_id: "math",
            p_week_reference: "w1",
            p_day_id: "d1",
            p_step: 1,
          });
          return Promise.resolve({ data: null, error: null });
        },
      } as unknown as SupabaseClient<Database>;

      await callPublishedDayStepRpc(mockClient, {
        p_course_id: "math",
        p_week_reference: "w1",
        p_day_id: "d1",
        p_step: 1,
      });
      assert.equal(called, true);
    });
  });

  describe("Preview and admin authorization security checks", () => {
    it("rejects preview when userId is null", async () => {
      const authorized = await isAuthorizedLessonAdmin(null);
      assert.equal(authorized, false);
    });

    it("rejects preview when admin session check fails with unauthorized error", async () => {
      const { AdminUnauthorizedError } = await import("../lib/adminSession");
      const authorized = await isAuthorizedLessonAdmin("user-123", {
        requireAdminFn: () => Promise.reject(new AdminUnauthorizedError()),
      });
      assert.equal(authorized, false);
    });

    it("rejects preview when user is authenticated admin but not in allowlist", async () => {
      const authorized = await isAuthorizedLessonAdmin("user-123", {
        requireAdminFn: () => Promise.resolve({ subject: "admin", expiresAt: 9999999999 }),
        isAllowlistedFn: () => Promise.resolve(false),
      });
      assert.equal(authorized, false);
    });

    it("authorizes preview when admin session is valid and user is allowlisted", async () => {
      const authorized = await isAuthorizedLessonAdmin("user-123", {
        requireAdminFn: () => Promise.resolve({ subject: "admin", expiresAt: 9999999999 }),
        isAllowlistedFn: () => Promise.resolve(true),
      });
      assert.equal(authorized, true);
    });
  });
});
