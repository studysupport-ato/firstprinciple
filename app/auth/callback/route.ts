import { NextResponse, type NextRequest } from "next/server";

import { completeOAuthCallback, isOAuthStudentMappingValid } from "@/lib/auth/oauthCallback";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const result = await completeOAuthCallback(
    {
      code: request.nextUrl.searchParams.get("code"),
      next: request.nextUrl.searchParams.get("next"),
      error: request.nextUrl.searchParams.get("error"),
    },
    async (code) => {
      const supabase = await createSupabaseServerClient({
        route: "auth-oauth-callback",
        requestId: crypto.randomUUID(),
        sampled: false,
      });
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.session) return false;

      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("auth_user_id", data.session.user.id)
        .maybeSingle();
      if (studentError || !student) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          console.error("[auth oauth callback] Could not clear a session without a student profile.");
        }
        return false;
      }

      const requiresGoogleIdentity = request.nextUrl.searchParams.get("link") === "google";
      let identityProviders: string[] = [];
      if (requiresGoogleIdentity) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) return false;
        identityProviders = userData.user.identities?.map((identity) => identity.provider) ?? [];
      }

      return isOAuthStudentMappingValid({
        studentMappingFound: Boolean(student),
        identityProviders,
        requiredProvider: requiresGoogleIdentity ? "google" : undefined,
      });
    },
  );

  return NextResponse.redirect(new URL(result.destination, request.url));
}
