export type ContentStatus = "draft" | "published" | "archived";

export interface VisibilityOptions {
  preview?: boolean;
  includeArchived?: boolean;
}

export function isStudentVisible(status: ContentStatus | undefined) {
  return status === "published";
}

export function isAdminVisible(status: ContentStatus | undefined) {
  return status === "draft" || status === "published" || status === "archived";
}

export function isPreviewVisible(status: ContentStatus | undefined, options: VisibilityOptions = {}) {
  if (status === "archived") return options.includeArchived === true;
  return status === "published" || (options.preview === true && status === "draft");
}

export function legacyStatus(status: ContentStatus | undefined, fallback: ContentStatus = "published"): ContentStatus {
  return status ?? fallback;
}
