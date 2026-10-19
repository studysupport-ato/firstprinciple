import {
  normalizePublicHttpsUrl,
} from "./template";
import type { EmailPublicConfiguration } from "./types";
import { isValidEmailAddress } from "./validation";

export type ResendConfiguration = {
  apiKey: string;
  sender: string;
};

export function getEmailPublicConfiguration(): EmailPublicConfiguration {
  const logoValue = process.env.FIRST_PRINCIPLES_EMAIL_LOGO_URL;
  const logoUrl = normalizePublicHttpsUrl(logoValue);
  const platformUrl = normalizePublicHttpsUrl(
    process.env.FIRST_PRINCIPLES_PLATFORM_URL || process.env.NEXT_PUBLIC_SITE_URL,
  );
  const senderAddress = process.env.RESEND_FROM_EMAIL?.trim() ?? "";
  const senderReady = isValidEmailAddress(senderAddress);
  const providerReady = Boolean(process.env.RESEND_API_KEY?.trim()) && senderReady;
  const missing: string[] = [];

  if (!logoUrl) missing.push("FIRST_PRINCIPLES_EMAIL_LOGO_URL (public HTTPS URL)");
  if (!senderReady) missing.push("RESEND_FROM_EMAIL (verified sender address)");
  if (!process.env.RESEND_API_KEY?.trim()) missing.push("RESEND_API_KEY");

  return { logoUrl, platformUrl, logoReady: Boolean(logoUrl), senderReady, providerReady, missing };
}

export function getResendConfiguration(): ResendConfiguration {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const senderAddress = process.env.RESEND_FROM_EMAIL?.trim();
  const configuredSenderName = (process.env.RESEND_FROM_NAME?.trim() || "First Principles · Math 151")
    .replace(/[\r\n<>]/g, "")
    .trim()
    .slice(0, 80);
  const senderName = configuredSenderName || "First Principles · Math 151";
  const configuration = getEmailPublicConfiguration();
  if (!apiKey || !senderAddress || !configuration.senderReady) {
    throw new Error("Email sending is not configured. Set RESEND_API_KEY and a verified RESEND_FROM_EMAIL.");
  }
  if (!configuration.logoReady) {
    throw new Error("Email sending requires FIRST_PRINCIPLES_EMAIL_LOGO_URL to point to the public HTTPS First Principles logo.");
  }
  return { apiKey, sender: `${senderName} <${senderAddress}>` };
}
