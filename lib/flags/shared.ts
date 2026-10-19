/** Flags: students report a problem with a lesson step, question, video or playlist. Shared by the browser and the server. */

export type FlagTargetType = "lesson" | "question" | "video" | "playlist";
export type FlagStatus = "open" | "in_progress" | "fixed" | "dismissed";

export const FLAG_REASONS: Record<FlagTargetType, string[]> = {
  lesson: ["Mistake in the maths", "Hard to understand", "Visual not working", "Typo or wording", "Something else"],
  question: ["The answer key looks wrong", "The question is unclear", "Diagram missing or wrong", "The explanation does not help", "Something else"],
  video: ["Video will not play or was removed", "Wrong video for this topic", "Hard to follow or poor sound", "Wrong title or label", "Something else"],
  playlist: ["Playlist will not load", "Videos are in the wrong order", "A topic has no video", "Videos do not match the course", "Something else"],
};

export const FLAG_KIND_LABEL: Record<FlagTargetType, string> = {
  lesson: "Lesson step",
  question: "Question",
  video: "Video",
  playlist: "Playlist",
};

/** What a flag button knows about the thing being flagged. */
export interface FlagTarget {
  type: FlagTargetType;
  /** Reports with the same key are grouped in the admin inbox (one lesson step, one question, one video). */
  key: string;
  title: string;
  /** Where it sits, e.g. "MATH 151 · Week 1 · Real Numbers · Step 4". */
  location: string;
  /** Where an admin goes to fix it. */
  link?: string;
  courseId?: string;
}

export interface FlagSubmission extends FlagTarget {
  reason: string;
  note?: string;
}

export interface FlagRecord {
  id: string;
  targetType: FlagTargetType;
  targetKey: string;
  courseId: string | null;
  title: string;
  location: string;
  link: string | null;
  reason: string;
  note: string | null;
  reporterName: string | null;
  signedIn: boolean;
  status: FlagStatus;
  resolution: string | null;
  notify: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

export type FlagResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** "math-151" -> "MATH 151". */
export function courseCodeLabel(courseId: string | undefined | null) {
  if (!courseId) return "";
  return courseId.replace(/-/g, " ").toUpperCase();
}
