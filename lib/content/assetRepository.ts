import { archiveAsset, createAsset, getAssetById, getAssets, restoreAsset, updateAsset } from "./assets";
import type { Asset, AssetStatus, AssetType } from "./types/asset";
import { createSupabaseBrowserClient } from "../supabase/client";
import type { Database } from "../supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AssetRepositoryListOptions = { type?: AssetType; status?: AssetStatus; sourceKind?: "local" | "managed" | "external"; limit?: number };
export type LessonImageUploadInput = { courseId: string; weekId: string; dayId: string; file: File; altText?: string };
export interface AssetRepository {
  listAssets(options?: AssetRepositoryListOptions): Promise<Asset[]>;
  getAsset(assetId: string): Promise<Asset | undefined>;
  getAssetsByIds(assetIds: string[]): Promise<Asset[]>;
  createAsset(input: Omit<Asset, "id" | "createdAt" | "updatedAt">): Promise<Asset>;
  uploadLessonImage(input: LessonImageUploadInput): Promise<Asset>;
  updateAsset(assetId: string, patch: Partial<Omit<Asset, "id" | "createdAt">>): Promise<Asset | undefined>;
  archiveAsset(assetId: string): Promise<void>;
  restoreAsset(assetId: string): Promise<void>;
}

function filterAssets(assets: Asset[], options: AssetRepositoryListOptions) {
  const filtered = assets.filter((asset) => !options.type || asset.type === options.type).filter((asset) => !options.status || asset.status === options.status).filter((asset) => !options.sourceKind || asset.source.kind === options.sourceKind);
  return options.limit && options.limit > 0 ? filtered.slice(0, options.limit) : filtered;
}

export const assetLocalRepository: AssetRepository = {
  async listAssets(options = {}) { return filterAssets(getAssets(), options); },
  async getAsset(id) { return getAssetById(id); },
  async getAssetsByIds(ids) { const wanted = new Set(ids); return getAssets().filter((asset) => wanted.has(asset.id)); },
  async createAsset(input) { return createAsset(input); },
  async uploadLessonImage() { throw new Error("Lesson image uploads require the Supabase admin repository."); },
  async updateAsset(id, patch) { updateAsset(id, patch); return getAssetById(id); },
  async archiveAsset(id) { archiveAsset(id); },
  async restoreAsset(id) { restoreAsset(id); },
};

type AssetRow = Database["public"]["Tables"]["assets"]["Row"];
function mapAsset(row: AssetRow): Asset {
  return { id: row.id, type: row.type as AssetType, name: row.name, title: row.title ?? undefined, description: row.description ?? undefined, source: { kind: row.source_kind as Asset["source"]["kind"], url: row.url }, mimeType: row.mime_type ?? undefined, fileSize: row.size_bytes ?? undefined, width: row.width ?? undefined, height: row.height ?? undefined, duration: row.duration ?? undefined, altText: row.alt_text ?? undefined, status: row.status as AssetStatus, tags: row.tags ?? [], metadata: (row.metadata ?? {}) as Record<string, unknown>, createdAt: row.created_at, updatedAt: row.updated_at };
}

function assetRow(asset: Asset) {
  return { id: asset.id, type: asset.type, name: asset.name, title: asset.title ?? null, description: asset.description ?? null, alt_text: asset.altText ?? null, source_kind: asset.source.kind, url: asset.source.url, size_bytes: asset.fileSize ?? null, mime_type: asset.mimeType ?? null, width: asset.width ?? null, height: asset.height ?? null, duration: asset.duration ?? null, metadata: asset.metadata ?? {}, tags: asset.tags ?? [], status: asset.status };
}

export const assetSupabaseRepository: AssetRepository = {
  async listAssets(options = {}) { let query = createSupabaseBrowserClient().from("assets").select("*").order("created_at", { ascending: true }).order("id", { ascending: true }); if (options.type) query = query.eq("type", options.type); if (options.status) query = query.eq("status", options.status); if (options.sourceKind) query = query.eq("source_kind", options.sourceKind); if (options.limit && options.limit > 0) query = query.limit(options.limit); const { data, error } = await query; if (error) throw error; return ((data ?? []) as AssetRow[]).map(mapAsset); },
  async getAsset(id) { const { data, error } = await createSupabaseBrowserClient().from("assets").select("*").eq("id", id).maybeSingle(); if (error) throw error; return data ? mapAsset(data as AssetRow) : undefined; },
  async getAssetsByIds(ids) { if (!ids.length) return []; const { data, error } = await createSupabaseBrowserClient().from("assets").select("*").in("id", ids); if (error) throw error; return ((data ?? []) as AssetRow[]).map(mapAsset); },
  async createAsset(input) { const now = new Date().toISOString(); const asset = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now } as Asset; const { error } = await createSupabaseBrowserClient().from("assets").insert(assetRow(asset) as never); if (error) throw error; return asset; },
  async uploadLessonImage() { throw new Error("Lesson image uploads require the Supabase admin repository."); },
  async updateAsset(id, patch) { const current = await this.getAsset(id); if (!current) return undefined; const updated = { ...current, ...patch, id, createdAt: current.createdAt, updatedAt: new Date().toISOString() } as Asset; const { error } = await createSupabaseBrowserClient().from("assets").update(assetRow(updated) as never).eq("id", id); if (error) throw error; return updated; },
  async archiveAsset(id) { const { error } = await createSupabaseBrowserClient().from("assets").update({ status: "archived" } as never).eq("id", id); if (error) throw error; },
  async restoreAsset(id) { const { error } = await createSupabaseBrowserClient().from("assets").update({ status: "ready" } as never).eq("id", id); if (error) throw error; },
};

export function createAssetSupabaseRepository(clientFactory: () => SupabaseClient<Database>): AssetRepository {
  const repository: AssetRepository = {
    ...assetSupabaseRepository,
    async uploadLessonImage(input) {
      const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
      const maxBytes = 10 * 1024 * 1024;
      if (!allowed.has(input.file.type)) throw new Error("Only JPEG, PNG, and WebP images are supported.");
      if (input.file.size <= 0 || input.file.size > maxBytes) throw new Error("Images must be smaller than 10 MB.");
      const bytes = new Uint8Array(await input.file.arrayBuffer());
      const validSignature = input.file.type === "image/jpeg"
        ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
        : input.file.type === "image/png"
          ? bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index])
          : bytes.slice(0, 4).every((value, index) => value === [82, 73, 70, 70][index]) && bytes.slice(8, 12).every((value, index) => value === [87, 69, 66, 80][index]);
      if (!validSignature) throw new Error("The uploaded file does not match its declared image type.");

      const id = crypto.randomUUID();
      const extension = input.file.type === "image/jpeg" ? "jpg" : input.file.type === "image/png" ? "png" : "webp";
      const storagePath = `lessons/${input.courseId}/${input.weekId}/${input.dayId}/${id}.${extension}`;
      const client = clientFactory();
      const upload = await client.storage.from("lesson-assets").upload(storagePath, bytes, { contentType: input.file.type, upsert: false });
      if (upload.error) throw upload.error;

      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!baseUrl) {
        await client.storage.from("lesson-assets").remove([storagePath]);
        throw new Error("Supabase public URL is not configured.");
      }
      const now = new Date().toISOString();
      const asset: Asset = { id, type: "image", name: input.file.name || `${id}.${extension}`, title: input.file.name || undefined, source: { kind: "managed", url: `${baseUrl}/storage/v1/object/public/lesson-assets/${storagePath}` }, mimeType: input.file.type, fileSize: input.file.size, altText: input.altText?.trim() || undefined, status: "ready", tags: ["lesson", "uploaded"], metadata: { storagePath, bucket: "lesson-assets", courseId: input.courseId, weekId: input.weekId, dayId: input.dayId }, createdAt: now, updatedAt: now };
      const { error } = await client.from("assets").insert(assetRow(asset) as never);
      if (error) {
        await client.storage.from("lesson-assets").remove([storagePath]);
        throw error;
      }
      return asset;
    },
  };
  return repository;
}

export type AssetRepositorySource = "local" | "supabase";
export function createAssetRepository(source: AssetRepositorySource = "local"): AssetRepository { return source === "supabase" ? assetSupabaseRepository : assetLocalRepository; }
