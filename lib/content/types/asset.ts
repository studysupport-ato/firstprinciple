export type AssetType = "image" | "video" | "document" | "audio";
export type AssetSourceKind = "local" | "managed" | "external";
export type AssetStatus = "draft" | "ready" | "archived";

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  title?: string;
  description?: string;
  source: { kind: AssetSourceKind; url: string };
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
  altText?: string;
  status: AssetStatus;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
