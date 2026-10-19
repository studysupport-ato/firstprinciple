import { NextResponse, type NextRequest } from "next/server";

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
    const emailConfiguration = getEmailPublicConfiguration();
    const resendConfiguration = getResendConfiguration();
    if (!emailConfiguration.platformUrl) {
      throw new Error("A public HTTPS platform URL is required to send password recovery links.");
    }
    const confirmationUrl = new URL("/auth/confirm", emailConfiguration.platformUrl).toString();

    const { data, error } = await createSupabaseAdminClient().auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: confirmationUrl },
    });

    if (error) {
      console.error("[password recovery] Supabase could not generate a recovery link.");
      return response("Password reset is temporarily unavailable. Please try again later.", 503);
    }

    const tokenHash = data.properties?.hashed_token;
    if (!tokenHash) {
      console.error("[password recovery] Supabase returned no recovery token.");
      return response("Password reset is temporarily unavailable. Please try again later.", 503);
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
      return response("Password reset is temporarily unavailable. Please try again later.", 503);
    }

    return response(acceptedMessage, 202);
  } catch (error) {
    console.error("[password recovery] Recovery email could not be sent:", error);
    return response("Password reset is temporarily unavailable. Please try again later.", 503);
  }
}
