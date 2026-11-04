/**
 * Phone notifications for course rep uploads.
 *
 * A phone registers for one programme + year. When a course rep for that
 * programme and year adds slides, books or videos, every registered phone
 * gets a notification that opens the new material.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import { getServerVapidConfig, isPushServerConfigured } from "@/lib/push/config";
import { sendOneNotification } from "@/lib/push/dispatch";
import { validateSubscriptionEndpoint, validateSubscriptionKeys } from "@/lib/push/validation";

if (typeof window !== "undefined") throw new Error("lib/courseReps/uploadPush.ts is server-only.");

const TABLE = "materials_push_subscriptions";
const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.b2bwithkwamina.com";

function db() {
  return createSupabaseAdminClient() as unknown as { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export async function saveUploadSubscription(input: { endpoint: unknown; keys: unknown; departmentId: unknown; studyYear: unknown; userId: string | null }) {
  const endpoint = validateSubscriptionEndpoint(input.endpoint);
  if (!endpoint.ok) throw new Error(endpoint.error);
  const keys = validateSubscriptionKeys(input.keys);
  if (!keys.ok) throw new Error(keys.error);
  const departmentId = typeof input.departmentId === "string" ? input.departmentId.trim().slice(0, 120) : "";
  const studyYear = Number(input.studyYear);
  if (!departmentId || !Number.isInteger(studyYear) || studyYear < 1 || studyYear > 6) throw new Error("Choose your programme and year first.");
  const { data: dept } = await db().from("departments").select("id,status").eq("id", departmentId).maybeSingle();
  if (!dept || dept.status !== "published") throw new Error("Choose your programme and year first.");
  const { error } = await db()
    .from(TABLE)
    .upsert({ endpoint: endpoint.data, p256dh: keys.data.p256dh, auth: keys.data.auth, department_id: departmentId, study_year: studyYear, user_id: input.userId, failed_attempts: 0, updated_at: new Date().toISOString() }, { onConflict: "endpoint" });
  if (error) throw new Error("Could not switch on notifications.");
}

export async function removeUploadSubscription(endpoint: unknown) {
  const valid = validateSubscriptionEndpoint(endpoint);
  if (!valid.ok) return;
  await db().from(TABLE).delete().eq("endpoint", valid.data);
}

export async function isUploadSubscriptionActive(endpoint: unknown, departmentId: string, studyYear: number) {
  const valid = validateSubscriptionEndpoint(endpoint);
  if (!valid.ok) return false;
  const { data } = await db().from(TABLE).select("department_id,study_year").eq("endpoint", valid.data).maybeSingle();
  return Boolean(data && data.department_id === departmentId && data.study_year === studyYear);
}

/** Tell every phone registered for this programme and year. Never throws: an upload must not fail because of a notification. */
export async function notifyRepUpload(upload: { departmentId: string; studyYear: number; courseId: string; courseTitle: string; title: string; kind: "slides" | "books" | "videos" }) {
  try {
    if (!isPushServerConfigured()) return;
    const vapid = getServerVapidConfig();
    const { data } = await db().from(TABLE).select("endpoint,p256dh,auth,failed_attempts").eq("department_id", upload.departmentId).eq("study_year", upload.studyYear).limit(5000);
    const subs = (data ?? []) as Array<{ endpoint: string; p256dh: string; auth: string; failed_attempts: number }>;
    if (!subs.length) return;
    const what = upload.kind === "books" ? "book" : upload.kind === "videos" ? "videos" : "slides";
    const path = `/materials-hub?course=${encodeURIComponent(upload.courseId)}&view=${upload.kind}`;
    const payload = JSON.stringify({
      title: `New ${what} from your course rep`,
      body: `${upload.courseTitle}: ${upload.title}. Tap to open.`.slice(0, 200),
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: `rep-upload-${upload.courseId}`,
      url: `${SITE}${path}`,
      data: { url: `${SITE}${path}` },
    });
    const queue = [...subs];
    const worker = async () => {
      for (let sub = queue.shift(); sub; sub = queue.shift()) {
        const outcome = await sendOneNotification({ id: sub.endpoint, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, payload, vapid);
        if (outcome.kind === "expired_endpoint" || (outcome.kind !== "success" && sub.failed_attempts >= 4)) {
          await db().from(TABLE).delete().eq("endpoint", sub.endpoint);
        } else if (outcome.kind !== "success") {
          await db().from(TABLE).update({ failed_attempts: sub.failed_attempts + 1 }).eq("endpoint", sub.endpoint);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(10, subs.length) }, worker));
  } catch (error) {
    console.error("[rep-upload-push]", error instanceof Error ? error.message : "failed");
  }
}
