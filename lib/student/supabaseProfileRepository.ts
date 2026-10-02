import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { StudentProfile } from "./profileRepository";

type StudentRow = { id: string; display_name: string; email: string | null };

function toProfile(row: StudentRow): StudentProfile {
  const now = new Date().toISOString();
  return {
    studentId: row.id,
    fullName: row.display_name ?? "",
    phoneNumber: "",
    email: row.email,
    profileCompleted: Boolean((row.display_name ?? "").trim()),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Task 40B — canonical Supabase profile path. The students row is the source
 * of truth for authenticated users. Email is read-only from Auth/students row;
 * the browser cannot change identity email via profile edit. Explicit one-time
 * localStorage migration only fills an EMPTY display_name, never overwrites.
 */
export async function getSupabaseStudentProfile(client: SupabaseClient<Database>, studentId: string): Promise<StudentProfile | null> {
  const { data, error } = await client.from("students").select("id,display_name,email").eq("id", studentId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toProfile(data as StudentRow);
}

export async function saveSupabaseStudentProfile(
  client: SupabaseClient<Database>,
  studentId: string,
  patch: { fullName: string; migrateFromLocal?: { fullName?: string } },
): Promise<StudentProfile> {
  const name = patch.fullName.trim();
  if (!name) throw new Error("Full name is required.");
  // One-time migration: only used when caller explicitly passes local data AND
  // server name is empty — enforced by fetching first.
  const current = await getSupabaseStudentProfile(client, studentId);
  const resolved = name || (current && !current.fullName.trim() ? patch.migrateFromLocal?.fullName?.trim() ?? "" : "");
  if (!resolved) throw new Error("Full name is required.");
  const { data, error } = await client.from("students").update({ display_name: resolved } as never).eq("id", studentId).select("id,display_name,email").single();
  if (error) throw error;
  return toProfile(data as StudentRow);
}
