import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/types";
import { createTimedSupabaseFetch, type ServerTimingContext } from "@/lib/performance/serverTiming";

export async function createSupabaseServerClient(context: ServerTimingContext = { route: "unattributed", requestId: crypto.randomUUID(), sampled: false }) {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.publishableKey, {
    global: { fetch: createTimedSupabaseFetch(context) },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components may read cookies but cannot write refreshed cookies.
        }
      },
    },
  });
}