import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminConfig, getSupabasePublicConfig, type SupabaseEnv } from "./config";
import type { Database } from "./types";

/**
 * Supabase client factories (Task 25 — foundation only).
 *
 * These factories exist so future repository layers have a single, reviewed
 * seam. NOTHING in the application calls them yet:
 *   - lib/content/access.ts still reads local/seed content
 *   - lib/progress/repository.ts still reads localStorage
 *
 * Browser (publishable key) vs server (secret key) separation:
 *   - createSupabaseBrowserClient(): safe anywhere, uses publishable key
 *   - createSupabaseAdminClient(): server-only, bypasses RLS (future admin
 *     jobs/migrations); guarded against browser bundles in config.ts
 */

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  const config: SupabaseEnv | null = getSupabasePublicConfig();
  if (!config) throw new Error("[Back2Basics with Kwamina] Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL / publishable key).");
  return createClient<Database>(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

/** Server-only client using the secret (service-role) key. Bypasses RLS. */
export function createSupabaseAdminClient(): SupabaseClient<Database> {
  const config = getSupabaseAdminConfig();
  return createClient<Database>(config.url, config.secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
