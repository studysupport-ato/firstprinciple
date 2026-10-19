import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function recoveryRedirect(request: NextRequest, result: "success" | "error") {
  const destination = new URL("/reset-password", request.url);
  if (result === "success") {
    destination.searchParams.set("recovery", "1");
  } else {
    destination.searchParams.set("error", "recovery-link-invalid");
  }
  return NextResponse.redirect(destination);
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (!tokenHash || type !== "recovery") {
    return recoveryRedirect(request, "error");
  }

  try {
    const supabase = await createSupabaseServerClient({
      route: "auth-recovery-confirm",
      requestId: crypto.randomUUID(),
      sampled: false,
    });
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });

    if (error) {
      console.warn("[auth recovery callback] Recovery link verification failed.");
      return recoveryRedirect(request, "error");
    }

    return recoveryRedirect(request, "success");
  } catch (error) {
    console.error("[auth recovery callback] Could not complete recovery verification:", error);
    return recoveryRedirect(request, "error");
  }
}
