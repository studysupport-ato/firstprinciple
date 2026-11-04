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
  type ImportSource,
  type UploadKind,
  importCoursesFromFolder,
  listImportSources,
  repFinishUpload,
  repSetHiddenFiles,
  repStartUpload,
} from "./repService";
import { DriveNotConnectedError, driveConnectConfigured, getConnectionInfo } from "./googleDrive";

export type RepResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<RepResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    const message = error instanceof RepAccessError || error instanceof DriveNotConnectedError || (error instanceof Error && /^(Upload a PDF|Files can be up to|Google Drive would not start|That file is not in)/.test(error.message)) ? error.message : error instanceof Error && error.name === "AdminUnauthorizedError" ? "Admin sign-in required." : "Something went wrong. Try again.";
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

export async function repStartUploadAction(input: { courseId: string; fileName: string; fileType: string; size: number }): Promise<RepResult<{ uploadUrl: string }>> {
  return run(() => repStartUpload(input));
}
export async function repFinishUploadAction(input: { courseId: string; kind: UploadKind; fileId: string; title: string }): Promise<RepResult<{ id: string }>> {
  return run(async () => ({ id: (await repFinishUpload(input)).id }));
}
export async function repSetHiddenFilesAction(materialId: string, fileIds: string[]): Promise<RepResult<null>> {
  return run(async () => {
    await repSetHiddenFiles(materialId, fileIds);
    return null;
  });
}

export async function adminDriveStatusAction(): Promise<RepResult<{ configured: boolean; connected: { email: string | null; connectedAt: string } | null }>> {
  return run(async () => {
    await requireAdmin();
    return { configured: driveConnectConfigured(), connected: await getConnectionInfo().catch(() => null) };
  });
}
export async function adminImportSourcesAction(): Promise<RepResult<ImportSource[]>> {
  return run(async () => {
    await requireAdmin();
    return listImportSources();
  });
}
export async function adminImportCoursesAction(sourceMaterialId: string, folders: Array<{ folderId: string; code: string; title: string }>): Promise<RepResult<number>> {
  return run(async () => {
    await requireAdmin();
    return importCoursesFromFolder(sourceMaterialId, folders);
  });
}
