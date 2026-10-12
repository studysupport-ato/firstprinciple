/**
 * Task 40H.2 — transfer an existing Day between Weeks (verification).
 *
 * Proves, against the LIVE Supabase-backed app over the real Server Action
 * wire protocol (Next-Action), that:
 *   A. a Day moves to another Week of the same Course: same Day id and
 *      content, both Weeks renumbered densely, dependent rows (progress,
 *      placement, question) still reference the same Day id, and the student
 *      published Course -> Week -> Day roadmap reflects the new location;
 *   B. cross-course / invalid moves are DENIED with NO database mutation
 *      (plus: unauthenticated invocation of moveDayAction is DENIED);
 *   C. moving the Day back restores the exact pre-test database state and all
 *      tmp40h2-* fixtures are deleted (no test rows left behind).
 *
 * Self-cleaning: only tmp40h2-* rows are ever created; they are removed in C
 * and swept on any exit path. Credentials are never printed.
 *
 * Prerequisite: migration 20261004000000_task40h2_progress_fk_on_update_cascade
 * must be applied to the live database (student_day_progress FK ON UPDATE
 * CASCADE) — without it the transfer of a progress-bearing Day fails with FK
 * 23503 and this script reports that explicitly.
 *
 * Usage (from app/firstprinciples-app):
 *   npm run build && npm run start    # shell 1 — must serve the new build
 *   npm run verify:day-transfer       # shell 2
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_SESSION_COOKIE } from "../lib/adminSession";
import { getPublishedRoadmap } from "../lib/content/publishedStructure";

const BASE_URL = (process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const UNAUTHORIZED_PREFIX = "Unauthorized.";

const COURSE = "math-151";
const SRC_WEEK = "math151-week-4";
const DST_WEEK = "math151-week-5";
const DAY_A = "tmp40h2-day-a";
const DAY_B = "tmp40h2-day-b";
const DAY_X = "tmp40h2-day-x";
const DAY_Y = "tmp40h2-day-y";
const TMP_COURSE = "tmp40h2-course-b";
const TMP_WEEK = "tmp40h2-week-b";
const TMP_RESOURCE = "tmp40h2-res";
const TMP_PLACEMENT = "tmp40h2-plc";
const TMP_QUESTION = "tmp40h2-q";

const B_CONTENT = {
  title: "TMP 40H.2 Lesson B",
  description: "TMP 40H.2 baseline description - must remain identical after transfer.",
  objectives: ["tmp40h2-objective-1"],
  content_blocks: [{ id: "tmp40h2-block-1", type: "text", text: "TMP block body" }],
  estimated_minutes: 42,
};

let failures = 0;
function check(label: string, pass: boolean, detail = "") {
  if (!pass) failures += 1;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${!pass && detail ? ` - ${detail}` : ""}`);
}
function note(label: string, detail = "") {
  console.log(`  NOTE  ${label}${detail ? ` - ${detail}` : ""}`);
}

// ---------------------------------------------------------------------------
// Server Action wire protocol (same approach as verify:admin-session-boundary)
// ---------------------------------------------------------------------------

interface ActionMeta {
  id: string;
  workers: string[];
}

interface Invocation {
  status: number;
  ok?: boolean;
  data?: unknown;
  error?: string;
  thrown?: boolean;
  setCookie: string | null;
  raw: string;
}

function loadActions(): Map<string, ActionMeta> {
  const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8"));
  const map = new Map<string, ActionMeta>();
  for (const [id, entry] of Object.entries(manifest.node ?? {}) as Array<[string, any]>) {
    if (entry?.filename === "lib/adminContentActions.ts" && entry.exportedName) {
      map.set(entry.exportedName, { id, workers: Object.keys(entry.workers ?? {}) });
    }
  }
  return map;
}

function routeForWorker(worker: string): string {
  const page = worker.replace(/\\/g, "/").replace(/^app/, "").replace(/\/page$/, "");
  const route = page.replace(/\[[^\]]+\]/g, "placeholder");
  return route.startsWith("/") ? route : `/${route}`;
}

async function invoke(
  actions: Map<string, ActionMeta>,
  name: string,
  args: unknown[],
  opts: { cookie?: string } = {},
): Promise<Invocation> {
  const meta = actions.get(name);
  if (!meta) {
    throw new Error(`Action "${name}" is not in the build manifest - run \`npm run build\` first.`);
  }
  const worker = meta.workers.find((w) => !w.includes("[")) ?? meta.workers[0];
  if (!worker) throw new Error(`No worker page registered for ${name}`);
  const headers: Record<string, string> = {
    "Next-Action": meta.id,
    "Content-Type": "text/plain;charset=UTF-8",
  };
  if (opts.cookie !== undefined) headers["Cookie"] = opts.cookie;
  const res = await fetch(`${BASE_URL}${routeForWorker(worker)}`, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
  });
  const raw = await res.text();
  let payload: any;
  for (const row of raw.split(/\r?\n/)) {
    if (row.startsWith("1:E")) {
      payload = { thrown: true, error: "The action threw before returning a value." };
      break;
    }
    if (row.startsWith("1:")) {
      try {
        payload = JSON.parse(row.slice(2));
      } catch {
        payload = undefined;
      }
      break;
    }
  }
  return {
    status: res.status,
    ok: payload?.ok,
    data: payload?.data,
    error: payload?.error,
    thrown: payload?.thrown === true,
    setCookie: res.headers.get("set-cookie"),
    raw,
  };
}

function isDenied(r: Invocation): boolean {
  return r.ok === false && typeof r.error === "string" && r.error.startsWith(UNAUTHORIZED_PREFIX);
}

function sessionCookieValue(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]*)`));
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Service-role helpers (fixtures, snapshots, assertions)
// ---------------------------------------------------------------------------

function svc(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Row = Record<string, any>;

async function must<T>(result: PromiseLike<{ data: T | null; error: any }>, what: string): Promise<T> {
  const resolved = await result;
  if (resolved.error) throw new Error(`${what}: ${resolved.error.message}`);
  return resolved.data as T;
}

async function dumpDays(c: SupabaseClient): Promise<Row[]> {
  return must(c.from("days").select("*").order("id", { ascending: true }), "dump days");
}
async function dumpWeeks(c: SupabaseClient): Promise<Row[]> {
  return must(c.from("weeks").select("*").order("id", { ascending: true }), "dump weeks");
}
async function dumpCourses(c: SupabaseClient): Promise<Row[]> {
  return must(c.from("courses").select("*").order("id", { ascending: true }), "dump courses");
}
async function dumpProgress(c: SupabaseClient): Promise<Row[]> {
  return must(c.from("student_day_progress").select("*").order("student_id", { ascending: true }).order("day_id", { ascending: true }), "dump progress");
}
async function dumpPlacements(c: SupabaseClient): Promise<Row[]> {
  return must(c.from("resource_placements").select("*").order("id", { ascending: true }), "dump placements");
}
async function dumpQuestionIds(c: SupabaseClient): Promise<string[]> {
  const rows = await must(c.from("questions").select("id").order("id", { ascending: true }), "dump question ids");
  return rows.map((row: Row) => row.id as string);
}

const stripVolatile = (rows: Row[]): Row[] => rows.map(({ updated_at, ...rest }) => rest);
const stable = (value: unknown) =>
  JSON.stringify(value, (_key, entry: unknown) =>
    entry && typeof entry === "object" && !Array.isArray(entry)
      ? Object.fromEntries(Object.entries(entry).sort(([left], [right]) => left.localeCompare(right)))
      : entry,
  );

async function weekRows(c: SupabaseClient, weekId: string): Promise<Row[]> {
  return must(
    c.from("days").select("id, order_index, week_id").eq("week_id", weekId).order("order_index", { ascending: true }),
    `read week ${weekId}`,
  );
}

async function assertSequential(label: string, c: SupabaseClient, weekId: string) {
  const rows = await weekRows(c, weekId);
  const orders = rows.map((row) => row.order_index as number);
  const dense = orders.every((order, index) => order === index + 1);
  check(`${label}: dense sequential ordering 1..N`, dense, JSON.stringify(rows.map((r) => `${r.id}=${r.order_index}`)));
}

async function assertNoDuplicateOrders(c: SupabaseClient) {
  const rows = await must(c.from("days").select("week_id, order_index").order("week_id"), "read all orders");
  const seen = new Map<string, number>();
  let duplicates = 0;
  let negative = 0;
  for (const row of rows as Row[]) {
    const key = `${row.week_id}::${row.order_index}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
    if ((row.order_index as number) < 1) negative += 1;
  }
  for (const count of seen.values()) if (count > 1) duplicates += 1;
  check("no duplicate (week_id, order_index) anywhere in days", duplicates === 0, `${duplicates} duplicated positions`);
  check("no negative order_index remains", negative === 0, `${negative} negative rows`);
}

async function roadmapDays(weekId: string): Promise<{ ids: string[]; via: string }> {
  const anonFactory = () => createClient(SUPABASE_URL, PUBLISHABLE, { auth: { persistSession: false, autoRefreshToken: false } });
  let result = await getPublishedRoadmap(COURSE, anonFactory);
  let via = "anon RLS";
  if (result.kind !== "success") {
    result = await getPublishedRoadmap(COURSE);
    via = "service-role fallback (anon read not available)";
  }
  if (result.kind !== "success") return { ids: [], via: `unavailable (${via})` };
  return { ids: (result.value.daysByWeek[weekId] ?? []).map((day) => day.id), via };
}

// ---------------------------------------------------------------------------
// Fixture lifecycle (tmp40h2-* only; swept on every exit path)
// ---------------------------------------------------------------------------

async function sweep(c: SupabaseClient) {
  // Order matters: dependents before days, days before weeks, weeks before course.
  const steps: Array<[string, any]> = [
    ["progress", () => c.from("student_day_progress").delete().like("day_id", "tmp40h2-%")],
    ["placements", () => c.from("resource_placements").delete().like("id", "tmp40h2-%")],
    ["questions", () => c.from("questions").delete().like("id", "tmp40h2-%")],
    ["days", () => c.from("days").delete().like("id", "tmp40h2-%")],
    ["resources", () => c.from("learning_resources").delete().like("id", "tmp40h2-%")],
    ["weeks", () => c.from("weeks").delete().like("id", "tmp40h2-%")],
    ["courses", () => c.from("courses").delete().like("id", "tmp40h2-%")],
  ];
  for (const [what, run] of steps) {
    const { error } = await run();
    if (error) note(`sweep ${what} (ignored)`, error.message);
  }
}

async function createFixtures(c: SupabaseClient) {
  const srcRows = await weekRows(c, SRC_WEEK);
  const dstRows = await weekRows(c, DST_WEEK);
  const srcMax = srcRows.length ? (srcRows[srcRows.length - 1].order_index as number) : 0;
  const dstMax = dstRows.length ? (dstRows[dstRows.length - 1].order_index as number) : 0;

  const srcWeekBefore = stable(stripVolatile(await dumpDays(c)));

  await must(
    c.from("days").insert([
      { id: DAY_A, course_id: COURSE, week_id: SRC_WEEK, title: "TMP 40H.2 Lesson A", description: "temp A", order_index: srcMax + 1, status: "published", objectives: [], content_blocks: [], estimated_minutes: 10 },
      { id: DAY_B, course_id: COURSE, week_id: SRC_WEEK, title: B_CONTENT.title, description: B_CONTENT.description, order_index: srcMax + 2, status: "published", objectives: B_CONTENT.objectives, content_blocks: B_CONTENT.content_blocks, estimated_minutes: B_CONTENT.estimated_minutes },
      { id: DAY_X, course_id: COURSE, week_id: DST_WEEK, title: "TMP 40H.2 Lesson X", description: "temp X", order_index: dstMax + 1, status: "published", objectives: [], content_blocks: [], estimated_minutes: 10 },
      { id: DAY_Y, course_id: COURSE, week_id: DST_WEEK, title: "TMP 40H.2 Lesson Y", description: "temp Y", order_index: dstMax + 2, status: "published", objectives: [], content_blocks: [], estimated_minutes: 10 },
    ]).select(),
    "insert temp days",
  );

  const students = await must(c.from("students").select("id").limit(1), "pick student");
  if (!students.length) throw new Error("No students row exists for the progress-dependency fixture.");
  await must(
    c.from("student_day_progress").insert({ student_id: students[0].id, day_id: DAY_B, course_id: COURSE, week_id: SRC_WEEK, status: "in_progress", time_spent_seconds: 42 }).select(),
    "insert temp progress",
  );

  await must(
    c.from("learning_resources").insert({ id: TMP_RESOURCE, type: "external", title: "TMP 40H.2 Resource", description: "temp fixture", data: { url: "https://example.com/tmp40h2" }, status: "draft" }).select(),
    "insert temp resource",
  );
  await must(
    c.from("resource_placements").insert({ id: TMP_PLACEMENT, resource_id: TMP_RESOURCE, day_id: DAY_B, order_index: 0 }).select(),
    "insert temp placement",
  );

  await must(
    c.from("questions").insert({
      id: TMP_QUESTION, course_id: COURSE, lesson_id: DAY_B,
      topic: "TMP40H2", subtopic: "TMP40H2", type: "multiple-choice", difficulty: "easy",
      prompt: "TMP 40H.2 question?", options: [{ id: "a", text: "A" }], correct_answer: "a",
      explanation: "temp fixture", marks: 1, status: "draft",
    }).select(),
    "insert temp question",
  );

  await must(
    c.from("courses").insert({ id: TMP_COURSE, code: "TMP40H2B", title: "TMP 40H.2 Course B", short_title: "TMP40H2B", description: "temp cross-course fixture", status: "draft" }).select(),
    "insert temp course",
  );
  await must(
    c.from("weeks").insert({ id: TMP_WEEK, course_id: TMP_COURSE, title: "TMP 40H.2 Week", description: "temp cross-course fixture", week_number: 1, status: "draft" }).select(),
    "insert temp week",
  );

  return { srcWeekBefore };
}

async function deleteFixtures(c: SupabaseClient) {
  await must(c.from("student_day_progress").delete().eq("day_id", DAY_B), "delete temp progress");
  await must(c.from("resource_placements").delete().eq("id", TMP_PLACEMENT), "delete temp placement");
  await must(c.from("questions").delete().eq("id", TMP_QUESTION), "delete temp question");
  await must(c.from("days").delete().in("id", [DAY_A, DAY_B, DAY_X, DAY_Y]), "delete temp days");
  await must(c.from("learning_resources").delete().eq("id", TMP_RESOURCE), "delete temp resource");
  await must(c.from("weeks").delete().eq("id", TMP_WEEK), "delete temp week");
  await must(c.from("courses").delete().eq("id", TMP_COURSE), "delete temp course");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const c = svc();
  console.log(`\n40H.2 day-transfer verification against ${BASE_URL}`);
  await sweep(c); // remove leftovers from any aborted earlier run

  const actions = loadActions();
  if (!actions.has("moveDayAction")) {
    throw new Error("moveDayAction is not in the build manifest - run `npm run build` first.");
  }
  check("moveDayAction present in the build manifest (fresh build)", true);

  // ---- Baseline BEFORE fixtures ----
  const baselineDaysRaw = await dumpDays(c);
  const baseline = {
    courses: stable(await dumpCourses(c)),
    weeks: stable(await dumpWeeks(c)),
    days: stable(stripVolatile(baselineDaysRaw)),
    progress: stable(await dumpProgress(c)),
    placements: stable(await dumpPlacements(c)),
    questionIds: await dumpQuestionIds(c),
  };
  const preSrc = await weekRows(c, SRC_WEEK);
  const preDst = await weekRows(c, DST_WEEK);
  check(
    "precondition: source Week ordering is dense before the test",
    preSrc.every((row, index) => row.order_index === index + 1),
    JSON.stringify(preSrc.map((r) => r.order_index)),
  );
  check(
    "precondition: destination Week ordering is dense before the test",
    preDst.every((row, index) => row.order_index === index + 1),
    JSON.stringify(preDst.map((r) => r.order_index)),
  );

  // ---- Admin session over the wire ----
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("ADMIN_EMAIL / ADMIN_PASSWORD missing from .env.local");
  const login = await invoke(actions, "adminLoginAction", [ADMIN_EMAIL, ADMIN_PASSWORD]);
  check("admin login over the wire", login.ok === true, login.error ?? "");
  if (login.ok !== true) throw new Error("cannot continue without an admin session");
  const cookie = `${ADMIN_SESSION_COOKIE}=${sessionCookieValue(login.setCookie)}`;

  await createFixtures(c);

  // ---- U: authorization gate ----
  console.log("\nU. Authorization (existing requireAdmin path)");
  const beforeUnauth = stable(stripVolatile(await dumpDays(c)));
  const unauth = await invoke(actions, "moveDayAction", [COURSE, DAY_B, DST_WEEK]);
  check("unauthenticated moveDayAction -> DENIED", isDenied(unauth), `ok=${unauth.ok} error=${unauth.error}`);
  check("denied unauthenticated call mutated nothing", stable(stripVolatile(await dumpDays(c))) === beforeUnauth);

  // ---- Test A: transfer ----
  console.log("\nA. Transfer Temp B from Week 4 to Week 5 (same Course, via moveDayAction)");
  const bBefore = (await must(c.from("days").select("*").eq("id", DAY_B).single(), "read Temp B before move")) as Row;
  const moveA = await invoke(actions, "moveDayAction", [COURSE, DAY_B, DST_WEEK], { cookie });
  if (moveA.ok !== true && String(moveA.error).includes("23503")) {
    check("transfer succeeded", false, "FK student_day_progress_day_fkey is still ON UPDATE NO ACTION - apply migration 20261004000000_task40h2 SQL first");
    throw new Error("transfer rejected by student_day_progress_day_fkey - the 40H.2 migration is not applied to the live database yet");
  }
  check("moveDayAction transfer -> ok", moveA.ok === true, String(moveA.error));

  const bAfter = (await must(c.from("days").select("*").eq("id", DAY_B).single(), "read Temp B after move")) as Row;
  check("Temp B still exists", Boolean(bAfter));
  check("Temp B id unchanged", bAfter.id === DAY_B, bAfter.id);
  check("Temp B week_id is the destination Week", bAfter.week_id === DST_WEEK, bAfter.week_id);
  check("Temp B course_id unchanged", bAfter.course_id === COURSE, bAfter.course_id);
  check(
    "Temp B content unchanged (title/description/objectives/blocks/status/minutes/created_at)",
    bAfter.title === bBefore.title &&
      bAfter.description === bBefore.description &&
      stable(bAfter.objectives) === stable(bBefore.objectives) &&
      stable(bAfter.content_blocks) === stable(bBefore.content_blocks) &&
      bAfter.status === bBefore.status &&
      bAfter.estimated_minutes === bBefore.estimated_minutes &&
      bAfter.created_at === bBefore.created_at,
  );

  await assertSequential("source Week (post-move)", c, SRC_WEEK);
  await assertSequential("destination Week (post-move)", c, DST_WEEK);
  const srcAfter = await weekRows(c, SRC_WEEK);
  const dstAfter = await weekRows(c, DST_WEEK);
  check("source Week no longer contains Temp B", !srcAfter.some((row) => row.id === DAY_B));
  check("Temp B appended to the END of the destination Week", dstAfter[dstAfter.length - 1]?.id === DAY_B, JSON.stringify(dstAfter.map((r) => `${r.id}=${r.order_index}`)));
  await assertNoDuplicateOrders(c);

  const progress = await must(c.from("student_day_progress").select("*").eq("day_id", DAY_B), "read Temp B progress");
  check("progress row preserved (same student + Day + status + time)", progress.length === 1 && progress[0].day_id === DAY_B && progress[0].status === "in_progress" && progress[0].time_spent_seconds === 42, JSON.stringify(progress));
  check("progress row week_id followed the Day (ON UPDATE CASCADE)", progress[0]?.week_id === DST_WEEK, `week_id=${progress[0]?.week_id}`);
  const placement = await must(c.from("resource_placements").select("*").eq("id", TMP_PLACEMENT), "read placement");
  check("resource placement still references Temp B", placement.length === 1 && placement[0].day_id === DAY_B, JSON.stringify(placement));
  const question = await must(c.from("questions").select("*").eq("id", TMP_QUESTION), "read question");
  check("question still references Temp B (lesson_id unchanged)", question.length === 1 && question[0].lesson_id === DAY_B && question[0].prompt === "TMP 40H.2 question?", JSON.stringify(question));

  const dstRoadmap = await roadmapDays(DST_WEEK);
  check(`student published roadmap shows Temp B in the destination Week (via ${dstRoadmap.via})`, dstRoadmap.ids.includes(DAY_B), JSON.stringify(dstRoadmap.ids));
  check("student published roadmap shows Temp B last in the destination Week", dstRoadmap.ids[dstRoadmap.ids.length - 1] === DAY_B, JSON.stringify(dstRoadmap.ids));
  const srcRoadmap = await roadmapDays(SRC_WEEK);
  check("student published roadmap: source Week no longer contains Temp B", !srcRoadmap.ids.includes(DAY_B), JSON.stringify(srcRoadmap.ids));

  // ---- Test B: rejections ----
  console.log("\nB. Cross-course and invalid transfers must be DENIED with no mutation");
  const digestBefore = stable(stripVolatile(await dumpDays(c)));
  const b1 = await invoke(actions, "moveDayAction", [COURSE, DAY_B, TMP_WEEK], { cookie });
  check("destination Week of ANOTHER Course -> DENIED", b1.ok === false && String(b1.error).includes("Cross-course transfers are not allowed"), String(b1.error));
  const b2 = await invoke(actions, "moveDayAction", [TMP_COURSE, DAY_B, SRC_WEEK], { cookie });
  check("Day does not belong to the supplied Course -> DENIED", b2.ok === false && String(b2.error).includes("does not belong to Course"), String(b2.error));
  const b3 = await invoke(actions, "moveDayAction", [COURSE, DAY_B, DST_WEEK], { cookie });
  check("destination Week identical to current Week -> DENIED", b3.ok === false && String(b3.error).includes("already in Week"), String(b3.error));
  const b4 = await invoke(actions, "moveDayAction", [COURSE, "tmp40h2-no-such-day", SRC_WEEK], { cookie });
  check("unknown Day -> DENIED", b4.ok === false && String(b4.error).includes("was not found"), String(b4.error));
  const b5 = await invoke(actions, "moveDayAction", [COURSE, DAY_B, "tmp40h2-no-such-week"], { cookie });
  check("unknown destination Week -> DENIED", b5.ok === false && String(b5.error).includes("Destination Week"), String(b5.error));
  check("NO database mutation from any denied attempt", stable(stripVolatile(await dumpDays(c))) === digestBefore);
  const dstAfterDenials = await weekRows(c, DST_WEEK);
  check("Temp B still in its Week after every denial", dstAfterDenials.some((row) => row.id === DAY_B));

  // ---- Test C: restore baseline + cleanup ----
  console.log("\nC. Restore: move Temp B back, delete fixtures, compare to baseline");
  const moveC = await invoke(actions, "moveDayAction", [COURSE, DAY_B, SRC_WEEK], { cookie });
  check("reverse transfer via moveDayAction -> ok", moveC.ok === true, String(moveC.error));
  const bRestored = (await must(c.from("days").select("*").eq("id", DAY_B).single(), "read Temp B after restore")) as Row;
  check("Temp B restored to its original Week", bRestored.week_id === SRC_WEEK, bRestored.week_id);
  note("DBG restored.description=", JSON.stringify(bRestored.description));
  note("DBG restored.content_blocks=", stable(bRestored.content_blocks));
  note("DBG baseline.description=", JSON.stringify(B_CONTENT.description));
  note("DBG baseline.content_blocks=", stable(B_CONTENT.content_blocks));
  check("Temp B content still unchanged after round trip", bRestored.description === B_CONTENT.description && stable(bRestored.content_blocks) === stable(B_CONTENT.content_blocks));
  await assertSequential("source Week (after restore)", c, SRC_WEEK);
  await assertSequential("destination Week (after restore)", c, DST_WEEK);
  const srcRestored = await weekRows(c, SRC_WEEK);
  check("Temp B is last in the restored source Week", srcRestored[srcRestored.length - 1]?.id === DAY_B, JSON.stringify(srcRestored.map((r) => `${r.id}=${r.order_index}`)));
  const progressRestored = await must(c.from("student_day_progress").select("*").eq("day_id", DAY_B), "read progress after restore");
  check("progress row week_id restored with the Day", progressRestored.length === 1 && progressRestored[0].week_id === SRC_WEEK, JSON.stringify(progressRestored));
  const srcRoadmapBack = await roadmapDays(SRC_WEEK);
  const dstRoadmapBack = await roadmapDays(DST_WEEK);
  check("student roadmap: Temp B back under the source Week", srcRoadmapBack.ids.includes(DAY_B), JSON.stringify(srcRoadmapBack.ids));
  check("student roadmap: Temp B gone from the destination Week again", !dstRoadmapBack.ids.includes(DAY_B), JSON.stringify(dstRoadmapBack.ids));

  // Cleanup fixtures and compare the whole database to the pre-test baseline.
  await deleteFixtures(c);
  const afterDaysRaw = await dumpDays(c);
  check("courses restored (exact match)", stable(await dumpCourses(c)) === baseline.courses);
  check("weeks restored (exact match)", stable(await dumpWeeks(c)) === baseline.weeks);
  check("days restored exactly (excluding updated_at)", stable(stripVolatile(afterDaysRaw)) === baseline.days);
  check("student_day_progress restored (exact match)", stable(await dumpProgress(c)) === baseline.progress);
  check("resource_placements restored (exact match)", stable(await dumpPlacements(c)) === baseline.placements);
  check("questions baseline rows restored (exact id set)", stable(await dumpQuestionIds(c)) === stable(baseline.questionIds));

  const baselineById = new Map(baselineDaysRaw.map((row) => [row.id as string, row]));
  const drifted = afterDaysRaw.filter((row) => baselineById.get(row.id as string)?.updated_at !== row.updated_at).map((row) => row.id as string);
  const touchedWeekIds = new Set(baselineDaysRaw.filter((row) => row.week_id === SRC_WEEK || row.week_id === DST_WEEK).map((row) => row.id as string));
  check(
    "updated_at drift confined to Days of the two renumbered Weeks (no other Day touched)",
    drifted.every((id) => touchedWeekIds.has(id)),
    JSON.stringify(drifted),
  );

  const leftovers = {
    days: (await must(c.from("days").select("id").like("id", "tmp40h2-%"), "leftover days")).length,
    weeks: (await must(c.from("weeks").select("id").like("id", "tmp40h2-%"), "leftover weeks")).length,
    courses: (await must(c.from("courses").select("id").like("id", "tmp40h2-%"), "leftover courses")).length,
    progress: (await must(c.from("student_day_progress").select("day_id").like("day_id", "tmp40h2-%"), "leftover progress")).length,
    placements: (await must(c.from("resource_placements").select("id").like("id", "tmp40h2-%"), "leftover placements")).length,
    questions: (await must(c.from("questions").select("id").like("id", "tmp40h2-%"), "leftover questions")).length,
  };
  check("no tmp40h2-* test rows remain anywhere", Object.values(leftovers).every((count) => count === 0), JSON.stringify(leftovers));
}

async function run() {
  try {
    await main();
  } catch (error) {
    failures += 1;
    console.error(`\nABORTED: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    try {
      await sweep(svc());
    } catch {
      // best-effort cleanup only
    }
    console.log(
      `\n==== 40H.2 transfer verification: ${failures === 0 ? "GREEN - all checks passed" : `${failures} check(s) FAILED`} ====`,
    );
    process.exitCode = failures === 0 ? 0 : 1;
  }
}

void run();
