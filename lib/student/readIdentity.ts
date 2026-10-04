import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Task 40C-1 — canonical CLIENT-SIDE read identity.
 *
 *   Supabase Auth session
 *     -> auth.users.id
 *     -> students.auth_user_id
 *     -> students.id
 *
 * Contract (identical to the Task 40B write boundary):
 *  - authenticated  -> returns the real `students.id`
 *  - unauthenticated -> returns null (never local-student / demo-student-*)
 *  - session exists but no `students` row -> THROWS (never a silent fallback)
 *
 * The Auth UUID is never used as a student id. Service-role is never used here:
 * student fact reads must go through RLS with the publishable key.
 *
 * Module-level cache: one `students` lookup per session, shared by every
 * consumer (useAuthSession, lib/progress/access, page-level reads) so a single
 * page render never issues duplicate identity queries.
 */
export interface AuthenticatedReadStudent {
  id: string;
  authUserId: string;
  displayName: string;
  email: string | null;
}

export const MISSING_STUDENT_RECORD_MESSAGE = "Authenticated user has no student record.";

let cachedAuthUserId: string | null = null;
let cachedStudent: AuthenticatedReadStudent | null = null;
let inFlight: Promise<AuthenticatedReadStudent> | null = null;

/** Drop the cached identity. Called on sign-out and on auth state change. */
export function clearAuthenticatedReadStudentCache() {
  cachedAuthUserId = null;
  cachedStudent = null;
  inFlight = null;
}

/**
 * Resolve the real authenticated student for READ paths.
 * Returns null when there is no Supabase session. Throws when a session exists
 * but the student mapping is missing — that is a trigger integrity error and
 * must never be papered over with a mock/local identity.
 */
export async function resolveAuthenticatedReadStudent(): Promise<AuthenticatedReadStudent | null> {
  const client = createSupabaseBrowserClient();

  // getSession() is served from the local session cache — no network round trip.
  const { data } = await client.auth.getSession();
  const authUserId = data.session?.user?.id;

  if (!authUserId) {
    if (cachedAuthUserId !== null) clearAuthenticatedReadStudentCache();
    return null;
  }

  if (cachedAuthUserId === authUserId && cachedStudent) return cachedStudent;
  if (inFlight && cachedAuthUserId === authUserId) return inFlight;

  cachedAuthUserId = authUserId;
  cachedStudent = null;

  inFlight = (async () => {
    const { data: row, error } = await client
      .from("students")
      .select("id,auth_user_id,display_name,email")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error) throw error;

    const studentRow = row as {
      id: string;
      auth_user_id: string;
      display_name: string | null;
      email: string | null;
    } | null;

    if (!studentRow) {
      clearAuthenticatedReadStudentCache();
      throw new Error(MISSING_STUDENT_RECORD_MESSAGE);
    }

    const student: AuthenticatedReadStudent = {
      id: studentRow.id,
      authUserId: studentRow.auth_user_id,
      displayName: studentRow.display_name ?? "",
      email: studentRow.email,
    };
    cachedStudent = student;
    return student;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/**
 * Convenience wrapper returning just the canonical `students.id`.
 * null when unauthenticated; throws when the student mapping is missing.
 */
export async function resolveAuthenticatedReadStudentId(): Promise<string | null> {
  const student = await resolveAuthenticatedReadStudent();
  return student?.id ?? null;
}

/**
 * The current Supabase Auth user id, or null when signed out.
 * getSession() is served from the local session cache — no network round trip.
 * Used to decide whether a mock/local fallback is ever permissible.
 */
export async function getSupabaseAuthUserId(): Promise<string | null> {
  const { data } = await createSupabaseBrowserClient().auth.getSession();
  return data.session?.user?.id ?? null;
}