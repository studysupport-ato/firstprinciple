import type { ResendConfiguration } from "./config";

export type ResendSubmission =
  | { status: "provider_accepted"; messageId: string }
  | { status: "failed"; error: string }
  | { status: "uncertain"; error: string };

type ResendResponse = { id?: unknown };

export async function submitBrandedEmail(
  configuration: ResendConfiguration,
  input: { recipient: string; subject: string; html: string },
  request: typeof fetch = fetch,
): Promise<ResendSubmission> {
  let response: Response;
  try {
    response = await request("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: configuration.sender,
        to: [input.recipient],
        subject: input.subject,
        html: input.html,
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    const timeout = error instanceof Error && error.name === "TimeoutError";
    return {
      status: "uncertain",
      error: timeout
        ? "The provider request timed out; check campaign status before retrying."
        : "The provider connection failed; check campaign status before retrying.",
    };
  }

  let result: ResendResponse;
  try {
    result = await response.json() as ResendResponse;
  } catch {
    return response.ok
      ? { status: "uncertain", error: "Resend responded without a usable message ID." }
      : { status: "failed", error: `Resend rejected the email (HTTP ${response.status}).` };
  }

  if (!response.ok) {
    return response.status >= 500
      ? { status: "uncertain", error: `Resend returned HTTP ${response.status}; verify provider status before retrying.` }
      : { status: "failed", error: `Resend rejected the email (HTTP ${response.status}). Check sender and provider configuration.` };
  }

  if (typeof result.id !== "string" || !result.id) {
    return { status: "uncertain", error: "Resend accepted the request without a usable message ID." };
  }
  return { status: "provider_accepted", messageId: result.id };
}
