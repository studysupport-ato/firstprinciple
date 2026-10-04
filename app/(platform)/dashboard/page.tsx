import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

/**
 * Task 40G.2 — server-side session guard for the Dashboard.
 *
 * Mirrors the established pattern in
 * `courses/[courseId]/chapter/[chapterId]/lesson/[id]/page.tsx`:
 * establish "is there an authenticated Supabase user?" BEFORE any
 * page-specific student data is resolved. This is a session check only —
 * it never queries `students` and never resolves `students.id`.
 *
 * The redirect target is the app's existing auth flow:
 *   /courses?auth=required&next=<encoded destination>
 * which `app/(platform)/layout.tsx` consumes to open the AuthModal and return
 * the student to this page after sign-in.
 */
export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect(`/courses?auth=required&next=${encodeURIComponent("/dashboard")}`);
  }

  return <DashboardClient />;
}