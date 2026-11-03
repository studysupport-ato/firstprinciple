import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/adminSession";
import { isAllowlistedAdminUser } from "@/lib/lessonUnlock";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * True when the visitor is signed in to the admin panel, or signed in to the
 * student portal with an account on the admin allowlist.
 */
export async function isAdminVisitor(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    if (verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value) !== null) return true;
  } catch {
    /* fall through to the student check */
  }
  try {
    const client = await createSupabaseServerClient();
    const { data } = await client.auth.getUser();
    return data.user ? await isAllowlistedAdminUser(data.user.id) : false;
  } catch {
    return false;
  }
}
