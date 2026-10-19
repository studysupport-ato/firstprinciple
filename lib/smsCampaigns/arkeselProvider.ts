export const ARKESEL_SMS_ENDPOINT = "https://sms.arkesel.com/api/v2/sms/send";

export type SmsProviderConfiguration = {
  apiKey: string;
  sender: string;
  callbackUrl: string;
};

export type ArkeselAcceptedRecipient = {
  phoneNumber: string;
  providerReference: string;
};

export type ArkeselSubmission =
  | { status: "provider_accepted"; recipients: ArkeselAcceptedRecipient[] }
  | { status: "failed"; error: string }
  | { status: "uncertain"; error: string };

type ArkeselResponse = {
  status?: unknown;
  data?: unknown;
};

function safeArkeselRecipient(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/^\+/, "");
  return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
}

export async function submitArkeselSmsBatch(
  configuration: SmsProviderConfiguration,
  input: { recipients: Array<{ phoneNumber: string }>; message: string },
  request: typeof fetch = fetch,
): Promise<ArkeselSubmission> {
  if (!input.recipients.length) return { status: "failed", error: "No valid SMS recipients were supplied." };
  try {
    const response = await request(ARKESEL_SMS_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": configuration.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: configuration.sender,
        recipients: input.recipients.map(({ phoneNumber }) => phoneNumber.replace(/^\+/, "")),
        message: input.message,
        callback_url: configuration.callbackUrl,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    let body: ArkeselResponse;
    try {
      body = await response.json() as ArkeselResponse;
    } catch {
      return response.ok
        ? { status: "uncertain", error: "Arkesel responded without a usable result; check delivery status before retrying." }
        : response.status >= 500
          ? { status: "uncertain", error: `Arkesel returned HTTP ${response.status}; check status before retrying.` }
          : { status: "failed", error: `Arkesel rejected the SMS request (HTTP ${response.status}).` };
    }

    if (!response.ok) {
      return response.status >= 500 || response.status === 408 || response.status === 429
        ? { status: "uncertain", error: `Arkesel returned HTTP ${response.status}; check status before retrying.` }
        : { status: "failed", error: `Arkesel rejected the SMS request (HTTP ${response.status}). Check sender, balance, and request configuration.` };
    }
    if (body.status !== "success" || !Array.isArray(body.data)) {
      return { status: "uncertain", error: "Arkesel response could not be matched to recipients; check delivery status before retrying." };
    }

    const accepted = body.data.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      const phoneNumber = safeArkeselRecipient(record.recipient);
      if (!phoneNumber || typeof record.id !== "string" || !record.id.trim()) return [];
      return [{ phoneNumber, providerReference: record.id.trim() }];
    });
    if (!accepted.length) {
      return { status: "uncertain", error: "Arkesel did not return a matching recipient reference; check provider status before retrying." };
    }
    return { status: "provider_accepted", recipients: accepted };
  } catch (error) {
    const timeout = error instanceof Error && error.name === "TimeoutError";
    return {
      status: "uncertain",
      error: timeout
        ? "Arkesel request timed out; check status before retrying."
        : "Arkesel connection failed; check status before retrying.",
    };
  }
}
