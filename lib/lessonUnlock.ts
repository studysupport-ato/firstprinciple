if (typeof window !== "undefined") {
  throw new Error(
    "[Back2Basics with Kwamina] lib/lessonUnlock.ts is server-only and must never be bundled into client code.",
  );
}

import { AdminUnauthorizedError, requireAdmin } from "@/lib/adminSession";
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export async function isAllowlistedAdminUser(userId: string): Promise<boolean> {
  const { data, error } = await createSupabaseAdminClient()
    .from("admin_users")
    .select("user_id,role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as { role: string } | null)?.role === "admin";
}

export async function readUnlockAllLessonsSetting(): Promise<boolean> {
  const { data, error } = await createSupabaseAdminClient()
    .from("platform_settings")
    .select("unlock_all_lessons_enabled")
    .eq("id", "global")
    .single();

  if (error) throw error;
  return (data as { unlock_all_lessons_enabled: boolean }).unlock_all_lessons_enabled;
}

export async function readMaintenanceModeSetting(): Promise<boolean> {
  const { data, error } = await createSupabaseAdminClient()
    .from("platform_settings")
    .select("maintenance_mode_enabled")
    .eq("id", "global")
    .single();

  if (error) throw error;
  return (data as { maintenance_mode_enabled: boolean }).maintenance_mode_enabled;
}

export async function writeMaintenanceModeSetting(enabled: boolean): Promise<boolean> {
  const { data, error } = await createSupabaseAdminClient()
    .from("platform_settings")
    .update({ maintenance_mode_enabled: enabled } as never)
    .eq("id", "global")
    .select("maintenance_mode_enabled")
    .single();

  if (error) throw error;
  return (data as { maintenance_mode_enabled: boolean }).maintenance_mode_enabled;
}

export async function writeUnlockAllLessonsSetting(enabled: boolean): Promise<boolean> {
  const { data, error } = await createSupabaseAdminClient()
    .from("platform_settings")
    .update({ unlock_all_lessons_enabled: enabled } as never)
    .eq("id", "global")
    .select("unlock_all_lessons_enabled")
    .single();

  if (error) throw error;
  return (data as { unlock_all_lessons_enabled: boolean }).unlock_all_lessons_enabled;
}

export async function isAuthorizedLessonAdmin(
  userId: string | null,
  options?: { requireAdminFn?: () => Promise<unknown>; isAllowlistedFn?: (id: string) => Promise<boolean> },
): Promise<boolean> {
  if (!userId) return false;

  try {
    if (options?.requireAdminFn) {
      await options.requireAdminFn();
    } else {
      await requireAdmin();
    }
  } catch (error) {
    if (error instanceof AdminUnauthorizedError) return false;
    throw error;
  }

  const checkAllowlist = options?.isAllowlistedFn ?? isAllowlistedAdminUser;
  return checkAllowlist(userId);
}

export async function getLessonTestingModeForUser(userId: string | null): Promise<boolean> {
  if (!(await isAuthorizedLessonAdmin(userId))) return false;
  return readUnlockAllLessonsSetting();
}

export async function requireLessonUnlockAdmin(
  authenticatedClient: SupabaseClient<Database>,
): Promise<string> {
  await requireAdmin();

  const { data, error } = await authenticatedClient.auth.getUser();
  if (error) throw error;
  if (!data.user) {
    throw new AdminUnauthorizedError(
      "Sign in to the student platform with Ato's verified Supabase Auth account in this browser.",
    );
  }
  if (!(await isAllowlistedAdminUser(data.user.id))) {
    throw new AdminUnauthorizedError("This Supabase Auth account is not in the administrator allowlist.");
  }

  return data.user.id;
}
