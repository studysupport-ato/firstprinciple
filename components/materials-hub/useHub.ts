"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createCourseMaterialsRepository } from "@/lib/courseMaterialsRepository";
import type { CourseMaterialEntry, CourseMaterialsDepartment } from "@/lib/courseMaterials";
import { useAuthSession } from "@/lib/auth/useAuthSession";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { HUB_METADATA_KEY, isHubChoice, readLocalChoice, writeLocalChoice, type HubChoice } from "@/lib/site/materialsHub";

export interface HubData {
  status: "loading" | "ready" | "error";
  departments: CourseMaterialsDepartment[];
  entries: CourseMaterialEntry[];
}

let cache: { departments: CourseMaterialsDepartment[]; entries: CourseMaterialEntry[] } | null = null;

export function useHubData(): HubData {
  const [state, setState] = useState<HubData>(() => (cache ? { status: "ready", ...cache } : { status: "loading", departments: [], entries: [] }));
  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    const repository = createCourseMaterialsRepository("supabase");
    Promise.all([repository.listDepartments({ visibility: "student" }), repository.listCourseMaterials({ visibility: "student" })])
      .then(([departments, entries]) => {
        cache = { departments, entries };
        if (!cancelled) setState({ status: "ready", departments, entries });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", departments: [], entries: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

/**
 * The student's programme, year and semester. Kept in this browser, and on
 * their account when they are signed in, so it follows them to other devices.
 */
export function useHubChoice() {
  const { user, authenticated, loading } = useAuthSession();
  const [choice, setChoiceState] = useState<HubChoice | null>(null);
  const [ready, setReady] = useState(false);

  const accountChoice = useMemo(() => {
    const raw: unknown = user?.user_metadata?.[HUB_METADATA_KEY];
    return isHubChoice(raw) ? raw : null;
  }, [user]);

  useEffect(() => {
    if (loading) return;
    const local = readLocalChoice();
    setChoiceState(accountChoice ?? local);
    if (accountChoice && !local) writeLocalChoice(accountChoice);
    setReady(true);
  }, [loading, accountChoice]);

  // Picked before signing up: carry the choice onto the new account.
  useEffect(() => {
    if (loading || authenticated !== true || accountChoice) return;
    const local = readLocalChoice();
    if (local) void createSupabaseBrowserClient().auth.updateUser({ data: { [HUB_METADATA_KEY]: local } }).catch(() => undefined);
  }, [loading, authenticated, accountChoice]);

  const saveToAccount = useCallback(async (next: HubChoice | null) => {
    try {
      await createSupabaseBrowserClient().auth.updateUser({ data: { [HUB_METADATA_KEY]: next } });
      return true;
    } catch {
      return false;
    }
  }, []);

  const setChoice = useCallback(
    (next: HubChoice | null) => {
      setChoiceState(next);
      writeLocalChoice(next);
      if (authenticated) void saveToAccount(next);
    },
    [authenticated, saveToAccount],
  );

  return { choice, setChoice, ready, signedIn: authenticated === true, savedToAccount: accountChoice !== null, saveToAccount };
}
