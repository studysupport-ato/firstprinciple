import {
  createAssessmentAdminRepository,
  createCourseMaterialsAdminRepository,
  createCourseStructureAdminRepository,
  createDayContentAdminRepository,
  createQuestionAdminRepository,
  createResourceAdminRepository,
} from "./adminRepository";
import { validateQuestion } from "./access";
import { validateBlock } from "./overrides";
import { validateLearningResource, validateResourcePlacement } from "./resources";
import { validateCourseMaterial, validateDepartment } from "../courseMaterials";
import type { ContentStatus } from "./lifecycle";
import type {
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
  AdminWeekView,
  Assessment,
  Chapter,
  ContentBlock,
  Course,
  CourseMaterialEntry,
  CourseMaterialsDepartment,
  LearningResource,
  Lesson,
  Question,
  ResourcePlacement,
  Week,
} from "./adminContract";
import type { CoursePatch, DayPatch, WeekPatch } from "./repository";

/**
 * ============================================================================
 * Task 39E — SERVER-ONLY admin content service.
 * ============================================================================
 *
 * ADMIN_AUTH_RLS_REQUIRED_BEFORE_PUBLIC_PRODUCTION
 *
 * TEMPORARY PRE-AUTH CONTENT-MANAGEMENT BOUNDARY — NOT a production security model.
 *
 * This module is the ONLY place that performs admin content mutations (Courses,
 * Weeks, Days/content, Questions, Assessments, Learning Resources, Course
 * Materials). It is reachable only through lib/adminContentActions.ts, which
 * exposes a fixed list of named operations — never a generic table/query API.
 *
 * Efficiency contract (per operation): single-row CREATE / GET / UPDATE / DELETE
 * by primary key or scoped key; Day content writes update `days.content_blocks`
 * ONLY (targeted update); admin list pages use one query per table, grouped in
 * memory — never N+1 per course/week.
 *
 * BEFORE PUBLIC PRODUCTION THIS MUST BE REPLACED WITH:
 *   Admin Auth -> authenticated server boundary -> Supabase
 */

if (typeof window !== "undefined") {
  throw new Error(
    "[Back2Basics with Kwamina] lib/content/adminService.ts is server-only and must never be bundled into client code. ADMIN_AUTH_RLS_REQUIRED_BEFORE_PUBLIC_PRODUCTION",
  );
}

function assertNonEmpty(value: string, label: string) {
  if (!value || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

/** Derived legacy label for `days.chapter_id` — NOT a chapters entity. */
function chapterLabel(chapterId: string) {
  return chapterId
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildChapters(courseId: string, days: Lesson[]): Chapter[] {
  const seen = new Set<string>();
  const chapters: Chapter[] = [];
  for (const day of days) {
    if (!day.chapterId || seen.has(day.chapterId)) continue;
    seen.add(day.chapterId);
    chapters.push({ id: day.chapterId, courseId, title: chapterLabel(day.chapterId), description: "", order: chapters.length + 1 });
  }
  return chapters;
}

function validateDayBlocks(blocks: ContentBlock[]) {
  if (!Array.isArray(blocks)) throw new Error("Day content must be an array of content blocks.");
  blocks.forEach((block, index) => {
    if (!block || typeof block !== "object" || typeof block.id !== "string" || typeof block.type !== "string") {
      throw new Error(`Block ${index + 1}: malformed content block.`);
    }
    const errors = validateBlock(block);
    if (errors.length > 0) throw new Error(`Block ${index + 1}: ${errors.join("; ")}`);
  });
}

// ---------------------------------------------------------------------------
// Reads (admin views)
// ---------------------------------------------------------------------------

export async function listAdminCourses(): Promise<AdminCourseListRow[]> {
  const structure = createCourseStructureAdminRepository();
  const [courses, weeks, days] = await Promise.all([structure.listCourses(), structure.listAllWeeks(), structure.listAllDays()]);
  const weekCounts = new Map<string, number>();
  for (const week of weeks) weekCounts.set(week.courseId, (weekCounts.get(week.courseId) ?? 0) + 1);
  const dayCounts = new Map<string, number>();
  for (const day of days) dayCounts.set(day.courseId, (dayCounts.get(day.courseId) ?? 0) + 1);
  return courses
    .map((course) => ({ course, weekCount: weekCounts.get(course.id) ?? 0, dayCount: dayCounts.get(course.id) ?? 0 }))
    .sort((first, second) => first.course.title.localeCompare(second.course.title));
}

export async function getAdminCourse(courseId: string): Promise<Course | undefined> {
  return createCourseStructureAdminRepository().getCourse(courseId);
}

export async function getAdminCourseStructure(courseId: string): Promise<AdminCourseStructure | undefined> {
  const structure = createCourseStructureAdminRepository();
  const course = await structure.getCourse(courseId);
  if (!course) return undefined;
  const [weeks, days] = await Promise.all([structure.listWeeksForCourse(courseId), structure.listDaysForCourse(courseId)]);
  const daysByWeek = new Map<string, Lesson[]>();
  for (const day of days) {
    const bucket = daysByWeek.get(day.weekId) ?? [];
    bucket.push(day);
    daysByWeek.set(day.weekId, bucket);
  }
  const weekViews: AdminWeekView[] = weeks
    .sort((first, second) => first.weekNumber - second.weekNumber)
    .map((week) => {
      const weekDays = (daysByWeek.get(week.id) ?? []).sort((first, second) => first.order - second.order);
      const weekView: AdminWeekView = {
        week: {
          ...week,
          chapterIds: [...new Set(weekDays.map((day) => day.chapterId).filter(Boolean))],
          sessionIds: weekDays.map((day) => day.id),
        },
        days: weekDays,
      };
      return weekView;
    });
  const structureView: AdminCourseStructure = { course, weeks: weekViews, days, chapters: buildChapters(courseId, days) };
  return structureView;
}

export async function listAdminDays(): Promise<AdminDayListRow[]> {
  const structure = createCourseStructureAdminRepository();
  const [courses, weeks, days] = await Promise.all([structure.listCourses(), structure.listAllWeeks(), structure.listAllDays()]);
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const weekById = new Map(weeks.map((week) => [week.id, week]));
  return days
    .map((day) => ({
      day,
      week: weekById.get(day.weekId),
      course: courseById.get(day.courseId),
      chapterTitle: day.chapterId ? chapterLabel(day.chapterId) : "Unassigned",
    }))
    .sort(
      (first, second) =>
        (first.course?.code ?? "").localeCompare(second.course?.code ?? "") ||
        (first.week?.weekNumber ?? 0) - (second.week?.weekNumber ?? 0) ||
        first.day.order - second.day.order,
    );
}

export async function getAdminDay(dayId: string): Promise<Lesson | undefined> {
  return createCourseStructureAdminRepository().getDayById(dayId);
}

export async function getAdminDayContent(courseId: string, weekId: string, dayId: string): Promise<ContentBlock[] | undefined> {
  return createDayContentAdminRepository().getDayContent(courseId, weekId, dayId);
}

export async function listAdminQuestions(courseId?: string): Promise<Question[]> {
  return createQuestionAdminRepository().listQuestions(courseId ? { courseId } : {});
}

export async function getAdminQuestion(questionId: string): Promise<Question | undefined> {
  return createQuestionAdminRepository().getQuestion(questionId);
}

export async function listAdminAssessments(courseId?: string): Promise<Assessment[]> {
  return createAssessmentAdminRepository().listAssessments(courseId ? { courseId } : {});
}

export async function getAdminAssessment(assessmentId: string): Promise<Assessment | undefined> {
  return createAssessmentAdminRepository().getAssessment(assessmentId);
}

export async function listAdminResources(): Promise<AdminResourceListRow[]> {
  const resources = createResourceAdminRepository();
  const [items, placements] = await Promise.all([resources.listResources(), resources.listPlacements()]);
  const counts = new Map<string, number>();
  for (const placement of placements) counts.set(placement.resourceId, (counts.get(placement.resourceId) ?? 0) + 1);
  return items.map((resource) => ({ resource, placementCount: counts.get(resource.id) ?? 0 }));
}

export async function getAdminResource(resourceId: string): Promise<LearningResource | undefined> {
  return createResourceAdminRepository().getResource(resourceId);
}

export async function listAdminResourcePlacements(): Promise<ResourcePlacement[]> {
  return createResourceAdminRepository().listPlacements();
}

export async function listAdminDepartments(): Promise<AdminDepartmentListRow[]> {
  const materials = createCourseMaterialsAdminRepository();
  const [departments, entries] = await Promise.all([materials.listDepartments(), materials.listCourseMaterials()]);
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.departmentId, (counts.get(entry.departmentId) ?? 0) + 1);
  return departments.map((department) => ({ department, materialCount: counts.get(department.id) ?? 0 }));
}

export async function getAdminDepartment(departmentId: string): Promise<CourseMaterialsDepartment | undefined> {
  return createCourseMaterialsAdminRepository().getDepartment(departmentId);
}

export async function listAdminCourseMaterials(departmentId?: string): Promise<CourseMaterialEntry[]> {
  return createCourseMaterialsAdminRepository().listCourseMaterials(departmentId ? { departmentId } : {});
}

// ---------------------------------------------------------------------------
// Writes — Courses
// ---------------------------------------------------------------------------

export async function createAdminCourse(input: AdminCourseInput): Promise<Course> {
  const structure = createCourseStructureAdminRepository();
  const id = assertNonEmpty(input.id, "Course id");
  const code = assertNonEmpty(input.code, "Course code");
  const title = assertNonEmpty(input.title, "Course title");
  const description = assertNonEmpty(input.description, "Course description");
  return structure.createCourse({
    id,
    code,
    title,
    shortTitle: input.shortTitle.trim() || title,
    description,
    department: input.department?.trim() || undefined,
    chapterIds: [],
    weekIds: [],
    status: input.status ?? "draft",
  });
}

export async function updateAdminCourse(courseId: string, patch: CoursePatch): Promise<Course> {
  return createCourseStructureAdminRepository().updateCourse(courseId, patch);
}

export async function setAdminCourseStatus(courseId: string, status: ContentStatus): Promise<Course> {
  return createCourseStructureAdminRepository().setCourseStatus(courseId, status);
}

export async function deleteAdminCourse(courseId: string): Promise<void> {
  return createCourseStructureAdminRepository().deleteCourse(courseId);
}

// ---------------------------------------------------------------------------
// Writes — Weeks
// ---------------------------------------------------------------------------

export async function createAdminWeek(input: AdminWeekInput): Promise<Week> {
  const structure = createCourseStructureAdminRepository();
  const id = assertNonEmpty(input.id, "Week id");
  const courseId = assertNonEmpty(input.courseId, "Week course");
  const title = assertNonEmpty(input.title, "Week title");
  if (!Number.isFinite(input.weekNumber) || input.weekNumber < 1) throw new Error("Week number must be a positive integer.");
  const course = await structure.getCourse(courseId);
  if (!course) throw new Error(`Cannot create a Week for unknown Course ${courseId}.`);
  return structure.createWeek({
    id,
    courseId,
    chapterIds: [],
    title,
    description: input.description.trim() || `${title} for ${course.title}.`,
    weekNumber: Math.trunc(input.weekNumber),
    sessionIds: [],
    status: input.status ?? "draft",
  });
}

export async function updateAdminWeek(courseId: string, weekId: string, patch: WeekPatch): Promise<Week> {
  return createCourseStructureAdminRepository().updateWeek(courseId, weekId, patch);
}

export async function setAdminWeekStatus(courseId: string, weekId: string, status: ContentStatus): Promise<Week> {
  return createCourseStructureAdminRepository().setWeekStatus(courseId, weekId, status);
}

export async function deleteAdminWeek(courseId: string, weekId: string): Promise<void> {
  return createCourseStructureAdminRepository().deleteWeek(courseId, weekId);
}

// ---------------------------------------------------------------------------
// Writes — Days / lesson content
// ---------------------------------------------------------------------------

export async function createAdminDay(input: AdminDayInput): Promise<Lesson> {
  const structure = createCourseStructureAdminRepository();
  const id = assertNonEmpty(input.id, "Day id");
  const courseId = assertNonEmpty(input.courseId, "Day course");
  const weekId = assertNonEmpty(input.weekId, "Day week");
  const title = assertNonEmpty(input.title, "Day title");
  const week = await structure.getWeek(courseId, weekId);
  if (!week) throw new Error(`Cannot create a Day for unknown Week ${weekId} in Course ${courseId}.`);
  const blocks = input.blocks ?? [];
  validateDayBlocks(blocks);
  return structure.createDay({
    id,
    courseId,
    weekId,
    chapterId: input.chapterId ?? "",
    title,
    description: input.description.trim() || title,
    order: Number.isFinite(input.order) && input.order > 0 ? Math.trunc(input.order) : 1,
    estimatedMinutes: input.estimatedMinutes && input.estimatedMinutes > 0 ? Math.trunc(input.estimatedMinutes) : 30,
    objectives: input.objectives ?? [],
    blocks,
    status: input.status ?? "draft",
  });
}

export async function updateAdminDay(courseId: string, weekId: string, dayId: string, patch: DayPatch): Promise<Lesson> {
  if (patch.blocks !== undefined) validateDayBlocks(patch.blocks);
  return createCourseStructureAdminRepository().updateDay(courseId, weekId, dayId, patch);
}

export async function setAdminDayStatus(courseId: string, weekId: string, dayId: string, status: ContentStatus): Promise<Lesson> {
  return createCourseStructureAdminRepository().setDayStatus(courseId, weekId, dayId, status);
}

export async function deleteAdminDay(courseId: string, weekId: string, dayId: string): Promise<void> {
  return createCourseStructureAdminRepository().deleteDay(courseId, weekId, dayId);
}

/** Writes ONLY `days.content_blocks` for the scoped Day. */
export async function saveAdminDayContent(courseId: string, weekId: string, dayId: string, blocks: ContentBlock[]): Promise<void> {
  validateDayBlocks(blocks);
  const day = await createCourseStructureAdminRepository().getDay(courseId, weekId, dayId);
  if (!day) throw new Error(`Cannot save content for unknown Day ${dayId} in the requested hierarchy.`);
  return createDayContentAdminRepository().saveDayContent(courseId, weekId, dayId, blocks);
}

// ---------------------------------------------------------------------------
// Writes — Questions
// ---------------------------------------------------------------------------

function assertValidQuestion(question: Question) {
  const errors = validateQuestion(question);
  if (errors.length > 0) throw new Error(`Invalid question: ${errors.join("; ")}`);
}

export async function createAdminQuestion(question: Question): Promise<Question> {
  assertValidQuestion(question);
  return createQuestionAdminRepository().createQuestion(question);
}

export async function updateAdminQuestion(question: Question): Promise<Question> {
  assertValidQuestion(question);
  return createQuestionAdminRepository().updateQuestion(question);
}

export async function deleteAdminQuestion(questionId: string): Promise<void> {
  return createQuestionAdminRepository().deleteQuestion(questionId);
}

// ---------------------------------------------------------------------------
// Writes — Assessments
// ---------------------------------------------------------------------------

export async function createAdminAssessment(assessment: Assessment): Promise<Assessment> {
  if (!assessment.blueprint || !Array.isArray(assessment.blueprint.rules)) throw new Error("Assessment blueprint rules are required.");
  return createAssessmentAdminRepository().createAssessment(assessment);
}

export async function updateAdminAssessment(assessment: Assessment): Promise<Assessment> {
  if (!assessment.blueprint || !Array.isArray(assessment.blueprint.rules)) throw new Error("Assessment blueprint rules are required.");
  return createAssessmentAdminRepository().updateAssessment(assessment);
}

export async function deleteAdminAssessment(assessmentId: string): Promise<void> {
  return createAssessmentAdminRepository().deleteAssessment(assessmentId);
}

// ---------------------------------------------------------------------------
// Writes — Learning Resources (learning_resources + resource_placements)
// ---------------------------------------------------------------------------

export async function createAdminResource(input: AdminResourceInput): Promise<LearningResource> {
  const errors = validateLearningResource(input);
  if (errors.length > 0) throw new Error(errors.join(" "));
  return createResourceAdminRepository().createResource(input);
}

export async function updateAdminResource(
  resourceId: string,
  patch: Partial<Omit<LearningResource, "id" | "createdAt" | "updatedAt">>,
): Promise<LearningResource | undefined> {
  return createResourceAdminRepository().updateResource(resourceId, patch);
}

export async function setAdminResourceStatus(resourceId: string, status: ContentStatus): Promise<LearningResource | undefined> {
  const repository = createResourceAdminRepository();
  if (status === "archived") return repository.archiveResource(resourceId);
  if (status === "published") return repository.updateResource(resourceId, { status: "published" });
  return repository.restoreResource(resourceId);
}

/** Placement must target exactly one of course / week / day. */
export async function placeAdminResource(resourceId: string, target: AdminPlacementTarget): Promise<ResourcePlacement> {
  const errors = validateResourcePlacement(resourceId, target);
  if (errors.length > 0) throw new Error(errors.join(" "));
  const repository = createResourceAdminRepository();
  const existing = await repository.listPlacements(target);
  const duplicate = existing.find(
    (placement) =>
      placement.resourceId === resourceId &&
      placement.courseId === target.courseId &&
      placement.weekId === target.weekId &&
      placement.dayId === target.dayId,
  );
  if (duplicate) return duplicate;
  return repository.createPlacement(resourceId, target);
}

export async function removeAdminResourcePlacement(resourceId: string, target: AdminPlacementTarget): Promise<void> {
  return createResourceAdminRepository().deletePlacement(resourceId, target);
}

// ---------------------------------------------------------------------------
// Writes — Course Materials (departments + course_materials)
// ---------------------------------------------------------------------------

export async function createAdminDepartment(input: AdminDepartmentInput): Promise<CourseMaterialsDepartment> {
  const errors = validateDepartment(input);
  if (errors.length > 0) throw new Error(errors.join(" "));
  return createCourseMaterialsAdminRepository().createDepartment(input);
}

export async function updateAdminDepartment(
  departmentId: string,
  patch: Partial<Omit<CourseMaterialsDepartment, "id" | "createdAt" | "updatedAt">>,
): Promise<CourseMaterialsDepartment | undefined> {
  return createCourseMaterialsAdminRepository().updateDepartment(departmentId, patch);
}

export async function setAdminDepartmentStatus(departmentId: string, status: ContentStatus): Promise<CourseMaterialsDepartment | undefined> {
  const repository = createCourseMaterialsAdminRepository();
  if (status === "archived") return repository.archiveDepartment(departmentId);
  if (status === "published") return repository.updateDepartment(departmentId, { status: "published" });
  return repository.restoreDepartment(departmentId);
}

export async function createAdminCourseMaterial(input: AdminCourseMaterialInput): Promise<CourseMaterialEntry> {
  const errors = validateCourseMaterial(input);
  if (errors.length > 0) throw new Error(errors.join(" "));
  return createCourseMaterialsAdminRepository().createCourseMaterial(input);
}

export async function updateAdminCourseMaterial(
  materialId: string,
  patch: Partial<Omit<CourseMaterialEntry, "id" | "createdAt" | "updatedAt">>,
): Promise<CourseMaterialEntry | undefined> {
  return createCourseMaterialsAdminRepository().updateCourseMaterial(materialId, patch);
}

export async function setAdminCourseMaterialStatus(materialId: string, status: ContentStatus): Promise<CourseMaterialEntry | undefined> {
  const repository = createCourseMaterialsAdminRepository();
  if (status === "archived") return repository.archiveCourseMaterial(materialId);
  if (status === "published") return repository.updateCourseMaterial(materialId, { status: "published" });
  return repository.restoreCourseMaterial(materialId);
}

export async function reorderAdminDepartments(ids: string[]): Promise<CourseMaterialsDepartment[]> {
  return createCourseMaterialsAdminRepository().reorderDepartments(ids);
}

export async function reorderAdminCourseMaterials(departmentId: string, ids: string[]): Promise<CourseMaterialEntry[]> {
  return createCourseMaterialsAdminRepository().reorderCourseMaterials(departmentId, ids);
}

export async function archiveAdminCourseMaterial(materialId: string): Promise<void> {
  await createCourseMaterialsAdminRepository().archiveCourseMaterial(materialId);
}



