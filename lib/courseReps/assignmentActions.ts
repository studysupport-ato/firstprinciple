"use server";

import { DriveNotConnectedError } from "./googleDrive";
import { RepAccessError } from "./repService";
import {
  clearAssignmentReminder,
  listClassAssignments,
  repListAssignments,
  repPostAssignment,
  repRemoveAssignment,
  repSetAssignmentUrgent,
  repStartAssignmentUpload,
  setAssignmentDone,
  setAssignmentReminder,
  type Assignment,
  type AssignmentWithMine,
} from "./assignments";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const SAFE = /^(Upload a PDF|Files can be up to|Google Drive would not start|That file is not in|Type the assignment|Pick |Your browser|That assignment|Refresh the page|Could not )/;

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    const known = error instanceof RepAccessError || error instanceof DriveNotConnectedError || (error instanceof Error && SAFE.test(error.message));
    if (!known) console.error("[assignments]", error);
    return { ok: false, error: known && error instanceof Error ? error.message : "Something went wrong. Try again." };
  }
}

/* Students */
export async function classAssignmentsAction(input: { departmentId: string; studyYear: number; deviceId?: string }): Promise<Result<AssignmentWithMine[]>> {
  return run(() => listClassAssignments(input));
}
export async function setAssignmentDoneAction(input: { assignmentId: string; done: boolean; deviceId?: string }): Promise<Result<null>> {
  return run(async () => {
    await setAssignmentDone(input);
    return null;
  });
}
export async function setAssignmentReminderAction(input: { assignmentId: string; everyMinutes: number; endsAt: string; endpoint: string; keys: { p256dh: string; auth: string }; deviceId?: string }): Promise<Result<null>> {
  return run(async () => {
    await setAssignmentReminder(input);
    return null;
  });
}
export async function clearAssignmentReminderAction(input: { assignmentId: string; deviceId?: string }): Promise<Result<null>> {
  return run(async () => {
    await clearAssignmentReminder(input);
    return null;
  });
}

/* Course reps */
export async function repAssignmentsAction(): Promise<Result<Assignment[]>> {
  return run(() => repListAssignments());
}
export async function repStartAssignmentUploadAction(input: { courseId: string; fileName: string; fileType: string; size: number }): Promise<Result<{ uploadUrl: string }>> {
  return run(() => repStartAssignmentUpload(input));
}
export async function repPostAssignmentAction(input: { courseId: string; body: string; fileId?: string; urgent?: boolean }): Promise<Result<Assignment>> {
  return run(() => repPostAssignment(input));
}
export async function repSetAssignmentUrgentAction(id: string, urgent: boolean): Promise<Result<null>> {
  return run(async () => {
    await repSetAssignmentUrgent(id, urgent);
    return null;
  });
}
export async function repRemoveAssignmentAction(id: string): Promise<Result<null>> {
  return run(async () => {
    await repRemoveAssignment(id);
    return null;
  });
}
