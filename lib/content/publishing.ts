import type { ContentLifecycleState } from "./quality";

const STORAGE_KEY = "first-principles-content-lifecycle-v1";

type LifecycleRecord = { courseId: string; state: ContentLifecycleState; updatedAt: string };

function readRecords(): Record<string, LifecycleRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LifecycleRecord>) : {};
  } catch {
    return {};
  }
}

export function getCourseLifecycleState(courseId: string): LifecycleRecord | null {
  return readRecords()[courseId] ?? null;
}

export function saveCourseLifecycleState(courseId: string, state: ContentLifecycleState) {
  if (typeof window === "undefined") return;
  const records = readRecords();
  records[courseId] = { courseId, state, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
