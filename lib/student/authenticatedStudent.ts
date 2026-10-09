import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/client";

/**
 * Task 40B — canonical server-safe student resolver.
 * Supabase Auth -> students.auth_user_id -> students.id -> student-owned rows.
 * Never reads localStorage, never trusts a browser-supplied student id, never
 * uses email as the primary key. Missing student = integrity error (the
 * on_auth_user_created_student trigger guarantees exactly one student).
 */
export interface AuthenticatedStudent {
  id: string;
  authUserId: string;
  displayName: string;
  email: string | null;
}

export async function getAuthenticatedStudent(authUserId: string, email?: string | null): Promise<AuthenticatedStudent> {
  if (!authUserId) throw new Error("No authenticated user.");
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("students").select("id,auth_user_id,display_name,email").eq("auth_user_id", authUserId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Authenticated user has no student record (trigger integrity error).");
  const row = data as { id: string; auth_user_id: string; display_name: string; email: string | null };
  void email;
  return { id: row.id, authUserId: row.auth_user_id, displayName: row.display_name, email: row.email };
}
