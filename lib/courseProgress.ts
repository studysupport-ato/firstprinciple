const progressKey = (courseId: string) => `first-principles-progress:${courseId}`;

export function getCompletedLessons(courseId: string): string[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.sessionStorage.getItem(progressKey(courseId));
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function markLessonComplete(courseId: string, lessonSlug: string) {
  if (typeof window === "undefined") return;

  const completed = new Set(getCompletedLessons(courseId));
  completed.add(lessonSlug);
  window.sessionStorage.setItem(progressKey(courseId), JSON.stringify([...completed]));
}