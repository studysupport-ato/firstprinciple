import type { SmsProviderConfiguration } from "./arkeselProvider";
import type { SmsPublicConfiguration } from "./types";

export function isValidArkeselSender(value: unknown): value is string {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= 11 &&
    !/[\r\n<>]/.test(value);
}

export function getSmsPublicConfiguration(): SmsPublicConfiguration {
  const sender = process.env.ARKESEL_SENDER_ID?.trim() ?? "";
  const apiReady = Boolean(process.env.ARKESEL_API_KEY?.trim());
  const callbackReady = Boolean(process.env.ARKESEL_CALLBACK_URL?.trim());
  const webhookReady = Boolean(process.env.ARKESEL_WEBHOOK_SECRET?.trim());
  const missing: string[] = [];
  if (!apiReady) missing.push("ARKESEL_API_KEY");
  if (!isValidArkeselSender(sender)) missing.push("ARKESEL_SENDER_ID (1–11 characters, approved by Arkesel)");
  if (!callbackReady) missing.push("ARKESEL_CALLBACK_URL (public HTTPS callback)");
  if (!webhookReady) missing.push("ARKESEL_WEBHOOK_SECRET (Arkesel webhook signing secret)");
  return {
    senderName: sender || "Not configured",
    senderReady: isValidArkeselSender(sender),
    apiReady,
    callbackReady,
    webhookReady,
    missing,
  };
}

export function getArkeselConfiguration(): SmsProviderConfiguration {
  const apiKey = process.env.ARKESEL_API_KEY?.trim();
  const sender = process.env.ARKESEL_SENDER_ID?.trim();
  const callbackUrl = process.env.ARKESEL_CALLBACK_URL?.trim();
  const webhookSecret = process.env.ARKESEL_WEBHOOK_SECRET?.trim();
  const publicConfig = getSmsPublicConfiguration();
  if (!apiKey) throw new Error("SMS sending is not configured: ARKESEL_API_KEY is required.");
  if (!sender || !isValidArkeselSender(sender)) {
    throw new Error("SMS sending is not configured: set an Arkesel-approved ARKESEL_SENDER_ID of 1–11 characters.");
  }
  if (!callbackUrl || !isPublicHttpsUrl(callbackUrl)) {
    throw new Error("SMS sending is not configured: set ARKESEL_CALLBACK_URL to a public HTTPS delivery callback.");
  }
  if (!webhookSecret) throw new Error("SMS sending is not configured: ARKESEL_WEBHOOK_SECRET is required for authenticated delivery reports.");
  if (!publicConfig.apiReady) throw new Error("SMS sending is not configured.");
  return { apiKey, sender, callbackUrl };
}

function isPublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}
