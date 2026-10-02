"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
let cachedUserId: string | null = null;
let cachedStudent: AuthStudent | null = null;
let inFlight: Promise<AuthStudent | null> | null = null;

async function fetchStudentOnce(userId: string): Promise<AuthStudent | null> {
  if (cachedUserId === userId && cachedStudent) return cachedStudent;
  if (inFlight && cachedUserId === userId) return inFlight;
  cachedUserId = userId;
  inFlight = (async () => {
    try {
      const client = createSupabaseBrowserClient();
      const { data, error } = await client.from("students").select("id,display_name,email").eq("auth_user_id", userId).maybeSingle();
      if (error) {
        cachedStudent = null;
        return null;
      }
      const row = data as { id: string; display_name: string; email: string | null } | null;
      cachedStudent = row ? { id: row.id, displayName: row.display_name, email: row.email } : null;
      return cachedStudent;
    } catch {
      cachedStudent = null;
      return null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function useAuthSession(): AuthSessionState {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<AuthStudent | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);

  const signOut = useCallback(async () => {
    cachedUserId = null;
    cachedStudent = null;
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
        cachedUserId = null;
        cachedStudent = null;
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
        cachedUserId = null;
        cachedStudent = null;
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

