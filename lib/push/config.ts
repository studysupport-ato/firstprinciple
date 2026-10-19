if (typeof window !== "undefined") {
  throw new Error("[Back2Basics with Kwamina] lib/push/config.ts is server-only and must never be bundled into client code.");
}

import webpush from "web-push";
import type { VapidConfig } from "./types";

export class VapidConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VapidConfigurationError";
  }
}

/**
 * Validates the VAPID subject claim according to RFC 8292.
 * The subject MUST be either a mailto: URI or an https: URL.
 */
export function validateVapidSubject(subject: string | undefined): { ok: true; subject: string } | { ok: false; error: string } {
  if (!subject || typeof subject !== "string" || !subject.trim()) {
    return {
      ok: false,
      error: "VAPID_SUBJECT is missing. Set a valid contact URI (e.g. mailto:notifications@b2bwithkwamina.com).",
    };
  }

  const trimmed = subject.trim();
  if (!trimmed.startsWith("mailto:") && !trimmed.startsWith("https://")) {
    return {
      ok: false,
      error: "VAPID_SUBJECT must be a valid 'mailto:' or 'https://' URI.",
    };
  }

  if (trimmed.startsWith("mailto:")) {
    const email = trimmed.slice(7).trim();
    // Basic email structure check
    if (!email || !email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
      return {
        ok: false,
        error: "VAPID_SUBJECT mailto URI must include a valid email address.",
      };
    }
  } else {
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "https:") {
        return {
          ok: false,
          error: "VAPID_SUBJECT URL must use the https protocol.",
        };
      }
    } catch {
      return {
        ok: false,
        error: "VAPID_SUBJECT is not a valid URL.",
      };
    }
  }

  return { ok: true, subject: trimmed };
}

/**
 * Validates the public and private VAPID keys.
 * Note: Error messages must NEVER echo the private key value.
 */
export function validateVapidKeys(
  publicKey: string | undefined,
  privateKey: string | undefined,
): { ok: true; publicKey: string; privateKey: string } | { ok: false; error: string } {
  if (!publicKey || typeof publicKey !== "string" || !publicKey.trim()) {
    return {
      ok: false,
      error: "NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing. Configure VAPID keys before enabling push.",
    };
  }

  if (!privateKey || typeof privateKey !== "string" || !privateKey.trim()) {
    return {
      ok: false,
      error: "VAPID_PRIVATE_KEY is missing. Configure VAPID keys before enabling push.",
    };
  }

  const trimmedPublic = publicKey.trim();
  const trimmedPrivate = privateKey.trim();

  // Test decoding via webpush to ensure valid curve25519 / P-256 keys
  try {
    webpush.setVapidDetails("mailto:test@example.com", trimmedPublic, trimmedPrivate);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Invalid key structure";
    return {
      ok: false,
      error: `Malformed VAPID key material: ${reason}. Check that both keys are valid base64url-encoded strings.`,
    };
  }

  return { ok: true, publicKey: trimmedPublic, privateKey: trimmedPrivate };
}

/**
 * Loads and validates server-side VAPID configuration.
 * Throws a VapidConfigurationError if any variable is missing or malformed.
 */
export function getServerVapidConfig(): VapidConfig {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  const keyResult = validateVapidKeys(publicKey, privateKey);
  if (!keyResult.ok) {
    throw new VapidConfigurationError(keyResult.error);
  }

  const subjectResult = validateVapidSubject(subject);
  if (!subjectResult.ok) {
    throw new VapidConfigurationError(subjectResult.error);
  }

  return {
    publicKey: keyResult.publicKey,
    privateKey: keyResult.privateKey,
    subject: subjectResult.subject,
  };
}

/**
 * Safe checker to test if push notifications are fully configured on the server.
 * Does not throw; returns false if any required environment variable is missing or invalid.
 */
export function isPushServerConfigured(): boolean {
  try {
    getServerVapidConfig();
    return true;
  } catch {
    return false;
  }
}
