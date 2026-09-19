import type { GeoGebraInteractiveConfig } from "./lesson";

export type LearningResourceType = "youtube" | "geogebra" | "external";
export type LearningResourceStatus = "draft" | "published" | "archived";
export type YouTubeSourceType = "ato" | "recommended";

export interface ResourceThumbnail {
  assetId?: string;
  url?: string;
}

export interface YouTubeResourceData {
  videoId: string;
  url: string;
  sourceType: YouTubeSourceType;
  thumbnail?: ResourceThumbnail;
  duration?: number;
}

export interface GeoGebraResourceData {
  materialId?: string;
  sourceUrl?: string;
  appName?: GeoGebraInteractiveConfig["appName"];
  config: GeoGebraInteractiveConfig;
}

export interface ExternalResourceData {
  url: string;
  provider?: string;
  thumbnail?: ResourceThumbnail;
}

interface LearningResourceBase {
  id: string;
  title: string;
  description?: string;
  status: LearningResourceStatus;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface YouTubeLearningResource extends LearningResourceBase {
  type: "youtube";
  data: YouTubeResourceData;
}

export interface GeoGebraLearningResource extends LearningResourceBase {
  type: "geogebra";
  data: GeoGebraResourceData;
}

export interface ExternalLearningResource extends LearningResourceBase {
  type: "external";
  data: ExternalResourceData;
}

export type LearningResource = YouTubeLearningResource | GeoGebraLearningResource | ExternalLearningResource;

type LearningResourceDraft<T extends LearningResource> = Omit<T, "id" | "createdAt" | "updatedAt">;

export type LearningResourceInput =
  | LearningResourceDraft<YouTubeLearningResource>
  | LearningResourceDraft<GeoGebraLearningResource>
  | LearningResourceDraft<ExternalLearningResource>;

export interface ResourcePlacementTarget {
  courseId?: string;
  weekId?: string;
  dayId?: string;
}

export type ResourcePlacement = ResourcePlacementTarget & {
  id: string;
  resourceId: string;
  createdAt: string;
};