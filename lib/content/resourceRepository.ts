import {
  archiveResource,
  attachResource,
  createResource,
  detachResource,
  getResourceById,
  getResourcePlacements,
  getResources,
  restoreResource,
  updateResource,
  validateLearningResource,
  validateResourcePlacement,
} from "./resources";
import { getLesson, getWeek } from "./access";
import type { LearningResource, LearningResourceInput, LearningResourceStatus, ResourcePlacement, ResourcePlacementTarget } from "./types/resource";
import { createSupabaseAdminClient, createSupabaseBrowserClient } from "../supabase/client";
import type { Database } from "../supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ResourceRepositoryListOptions = {
  type?: LearningResource["type"];
  status?: LearningResourceStatus;
  tags?: string[];
  visibility?: "all" | "student";
  includeDraft?: boolean;
  limit?: number;
};

export interface ResourceRepository {
  listResources(options?: ResourceRepositoryListOptions): Promise<LearningResource[]>;
  getResource(resourceId: string): Promise<LearningResource | undefined>;
  createResource(resource: LearningResourceInput): Promise<LearningResource>;
  updateResource(resourceId: string, patch: Partial<Omit<LearningResource, "id" | "createdAt" | "updatedAt">>): Promise<LearningResource | undefined>;
  archiveResource(resourceId: string): Promise<LearningResource | undefined>;
  restoreResource(resourceId: string): Promise<LearningResource | undefined>;
  listPlacements(scope?: ResourcePlacementTarget): Promise<ResourcePlacement[]>;
  createPlacement(resourceId: string, target: ResourcePlacementTarget): Promise<ResourcePlacement>;
  deletePlacement(resourceId: string, target: ResourcePlacementTarget): Promise<void>;
  listResourcesForScope(scope: ResourcePlacementTarget, options?: ResourceRepositoryListOptions): Promise<LearningResource[]>;
  deleteResource(resourceId: string): Promise<void>;
}

function resourceIsVisible(resource: LearningResource, options: ResourceRepositoryListOptions) {
  return options.visibility !== "student" || resource.status === "published" || (options.includeDraft === true && resource.status === "draft");
}

function applyResourceOptions(resources: LearningResource[], options: ResourceRepositoryListOptions) {
  const filtered = resources
    .filter((resource) => !options.type || resource.type === options.type)
    .filter((resource) => !options.status || resource.status === options.status)
    .filter((resource) => !options.tags?.length || options.tags.every((tag) => resource.tags.includes(tag)))
    .filter((resource) => resourceIsVisible(resource, options));
  return options.limit && options.limit > 0 ? filtered.slice(0, options.limit) : filtered;
}

export const resourceLocalRepository: ResourceRepository = {
  async listResources(options = {}) {
    return applyResourceOptions(getResources(), options);
  },
  async getResource(resourceId) {
    return getResourceById(resourceId);
  },
  async createResource(resource) {
    return createResource(resource);
  },
  async updateResource(resourceId, patch) {
    return updateResource(resourceId, patch);
  },
  async archiveResource(resourceId) {
    return archiveResource(resourceId);
  },
  async restoreResource(resourceId) {
    return restoreResource(resourceId);
  },
  async listPlacements(scope = {}) {
    return getResourcePlacements().filter((placement) => (!scope.courseId || placement.courseId === scope.courseId) && (!scope.weekId || placement.weekId === scope.weekId) && (!scope.dayId || placement.dayId === scope.dayId));
  },
  async createPlacement(resourceId, target) {
    const errors = validateResourcePlacement(resourceId, target);
    if (errors.length) throw new Error(errors.join(" "));
    return attachResource(resourceId, target) as ResourcePlacement;
  },
  async deletePlacement(resourceId, target) {
    detachResource(resourceId, target);
  },
  async listResourcesForScope(scope, options = {}) {
    const placements = getResourcePlacements().filter((placement) =>
      scope.dayId
        ? placement.dayId === scope.dayId || placement.weekId === getLesson(scope.dayId)?.weekId || placement.courseId === getLesson(scope.dayId)?.courseId
        : scope.weekId
          ? placement.weekId === scope.weekId || placement.courseId === getWeek(scope.weekId)?.courseId
          : placement.courseId === scope.courseId,
    );
    const resourceIds = new Set(placements.map((placement) => placement.resourceId));
    return applyResourceOptions(getResources().filter((resource) => resourceIds.has(resource.id)), options);
  },
  async deleteResource() {
    throw new Error("Not implemented for local source");
  },
};

type ResourceRow = Database["public"]["Tables"]["learning_resources"]["Row"];
type PlacementRow = Database["public"]["Tables"]["resource_placements"]["Row"];

function defaultResourceClientFactory() {
  return typeof window === "undefined" ? createSupabaseAdminClient() : createSupabaseBrowserClient();
}

function mapResource(row: ResourceRow): LearningResource {
  const resource = {
    id: row.id,
    type: row.type as LearningResource["type"],
    title: row.title,
    description: row.description ?? undefined,
    status: row.status as LearningResourceStatus,
    tags: row.tags ?? [],
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    data: row.data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as unknown as LearningResource;
  const errors = validateLearningResource(resource);
  if (errors.length) throw new Error(`Invalid learning resource ${row.id}: ${errors.join("; ")}`);
  return resource;
}

function mapPlacement(row: PlacementRow): ResourcePlacement {
  return {
    id: row.id,
    resourceId: row.resource_id,
    courseId: row.course_id ?? undefined,
    weekId: row.week_id ?? undefined,
    dayId: row.day_id ?? undefined,
    order: row.order_index,
    createdAt: row.created_at,
  };
}

function applyResourceQuery(query: any, options: ResourceRepositoryListOptions) {
  let next = query;
  if (options.type) next = next.eq("type", options.type);
  if (options.status) next = next.eq("status", options.status);
  if (options.tags?.length) next = next.contains("tags", options.tags);
  if (options.visibility === "student") next = options.includeDraft ? next.in("status", ["published", "draft"]) : next.eq("status", "published");
  return next;
}

function resourceRow(resource: LearningResource) {
  return { id: resource.id, type: resource.type, title: resource.title, description: resource.description ?? null, status: resource.status, tags: resource.tags, data: resource.data, metadata: resource.metadata };
}

/**
 * Supabase-backed Resource repository. The client factory is injectable so the
 * server-only admin content boundary (Task 39E) can supply the service-role
 * client without duplicating this implementation.
 */
export function createResourceSupabaseRepository(clientFactory: () => SupabaseClient<Database> = defaultResourceClientFactory): ResourceRepository {
  return {
  async listResources(options = {}) {
    const client = clientFactory();
    let query = applyResourceQuery(client.from("learning_resources").select("*"), options).order("created_at", { ascending: true }).order("id", { ascending: true });
    if (options.limit && options.limit > 0) query = query.limit(options.limit);
    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as ResourceRow[]).map(mapResource);
  },
  async getResource(resourceId) {
    const { data, error } = await clientFactory().from("learning_resources").select("*").eq("id", resourceId).maybeSingle();
    if (error) throw error;
    return data ? mapResource(data as ResourceRow) : undefined;
  },
  async createResource(resource) {
    const errors = validateLearningResource(resource);
    if (errors.length) throw new Error(errors.join(" "));
    const now = new Date().toISOString();
    const row = { ...resourceRow({ ...resource, id: "", createdAt: now, updatedAt: now } as LearningResource), id: crypto.randomUUID(), created_at: now, updated_at: now };
    const { error } = await clientFactory().from("learning_resources").insert(row as never);
    if (error) throw error;
    return mapResource(row as unknown as ResourceRow);
  },
  async updateResource(resourceId, patch) {
    const current = await this.getResource(resourceId);
    if (!current) return undefined;
    const updated = { ...current, ...patch, id: current.id, createdAt: current.createdAt, updatedAt: new Date().toISOString() } as LearningResource;
    const errors = validateLearningResource(updated);
    if (errors.length) throw new Error(errors.join(" "));
    const { error } = await clientFactory().from("learning_resources").update(resourceRow(updated) as never).eq("id", resourceId);
    if (error) throw error;
    return updated;
  },
  async archiveResource(resourceId) {
    return this.updateResource(resourceId, { status: "archived" });
  },
  async restoreResource(resourceId) {
    return this.updateResource(resourceId, { status: "draft" });
  },
  async listPlacements(scope = {}) {
    let query = clientFactory().from("resource_placements").select("*").order("order_index", { ascending: true }).order("created_at", { ascending: true });
    if (scope.courseId) query = query.eq("course_id", scope.courseId);
    if (scope.weekId) query = query.eq("week_id", scope.weekId);
    if (scope.dayId) query = query.eq("day_id", scope.dayId);
    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as PlacementRow[]).map(mapPlacement);
  },
  async createPlacement(resourceId, target) {
    if ([target.courseId, target.weekId, target.dayId].filter(Boolean).length !== 1) throw new Error("A resource placement must target exactly one Course, Week, or Day.");
    const row = { id: crypto.randomUUID(), resource_id: resourceId, course_id: target.courseId ?? null, week_id: target.weekId ?? null, day_id: target.dayId ?? null, order_index: 0 };
    const { data, error } = await clientFactory().from("resource_placements").insert(row as never).select("*").single();
    if (error) throw error;
    return mapPlacement(data as PlacementRow);
  },
  async deletePlacement(resourceId, target) {
    let query = clientFactory().from("resource_placements").delete().eq("resource_id", resourceId);
    if (target.courseId) query = query.eq("course_id", target.courseId); else query = query.is("course_id", null);
    if (target.weekId) query = query.eq("week_id", target.weekId); else query = query.is("week_id", null);
    if (target.dayId) query = query.eq("day_id", target.dayId); else query = query.is("day_id", null);
    const { error } = await query;
    if (error) throw error;
  },
  async listResourcesForScope(scope, options = {}) {
    let courseId = scope.courseId;
    let weekId = scope.weekId;
    if (scope.dayId) {
      const { data, error } = await clientFactory().from("days").select("course_id,week_id").eq("id", scope.dayId).maybeSingle();
      if (error) throw error;
      const row = data as unknown as { course_id: string; week_id: string } | null;
      courseId = row?.course_id;
      weekId = row?.week_id;
    } else if (scope.weekId && !scope.courseId) {
      const { data, error } = await clientFactory().from("weeks").select("course_id").eq("id", scope.weekId).maybeSingle();
      if (error) throw error;
      const row = data as unknown as { course_id: string } | null;
      courseId = row?.course_id;
    }
    let placementQuery = clientFactory().from("resource_placements").select("*").order("order_index", { ascending: true });
    if (scope.dayId) placementQuery = placementQuery.or(`day_id.eq.${scope.dayId},week_id.eq.${weekId},course_id.eq.${courseId}`);
    else if (scope.weekId) placementQuery = placementQuery.or(`week_id.eq.${scope.weekId},course_id.eq.${courseId}`);
    else if (scope.courseId) placementQuery = placementQuery.eq("course_id", scope.courseId);
    const { data: placementData, error: placementError } = await placementQuery;
    if (placementError) throw placementError;
    const placements = ((placementData ?? []) as PlacementRow[]).map(mapPlacement);
    if (!placements.length) return [];
    const ids = [...new Set(placements.map((placement) => placement.resourceId))];
    let query = applyResourceQuery(clientFactory().from("learning_resources").select("*"), options).in("id", ids).order("created_at", { ascending: true }).order("id", { ascending: true });
    if (options.limit && options.limit > 0) query = query.limit(options.limit);
    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as ResourceRow[]).map(mapResource);
  },
  async deleteResource(resourceId) {
    const { error: placementsError } = await clientFactory().from("resource_placements").delete().eq("resource_id", resourceId);
    if (placementsError) throw placementsError;
    const { error } = await clientFactory().from("learning_resources").delete().eq("id", resourceId);
    if (error) throw error;
  },
  };
}

export const resourceSupabaseRepository: ResourceRepository = createResourceSupabaseRepository();

export type ResourceRepositorySource = "local" | "supabase";
export function createResourceRepository(source: ResourceRepositorySource = "local"): ResourceRepository {
  return source === "supabase" ? resourceSupabaseRepository : resourceLocalRepository;
}