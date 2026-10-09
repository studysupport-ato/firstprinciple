import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminConfig, getSupabasePublicConfig, type SupabaseEnv } from "./config";
import type { Database } from "./types";

let browserClient: SupabaseClient<Database> | null = null;

export function resetSupabaseBrowserClient() {
  browserClient = null;
}

/**
 * Single browser Supabase client used by the student auth layer and future browser repositories.
 * This keeps session state consistent and avoids creating competing clients in the same app session.
 * Auth-state transitions reset the singleton so a fresh client is created after sign-in/sign-out.
 */
export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;

  const config: SupabaseEnv | null = getSupabasePublicConfig();
  if (!config) throw new Error("[Back2Basics with Kwamina] Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL / publishable key).");

  browserClient = createBrowserClient<Database>(config.url, config.publishableKey);

  return browserClient;
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
