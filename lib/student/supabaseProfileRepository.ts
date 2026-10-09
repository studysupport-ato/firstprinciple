import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { StudentProfile } from "./profileRepository";

type StudentRow = { id: string; display_name: string; email: string | null; phone_number: string | null };

function toProfile(row: StudentRow): StudentProfile {
  const now = new Date().toISOString();
  return {
    studentId: row.id,
    fullName: row.display_name ?? "",
    phoneNumber: row.phone_number ?? "",
    email: row.email,
    profileCompleted: Boolean((row.display_name ?? "").trim() && (row.phone_number ?? "").trim()),
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
  const { data, error } = await client.from("students").select("id,display_name,email,phone_number").eq("id", studentId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toProfile(data as StudentRow);
}

export async function saveSupabaseStudentProfile(
  client: SupabaseClient<Database>,
  studentId: string,
  patch: { fullName?: string; phoneNumber?: string; migrateFromLocal?: { fullName?: string } },
): Promise<StudentProfile> {
  if (patch.fullName === undefined && patch.phoneNumber === undefined) {
    throw new Error("At least one profile field is required.");
  }
  // One-time migration: only used when caller explicitly passes local data AND
  // server name is empty — enforced by fetching first.
  const current = await getSupabaseStudentProfile(client, studentId);
  const name = patch.fullName?.trim();
  const resolved = name || (current && !current.fullName.trim() ? patch.migrateFromLocal?.fullName?.trim() ?? "" : current?.fullName ?? "");
  if (!resolved) throw new Error("Full name is required.");
  const update: { display_name: string; phone_number?: string } = { display_name: resolved };
  if (patch.phoneNumber !== undefined) update.phone_number = patch.phoneNumber.trim();
  const { data, error } = await client.from("students").update(update as never).eq("id", studentId).select("id,display_name,email,phone_number").single();
  if (error) throw error;
  return toProfile(data as StudentRow);
}
