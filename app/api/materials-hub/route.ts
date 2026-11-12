import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import { createCourseMaterialsSupabaseRepository } from "@/lib/courseMaterialsRepository";

/**
 * Everything students can see on the Materials pages (published programmes and entries), as one
 * shared copy cached by the CDN for two minutes. Students get this copy instead of each asking the
 * database, and a new upload shows within about two minutes.
 */
export async function GET() {
  try {
    const repository = createCourseMaterialsSupabaseRepository(createSupabaseAdminClient);
    const [departments, entries] = await Promise.all([
      repository.listDepartments({ visibility: "student" }),
      repository.listCourseMaterials({ visibility: "student" }),
    ]);
    return NextResponse.json(
      { departments, entries },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=600" } },
    );
  } catch {
    return NextResponse.json({ error: "Unable to load materials." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
