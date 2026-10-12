/**
 * Final product pass — course progress persistence verification.
 * Signs in as a real student (publishable key, RLS enforced) and proves:
 * started state persists, re-read matches, completion persists, resume
 * position stays consistent, cross-student writes denied. Self-cleaning:
 * the probe day row is deleted/restored at the end. Probes the LAST
 * published math-151 day so real progress is never disturbed.
 * Env: NEXT_PUBLIC_SUPABASE_URL, PUBLISHABLE/ANON key,
 * VERIFY_STUDENT_A_EMAIL/_PASSWORD, VERIFY_STUDENT_B_EMAIL/_PASSWORD.
 * Usage: npm run verify:day-persistence
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLISHABLE =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const A_EMAIL = process.env.VERIFY_STUDENT_A_EMAIL;
const A_PASSWORD = process.env.VERIFY_STUDENT_A_PASSWORD;
const B_EMAIL = process.env.VERIFY_STUDENT_B_EMAIL;
const B_PASSWORD = process.env.VERIFY_STUDENT_B_PASSWORD;

const COURSE_ID = "math-151";

let failures = 0;
function check(label: string, pass: boolean, detail = "") {
  if (!pass) failures += 1;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${!pass && detail ? ` — ${detail}` : ""}`);
}

function studentClient(): SupabaseClient {
  return createClient(URL, PUBLISHABLE, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function main() {
  if (!A_EMAIL || !A_PASSWORD || !B_EMAIL || !B_PASSWORD) {
    console.log("SKIP: set VERIFY_STUDENT_A_EMAIL/_PASSWORD and VERIFY_STUDENT_B_EMAIL/_PASSWORD in .env.local");
    process.exit(0);
  }
  const login = (email: string, password: string) =>
    studentClient().auth.signInWithPassword({ email, password });
  const [{ data: aAuth, error: aErr }, { data: bAuth, error: bErr }] = await Promise.all([
    login(A_EMAIL, A_PASSWORD),
    login(B_EMAIL, B_PASSWORD),
  ]);
  if (aErr) throw aErr;
  if (bErr) throw bErr;
  const a = studentClient();
  await a.auth.setSession({ access_token: aAuth.session!.access_token, refresh_token: aAuth.session!.refresh_token });
  const b = studentClient();
  await b.auth.setSession({ access_token: bAuth.session!.access_token, refresh_token: bAuth.session!.refresh_token });
  const rowA = (await a.from("students").select("id").eq("auth_user_id", aAuth.user.id).maybeSingle()).data as { id: string } | null;
  const rowB = (await b.from("students").select("id").eq("auth_user_id", bAuth.user.id).maybeSingle()).data as { id: string } | null;
  check("student A resolves own students row", Boolean(rowA?.id));
  check("student B resolves own students row", Boolean(rowB?.id));
  if (!rowA || !rowB) {
    console.log(`\nRESULT: FAIL (${failures})`);
    process.exit(1);
  }
  const days = ((await a.from("days").select("id,week_id").eq("course_id", COURSE_ID)).data ?? []) as { id: string; week_id: string }[];
  check("math-151 has published days to probe", days.length > 0);
  if (days.length === 0) {
    console.log(`\nRESULT: FAIL (${failures})`);
    process.exit(1);
  }
  const probeDay = days[days.length - 1];
  type DayRow = { status: string; started_at: string | null; completed_at: string | null; last_visited_at: string | null; time_spent_seconds: number | null };
  const before = (await a.from("student_day_progress").select("status,started_at,completed_at,last_visited_at,time_spent_seconds").eq("student_id", rowA.id).eq("day_id", probeDay.id).maybeSingle()).data as DayRow | null;
  const hadRow = Boolean(before);
  const now = new Date().toISOString();
  const start = await a.from("student_day_progress").upsert(
    { student_id: rowA.id, course_id: COURSE_ID, week_id: probeDay.week_id, day_id: probeDay.id, status: "in_progress", started_at: now, last_visited_at: now, time_spent_seconds: 300 },
    { onConflict: "student_id,day_id" },
  ).select("status").single();
  check("in_progress day row writes", !start.error && start.data?.status === "in_progress", start.error?.message ?? "");
  const reread = (await a.from("student_day_progress").select("status").eq("student_id", rowA.id).eq("day_id", probeDay.id).maybeSingle()).data as { status: string } | null;
  check("started state re-reads identically", reread?.status === "in_progress");
  const doneAt = new Date().toISOString();
  const done = await a.from("student_day_progress").upsert(
    { student_id: rowA.id, course_id: COURSE_ID, week_id: probeDay.week_id, day_id: probeDay.id, status: "completed", started_at: now, completed_at: doneAt, last_visited_at: doneAt },
    { onConflict: "student_id,day_id" },
  ).select("status").single();
  check("completed day row writes", !done.error && done.data?.status === "completed", done.error?.message ?? "");
  const allRows = ((await a.from("student_day_progress").select("day_id,status").eq("student_id", rowA.id).eq("course_id", COURSE_ID)).data ?? []) as { day_id: string; status: string }[];
  const statusByDay = new Map(allRows.map((r) => [r.day_id, r.status]));
  const resume = days.find((d) => (statusByDay.get(d.id) ?? "not_started") !== "completed") ?? null;
  check("resume position consistent after probe completion", resume === null || resume.id !== probeDay.id || allRows.every((r) => r.status === "completed"));
  const crossInsert = await b.from("student_day_progress").insert({
    student_id: rowA.id, course_id: COURSE_ID, week_id: probeDay.week_id, day_id: probeDay.id, status: "completed",
  } as never);
  check("student B cannot insert for student A", Boolean(crossInsert.error), "insert unexpectedly allowed");
  if (hadRow && before) {
    const restore = await a.from("student_day_progress").upsert(
      { student_id: rowA.id, course_id: COURSE_ID, week_id: probeDay.week_id, day_id: probeDay.id, ...before },
      { onConflict: "student_id,day_id" },
    ).select("status").single();
    check("cleanup restores pre-existing row", !restore.error && restore.data?.status === before.status, restore.error?.message ?? "");
  } else {
    const del = await a.from("student_day_progress").delete().eq("student_id", rowA.id).eq("day_id", probeDay.id);
    const gone = (await a.from("student_day_progress").select("day_id").eq("student_id", rowA.id).eq("day_id", probeDay.id).maybeSingle()).data;
    if (gone === null) {
      check("cleanup removes probe row", !del.error, del.error?.message ?? "");
      check("probe row gone after cleanup", gone === null);
    } else {
      // RLS deliberately grants students select/insert/update on their own
      // progress rows but no DELETE (the app only ever upserts), so the delete
      // above is silently denied (200 with 0 rows). Neutralise the probe row
      // instead — upsert to not_started — and let the account's own removal
      // cascade it away during final test-data cleanup.
      const reset = await a.from("student_day_progress").upsert(
        { student_id: rowA.id, course_id: COURSE_ID, week_id: probeDay.week_id, day_id: probeDay.id, status: "not_started", started_at: null, completed_at: null, last_visited_at: null, time_spent_seconds: 0 },
        { onConflict: "student_id,day_id" },
      ).select("status").single();
      check("cleanup neutralises probe row (student DELETE is RLS-denied by design)", !reset.error && reset.data?.status === "not_started", reset.error?.message ?? "");
      check("probe row no longer affects resume logic", reset.data?.status === "not_started");
    }
  }
  console.log(`\n${failures === 0 ? "RESULT: PASS" : `RESULT: FAIL (${failures})`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("verify-day-persistence crashed:", error);
  process.exit(1);
});
