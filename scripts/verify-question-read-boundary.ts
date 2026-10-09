/**
 * Task 40G.4 — focused read-path boundary test for the `questions` table.
 *
 * Proves the two production client paths behave differently under the live
 * `public_questions_select_published` RLS policy:
 *
 *   STUDENT  publishable-key client (the same key `createSupabaseServerClient()`
 *            uses, carrying the signed-in user's session) -> published only
 *   ADMIN    service-role client (createSupabaseAdminClient) -> drafts included
 *
 * Read-only apart from one self-cleaning temporary draft probe.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;

const PROBE_ID = `verify-40g4-${Date.now()}`;
const PROBE_PROMPT = "VERIFY 40G.4 draft probe";
const PROBE_SECRET = "SECRET-ANSWER-40G4";

function client(key: string): SupabaseClient {
  return createClient(URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const pass = actual === expected;
  if (!pass) failures += 1;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}: ${JSON.stringify(actual)} (expected ${JSON.stringify(expected)})`);
}

async function main() {
  const student = client(PUBLISHABLE);
  const admin = client(SERVICE);

  const baselineTotal = (await admin.from("questions").select("id", { count: "exact", head: true })).count ?? 0;
  const baselineDrafts = (await admin.from("questions").select("id", { count: "exact", head: true }).eq("status", "draft")).count ?? 0;
  console.log(`baseline: questions=${baselineTotal} drafts=${baselineDrafts}`);

  const template = (await admin.from("questions").select("*").limit(1).single()).data as Record<string, unknown>;
  const row: Record<string, unknown> = { ...template, id: PROBE_ID, status: "draft", prompt: PROBE_PROMPT, correct_answer: PROBE_SECRET };
  delete row.created_at;
  delete row.updated_at;
  const inserted = await admin.from("questions").insert(row as never).select("id").single();
  if (inserted.error) throw inserted.error;
  console.log(`probe inserted: ${PROBE_ID}`);

  console.log("\nSTUDENT path (publishable key, RLS enforced):");
  const published = (await student.from("questions").select("id").eq("status", "published").limit(1)).data ?? [];
  check("published question readable", published.length, 1);
  check("draft readable by id", ((await student.from("questions").select("id").eq("id", PROBE_ID)).data ?? []).length, 0);
  check("draft readable by prompt", ((await student.from("questions").select("id").eq("prompt", PROBE_PROMPT)).data ?? []).length, 0);
  const leaked = (await student.from("questions").select("correct_answer").eq("id", PROBE_ID)).data ?? [];
  check("draft correct_answer exposed", leaked.length, 0);
  const visible = (await student.from("questions").select("id")).data ?? [];
  check("no draft rows in full read", visible.filter((q: { id: string }) => q.id === PROBE_ID).length, 0);

  console.log("\nADMIN path (service role, RLS bypassed):");
  const adminDraft = (await admin.from("questions").select("id,correct_answer").eq("id", PROBE_ID)).data ?? [];
  check("draft readable by admin", adminDraft.length, 1);
  check("correct_answer available to admin", adminDraft[0]?.correct_answer, PROBE_SECRET);

  const deleted = await admin.from("questions").delete().eq("id", PROBE_ID);
  if (deleted.error) throw deleted.error;
  const finalTotal = (await admin.from("questions").select("id", { count: "exact", head: true })).count ?? 0;
  const finalDrafts = (await admin.from("questions").select("id", { count: "exact", head: true }).eq("status", "draft")).count ?? 0;
  console.log("\ncleanup:");
  check("questions restored", finalTotal, baselineTotal);
  check("drafts restored", finalDrafts, baselineDrafts);

  console.log(`\n${failures === 0 ? "RESULT: PASS" : `RESULT: FAIL (${failures})`}`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("verify-question-read-boundary failed:", error);
  process.exitCode = 1;
});