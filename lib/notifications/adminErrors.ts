const ANNOUNCEMENT_REQUEST_TIMEOUT_MS = 10_000;

export function announcementRequestSignal(): AbortSignal {
  return AbortSignal.timeout(ANNOUNCEMENT_REQUEST_TIMEOUT_MS);
}

export function getAnnouncementOperationError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return typeof error === "string" && error.trim()
      ? error
      : "The notification operation failed.";
  }

  const detail = error as { name?: unknown; message?: unknown; details?: unknown; code?: unknown };
  const message = typeof detail.message === "string" ? detail.message : "";
  const details = typeof detail.details === "string" ? detail.details : "";
  const code = typeof detail.code === "string" ? detail.code : "";
  const diagnostic = `${message}\n${details}\n${code}`.toLowerCase();

  if (
    detail.name === "TimeoutError" ||
    detail.name === "AbortError" ||
    diagnostic.includes("aborterror") ||
    diagnostic.includes("timed out") ||
    diagnostic.includes("timeout")
  ) {
    return "The database request timed out. Check recent announcements before retrying; the write may have completed.";
  }

  if (
    diagnostic.includes("fetch failed") ||
    diagnostic.includes("networkerror") ||
    diagnostic.includes("nghttp2_protocol_error") ||
    diagnostic.includes("err_http2_stream_error")
  ) {
    return "The connection to Supabase failed before completion. Check recent announcements before retrying to avoid a duplicate send.";
  }

  if (message.trim()) return message;
  if (typeof error.toString === "function") {
    const formatted = error.toString();
    if (formatted && formatted !== "[object Object]") return formatted;
  }
  return "The notification operation failed.";
}
