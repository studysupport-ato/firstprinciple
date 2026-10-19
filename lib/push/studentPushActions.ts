"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import { getAuthenticatedStudent } from "@/lib/student/authenticatedStudent";
import type { ClientPushSubscriptionPayload } from "./types";

export type PushActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

import {
  validateSubscriptionEndpoint,
  validateSubscriptionKeys,
} from "./validation";

/**
 * Resolves the authenticated student session.
 * Never trusts client-supplied student ID or auth user ID.
 */
async function resolveAuthenticatedStudentContext() {
  const client = await createSupabaseServerClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) {
    return { ok: false as const, error: "Sign in to manage notifications." };
  }

  try {
    const student = await getAuthenticatedStudent(auth.user.id);
    return { ok: true as const, student };
  } catch (studentError) {
    console.error("[push] Could not resolve student profile:", studentError);
    return { ok: false as const, error: "Student profile not found." };
  }
}

/**
 * Registers or updates a device Web Push subscription for the authenticated student.
 */
export async function registerPushSubscriptionAction(
  input: ClientPushSubscriptionPayload,
): Promise<PushActionResult<{ status: "active" }>> {
  const context = await resolveAuthenticatedStudentContext();
  if (!context.ok) return context;

  const endpointResult = validateSubscriptionEndpoint(input?.endpoint);
  if (!endpointResult.ok) return endpointResult;

  const keysResult = validateSubscriptionKeys(input?.keys);
  if (!keysResult.ok) return keysResult;

  const userAgent =
    typeof input?.userAgent === "string" ? input.userAgent.trim().slice(0, 500) : null;

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("student_push_subscriptions").upsert(
      {
        student_id: context.student.id,
        endpoint: endpointResult.data,
        p256dh: keysResult.data.p256dh,
        auth: keysResult.data.auth,
        user_agent: userAgent,
        status: "active",
        failed_attempts: 0,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "endpoint" },
    );

    if (error) {
      console.error("[push] Database error during subscription registration:", error.message);
      return { ok: false, error: "Could not save push subscription." };
    }

    return { ok: true, data: { status: "active" } };
  } catch (error) {
    console.error("[push] Unexpected error during subscription registration:", error instanceof Error ? error.message : "Unknown");
    return { ok: false, error: "Could not register push notifications." };
  }
}

/**
 * Revokes an existing device Web Push subscription for the authenticated student.
 * Idempotent: succeeds cleanly even if the endpoint was already revoked or not found.
 */
export async function unregisterPushSubscriptionAction(
  input: { endpoint?: string },
): Promise<PushActionResult<{ status: "revoked" }>> {
  const context = await resolveAuthenticatedStudentContext();
  if (!context.ok) return context;

  const endpointResult = validateSubscriptionEndpoint(input?.endpoint);
  if (!endpointResult.ok) return endpointResult;

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("student_push_subscriptions")
      .update({
        status: "revoked",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("student_id", context.student.id)
      .eq("endpoint", endpointResult.data);

    if (error) {
      console.error("[push] Database error during subscription revocation:", error.message);
      return { ok: false, error: "Could not revoke push subscription." };
    }

    return { ok: true, data: { status: "revoked" } };
  } catch (error) {
    console.error("[push] Unexpected error during subscription revocation:", error instanceof Error ? error.message : "Unknown");
    return { ok: false, error: "Could not revoke push notifications." };
  }
}

/**
 * Checks if the specified device endpoint is currently registered and active for the authenticated student.
 */
export async function getStudentPushSubscriptionStatusAction(
  endpoint?: string | null,
): Promise<PushActionResult<{ active: boolean }>> {
  if (!endpoint) {
    return { ok: true, data: { active: false } };
  }

  const context = await resolveAuthenticatedStudentContext();
  if (!context.ok) return context;

  const endpointResult = validateSubscriptionEndpoint(endpoint);
  if (!endpointResult.ok) return { ok: true, data: { active: false } };

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("student_push_subscriptions")
      .select("status")
      .eq("student_id", context.student.id)
      .eq("endpoint", endpointResult.data)
      .maybeSingle();

    if (error) {
      console.error("[push] Could not query subscription status:", error.message);
      return { ok: false, error: "Could not check push subscription status." };
    }

    const row = data as { status?: string } | null;
    return { ok: true, data: { active: row?.status === "active" } };
  } catch {
    return { ok: false, error: "Could not check push subscription status." };
  }
}
