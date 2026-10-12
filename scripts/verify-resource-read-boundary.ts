/**
 * Task 40G.6C â€” focused read-path boundary test for `learning_resources` and
 * `resource_placements`.
 *
 * Proves the two production client paths behave differently under the live
 * Task 40G.6B published-only RLS policies:
 *
 *   STUDENT  request-scoped server client (publishable key + user JWT, the same
 *            key `createSupabaseServerClient()` uses) -> published only
 *   ADMIN    service-role client (createSupabaseAdminClient) -> drafts included
 *
 * It also asserts the repository boundary itself: asking for the "supabase"
 * resource source without an explicit client factory must throw rather than
 * silently resolve a service-role client.
 *
 * Read-only apart from self-cleaning temporary probes.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;

const P = `verify-40g6c-${Date.now()}`;
const PUB_DAY = "math151-cross-product";
const PUB_WEEK = "math151-week-1";
const PUB_COURSE = "math-151";

function client(key: string): SupabaseClient {
  return createClient(URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}: ${JSON.stringify(actual)}${pass ? "" : ` (expected ${JSON.stringify(expected)})`}`);
}
async function del(table: string) {
  for (let i = 0; i < 4; i++) {
    const r: any = await client(SERVICE).from(table).delete().like("id", `${P}%`);
    if (!r.error) return;
    await new Promise((res) => setTimeout(res, 3000));
  }
}

let createResourceRepository!: typeof import("../lib/content/resourceRepository").createResourceRepository;

async function main() {
  // Imported lazily: this module graph pulls in `lib/supabase/client`, which is
  // CommonJS and must not be pulled in by the script's top-level import.
  ({ createResourceRepository } = await import("../lib/content/resourceRepository"));
  const student = client(PUBLISHABLE);
  const admin = client(SERVICE);

  const baseRes = (await admin.from("learning_resources").select("id", { count: "exact", head: true })).count ?? 0;
  const basePlc = (await admin.from("resource_placements").select("id", { count: "exact", head: true })).count ?? 0;
  console.log(`baseline: learning_resources=${baseRes} resource_placements=${basePlc}`);

  // Order matters: placements reference the resources/days they point at.
  const insRes = await admin.from("learning_resources").insert([
    { id: `${P}-rd`, type: "external", title: "TEMP DRAFT", data: { url: "https://private.example.com/secret" }, metadata: { note: "SECRET-ADMIN-NOTE" }, status: "draft" },
    { id: `${P}-rp`, type: "external", title: "TEMP PUBLISHED", data: { url: "https://ok.example.com" }, metadata: {}, status: "published" },
  ] as never);
  if (insRes.error) throw insRes.error;
  const insDay = await admin.from("days").insert({ id: `${P}-day`, course_id: PUB_COURSE, week_id: PUB_WEEK, title: "TEMP DRAFT DAY", description: "d", order_index: 997, estimated_minutes: 5, objectives: [], content_blocks: [], status: "draft" } as never);
  if (insDay.error) throw insDay.error;
  const insPlc = await admin.from("resource_placements").insert([
    { id: `${P}-p1`, resource_id: `${P}-rp`, day_id: PUB_DAY },
    { id: `${P}-p2`, resource_id: `${P}-rd`, day_id: PUB_DAY },
    { id: `${P}-p3`, resource_id: `${P}-rp`, day_id: `${P}-day` },
    { id: `${P}-p5`, resource_id: `${P}-rp`, week_id: PUB_WEEK },
    { id: `${P}-p7`, resource_id: `${P}-rp`, course_id: PUB_COURSE },
  ] as never);
  if (insPlc.error) throw insPlc.error;
  console.log(`probes inserted: ${P}`);

  console.log("\nSTUDENT path (publishable key, RLS enforced):");
  const res = (await student.from("learning_resources").select("id,status,data,metadata")).data ?? [];
  check("published resource readable", ((await student.from("learning_resources").select("id").eq("id", `${P}-rp`)).data ?? []).length, 1);
  check("draft resource readable by id", ((await student.from("learning_resources").select("id").eq("id", `${P}-rd`)).data ?? []).length, 0);
  check("broad anon resource drafts", res.filter((r: any) => r.status !== "published").length, 0);
  const blob = JSON.stringify(res);
  check("draft data.url exposed", blob.includes("private.example.com"), false);
  check("draft metadata exposed", blob.includes("SECRET-ADMIN-NOTE"), false);

  const seen = new Set(((await student.from("resource_placements").select("id")).data ?? []).map((r: any) => r.id));
  console.log(`  (student sees ${seen.size} of 5 temp placements)`);
  check("p1 pub res + PUB day   ", seen.has(`${P}-p1`), true);
  check("p2 DRAFT res + pub day ", seen.has(`${P}-p2`), false);
  check("p3 pub res + DRAFT day ", seen.has(`${P}-p3`), false);
  check("p5 pub res + PUB week  ", seen.has(`${P}-p5`), true);
  check("p7 pub res + PUB course", seen.has(`${P}-p7`), true);

  console.log("\nREPOSITORY BOUNDARY:");
  let threw = false;
  try {
    createResourceRepository("supabase");
  } catch {
    threw = true;
  }
  check('createResourceRepository("supabase") without a factory throws', threw, true);
  const studentRepo = createResourceRepository("supabase", () => student);
  check("explicit publishable-key factory reads published only", (await studentRepo.listResources()).filter((r) => r.status !== "published").length, 0);

  console.log("\nADMIN path (explicit service-role client):");
  check("draft resource readable", ((await admin.from("learning_resources").select("id").eq("id", `${P}-rd`)).data ?? []).length, 1);
  check("all 5 placements readable", ((await admin.from("resource_placements").select("id").like("id", `${P}-%`)).data ?? []).length, 5);
  const adminRepo = createResourceRepository("supabase", () => client(SERVICE));
  check("admin factory listResources sees draft", (await adminRepo.listResources()).filter((r) => r.id === `${P}-rd`).length, 1);

  console.log("\nCLEANUP:");
  for (const t of ["resource_placements", "days", "learning_resources"]) await del(t);
  check("temp resources remaining", (await admin.from("learning_resources").select("id", { count: "exact", head: true }).like("id", `${P}%`)).count ?? 0, 0);
  check("learning_resources back to baseline", (await admin.from("learning_resources").select("id", { count: "exact", head: true })).count, baseRes);
  check("resource_placements back to baseline", (await admin.from("resource_placements").select("id", { count: "exact", head: true })).count, basePlc);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  if (failures > 0) process.exitCode = 1;
}
main().catch((e) => {
  console.error("CRASH:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
