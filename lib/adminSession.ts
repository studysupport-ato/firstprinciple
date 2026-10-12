import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * ============================================================================
 * Task 40G.9 — server-verifiable Admin session (the ONLY authorization source).
 * ============================================================================
 *
 * ADMIN_SESSION_SECRET is the signing key for the admin session cookie.
 * There is no suitable pre-existing project secret, so this environment
 * variable must be provided by the deployment (fail-closed when missing):
 *
 *   - The cookie is HMAC-SHA256 signed; the client cannot forge it without
 *     the server-side secret.
 *   - The cookie never contains the admin password or the secret itself.
 *   - localStorage (`lib/adminAuth.ts`) is UX only and is NEVER read here.
 *
 * Canonical guard: requireAdmin() — called from lib/adminContentActions.ts
 * before any privileged adminService / adminRepository operation.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "[Back2Basics with Kwamina] lib/adminSession.ts is server-only and must never be bundled into client code.",
  );
}

export const ADMIN_SESSION_COOKIE = "fp_admin_session";
/** Explicit session lifetime: 8 hours. */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
/** Thrown when no valid, signed, unexpired admin session cookie is present. */
export class AdminUnauthorizedError extends Error {
  constructor(message = "A valid admin session is required.") {
    super(message);
    this.name = "AdminUnauthorizedError";
  }
}

export interface AdminSession {
  /** Server-derived identity — always "admin"; never taken from the client. */
  readonly subject: "admin";
  /** Unix seconds. */
  readonly expiresAt: number;
}

function getAdminSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "Admin session is not configured: the ADMIN_SESSION_SECRET environment variable is required.",
    );
  }
  return secret;
}

function toBase64Url(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url");
}

function signPayload(payload: string): string {
  return toBase64Url(createHmac("sha256", getAdminSessionSecret()).update(payload).digest());
}

/** Constant-time string comparison (hashes first, so lengths never leak). */
export function timingSafeStringEquals(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

/** Create a fresh signed session token. Throws when ADMIN_SESSION_SECRET is missing. */
export function createAdminSessionToken(nowMs: number = Date.now()): string {
  const payload = toBase64Url(
    JSON.stringify({
      v: 1,
      subject: "admin",
      exp: Math.floor(nowMs / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
    }),
  );
  return `${payload}.${signPayload(payload)}`;
}

/**
 * Verify signature, format and expiration. Returns null (deny) for anything
 * invalid — absent, malformed, tampered, wrongly signed or expired.
 */
export function verifyAdminSessionToken(raw: string | undefined | null): AdminSession | null {
  if (!raw) return null;
  try {
    const separatorIndex = raw.lastIndexOf(".");
    if (separatorIndex <= 0 || separatorIndex === raw.length - 1) return null;

    const payload = raw.slice(0, separatorIndex);
    const signature = raw.slice(separatorIndex + 1);
    const expectedSignature = signPayload(payload);

    const signatureBuf = Buffer.from(signature, "utf8");
    const expectedBuf = Buffer.from(expectedSignature, "utf8");
    if (signatureBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(signatureBuf, expectedBuf)) return null;

    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      v?: unknown;
      subject?: unknown;
      exp?: unknown;
    };
    if (claims.v !== 1 || claims.subject !== "admin") return null;
    if (typeof claims.exp !== "number" || claims.exp <= Math.floor(Date.now() / 1000)) return null;

    return { subject: "admin", expiresAt: claims.exp };
  } catch {
    return null;
  }
}

/**
 * THE canonical guard. Reads the admin session cookie server-side, validates
 * cryptographic integrity + expiration, and returns the trusted session or
 * throws AdminUnauthorizedError. Every privileged admin Server Action passes
 * through this function before touching adminService / adminRepository.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const cookieStore = await cookies();
  const session = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) {
    throw new AdminUnauthorizedError();
  }
  return session;
}

/** Called by adminLoginAction after server-side credential verification. */
export async function establishAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
}

/** Called by adminLogoutAction — clears the admin session cookie server-side. */
export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
