/**
 * Supabase configuration boundary (Task 25 — foundation only).
 *
 * Conceptual layering:
 *
 *   UI
 *    ↓
 *   existing access/repository layers (lib/content/*, lib/progress/*)  ← unchanged
 *    ↓
 *   future Supabase repositories (not implemented yet)
 *    ↓
 *   lib/supabase/* (this module — the only place that knows about Supabase)
 *
 * Nothing in the application reads or writes through Supabase yet.
 * This module only establishes configuration, env-variable naming, and the
 * client factory seams so future repository work has a single boundary.
 *
 * Key naming follows the current official @supabase/supabase-js v2 conventions:
 *   - NEXT_PUBLIC_SUPABASE_URL            public project URL
 *   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY publishable (formerly "anon") key
 *   - SUPABASE_SECRET_KEY                 server-only secret (service role)
 *
 * The secret key is NEVER read from client code: getSupabaseAdminConfig
 * throws if evaluated in a browser bundle.
 */

export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

function readPublicEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // The publishable key may be provided under either current naming.
  const publishableKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

/** Public client configuration, or null when Supabase is not configured. */
export function getSupabasePublicConfig(): SupabaseEnv | null {
  return readPublicEnv();
}

/** True when the public Supabase configuration is present. */
export function isSupabaseConfigured(): boolean {
  return readPublicEnv() !== null;
}

/** Server-only secret configuration. Throws inside any browser bundle. */
export function getSupabaseAdminConfig(): SupabaseEnv & { secretKey: string } {
  if (typeof window !== "undefined") {
    throw new Error("[Back2Basics with Kwamina] The Supabase secret key must never be used in client code.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey = (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (!url || !secretKey) {
    throw new Error("[Back2Basics with Kwamina] Server Supabase configuration is missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  }
  return { url, publishableKey: secretKey, secretKey };
}
