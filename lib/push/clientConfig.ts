import type { PublicPushConfig } from "./types";

/**
 * Returns the public VAPID key configured for the browser.
 * Safe to import in client components as it only accesses NEXT_PUBLIC_ variables.
 */
export function getClientPushConfig(): PublicPushConfig {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null;
  return {
    publicKey,
    configured: Boolean(publicKey),
  };
}
