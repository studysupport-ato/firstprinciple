/**
 * Validates and normalizes notification click destination URLs.
 * Ensures the target URL is strictly same-origin to prevent open redirects.
 */
export function sanitizeNotificationUrl(rawUrl: unknown, baseOrigin: string): string {
  const fallback = `${baseOrigin.replace(/\/+$/, "")}/dashboard`;

  if (!rawUrl || typeof rawUrl !== "string") {
    return fallback;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith("javascript:") || trimmed.startsWith("data:") || trimmed.startsWith("vbscript:")) {
    return fallback;
  }

  try {
    // If it's a relative path starting with '/', resolve against baseOrigin
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      const resolved = new URL(trimmed, baseOrigin);
      return resolved.origin === new URL(baseOrigin).origin ? resolved.toString() : fallback;
    }

    // If it's an absolute URL, strictly verify origin match
    const parsed = new URL(trimmed);
    const parsedBase = new URL(baseOrigin);
    if (parsed.origin === parsedBase.origin) {
      return parsed.toString();
    }
  } catch {
    return fallback;
  }

  return fallback;
}
