import { parseYouTubeVideoId } from "./youtube";
import type { CourseMaterialEntry } from "./courseMaterials";

export type MaterialType = "PDF Document" | "Lecture Slides" | "Past Questions" | "Video Lecture" | "External Link";

export type MaterialRow = CourseMaterialEntry & {
  type: MaterialType;
};

const TYPE_FROM_CHOICE: Record<NonNullable<CourseMaterialEntry["materialType"]>, MaterialType> = {
  pdf: "PDF Document",
  slides: "Lecture Slides",
  past_questions: "Past Questions",
  video: "Video Lecture",
  link: "External Link",
};

export function deriveMaterialType(entry: CourseMaterialEntry): MaterialType {
  // An administrator's explicit choice wins; older rows are still guessed from their text.
  if (entry.materialType) return TYPE_FROM_CHOICE[entry.materialType];
  if (entry.kind === "youtube" || parseYouTubeVideoId(entry.url) || parseYouTubeVideoId(entry.provider)) return "Video Lecture";
  const raw = `${entry.courseTitle} ${entry.description ?? ""} ${entry.provider ?? ""} ${entry.url}`.toLowerCase();

  if (/vimeo|video|mp4|stream/.test(raw)) return "Video Lecture";
  if (/past|exam|question|quiz|test/.test(raw)) return "Past Questions";
  if (/slides|ppt|powerpoint|deck/.test(raw)) return "Lecture Slides";
  if (/pdf/.test(raw)) return "PDF Document";
  return "External Link";
}
