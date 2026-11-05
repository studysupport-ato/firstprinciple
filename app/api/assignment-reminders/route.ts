/**
 * POST /api/assignment-reminders
 * Sends the phone reminders students asked for on assignments.
 * Called every 5 minutes by Supabase (pg_cron + pg_net) with
 * Authorization: Bearer <ASSIGNMENT_REMINDER_SECRET>.
 */
import { type NextRequest, NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/courseReps/assignments";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = process.env.ASSIGNMENT_REMINDER_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token.length !== secret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) mismatch |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  return mismatch === 0;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await sendDueReminders();
    return NextResponse.json({ ok: true, sent: result.sent });
  } catch (error) {
    console.error("[assignment-reminders]", error instanceof Error ? error.message : "failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
