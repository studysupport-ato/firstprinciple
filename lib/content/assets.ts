import { getCourse, getLessons, getWeeks } from "./access";
import type { Asset, AssetStatus, AssetType } from "./types/asset";
import { createStableId } from "../ids";

const STORAGE_KEY = "first-principles-assets-v1";
const DELETED_KEY = "first-principles-assets-deleted-v1";

const baseAssets: Asset[] = [
  {
    id: "asset-placeholder-lesson",
    type: "image",
    name: "Lesson placeholder",
    title: "Lesson illustration placeholder",
    source: { kind: "local", url: "/hero-images/placeholder.png" },
    altText: "Lesson illustration placeholder",
    status: "ready",
    tags: ["placeholder", "lesson"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "asset-hero-argand-plane",
    type: "image",
    name: "Argand plane",
    title: "Argand plane illustration",
    source: { kind: "local", url: "/hero-images/img1.jpg" },
    altText: "Illustration of the complex plane showing a point representing a complex number",
    status: "ready",
    tags: ["complex-numbers", "argand-plane", "math-151"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "asset-hero-algebra-base",
    type: "image",
    name: "Algebra foundations hero",
    title: "Algebra foundations illustration",
    source: { kind: "local", url: "/hero-images/img2.jpg" },
    altText: "Conceptual hero illustration for the algebra foundations chapter",
    status: "ready",
    tags: ["algebra", "math-151"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "asset-hero-vector-algebra",
    type: "image",
    name: "Vector geometry hero",
    title: "Vector geometry illustration",
    source: { kind: "local", url: "/hero-images/img3.jpg" },
    altText: "Illustration of vectors and geometry for the vector algebra chapter",
    status: "ready",
    tags: ["vectors", "vector-algebra", "math-151"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

function readLocalAssets(): Asset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Asset[]) : [];
  } catch {
    console.warn(`[Back2Basics with Kwamina] Asset storage is malformed; using local seed assets: ${STORAGE_KEY}`);
    return [];
  }
}

function writeLocalAssets(assets: Asset[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
}

function readDeletedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DELETED_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && Array.isArray(parsed.ids) ? parsed.ids : [];
  } catch {
    console.warn(`[Back2Basics with Kwamina] Asset deletion index is malformed: ${DELETED_KEY}`);
    return [];
  }
}

function writeDeletedIds(ids: string[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(DELETED_KEY, JSON.stringify({ ids }));
}

export function getAssets(): Asset[] {
  const local = readLocalAssets();
  const deleted = new Set(readDeletedIds());
  const base = baseAssets.filter((asset) => !deleted.has(asset.id));
  const baseIds = new Set(base.map((asset) => asset.id));

  return [
    ...base.map((asset) => local.find((item) => item.id === asset.id) ?? asset),
    ...local.filter((asset) => !baseIds.has(asset.id) && !deleted.has(asset.id)),
  ];
}

export function getAssetById(id: string) {
  return getAssets().find((asset) => asset.id === id);
}

export function getAssetsByType(type: AssetType) {
  return getAssets().filter((asset) => asset.type === type);
}

export function getAssetsByTag(tag: string) {
  const normalized = tag.toLowerCase();
  return getAssets().filter((asset) => asset.tags?.some((item) => item.toLowerCase() === normalized));
}

export function saveAsset(asset: Asset) {
  const local = readLocalAssets().filter((item) => item.id !== asset.id);
  writeLocalAssets([...local, asset]);
}

export function archiveAsset(id: string) {
  const asset = getAssetById(id);
  if (!asset) return;
  saveAsset({ ...asset, status: "archived", updatedAt: new Date().toISOString() });
}

export function restoreAsset(id: string) {
  const asset = getAssetById(id);
  if (!asset) return;
  writeDeletedIds(readDeletedIds().filter((item) => item !== id));
  saveAsset({ ...asset, status: isAssetValid(asset) ? "ready" : "draft", updatedAt: new Date().toISOString() });
}

export function createAsset(input: Omit<Asset, "id" | "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const asset: Asset = {
    ...input,
    id: createStableId("asset", input.name),
    createdAt: now,
    updatedAt: now,
  };
  saveAsset(asset);
  return asset;
}

export function updateAsset(id: string, patch: Partial<Omit<Asset, "id" | "createdAt">>) {
  const asset = getAssetById(id);
  if (!asset) return;
  saveAsset({ ...asset, ...patch, id: asset.id, createdAt: asset.createdAt, updatedAt: new Date().toISOString() });
}

export function assetUrl(id: string | undefined, fallback: string) {
  return id ? getAssetById(id)?.source.url ?? fallback : fallback;
}

export function assetStatusIsSelectable(status: AssetStatus) {
  return status !== "archived";
}

export function isAssetValid(asset: Pick<Asset, "name" | "source">) {
  return Boolean(asset.name?.trim() && asset.source?.url?.trim());
}

export interface AssetUsageReference {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  weekId: string;
  weekTitle: string;
  blockId: string;
  blockType: "image" | "video";
}

export function getAssetUsage(assetId: string): AssetUsageReference[] {
  return getLessons().flatMap((lesson) => {
    const courseTitle = getCourse(lesson.courseId)?.title ?? "";
    const week = getWeeks(lesson.courseId).find((week) => week.id === lesson.weekId);
    return lesson.blocks
      .filter((block) => (block.type === "image" || block.type === "video") && block.assetId === assetId)
      .map((block) => ({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        courseId: lesson.courseId,
        courseTitle,
        weekId: lesson.weekId,
        weekTitle: week?.title ?? "",
        blockId: block.id,
        blockType: block.type as "image" | "video",
      }));
  });
}

export function getAssetUsageCount(assetId: string) {
  return getAssetUsage(assetId).length;
}

export function getAssetUsageCounts() {
  const counts = new Map<string, number>();
  for (const lesson of getLessons()) {
    for (const block of lesson.blocks) {
      if ((block.type !== "image" && block.type !== "video") || !block.assetId) continue;
      counts.set(block.assetId, (counts.get(block.assetId) ?? 0) + 1);
    }
  }
  return counts;
}

export function getUsedAssetIds(): string[] {
  const ids = new Set<string>();
  getLessons().forEach((lesson) =>
    lesson.blocks.forEach((block) => {
      if ((block.type === "image" || block.type === "video") && block.assetId) ids.add(block.assetId);
    })
  );
  return [...ids];
}

export function deleteAsset(id: string): boolean {
  if (getAssetUsage(id).length > 0) return false;
  writeLocalAssets(readLocalAssets().filter((asset) => asset.id !== id));
  if (!readDeletedIds().includes(id)) writeDeletedIds([...readDeletedIds(), id]);
  return true;
}
