"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUploadSubscriptionActive, removeUploadSubscription, saveUploadSubscription } from "./uploadPush";

type Result = { ok: true } | { ok: false; error: string };

async function currentUserId() {
  try {
    const { data } = await (await createSupabaseServerClient()).auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Register this phone for course rep uploads in one programme and year (signed in or not). */
export async function subscribeToRepUploadsAction(input: { endpoint: string; keys: { p256dh: string; auth: string }; departmentId: string; studyYear: number }): Promise<Result> {
  try {
    await saveUploadSubscription({ ...input, userId: await currentUserId() });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not switch on notifications." };
  }
}

export async function unsubscribeFromRepUploadsAction(endpoint: string): Promise<Result> {
  await removeUploadSubscription(endpoint);
  return { ok: true };
}

export async function repUploadsSubscriptionStatusAction(endpoint: string, departmentId: string, studyYear: number): Promise<boolean> {
  return isUploadSubscriptionActive(endpoint, departmentId, studyYear);
}
