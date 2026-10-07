"use server";

import {
  archiveAdminCourseMaterial,
  createAdminAssessment,
  createAdminCourse,
  createAdminCourseMaterial,
  createAdminDay,
  createAdminDepartment,
  createAdminQuestion,
  createAdminResource,
  createAdminWeek,
  deleteAdminAssessment,
  deleteAdminCourse,
  deleteAdminDay,
  deleteAdminQuestion,
  deleteAdminWeek,
  getAdminAssessment,
  getAdminCourse,
  getAdminCourseStructure,
  getAdminDay,
  getAdminDayContent,
  getAdminDepartment,
  getAdminQuestion,
  getAdminResource,
  listAdminAssessments,
  listAdminCourseMaterials,
  listAdminCourses,
  listAdminDays,
  listAdminDepartments,
  listAdminQuestions,
  listAdminResourcePlacements,
  listAdminResources,
  moveAdminDay,
  placeAdminResource,
  removeAdminResourcePlacement,
  reorderAdminCourseMaterials,
  reorderAdminDays,
  reorderAdminDepartments,
  saveAdminDayContent,
  setAdminCourseMaterialStatus,
  setAdminCourseStatus,
  setAdminDayStatus,
  setAdminDepartmentStatus,
  setAdminResourceStatus,
  setAdminWeekStatus,
  updateAdminAssessment,
  updateAdminCourse,
  updateAdminCourseMaterial,
  updateAdminDay,
  updateAdminDepartment,
  updateAdminQuestion,
  updateAdminResource,
  updateAdminWeek,
  uploadAdminLessonImage,
} from "@/lib/content/adminService";
import {
  AdminUnauthorizedError,
  destroyAdminSession,
  establishAdminSession,
  requireAdmin,
  timingSafeStringEquals,
} from "@/lib/adminSession";
import type { ContentStatus } from "@/lib/content/lifecycle";
import type { CoursePatch, DayPatch, WeekPatch } from "@/lib/content/repository";
import type {
  AdminActionResult,
  AdminCourseInput,
  AdminCourseListRow,
  AdminCourseMaterialInput,
  AdminCourseStructure,
  AdminDayInput,
  AdminDayListRow,
  AdminDepartmentInput,
  AdminDepartmentListRow,
  AdminPlacementTarget,
  AdminResourceInput,
  AdminResourceListRow,
  AdminWeekInput,
  Assessment,
  ContentBlock,
  Course,
  CourseMaterialEntry,
  CourseMaterialsDepartment,
  LearningResource,
  Lesson,
  Question,
  ResourcePlacement,
  Week,
} from "@/lib/content/adminContract";

/**
 * ============================================================================
 * Task 39E — admin content write/read boundary (single client-callable surface).
 * ============================================================================
 *
 * Task 40G.9 — SERVER-AUTHORIZED (40G.8 HIGH finding remediated).
 *
 * Every export below is a named content operation for an existing admin workflow.
 * There is deliberately NO generic table/query API here: a caller can only invoke
 * the operations the admin UI already performs.
 *
 * AUTHORIZATION: every privileged action goes through run(), which calls
 * requireAdmin() (lib/adminSession.ts) BEFORE any adminService / adminRepository
 * / service-role work. The admin session is a signed, HttpOnly, server-verified
 * cookie — localStorage (lib/adminAuth.ts) is UX only and grants nothing.
 *
 * An unauthenticated, tampered or expired request terminates inside run() with
 * { ok: false } and never reaches the privileged repository.
 *
 * The service-role key stays on the server; these actions never expose it, never
 * accept a Supabase client, and never accept raw SQL/table names.
 */

/** Error envelope shared by every admin action (no auth here). */
async function respond<T>(operation: () => Promise<T>): Promise<AdminActionResult<T>> {
  try {
    return { ok: true, data: await operation() };
  } catch (error) {
    console.error("[run wrapper error]", error);
    return { ok: false, error: error instanceof Error ? error.message : typeof error === 'object' ? JSON.stringify(error) : "The content operation failed." };
  }
}

/**
 * The ONE canonical authorization choke point for privileged admin actions.
 * Reads and verifies the signed admin session cookie server-side; denies
 * (fail-closed) before the operation — and therefore before adminService /
 * adminRepository / the service-role client — is ever reached.
 */
async function run<T>(operation: () => Promise<T>): Promise<AdminActionResult<T>> {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminUnauthorizedError) {
      console.warn("[admin action denied] Missing or invalid admin session cookie.");
      return { ok: false, error: "Unauthorized. A valid admin session is required." };
    }
    // Missing ADMIN_SESSION_SECRET or other guard failure: still fail closed.
    console.error("[admin action denied] Admin session guard failed:", error);
    return { ok: false, error: "Unauthorized. A valid admin session is required." };
  }
  return respond(operation);
}

/**
 * Credential check happens entirely server-side; on success the signed,
 * HttpOnly admin session cookie is established. Never returns the password
 * or the signing secret to the client. This is the only action that runs
 * WITHOUT requireAdmin() — because its whole purpose is to earn the session.
 */
export async function adminLoginAction(email: string, password: string): Promise<AdminActionResult<null>> {
  return respond(async () => {
    const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const expectedPassword = process.env.ADMIN_PASSWORD;
    const emailOk = expectedEmail ? timingSafeStringEquals(String(email ?? ""), expectedEmail) : false;
    const passwordOk = expectedPassword ? timingSafeStringEquals(String(password ?? ""), expectedPassword) : false;
    if (!expectedEmail || !expectedPassword || !emailOk || !passwordOk) {
      throw new Error("Invalid email or password.");
    }
    await establishAdminSession();
    return null;
  });
}

/** Invalidates the admin session cookie server-side (idempotent). */
export async function adminLogoutAction(): Promise<AdminActionResult<null>> {
  return respond(async () => {
    await destroyAdminSession();
    return null;
  });
}

// --- Reads -----------------------------------------------------------------

export async function getAdminCoursesAction(): Promise<AdminActionResult<AdminCourseListRow[]>> {
  return run(() => listAdminCourses());
}

export async function getAdminCourseAction(courseId: string): Promise<AdminActionResult<Course | null>> {
  return run(async () => (await getAdminCourse(courseId)) ?? null);
}

export async function getAdminCourseStructureAction(courseId: string): Promise<AdminActionResult<AdminCourseStructure | null>> {
  return run(async () => (await getAdminCourseStructure(courseId)) ?? null);
}

export async function getAdminDaysAction(): Promise<AdminActionResult<AdminDayListRow[]>> {
  return run(() => listAdminDays());
}

export async function getAdminDayAction(dayId: string): Promise<AdminActionResult<Lesson | null>> {
  return run(async () => (await getAdminDay(dayId)) ?? null);
}

export async function getAdminDayContentAction(courseId: string, weekId: string, dayId: string): Promise<AdminActionResult<ContentBlock[] | null>> {
  return run(async () => (await getAdminDayContent(courseId, weekId, dayId)) ?? null);
}

export async function uploadLessonImageAction(courseId: string, weekId: string, dayId: string, file: File, altText?: string): Promise<AdminActionResult<import("@/lib/content/types").Asset>> {
  return run(() => uploadAdminLessonImage(courseId, weekId, dayId, file, altText));
}

export async function getAdminQuestionsAction(courseId?: string): Promise<AdminActionResult<Question[]>> {
  return run(() => listAdminQuestions(courseId));
}

export async function getAdminQuestionAction(questionId: string): Promise<AdminActionResult<Question | null>> {
  return run(async () => (await getAdminQuestion(questionId)) ?? null);
}

export async function getAdminAssessmentsAction(courseId?: string): Promise<AdminActionResult<Assessment[]>> {
  return run(() => listAdminAssessments(courseId));
}

export async function getAdminAssessmentAction(assessmentId: string): Promise<AdminActionResult<Assessment | null>> {
  return run(async () => (await getAdminAssessment(assessmentId)) ?? null);
}

export async function getAdminResourcesAction(): Promise<AdminActionResult<AdminResourceListRow[]>> {
  return run(() => listAdminResources());
}

export async function getAdminResourceAction(resourceId: string): Promise<AdminActionResult<LearningResource | null>> {
  return run(async () => (await getAdminResource(resourceId)) ?? null);
}

export async function getAdminResourcePlacementsAction(resourceId?: string): Promise<AdminActionResult<ResourcePlacement[]>> {
  return run(() => listAdminResourcePlacements(resourceId));
}

export async function getAdminDepartmentsAction(): Promise<AdminActionResult<AdminDepartmentListRow[]>> {
  return run(() => listAdminDepartments());
}

export async function getAdminDepartmentAction(departmentId: string): Promise<AdminActionResult<CourseMaterialsDepartment | null>> {
  return run(async () => (await getAdminDepartment(departmentId)) ?? null);
}

export async function getAdminCourseMaterialsAction(departmentId?: string): Promise<AdminActionResult<CourseMaterialEntry[]>> {
  return run(() => listAdminCourseMaterials(departmentId));
}

// --- Writes: Courses -------------------------------------------------------

export async function createCourseAction(input: AdminCourseInput): Promise<AdminActionResult<Course>> {
  return run(() => createAdminCourse(input));
}

export async function updateCourseAction(courseId: string, patch: CoursePatch): Promise<AdminActionResult<Course>> {
  return run(() => updateAdminCourse(courseId, patch));
}

export async function setCourseStatusAction(courseId: string, status: ContentStatus): Promise<AdminActionResult<Course>> {
  return run(() => setAdminCourseStatus(courseId, status));
}

export async function deleteCourseAction(courseId: string): Promise<AdminActionResult<null>> {
  return run(async () => {
    await deleteAdminCourse(courseId);
    return null;
  });
}

// --- Writes: Weeks ---------------------------------------------------------

export async function createWeekAction(input: AdminWeekInput): Promise<AdminActionResult<Week>> {
  return run(() => createAdminWeek(input));
}

export async function updateWeekAction(courseId: string, weekId: string, patch: WeekPatch): Promise<AdminActionResult<Week>> {
  return run(() => updateAdminWeek(courseId, weekId, patch));
}

export async function setWeekStatusAction(courseId: string, weekId: string, status: ContentStatus): Promise<AdminActionResult<Week>> {
  return run(() => setAdminWeekStatus(courseId, weekId, status));
}

export async function deleteWeekAction(courseId: string, weekId: string): Promise<AdminActionResult<null>> {
  return run(async () => {
    await deleteAdminWeek(courseId, weekId);
    return null;
  });
}

// --- Writes: Days / lesson content ----------------------------------------

export async function createDayAction(input: AdminDayInput): Promise<AdminActionResult<Lesson>> {
  return run(() => createAdminDay(input));
}

export async function updateDayAction(courseId: string, weekId: string, dayId: string, patch: DayPatch): Promise<AdminActionResult<Lesson>> {
  return run(() => updateAdminDay(courseId, weekId, dayId, patch));
}

export async function setDayStatusAction(courseId: string, weekId: string, dayId: string, status: ContentStatus): Promise<AdminActionResult<Lesson>> {
  return run(() => setAdminDayStatus(courseId, weekId, dayId, status));
}

export async function deleteDayAction(courseId: string, weekId: string, dayId: string): Promise<AdminActionResult<null>> {
  return run(async () => {
    await deleteAdminDay(courseId, weekId, dayId);
    return null;
  });
}

export async function reorderDaysAction(courseId: string, weekId: string, orderedIds: string[]): Promise<AdminActionResult<Lesson[]>> {
  return run(() => reorderAdminDays(courseId, weekId, orderedIds));
}

/**
 * Transfer an existing Day to another Week of the same Course (Task 40H.2).
 * Guarded by run() -> requireAdmin() exactly like delete/reorder; the
 * service validates the Course/Week boundary before the repository writes.
 */
export async function moveDayAction(courseId: string, dayId: string, destinationWeekId: string): Promise<AdminActionResult<Lesson>> {
  return run(() => moveAdminDay(courseId, dayId, destinationWeekId));
}

export async function saveDayContentAction(
  courseId: string,
  weekId: string,
  dayId: string,
  blocks: ContentBlock[],
): Promise<AdminActionResult<null>> {
  return run(async () => {
    await saveAdminDayContent(courseId, weekId, dayId, blocks);
    return null;
  });
}

// --- Writes: Questions -----------------------------------------------------

export async function createQuestionAction(question: Question): Promise<AdminActionResult<Question>> {
  return run(() => createAdminQuestion(question));
}

export async function updateQuestionAction(question: Question): Promise<AdminActionResult<Question>> {
  return run(() => updateAdminQuestion(question));
}

export async function deleteQuestionAction(questionId: string): Promise<AdminActionResult<null>> {
  return run(async () => {
    await deleteAdminQuestion(questionId);
    return null;
  });
}

// --- Writes: Assessments ---------------------------------------------------

export async function createAssessmentAction(assessment: Assessment): Promise<AdminActionResult<Assessment>> {
  return run(() => createAdminAssessment(assessment));
}

export async function updateAssessmentAction(assessment: Assessment): Promise<AdminActionResult<Assessment>> {
  return run(() => updateAdminAssessment(assessment));
}

export async function deleteAssessmentAction(assessmentId: string): Promise<AdminActionResult<null>> {
  return run(async () => {
    await deleteAdminAssessment(assessmentId);
    return null;
  });
}

// --- Writes: Learning Resources --------------------------------------------

export async function createResourceAction(input: AdminResourceInput): Promise<AdminActionResult<LearningResource>> {
  return run(() => createAdminResource(input));
}

export async function updateResourceAction(
  resourceId: string,
  patch: Partial<Omit<LearningResource, "id" | "createdAt" | "updatedAt">>,
): Promise<AdminActionResult<LearningResource | null>> {
  return run(async () => (await updateAdminResource(resourceId, patch)) ?? null);
}

export async function setResourceStatusAction(resourceId: string, status: ContentStatus): Promise<AdminActionResult<LearningResource | null>> {
  return run(async () => (await setAdminResourceStatus(resourceId, status)) ?? null);
}

export async function placeResourceAction(resourceId: string, target: AdminPlacementTarget): Promise<AdminActionResult<ResourcePlacement>> {
  return run(() => placeAdminResource(resourceId, target));
}

export async function removeResourcePlacementAction(resourceId: string, target: AdminPlacementTarget): Promise<AdminActionResult<null>> {
  return run(async () => {
    await removeAdminResourcePlacement(resourceId, target);
    return null;
  });
}

// --- Writes: Course Materials ---------------------------------------------

export async function createDepartmentAction(input: AdminDepartmentInput): Promise<AdminActionResult<CourseMaterialsDepartment>> {
  return run(() => createAdminDepartment(input));
}

export async function updateDepartmentAction(
  departmentId: string,
  patch: Partial<Omit<CourseMaterialsDepartment, "id" | "createdAt" | "updatedAt">>,
): Promise<AdminActionResult<CourseMaterialsDepartment | null>> {
  return run(async () => (await updateAdminDepartment(departmentId, patch)) ?? null);
}

export async function setDepartmentStatusAction(departmentId: string, status: ContentStatus): Promise<AdminActionResult<CourseMaterialsDepartment | null>> {
  return run(async () => (await setAdminDepartmentStatus(departmentId, status)) ?? null);
}

export async function createCourseMaterialAction(input: AdminCourseMaterialInput): Promise<AdminActionResult<CourseMaterialEntry>> {
  return run(() => createAdminCourseMaterial(input));
}

export async function updateCourseMaterialAction(
  materialId: string,
  patch: Partial<Omit<CourseMaterialEntry, "id" | "createdAt" | "updatedAt">>,
): Promise<AdminActionResult<CourseMaterialEntry | null>> {
  return run(async () => (await updateAdminCourseMaterial(materialId, patch)) ?? null);
}

export async function setCourseMaterialStatusAction(materialId: string, status: ContentStatus): Promise<AdminActionResult<CourseMaterialEntry | null>> {
  return run(async () => (await setAdminCourseMaterialStatus(materialId, status)) ?? null);
}

export async function reorderDepartmentsAction(ids: string[]): Promise<AdminActionResult<CourseMaterialsDepartment[]>> {
  return run(() => reorderAdminDepartments(ids));
}

export async function reorderCourseMaterialsAction(departmentId: string, ids: string[]): Promise<AdminActionResult<CourseMaterialEntry[]>> {
  return run(() => reorderAdminCourseMaterials(departmentId, ids));
}

export async function archiveCourseMaterialAction(materialId: string): Promise<AdminActionResult<null>> {
  return run(async () => {
    await archiveAdminCourseMaterial(materialId);
    return null;
  });
}

import { deleteAdminDepartment, deleteAdminCourseMaterial } from "./content/adminService";

export async function deleteDepartmentAction(departmentId: string): Promise<AdminActionResult<null>> {
  return run(async () => {
    await deleteAdminDepartment(departmentId);
    return null;
  });
}

export async function deleteMaterialAction(materialId: string): Promise<AdminActionResult<null>> {
  return run(async () => {
    await deleteAdminCourseMaterial(materialId);
    return null;
  });
}

import { deleteAdminResource } from "./content/adminService";

export async function deleteResourceAction(resourceId: string): Promise<AdminActionResult<null>> {
  return run(async () => {
    await deleteAdminResource(resourceId);
    return null;
  });
}

