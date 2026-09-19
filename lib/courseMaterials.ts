export type CourseMaterialsStatus = "draft" | "published" | "archived";

export interface CourseMaterialsDepartment {
  id: string;
  name: string;
  shortName?: string;
  description?: string;
  order: number;
  status: CourseMaterialsStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CourseMaterialEntry {
  id: string;
  departmentId: string;
  courseCode?: string;
  courseTitle: string;
  description?: string;
  url: string;
  provider?: string;
  order: number;
  status: CourseMaterialsStatus;
  createdAt: string;
  updatedAt: string;
}

export type CourseMaterialsDepartmentInput = Omit<CourseMaterialsDepartment, "id" | "createdAt" | "updatedAt" | "order">;
export type CourseMaterialEntryInput = Omit<CourseMaterialEntry, "id" | "createdAt" | "updatedAt" | "order">;
import { createStableId } from "./ids";

export interface CourseMaterialsDirectory {
  departments: CourseMaterialsDepartment[];
  entries: CourseMaterialEntry[];
}

const STORAGE_KEY = "first-principles-course-materials-v1";
const EMPTY_DIRECTORY: CourseMaterialsDirectory = { departments: [], entries: [] };

function readDirectory(): CourseMaterialsDirectory {
  if (typeof window === "undefined") return EMPTY_DIRECTORY;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DIRECTORY;
    const parsed = JSON.parse(raw) as Partial<CourseMaterialsDirectory>;
    return {
      departments: Array.isArray(parsed.departments) ? parsed.departments : [],
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    console.warn(`[First Principles] Ignoring malformed course materials store: ${STORAGE_KEY}`);
    return EMPTY_DIRECTORY;
  }
}

function writeDirectory(directory: CourseMaterialsDirectory) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(directory));
}

function uid(prefix: string, value: string) {
  return createStableId(prefix, value);
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function sortByOrder<T extends { order: number; createdAt: string; id: string }>(items: T[]) {
  return [...items].sort((first, second) => first.order - second.order || first.createdAt.localeCompare(second.createdAt) || first.id.localeCompare(second.id));
}

export function validateDepartment(department: CourseMaterialsDepartmentInput | CourseMaterialsDepartment) {
  const errors: string[] = [];
  if (!department.name.trim()) errors.push("Department name is required.");
  if (!["draft", "published", "archived"].includes(department.status)) errors.push("Department status is invalid.");
  return errors;
}

export function validateCourseMaterial(entry: CourseMaterialEntryInput | CourseMaterialEntry) {
  const errors: string[] = [];
  if (!entry.departmentId.trim()) errors.push("A department is required.");
  if (!entry.courseTitle.trim()) errors.push("Course title is required.");
  if (!isHttpUrl(entry.url.trim())) errors.push("A valid HTTP or HTTPS URL is required.");
  if (!["draft", "published", "archived"].includes(entry.status)) errors.push("Course material status is invalid.");
  return errors;
}

export function getCourseMaterialsDirectory(): CourseMaterialsDirectory {
  const directory = readDirectory();
  return {
    departments: sortByOrder(directory.departments),
    entries: sortByOrder(directory.entries),
  };
}

export function getDepartments() {
  return getCourseMaterialsDirectory().departments;
}

export function getDepartmentById(id: string) {
  return getDepartments().find((department) => department.id === id);
}

export function getPublishedDepartments() {
  return getDepartments().filter((department) => department.status === "published");
}

export function getCourseMaterials() {
  return getCourseMaterialsDirectory().entries;
}

export function getCourseMaterialById(id: string) {
  return getCourseMaterials().find((entry) => entry.id === id);
}

export function getCourseMaterialsByDepartment(departmentId: string) {
  return getCourseMaterials().filter((entry) => entry.departmentId === departmentId);
}

export function getPublishedCourseMaterialsByDepartment(departmentId: string) {
  const department = getDepartmentById(departmentId);
  if (!department || department.status !== "published") return [];
  return getCourseMaterialsByDepartment(departmentId).filter((entry) => entry.status === "published");
}

export function getPublishedCourseMaterialsDirectory(): CourseMaterialsDirectory {
  const directory = getCourseMaterialsDirectory();
  const departments = directory.departments.filter((department) => department.status === "published");
  const publishedDepartmentIds = new Set(departments.map((department) => department.id));
  return {
    departments,
    entries: directory.entries.filter((entry) => publishedDepartmentIds.has(entry.departmentId) && entry.status === "published"),
  };
}

export function createDepartment(input: CourseMaterialsDepartmentInput) {
  const errors = validateDepartment(input);
  if (errors.length) throw new Error(errors.join(" "));
  const now = new Date().toISOString();
  const directory = readDirectory();
  if (directory.departments.some((department) => department.name.trim().toLowerCase() === input.name.trim().toLowerCase())) {
    throw new Error("A department with this name already exists.");
  }
  const department: CourseMaterialsDepartment = { ...input, id: uid("department", input.name), order: directory.departments.length, createdAt: now, updatedAt: now };
  writeDirectory({ ...directory, departments: [...directory.departments, department] });
  return department;
}

export function updateDepartment(id: string, patch: Partial<Omit<CourseMaterialsDepartment, "id" | "createdAt" | "updatedAt">>) {
  const current = getDepartmentById(id);
  if (!current) return undefined;
  const updated = { ...current, ...patch, id, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
  const errors = validateDepartment(updated);
  if (errors.length) throw new Error(errors.join(" "));
  const directory = readDirectory();
  if (directory.departments.some((department) => department.id !== id && department.name.trim().toLowerCase() === updated.name.trim().toLowerCase())) {
    throw new Error("A department with this name already exists.");
  }
  writeDirectory({ ...directory, departments: directory.departments.map((item) => item.id === id ? updated : item) });
  return updated;
}

export function archiveDepartment(id: string) {
  return updateDepartment(id, { status: "archived" });
}

export function restoreDepartment(id: string) {
  return updateDepartment(id, { status: "draft" });
}

export function reorderDepartments(ids: string[]) {
  const directory = readDirectory();
  const order = new Map(ids.map((id, index) => [id, index]));
  const departments = directory.departments.map((department) => ({ ...department, order: order.get(department.id) ?? department.order, updatedAt: order.has(department.id) ? new Date().toISOString() : department.updatedAt }));
  writeDirectory({ ...directory, departments });
  return sortByOrder(departments);
}

export function createCourseMaterial(input: CourseMaterialEntryInput) {
  if (!getDepartmentById(input.departmentId)) throw new Error("The selected department does not exist.");
  const errors = validateCourseMaterial(input);
  if (errors.length) throw new Error(errors.join(" "));
  const now = new Date().toISOString();
  const directory = readDirectory();
  const entries = directory.entries.filter((entry) => entry.departmentId === input.departmentId);
  const normalizedUrl = input.url.trim().toLowerCase();
  const normalizedCode = input.courseCode?.trim().toLowerCase();
  if (entries.some((entry) => entry.url.trim().toLowerCase() === normalizedUrl || (normalizedCode && entry.courseCode?.trim().toLowerCase() === normalizedCode && entry.courseTitle.trim().toLowerCase() === input.courseTitle.trim().toLowerCase()))) {
    throw new Error("This department already has the same course material link or course entry.");
  }
  const entry: CourseMaterialEntry = { ...input, id: uid("course-material", input.courseTitle), order: entries.length, createdAt: now, updatedAt: now };
  writeDirectory({ ...directory, entries: [...directory.entries, entry] });
  return entry;
}

export function updateCourseMaterial(id: string, patch: Partial<Omit<CourseMaterialEntry, "id" | "createdAt" | "updatedAt">>) {
  const current = getCourseMaterialById(id);
  if (!current) return undefined;
  const updated = { ...current, ...patch, id, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
  const errors = validateCourseMaterial(updated);
  if (errors.length) throw new Error(errors.join(" "));
  const directory = readDirectory();
  const siblings = directory.entries.filter((entry) => entry.departmentId === updated.departmentId && entry.id !== id);
  const normalizedUrl = updated.url.trim().toLowerCase();
  const normalizedCode = updated.courseCode?.trim().toLowerCase();
  if (siblings.some((entry) => entry.url.trim().toLowerCase() === normalizedUrl || (normalizedCode && entry.courseCode?.trim().toLowerCase() === normalizedCode && entry.courseTitle.trim().toLowerCase() === updated.courseTitle.trim().toLowerCase()))) {
    throw new Error("This department already has the same course material link or course entry.");
  }
  writeDirectory({ ...directory, entries: directory.entries.map((item) => item.id === id ? updated : item) });
  return updated;
}

export function archiveCourseMaterial(id: string) {
  return updateCourseMaterial(id, { status: "archived" });
}

export function restoreCourseMaterial(id: string) {
  return updateCourseMaterial(id, { status: "draft" });
}

export function reorderCourseMaterials(departmentId: string, ids: string[]) {
  const directory = readDirectory();
  const order = new Map(ids.map((id, index) => [id, index]));
  const entries = directory.entries.map((entry) => entry.departmentId === departmentId && order.has(entry.id) ? { ...entry, order: order.get(entry.id) ?? entry.order, updatedAt: new Date().toISOString() } : entry);
  writeDirectory({ ...directory, entries });
  return sortByOrder(entries.filter((entry) => entry.departmentId === departmentId));
}