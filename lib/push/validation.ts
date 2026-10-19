import type { ClientPushSubscriptionPayload } from "./types";

export type PushValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function validateSubscriptionEndpoint(endpoint: unknown): PushValidationResult<string> {
  if (!endpoint || typeof endpoint !== "string") {
    return { ok: false, error: "A valid subscription endpoint is required." };
  }
  const trimmed = endpoint.trim();
  if (trimmed.length > 2048) {
    return { ok: false, error: "Subscription endpoint exceeds allowed length." };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      return { ok: false, error: "Subscription endpoint must use secure HTTPS." };
    }
  } catch {
    return { ok: false, error: "Subscription endpoint is not a valid URL." };
  }
  return { ok: true, data: trimmed };
}

export function validateSubscriptionKeys(
  keys: unknown,
): PushValidationResult<{ p256dh: string; auth: string }> {
  if (!keys || typeof keys !== "object") {
    return { ok: false, error: "Subscription key material is missing." };
  }
  const rec = keys as Record<string, unknown>;
  if (typeof rec.p256dh !== "string" || !rec.p256dh.trim()) {
    return { ok: false, error: "p256dh public key is required." };
  }
  if (typeof rec.auth !== "string" || !rec.auth.trim()) {
    return { ok: false, error: "auth authentication secret is required." };
  }

  const p256dh = rec.p256dh.trim();
  const auth = rec.auth.trim();

  if (p256dh.length > 500 || auth.length > 500) {
    return { ok: false, error: "Subscription key material exceeds allowed length." };
  }

  return { ok: true, data: { p256dh, auth } };
}

export function validateSubscriptionPayload(
  input: unknown,
): PushValidationResult<ClientPushSubscriptionPayload> {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Subscription payload is required." };
  }
  const rec = input as Record<string, unknown>;

  const endpointRes = validateSubscriptionEndpoint(rec.endpoint);
  if (!endpointRes.ok) return endpointRes;

  const keysRes = validateSubscriptionKeys(rec.keys);
  if (!keysRes.ok) return keysRes;

  const userAgent =
    typeof rec.userAgent === "string" ? rec.userAgent.trim().slice(0, 500) : null;

  return {
    ok: true,
    data: {
      endpoint: endpointRes.data,
      keys: keysRes.data,
      userAgent,
    },
  };
}
