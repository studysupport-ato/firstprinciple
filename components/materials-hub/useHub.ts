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

/* Admin only: hidden programmes (the test one) added on top of what students see, for this visit. */
let extra: { departments: CourseMaterialsDepartment[]; entries: CourseMaterialEntry[] } = { departments: [], entries: [] };
const extraListeners = new Set<() => void>();
export function addAdminHubData(more: { departments: CourseMaterialsDepartment[]; entries: CourseMaterialEntry[] }) {
  const ids = new Set(more.entries.map((e) => e.id));
  const deptIds = new Set(more.departments.map((d) => d.id));
  extra = { departments: [...extra.departments.filter((d) => !deptIds.has(d.id)), ...more.departments], entries: [...extra.entries.filter((e) => !ids.has(e.id)), ...more.entries] };
  extraListeners.forEach((fn) => fn());
}

export function useHubData(): HubData {
  const base = useBaseHubData();
  const [version, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    extraListeners.add(fn);
    return () => {
      extraListeners.delete(fn);
    };
  }, []);
  return useMemo(() => {
    if (!extra.departments.length && !extra.entries.length) return base;
    const deptIds = new Set(extra.departments.map((d) => d.id));
    const entryIds = new Set(extra.entries.map((e) => e.id));
    return {
      ...base,
      departments: [...base.departments.filter((d) => !deptIds.has(d.id)), ...extra.departments],
      entries: [...base.entries.filter((e) => !entryIds.has(e.id)), ...extra.entries],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, version]);
}

const FRESH_MS = 30_000;
let cachedAt = 0;
let inflight: Promise<void> | null = null;
const baseListeners = new Set<(next: HubData) => void>();

/** Fetch what students can see; everyone using the data gets the new copy. Removed items disappear. */
function refreshHubData() {
  if (inflight) return inflight;
  const repository = createCourseMaterialsRepository("supabase");
  inflight = Promise.all([repository.listDepartments({ visibility: "student" }), repository.listCourseMaterials({ visibility: "student" })])
    .then(([departments, entries]) => {
      cache = { departments, entries };
      cachedAt = Date.now();
      baseListeners.forEach((fn) => fn({ status: "ready", departments, entries }));
    })
    .catch(() => {
      if (!cache) baseListeners.forEach((fn) => fn({ status: "error", departments: [], entries: [] }));
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function useBaseHubData(): HubData {
  const [state, setState] = useState<HubData>(() => (cache ? { status: "ready", ...cache } : { status: "loading", departments: [], entries: [] }));
  useEffect(() => {
    baseListeners.add(setState);
    // Show the saved copy straight away, but fetch again if it is more than a few seconds old,
    // so files and courses a rep removed vanish without closing the app.
    if (!cache || Date.now() - cachedAt > FRESH_MS) void refreshHubData();
    const onShow = () => {
      if (document.visibilityState === "visible" && Date.now() - cachedAt > FRESH_MS) void refreshHubData();
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      baseListeners.delete(setState);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
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
    // Signed out after using an account: start over and ask again.
    if (authenticated !== true && readChoiceOwner() === "account") {
      writeLocalChoice(null);
      writeChoiceOwner(null);
    }
    const local = readLocalChoice();
    setChoiceState(accountChoice ?? local);
    if (accountChoice && !local) writeLocalChoice(accountChoice);
    if (authenticated === true && (accountChoice ?? local)) writeChoiceOwner("account");
    setReady(true);
  }, [loading, authenticated, accountChoice]);

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
      writeChoiceOwner(authenticated ? "account" : null);
      if (authenticated) void saveToAccount(next);
    },
    [authenticated, saveToAccount],
  );

  return { choice, setChoice, ready, signedIn: authenticated === true, savedToAccount: accountChoice !== null, saveToAccount };
}

const OWNER_KEY = "b2b.materialsChoice.owner";
function readChoiceOwner() {
  try {
    return window.localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}
function writeChoiceOwner(value: "account" | null) {
  try {
    if (value) window.localStorage.setItem(OWNER_KEY, value);
    else window.localStorage.removeItem(OWNER_KEY);
  } catch {
    /* storage unavailable */
  }
}
