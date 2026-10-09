import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProgressClient from "./ProgressClient";

/**
 * Task 40G.2 — server-side session guard for the Progress (performance) page.
 * See dashboard/page.tsx for the rationale; this mirrors the established
 * lesson-route pattern. Session check only — no `students` lookup.
 */
export default async function ProgressPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect(`/courses?auth=required&next=${encodeURIComponent("/progress")}`);
  }

  return <ProgressClient />;
}