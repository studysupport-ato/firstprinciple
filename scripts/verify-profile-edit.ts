/**
 * Final product pass — profile editing verification.
 *
 * Uses two password-auth student sessions + one anonymous client to prove,
 * against the LIVE Supabase project (RLS enforced, publishable key only):
 *
 *   1. Student A's own profile row is readable.
 *   2. Student A can update ONLY their own display_name (students_update_own),
 *      and the new name persists on re-read (reload behaviour).
 *   3. Student A CANNOT update student B's row (RLS denies).
 *   4. Anonymous CANNOT read or update either row.
 *
 * Self-cleaning: restores A's original display_name at the end. No service
 * role, no new rows, no fake students.
 *
 * Required env (same as other verify scripts, loaded from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or ANON),
 *   VERIFY_STUDENT_A_EMAIL, VERIFY_STUDENT_A_PASSWORD,
 *   VERIFY_STUDENT_B_EMAIL, VERIFY_STUDENT_B_PASSWORD
 *
 * Usage: npm run verify:profile-edit
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

let failures = 0;
function check(label: string, pass: boolean, detail = "") {
  if (!pass) failures += 1;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${!pass && detail ? ` — ${detail}` : ""}`);
}

function studentClient(): SupabaseClient {
  return createClient(URL, PUBLISHABLE, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signIn(email: string, password: string) {
  const client = studentClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client, authUserId: data.user.id };
}

async function ownRow(client: SupabaseClient, authUserId: string) {
  const { data, error } = await client
    .from("students")
    .select("id,display_name,email")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; display_name: string | null; email: string | null } | null;
}

async function main() {
  if (!A_EMAIL || !A_PASSWORD || !B_EMAIL || !B_PASSWORD) {
    console.log("SKIP: set VERIFY_STUDENT_A_EMAIL/_PASSWORD and VERIFY_STUDENT_B_EMAIL/_PASSWORD in .env.local");
    console.log("      (two real student logins; no rows are created by this script)");
    process.exit(0);
  }

  const a = await signIn(A_EMAIL, A_PASSWORD);
  const b = await signIn(B_EMAIL, B_PASSWORD);
  const anon = studentClient();

  const rowA = await ownRow(a.client, a.authUserId);
  const rowB = await ownRow(b.client, b.authUserId);
  check("student A resolves own students row", Boolean(rowA?.id));
  check("student B resolves own students row", Boolean(rowB?.id));
  if (!rowA || !rowB) {
    console.log(`\nRESULT: FAIL (${failures})`);
    process.exit(1);
  }
  const originalName = rowA.display_name ?? "";

  // 1. Own write works and persists (save -> re-read, i.e. reload behaviour).
  const probeName = `Verify Name ${Date.now()}`;
  const upd = await a.client
    .from("students")
    .update({ display_name: probeName })
    .eq("id", rowA.id)
    .select("id,display_name")
    .single();
  check("student A updates own display_name", !upd.error && upd.data?.display_name === probeName, upd.error?.message ?? "");
  const reread = await ownRow(a.client, a.authUserId);
  check("updated name persists on re-read", reread?.display_name === probeName);

  // 2. Cross-student write is denied by students_update_own.
  const cross = await a.client.from("students").update({ display_name: "hijacked" }).eq("id", rowB.id).select("id");
  const crossDenied = Boolean(cross.error) || (cross.data ?? []).length === 0;
  check("student A cannot update student B row", crossDenied, cross.error?.message ?? "row was modified");
  const rowBAfter = await ownRow(b.client, b.authUserId);
  check("student B name unchanged", rowBAfter?.display_name === rowB.display_name);

  // 3. Anonymous cannot read or write either row.
  const anonRead = await anon.from("students").select("id").eq("id", rowA.id);
  check("anonymous cannot read student A row", (anonRead.data ?? []).length === 0);
  const anonWrite = await anon.from("students").update({ display_name: "anon" }).eq("id", rowA.id).select("id");
  check(
    "anonymous cannot update student A row",
    Boolean(anonWrite.error) || (anonWrite.data ?? []).length === 0,
  );

  // Cleanup: restore A's original display name.
  const restore = await a.client
    .from("students")
    .update({ display_name: originalName })
    .eq("id", rowA.id)
    .select("display_name")
    .single();
  check("cleanup restores original display_name", !restore.error && (restore.data?.display_name ?? "") === originalName);

  console.log(`\n${failures === 0 ? "RESULT: PASS" : `RESULT: FAIL (${failures})`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("verify-profile-edit crashed:", error);
  process.exit(1);
});
