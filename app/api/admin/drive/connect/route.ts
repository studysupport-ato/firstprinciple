import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminSession";
import { buildConsentUrl } from "@/lib/courseReps/googleDrive";

export const dynamic = "force-dynamic";

/** Admin only: sends the admin to Google to connect the Back2Basics Drive. */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.redirect(new URL("/admin/login", "https://www.b2bwithkwamina.com"));
  }
  const state = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(buildConsentUrl(state));
  response.cookies.set("b2b_drive_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/admin/drive", maxAge: 600 });
  return response;
}
