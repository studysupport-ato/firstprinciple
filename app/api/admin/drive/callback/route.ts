import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/adminSession";
import { MissingDriveScopeError, SITE_ORIGIN, completeConnection } from "@/lib/courseReps/googleDrive";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const back = (result: string) => NextResponse.redirect(new URL(`/admin/course-reps?drive=${result}`, SITE_ORIGIN));
  try {
    await requireAdmin();
  } catch {
    return NextResponse.redirect(new URL("/admin/login", SITE_ORIGIN));
  }
  const store = await cookies();
  const expected = store.get("b2b_drive_state")?.value;
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  if (!expected || !state || state !== expected || !code) return back("failed");
  try {
    await completeConnection(code);
  } catch (error) {
    if (error instanceof MissingDriveScopeError) return back("noscope");
    console.error("[drive connect]", error);
    return back("failed");
  }
  const response = back("connected");
  response.cookies.set("b2b_drive_state", "", { path: "/api/admin/drive", maxAge: 0 });
  return response;
}
