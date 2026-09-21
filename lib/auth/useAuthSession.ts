"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

import { getCurrentMockStudent, MockStudent } from "@/lib/auth/mock";

export interface AuthSessionState {
  authenticated: boolean | null;
  student: MockStudent | null;
}

/**
 * Returns the current mock session state.
 * authenticated is null while loading.
 */
export function useAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>({
    authenticated: null,
    student: null,
  });

  useEffect(() => {
    const checkSession = () => {
      const student = getCurrentMockStudent();
      setState({
        authenticated: !!student,
        student,
      });
    };

    // Check immediately
    checkSession();

    // Listen to mock auth changes
    window.addEventListener("mock-auth-change", checkSession);
    return () => window.removeEventListener("mock-auth-change", checkSession);
  }, []);

  return state;
}
