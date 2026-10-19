import { createHmac } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAdminConfig } from "@/lib/supabase/config";
import { consumePasswordRecoveryRateLimit } from "@/lib/auth/passwordRecoveryRateLimit";
import { getEmailPublicConfiguration, getResendConfiguration } from "@/lib/emailCampaigns/config";
import { submitBrandedEmail } from "@/lib/emailCampaigns/resendProvider";
import { createPasswordRecoveryUrl, renderPasswordRecoveryEmail } from "@/lib/auth/passwordRecoveryEmail";
import { createSupabaseAdminClient } from "@/lib/supabase/client";

const acceptedMessage = "If an account matches that email, a password reset link will be sent shortly.";

function response(message: string, status = 200) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response("Enter a valid email address.", 400);
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("email" in body) ||
    typeof body.email !== "string" ||
    body.email.trim().length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
  ) {
    return response("Enter a valid email address.", 400);
  }

  const email = body.email.trim().toLowerCase();

  try {
    const adminConfig = getSupabaseAdminConfig();
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ipAddress = request.headers.get("x-real-ip")?.trim() || forwardedFor || "unknown";
    const hmac = (value: string) =>
      createHmac("sha256", adminConfig.secretKey).update(value).digest("hex");
    const admin = createSupabaseAdminClient();
    const { data: allowed, error: rateLimitError } = await consumePasswordRecoveryRateLimit(admin, {
      p_email_key: hmac(`email:${email}`),
      p_ip_key: hmac(`ip:${ipAddress}`),
    });
    if (rateLimitError) {
      console.error("[password recovery] Rate limit check failed:", rateLimitError);
      return response("Password reset is temporarily unavailable. Please try again later.", 503);
    }
    if (!allowed) {
      return response("Too many password reset requests. Please try again later.", 429);
    }

    const emailConfiguration = getEmailPublicConfiguration();
    const resendConfiguration = getResendConfiguration();
    if (!emailConfiguration.platformUrl) {
      throw new Error("A public HTTPS platform URL is required to send password recovery links.");
    }
    const confirmationUrl = new URL("/auth/confirm", emailConfiguration.platformUrl).toString();

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: confirmationUrl },
    });

    if (error) {
      console.error("[password recovery] Supabase could not generate a recovery link.");
      return response(acceptedMessage, 202);
    }

    const tokenHash = data.properties?.hashed_token;
    if (!tokenHash) {
      console.error("[password recovery] Supabase returned no recovery token.");
      return response(acceptedMessage, 202);
    }

    const recoveryUrl = createPasswordRecoveryUrl(emailConfiguration.platformUrl, tokenHash);
    const result = await submitBrandedEmail(
      resendConfiguration,
      {
        recipient: email,
        subject: "Reset your First Principles password",
        html: renderPasswordRecoveryEmail({
          recoveryUrl,
          logoUrl: emailConfiguration.logoUrl,
        }),
      },
    );

    if (result.status !== "provider_accepted") {
      console.error("[password recovery] Email provider did not accept the recovery email:", result.error);
      return response(acceptedMessage, 202);
    }

    return response(acceptedMessage, 202);
  } catch (error) {
    console.error("[password recovery] Recovery email could not be sent:", error);
    return response(acceptedMessage, 202);
  }
}
