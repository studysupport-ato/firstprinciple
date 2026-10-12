import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SettingsClient from "./SettingsClient";

/**
 * Task 40G.2 — server-side session guard for Settings.
 * See dashboard/page.tsx for the rationale; this mirrors the established
 * lesson-route pattern. Session check only — no `students` lookup.
 *
 * Note: the Settings page also contains the demo-student switcher, which the
 * 40D.1 gating already hides from authenticated users. Requiring a session
 * here does not change that behaviour, it only prevents an unauthenticated
 * visitor from reaching the route at all.
 */
export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect(`/courses?auth=required&next=${encodeURIComponent("/settings")}`);
  }

  return <SettingsClient />;
}