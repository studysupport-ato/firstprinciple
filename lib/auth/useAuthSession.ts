"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Returns true if the current user has an active Supabase session, false otherwise.
 * Returns null while the check is still in flight (loading state).
 *
 * If Supabase is not configured in this environment the hook returns false
 * immediately so preview/dev flows are never blocked.
 */
export function useAuthSession(): boolean | null {
  const [authenticated, setAuthenticated] = useState<boolean | null>(
    isSupabaseConfigured() ? null : false,
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthenticated(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();

    // Check the current session immediately.
    supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(!!data.session);
    });

    // Subscribe to future changes (sign-in, sign-out, token refresh).
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return authenticated;
}
