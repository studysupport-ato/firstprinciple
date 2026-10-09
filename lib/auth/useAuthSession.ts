"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient, resetSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  clearAuthenticatedReadStudentCache,
  resolveAuthenticatedReadStudent,
} from "@/lib/student/readIdentity";

export interface AuthStudent {
  id: string;
  displayName: string;
  email: string | null;
}

export interface AuthSessionState {
  authenticated: boolean | null;
  loading: boolean;
  session: Session | null;
  user: User | null;
  student: AuthStudent | null;
  studentLoading: boolean;
  signOut: () => Promise<void>;
}

// Module-level cache: one student fetch per session, never per-render.
// Task 40C-1: the students lookup now lives in lib/student/readIdentity so
// reads and writes share a single identity algorithm and a single cache. The
// hook keeps its own resolved-value memo for React renders.
let cachedUserId: string | null = null;
let cachedStudent: AuthStudent | null = null;

async function fetchStudentOnce(userId: string): Promise<AuthStudent | null> {
  if (cachedUserId === userId && cachedStudent) return cachedStudent;
  cachedUserId = userId;
  try {
    const resolved = await resolveAuthenticatedReadStudent();
    cachedStudent = resolved
      ? { id: resolved.id, displayName: resolved.displayName, email: resolved.email }
      : null;
  } catch {
    // Integrity/lookup failure: the hook reports "no student" rather than
    // throwing during render. Consumers that must not silently degrade
    // (e.g. progress reads) call readIdentity directly and will see the throw.
    cachedStudent = null;
  }
  return cachedStudent;
}

function resetStudentCache() {
  cachedUserId = null;
  cachedStudent = null;
  clearAuthenticatedReadStudentCache();
}

export function useAuthSession(): AuthSessionState {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<AuthStudent | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);

  // Listen for profile updates so the UI refreshes after Settings saves.
  // The module cache must be reset first, otherwise fetchStudentOnce would
  // return the stale pre-save student.
  useEffect(() => {
    const handleProfileUpdated = () => {
      if (!user?.id) return;
      resetStudentCache();
      setStudentLoading(true);
      void fetchStudentOnce(user.id).then((resolved) => {
        setStudent(resolved);
        setStudentLoading(false);
      });
    };
    window.addEventListener("profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("profile-updated", handleProfileUpdated);
  }, [user?.id]);

  const signOut = useCallback(async () => {
    setSession(null);
    setUser(null);
    setAuthenticated(false);
    setStudent(null);
    setStudentLoading(false);
    resetStudentCache();
    resetSupabaseBrowserClient();
    const client = createSupabaseBrowserClient();
    const { error } = await client.auth.signOut();
    if (error) {
      throw error;
    }
  }, []);

  useEffect(() => {
    const client = createSupabaseBrowserClient();
    let isMounted = true;

    const syncSession = async () => {
      const { data, error } = await client.auth.getSession();
      if (!isMounted) return;

      const nextSession = data.session ?? null;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setAuthenticated(Boolean(nextSession));
      setLoading(false);

      if (nextSession?.user) {
        setStudentLoading(true);
        const resolved = await fetchStudentOnce(nextSession.user.id);
        if (isMounted) {
          setStudent(resolved);
          setStudentLoading(false);
        }
      } else {
        resetStudentCache();
        resetSupabaseBrowserClient();
        setStudent(null);
      }

      if (error) {
        console.warn("[AuthSession] Failed to restore Supabase session:", error.message);
      }
    };

    void syncSession();

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setAuthenticated(Boolean(nextSession));
      setLoading(false);
      if (nextSession?.user) {
        setStudentLoading(true);
        void fetchStudentOnce(nextSession.user.id).then((resolved) => {
          if (isMounted) {
            setStudent(resolved);
            setStudentLoading(false);
          }
        });
      } else {
        resetStudentCache();
        resetSupabaseBrowserClient();
        setStudent(null);
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return {
    authenticated,
    loading,
    session,
    user,
    student,
    studentLoading,
    signOut,
  };
}

