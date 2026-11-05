/**
 * Course rep updates for the site owner only: an email to his address and a
 * phone notification to the devices of his signed-in student account.
 * Nobody else receives these.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import { getResendConfiguration } from "@/lib/emailCampaigns/config";
import { submitBrandedEmail } from "@/lib/emailCampaigns/resendProvider";
import { getServerVapidConfig, isPushServerConfigured } from "@/lib/push/config";
import { sendOneNotification } from "@/lib/push/dispatch";

if (typeof window !== "undefined") throw new Error("lib/courseReps/adminUpdates.ts is server-only.");

export const OWNER_EMAIL = "atokessilfie@gmail.com";
const SITE = "https://www.b2bwithkwamina.com";

function db() {
  return createSupabaseAdminClient() as unknown as { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

/** Email + phone notification to the owner. Never throws. */
export async function tellOwner(update: { subject: string; lines: string[]; pushTitle: string; pushBody: string; path?: string }) {
  const path = update.path ?? "/admin/course-reps";
  try {
    const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#1A1814">
      <h2 style="margin:0 0 12px">${escapeHtml(update.subject)}</h2>
      ${update.lines.map((l) => `<p style="margin:0">${escapeHtml(l)}</p>`).join("")}
      <p style="margin:18px 0 0"><a href="${SITE}${path}" style="display:inline-block;background:#1A1814;color:#E9BC3A;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Open Course Reps</a></p>
    </div>`;
    await submitBrandedEmail(getResendConfiguration(), { recipient: OWNER_EMAIL, subject: update.subject, html });
  } catch (error) {
    console.error("[owner-update] email failed", error instanceof Error ? error.message : "unknown");
  }
  try {
    if (!isPushServerConfigured()) return;
    const { data: student } = await db().from("students").select("id").ilike("email", OWNER_EMAIL).maybeSingle();
    if (!student?.id) return;
    const { data: subs } = await db().from("student_push_subscriptions").select("id,endpoint,p256dh,auth").eq("student_id", student.id).eq("status", "active");
    const payload = JSON.stringify({ title: update.pushTitle.slice(0, 120), body: update.pushBody.slice(0, 200), icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: "course-rep-admin", url: `${SITE}${path}`, data: { url: `${SITE}${path}` } });
    const vapid = getServerVapidConfig();
    await Promise.all(((subs ?? []) as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>).map((s) => sendOneNotification(s, payload, vapid)));
  } catch (error) {
    console.error("[owner-update] push failed", error instanceof Error ? error.message : "unknown");
  }
}
