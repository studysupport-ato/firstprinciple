import {
  archiveCourseMaterial,
  archiveDepartment,
  createCourseMaterial,
  createDepartment,
  getCourseMaterialById,
  getCourseMaterials,
  getDepartmentById,
  getDepartments,
  getPublishedCourseMaterialsDirectory,
  reorderCourseMaterials,
  reorderDepartments,
  restoreCourseMaterial,
  restoreDepartment,
  updateCourseMaterial,
  updateDepartment,
  validateCourseMaterial,
  validateDepartment,
  type CourseMaterialEntry,
  type CourseMaterialEntryInput,
  type CourseMaterialsDepartment,
  type CourseMaterialsDepartmentInput,
} from "./courseMaterials";
import type { ContentStatus } from "./content/lifecycle";
import { buildYouTubeWatchUrl, getCourseMaterialVideoId, parseYouTubeVideoId } from "./youtube";
import { createSupabaseBrowserClient } from "./supabase/client";
import type { Database } from "./supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CourseMaterialsRepositoryListOptions = { departmentId?: string; status?: ContentStatus; visibility?: "all" | "student"; limit?: number };

export interface CourseMaterialsRepository {
  listDepartments(options?: CourseMaterialsRepositoryListOptions): Promise<CourseMaterialsDepartment[]>;
  getDepartment(departmentId: string): Promise<CourseMaterialsDepartment | undefined>;
  createDepartment(input: CourseMaterialsDepartmentInput): Promise<CourseMaterialsDepartment>;
  updateDepartment(departmentId: string, patch: Partial<Omit<CourseMaterialsDepartment, "id" | "createdAt" | "updatedAt">>): Promise<CourseMaterialsDepartment | undefined>;
  listCourseMaterials(options?: CourseMaterialsRepositoryListOptions): Promise<CourseMaterialEntry[]>;
  getCourseMaterial(materialId: string): Promise<CourseMaterialEntry | undefined>;
  createCourseMaterial(input: CourseMaterialEntryInput): Promise<CourseMaterialEntry>;
  updateCourseMaterial(materialId: string, patch: Partial<Omit<CourseMaterialEntry, "id" | "createdAt" | "updatedAt">>): Promise<CourseMaterialEntry | undefined>;
  archiveDepartment(departmentId: string): Promise<CourseMaterialsDepartment | undefined>;
  restoreDepartment(departmentId: string): Promise<CourseMaterialsDepartment | undefined>;
  archiveCourseMaterial(materialId: string): Promise<CourseMaterialEntry | undefined>;
  restoreCourseMaterial(materialId: string): Promise<CourseMaterialEntry | undefined>;
  reorderDepartments(ids: string[]): Promise<CourseMaterialsDepartment[]>;
  reorderCourseMaterials(departmentId: string, ids: string[]): Promise<CourseMaterialEntry[]>;
  deleteDepartment(departmentId: string): Promise<void>;
  deleteCourseMaterial(materialId: string): Promise<void>;
}

function visible(status: ContentStatus, options: CourseMaterialsRepositoryListOptions) {
  return options.visibility !== "student" || status === "published";
}

export const courseMaterialsLocalRepository: CourseMaterialsRepository = {
  async listDepartments(options = {}) {
    const departments = getDepartments().filter((department) => !options.status || department.status === options.status).filter((department) => visible(department.status, options));
    return options.limit && options.limit > 0 ? departments.slice(0, options.limit) : departments;
  },
  async getDepartment(departmentId) { return getDepartmentById(departmentId); },
  async createDepartment(input) { return createDepartment(input); },
  async updateDepartment(departmentId, patch) { return updateDepartment(departmentId, patch); },
  async listCourseMaterials(options = {}) {
    const directory = options.visibility === "student" ? getPublishedCourseMaterialsDirectory() : { departments: getDepartments(), entries: getCourseMaterials() };
    let entries = directory.entries.filter((entry) => !options.departmentId || entry.departmentId === options.departmentId).filter((entry) => !options.status || entry.status === options.status).filter((entry) => visible(entry.status, options));
    return options.limit && options.limit > 0 ? entries.slice(0, options.limit) : entries;
  },
  async getCourseMaterial(materialId) { return getCourseMaterialById(materialId); },
  async createCourseMaterial(input) { return createCourseMaterial(input); },
  async updateCourseMaterial(materialId, patch) { return updateCourseMaterial(materialId, patch); },
  async archiveDepartment(departmentId) { return archiveDepartment(departmentId); },
  async restoreDepartment(departmentId) { return restoreDepartment(departmentId); },
  async archiveCourseMaterial(materialId) { return archiveCourseMaterial(materialId); },
  async restoreCourseMaterial(materialId) { return restoreCourseMaterial(materialId); },
  async reorderDepartments(ids) { return reorderDepartments(ids); },
  async reorderCourseMaterials(departmentId, ids) { return reorderCourseMaterials(departmentId, ids); },
  async deleteDepartment() { throw new Error("Not implemented for local source"); },
  async deleteCourseMaterial() { throw new Error("Not implemented for local source"); },
};

type DepartmentRow = Database["public"]["Tables"]["departments"]["Row"];
type MaterialRow = Database["public"]["Tables"]["course_materials"]["Row"];

function mapDepartment(row: DepartmentRow): CourseMaterialsDepartment {
  return { id: row.id, name: row.name, shortName: row.short_name ?? undefined, description: row.description ?? undefined, order: row.order_index, status: row.status as ContentStatus, createdAt: row.created_at, updatedAt: row.updated_at };
}
function mapMaterial(row: MaterialRow): CourseMaterialEntry {
  // Backwards-compatible: no kind column. provider="youtube" marker OR a YouTube URL implies YouTube.
  const rawProvider = row.provider ?? undefined;
  const videoId = getCourseMaterialVideoId({ kind: undefined, url: row.url, provider: rawProvider });
  const kind: CourseMaterialEntry["kind"] = rawProvider === "youtube" || videoId ? "youtube" : "link";
  return { id: row.id, departmentId: row.department_id, courseCode: row.course_code ?? undefined, courseTitle: row.course_title, description: row.description ?? undefined, url: kind === "youtube" && videoId ? buildYouTubeWatchUrl(videoId) : row.url, provider: kind === "youtube" ? videoId ?? rawProvider : rawProvider === "youtube" ? undefined : rawProvider, kind, order: row.order_index, status: row.status as ContentStatus, createdAt: row.created_at, updatedAt: row.updated_at };
}

function toRowMaterial(input: { departmentId: string; courseCode?: string; courseTitle: string; description?: string; url: string; provider?: string; kind?: CourseMaterialEntry["kind"]; status: string }) {
  const kind = input.kind ?? (parseYouTubeVideoId(input.url) || parseYouTubeVideoId(input.provider) ? "youtube" : "link");
  if (kind === "youtube") {
    const videoId = parseYouTubeVideoId(input.provider) ?? parseYouTubeVideoId(input.url);
    // Store canonical watch URL; provider column carries ONLY the validated video ID (tiny metadata, no bytes).
    return { kind, url: videoId ? buildYouTubeWatchUrl(videoId) : input.url, provider: videoId ?? input.provider ?? null };
  }
  return { kind, url: input.url, provider: input.provider ?? null };
}
function applyVisibility(query: any, options: CourseMaterialsRepositoryListOptions) {
  let next = query;
  if (options.status) next = next.eq("status", options.status);
  if (options.visibility === "student") next = next.eq("status", "published");
  return next;
}

/**
 * Supabase-backed Course Materials repository. The client factory is injectable
 * so the server-only admin content boundary (Task 39E) can supply the
 * service-role client without duplicating this implementation.
 */
export function createCourseMaterialsSupabaseRepository(clientFactory: () => SupabaseClient<Database> = createSupabaseBrowserClient): CourseMaterialsRepository {
  return {
  async listDepartments(options = {}) {
    let query = applyVisibility(clientFactory().from("departments").select("*").order("order_index", { ascending: true }).order("id", { ascending: true }), options);
    if (options.limit && options.limit > 0) query = query.limit(options.limit);
    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as DepartmentRow[]).map(mapDepartment);
  },
  async getDepartment(departmentId) {
    const { data, error } = await clientFactory().from("departments").select("*").eq("id", departmentId).maybeSingle();
    if (error) throw error;
    return data ? mapDepartment(data as DepartmentRow) : undefined;
  },
  async createDepartment(input) {
    const errors = validateDepartment(input); if (errors.length) throw new Error(errors.join(" "));
    const now = new Date().toISOString(); const row = { id: crypto.randomUUID(), name: input.name, short_name: input.shortName ?? null, description: input.description ?? null, order_index: 0, status: input.status, created_at: now, updated_at: now };
    const { error } = await clientFactory().from("departments").insert(row as never); if (error) throw error; return mapDepartment(row as DepartmentRow);
  },
  async updateDepartment(departmentId, patch) {
    const current = await this.getDepartment(departmentId); if (!current) return undefined;
    const updated = { ...current, ...patch, id: current.id, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
    const errors = validateDepartment(updated); if (errors.length) throw new Error(errors.join(" "));
    const { error } = await clientFactory().from("departments").update({ name: updated.name, short_name: updated.shortName ?? null, description: updated.description ?? null, order_index: updated.order, status: updated.status } as never).eq("id", departmentId); if (error) throw error; return updated;
  },
  async listCourseMaterials(options = {}) {
    let query = applyVisibility(clientFactory().from("course_materials").select("*").order("order_index", { ascending: true }).order("id", { ascending: true }), options);
    if (options.visibility === "student") {
      const { data: departments, error: departmentError } = await clientFactory().from("departments").select("id").eq("status", "published");
      if (departmentError) throw departmentError;
      query = query.in("department_id", ((departments ?? []) as Array<{ id: string }>).map((department) => department.id));
    }
    if (options.departmentId) query = query.eq("department_id", options.departmentId); if (options.limit && options.limit > 0) query = query.limit(options.limit);
    const { data, error } = await query; if (error) throw error; return ((data ?? []) as MaterialRow[]).map(mapMaterial);
  },
  async getCourseMaterial(materialId) { const { data, error } = await clientFactory().from("course_materials").select("*").eq("id", materialId).maybeSingle(); if (error) throw error; return data ? mapMaterial(data as MaterialRow) : undefined; },
  async createCourseMaterial(input) { const errors = validateCourseMaterial({ ...input, kind: input.kind ?? (parseYouTubeVideoId(input.url) || parseYouTubeVideoId(input.provider) ? "youtube" : "link") }); if (errors.length) throw new Error(errors.join(" ")); const now = new Date().toISOString(); const stored = toRowMaterial(input); const row = { id: crypto.randomUUID(), department_id: input.departmentId, course_code: input.courseCode ?? null, course_title: input.courseTitle, description: input.description ?? null, url: stored.url, provider: stored.provider, order_index: 0, status: input.status, created_at: now, updated_at: now }; const { error } = await clientFactory().from("course_materials").insert(row as never); if (error) throw error; return mapMaterial(row as MaterialRow); },
  async updateCourseMaterial(materialId, patch) { const current = await this.getCourseMaterial(materialId); if (!current) return undefined; const merged = { ...current, ...patch, id: current.id, createdAt: current.createdAt, updatedAt: new Date().toISOString() }; const errors = validateCourseMaterial(merged); if (errors.length) throw new Error(errors.join(" ")); const stored = toRowMaterial(merged); const updated = { ...merged, url: stored.url, provider: stored.provider ?? undefined, kind: stored.kind }; const { error } = await clientFactory().from("course_materials").update({ department_id: updated.departmentId, course_code: updated.courseCode ?? null, course_title: updated.courseTitle, description: updated.description ?? null, url: stored.url, provider: stored.provider, order_index: updated.order, status: updated.status } as never).eq("id", materialId); if (error) throw error; return updated; },
  async archiveDepartment(id) { return this.updateDepartment(id, { status: "archived" }); },
  async restoreDepartment(id) { return this.updateDepartment(id, { status: "draft" }); },
  async archiveCourseMaterial(id) { return this.updateCourseMaterial(id, { status: "archived" }); },
  async restoreCourseMaterial(id) { return this.updateCourseMaterial(id, { status: "draft" }); },
  async reorderDepartments(ids) { for (const [order, id] of ids.entries()) { const { error } = await clientFactory().from("departments").update({ order_index: order } as never).eq("id", id); if (error) throw error; } return this.listDepartments(); },
  async reorderCourseMaterials(departmentId, ids) { for (const [order, id] of ids.entries()) { const { error } = await clientFactory().from("course_materials").update({ order_index: order } as never).eq("id", id).eq("department_id", departmentId); if (error) throw error; } return this.listCourseMaterials({ departmentId }); },
  async deleteDepartment(id) {
    // Must delete child materials first to satisfy the FK constraint
    const { error: materialsError } = await clientFactory().from("course_materials").delete().eq("department_id", id);
    if (materialsError) throw materialsError;
    const { error } = await clientFactory().from("departments").delete().eq("id", id);
    if (error) throw error;
  },
  async deleteCourseMaterial(id) { const { error } = await clientFactory().from("course_materials").delete().eq("id", id); if (error) throw error; },
  };
}

export const courseMaterialsSupabaseRepository: CourseMaterialsRepository = createCourseMaterialsSupabaseRepository();

export type CourseMaterialsRepositorySource = "local" | "supabase";
export function createCourseMaterialsRepository(source: CourseMaterialsRepositorySource = "local"): CourseMaterialsRepository { return source === "supabase" ? courseMaterialsSupabaseRepository : courseMaterialsLocalRepository; }