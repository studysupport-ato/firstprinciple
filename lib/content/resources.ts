import { getCourse, getLesson, getWeek } from "./access";
import { createStableId } from "../ids";
import { isPreviewVisible } from "./lifecycle";
import { createResourceRepository } from "./resourceRepository";
import { getGeoGebraEmbedConfig, resolveGeoGebraEmbed } from "./resourcePresentation";
import type {
  LearningResource,
  LearningResourceInput,
  LearningResourceStatus,
  LearningResourceType,
  ResourcePlacement,
  ResourcePlacementTarget,
} from "./types/resource";

const STORAGE_KEY = "first-principles-learning-resources-v1";

interface ResourceStore {
  resources: LearningResource[];
  placements: ResourcePlacement[];
}

const EMPTY_STORE: ResourceStore = { resources: [], placements: [] };

function readStore(): ResourceStore {
  if (typeof window === "undefined") return EMPTY_STORE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STORE;
    const parsed = JSON.parse(raw) as Partial<ResourceStore>;
    return {
      resources: Array.isArray(parsed.resources) ? parsed.resources : [],
      placements: Array.isArray(parsed.placements) ? parsed.placements : [],
    };
  } catch {
    console.warn(`[Back2Basics with Kwamina] Ignoring malformed resource store: ${STORAGE_KEY}`);
    return EMPTY_STORE;
  }
}

function writeStore(store: ResourceStore) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function uid(prefix: string, label: string) {
  return createStableId(prefix, label);
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateLearningResource(resource: LearningResourceInput | LearningResource): string[] {
  const errors: string[] = [];
  const label = ("id" in resource ? resource.id : undefined) || resource.title || "unknown";

  if ("id" in resource && !resource.id.trim()) errors.push(`Resource ${label} is missing an id.`);
  if (!resource.title.trim()) errors.push(`Resource ${label} is missing a title.`);
  if (!["youtube", "geogebra", "external"].includes(resource.type)) errors.push(`Resource ${label} has an unsupported type.`);
  if (!["draft", "published", "archived"].includes(resource.status)) errors.push(`Resource ${label} has an unsupported status.`);
  if (!Array.isArray(resource.tags)) errors.push(`Resource ${label} must have a tags array.`);

  if (resource.type === "youtube") {
    if (!/^[A-Za-z0-9_-]{6,}$/.test(resource.data.videoId)) errors.push(`Resource ${label} has an invalid YouTube video id.`);
    if (!isHttpUrl(resource.data.url)) errors.push(`Resource ${label} must have a valid YouTube URL.`);
    if (resource.data.sourceType !== "ato" && resource.data.sourceType !== "recommended") errors.push(`Resource ${label} has an invalid YouTube source type.`);
  }

  if (resource.type === "geogebra") {
    const { sourceUrl } = resource.data;
    if (sourceUrl && !isHttpUrl(sourceUrl)) errors.push(`Resource ${label} must have a valid GeoGebra source URL.`);

    // Reuse the resolver that the renderer uses, so "savable" and "renderable"
    // can never drift apart. A resource with no material id and no app name would
    // otherwise silently fall back to GeoGebra's raw (403-forbidden) app path.
    const resolution = resolveGeoGebraEmbed(getGeoGebraEmbedConfig(resource.data));
    if (!resolution.ok) {
      if (resolution.reason === "not-configured") {
        errors.push(`Resource ${label} needs a GeoGebra material ID (e.g. RHYH3UQ8) or a supported app (graphing, geometry, 3d, classic).`);
      } else if (resolution.reason === "invalid-material-id") {
        errors.push(`Resource ${label} has an invalid GeoGebra material ID "${resolution.detail}". Use the id from the activity URL, e.g. https://www.geogebra.org/m/RHYH3UQ8.`);
      } else {
        errors.push(`Resource ${label} has an unsupported GeoGebra app "${resolution.detail}". Supported apps: graphing, geometry, 3d, classic.`);
      }
    }
  }

  if (resource.type === "external" && !isHttpUrl(resource.data.url)) errors.push(`Resource ${label} must have a valid external URL.`);

  return errors;
}

function targetIds(target: ResourcePlacementTarget) {
  return [target.courseId, target.weekId, target.dayId].filter((value): value is string => Boolean(value));
}

export function validateResourcePlacement(resourceId: string, target: ResourcePlacementTarget): string[] {
  const errors: string[] = [];
  if (!getResourceById(resourceId)) errors.push(`Resource ${resourceId} does not exist.`);
  if (targetIds(target).length !== 1) errors.push("A resource placement must target exactly one Course, Week, or Day.");

  if (target.dayId) {
    const day = getLesson(target.dayId);
    if (!day) errors.push(`Day ${target.dayId} does not exist.`);
    if (day && target.courseId && day.courseId !== target.courseId) errors.push(`Day ${target.dayId} does not belong to Course ${target.courseId}.`);
    if (day && target.weekId && day.weekId !== target.weekId) errors.push(`Day ${target.dayId} does not belong to Week ${target.weekId}.`);
  } else if (target.weekId) {
    const week = getWeek(target.weekId);
    if (!week) errors.push(`Week ${target.weekId} does not exist.`);
    if (week && target.courseId && week.courseId !== target.courseId) errors.push(`Week ${target.weekId} does not belong to Course ${target.courseId}.`);
  } else if (target.courseId && !getCourse(target.courseId)) {
    errors.push(`Course ${target.courseId} does not exist.`);
  }

  return errors;
}

export function getResources(): LearningResource[] {
  return readStore().resources;
}

export function getResourceById(id: string) {
  return getResources().find((resource) => resource.id === id);
}

export function getResourcesByType(type: LearningResourceType) {
  return getResources().filter((resource) => resource.type === type);
}

export function getResourcePlacements(resourceId?: string) {
  const placements = readStore().placements;
  return resourceId ? placements.filter((placement) => placement.resourceId === resourceId) : placements;
}

function placementMatchesScope(placement: ResourcePlacement, target: ResourcePlacementTarget) {
  if (target.dayId) return placement.dayId === target.dayId;
  if (target.weekId) {
    return placement.weekId === target.weekId || (placement.dayId !== undefined && getLesson(placement.dayId)?.weekId === target.weekId);
  }
  if (target.courseId) {
    return (
      placement.courseId === target.courseId ||
      (placement.weekId !== undefined && getWeek(placement.weekId)?.courseId === target.courseId) ||
      (placement.dayId !== undefined && getLesson(placement.dayId)?.courseId === target.courseId)
    );
  }
  return false;
}

function getResourcesForTarget(target: ResourcePlacementTarget) {
  const ids = new Set(getResourcePlacements().filter((placement) => placementMatchesScope(placement, target)).map((placement) => placement.resourceId));
  return getResources().filter((resource) => ids.has(resource.id));
}

export function getResourcesForCourse(courseId: string) {
  return getResourcesForTarget({ courseId });
}

export function getResourcesForWeek(weekId: string) {
  return getResourcesForTarget({ weekId });
}

export interface ResourceResolutionOptions {
  includeDraft?: boolean;
}

function resourceIsVisible(resource: LearningResource, options: ResourceResolutionOptions) {
  return isPreviewVisible(resource.status, { preview: options.includeDraft });
}

function resourceOrder(resource: LearningResource) {
  if (resource.type === "youtube") return resource.data.sourceType === "ato" ? 0 : 1;
  if (resource.type === "geogebra") return 2;
  return 3;
}

export function getResourcesForDay(dayId: string, options: ResourceResolutionOptions = {}) {
  const day = getLesson(dayId);
  if (!day) return [];

  const repository = createResourceRepository("supabase");
  const resources = repository.listResourcesForScope(
    { dayId },
    {
      visibility: options.includeDraft ? "all" : "student",
      includeDraft: options.includeDraft,
    },
  );

  return resources.then((items) =>
    items
      .filter((resource) => resourceIsVisible(resource, options))
      .sort(
        (first, second) =>
          resourceOrder(first) - resourceOrder(second) ||
          first.createdAt.localeCompare(second.createdAt) ||
          first.id.localeCompare(second.id),
      ),
  );
}

export function createResource(input: LearningResourceInput) {
  const errors = validateLearningResource(input);
  if (errors.length > 0) throw new Error(errors.join(" "));
  const now = new Date().toISOString();
  const resource = { ...input, id: uid("resource", input.title), createdAt: now, updatedAt: now } as LearningResource;
  const store = readStore();
  writeStore({ ...store, resources: [...store.resources, resource] });
  return resource;
}

export function updateResource(id: string, patch: Partial<Omit<LearningResource, "id" | "createdAt" | "updatedAt">>) {
  const resource = getResourceById(id);
  if (!resource) return undefined;
  const updated = { ...resource, ...patch, id: resource.id, createdAt: resource.createdAt, updatedAt: new Date().toISOString() } as LearningResource;
  const errors = validateLearningResource(updated);
  if (errors.length > 0) throw new Error(errors.join(" "));
  const store = readStore();
  writeStore({ ...store, resources: store.resources.map((item) => (item.id === id ? updated : item)) });
  return updated;
}

export function archiveResource(id: string) {
  return updateResource(id, { status: "archived" as LearningResourceStatus });
}

export function restoreResource(id: string) {
  return updateResource(id, { status: "draft" as LearningResourceStatus });
}

export function deleteResource(id: string) {
  return archiveResource(id);
}

export function attachResource(resourceId: string, target: ResourcePlacementTarget) {
  const errors = validateResourcePlacement(resourceId, target);
  if (errors.length > 0) throw new Error(errors.join(" "));
  const store = readStore();
  const duplicate = store.placements.some(
    (placement) => placement.resourceId === resourceId && placement.courseId === target.courseId && placement.weekId === target.weekId && placement.dayId === target.dayId,
  );
  if (duplicate) return store.placements.find((placement) => placement.resourceId === resourceId && placement.courseId === target.courseId && placement.weekId === target.weekId && placement.dayId === target.dayId);
  const placement: ResourcePlacement = { ...target, id: uid("placement", resourceId), resourceId, createdAt: new Date().toISOString() };
  writeStore({ ...store, placements: [...store.placements, placement] });
  return placement;
}

export function detachResource(resourceId: string, target: ResourcePlacementTarget) {
  const store = readStore();
  const placements = store.placements.filter(
    (placement) => !(placement.resourceId === resourceId && placement.courseId === target.courseId && placement.weekId === target.weekId && placement.dayId === target.dayId),
  );
  writeStore({ ...store, placements });
}

export function getResourcePlacementCounts() {
  const counts = new Map<string, number>();
  for (const placement of readStore().placements) {
    counts.set(placement.resourceId, (counts.get(placement.resourceId) ?? 0) + 1);
  }
  return counts;
}