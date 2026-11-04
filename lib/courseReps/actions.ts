"use server";

import { requireAdmin } from "@/lib/adminSession";
import {
  RepAccessError,
  applyAsRep,
  getMyApplication,
  getRepScope,
  listApplicationsForAdmin,
  repAddMaterial,
  repCreateCourse,
  repRemoveEntry,
  repUpdateEntry,
  setApplicationStatus,
  type RepApplication,
  type RepMaterialType,
  type RepScope,
} from "./repService";

export type RepResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<RepResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    const message = error instanceof RepAccessError ? error.message : error instanceof Error && error.name === "AdminUnauthorizedError" ? "Admin sign-in required." : "Something went wrong. Try again.";
    if (!(error instanceof RepAccessError)) console.error("[course reps]", error);
    return { ok: false, error: message };
  }
}

/* Student / rep — identity always comes from the signed-in Supabase session. */
export async function myRepApplicationAction(): Promise<RepResult<RepApplication | null>> {
  return run(() => getMyApplication());
}
export async function applyAsRepAction(input: { fullName: string; departmentId: string; studyYear: number; phone: string }): Promise<RepResult<RepApplication>> {
  return run(() => applyAsRep(input));
}
export async function repScopeAction(): Promise<RepResult<RepScope>> {
  return run(() => getRepScope());
}
export async function repCreateCourseAction(input: { semester: number; courseCode: string; courseTitle: string }): Promise<RepResult<{ id: string }>> {
  return run(async () => ({ id: (await repCreateCourse(input)).id }));
}
export async function repAddMaterialAction(input: { courseId: string; type: RepMaterialType; title: string; url: string }): Promise<RepResult<{ id: string }>> {
  return run(async () => ({ id: (await repAddMaterial(input)).id }));
}
export async function repUpdateEntryAction(id: string, patch: { title?: string; url?: string; courseCode?: string }): Promise<RepResult<null>> {
  return run(async () => {
    await repUpdateEntry(id, patch);
    return null;
  });
}
export async function repRemoveEntryAction(id: string): Promise<RepResult<null>> {
  return run(async () => {
    await repRemoveEntry(id);
    return null;
  });
}

/* Admin — signed admin session cookie required. */
export async function adminListRepApplicationsAction(): Promise<RepResult<RepApplication[]>> {
  return run(async () => {
    await requireAdmin();
    return listApplicationsForAdmin();
  });
}
export async function adminSetRepStatusAction(id: string, status: "approved" | "declined" | "revoked"): Promise<RepResult<null>> {
  return run(async () => {
    await requireAdmin();
    await setApplicationStatus(id, status);
    return null;
  });
}
