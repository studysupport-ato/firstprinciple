import type { CourseMaterialEntry, CourseMaterialSemester, CourseMaterialYear, CourseOutlineChapter } from "./courseMaterials";

/** One course card: either a course an administrator created, or a legacy group of older loose materials. */
export interface CourseNode<T extends CourseMaterialEntry = CourseMaterialEntry> {
  /** Stable key used to open the course. */
  key: string;
  /** Id of the course row; undefined for a legacy group. */
  courseId?: string;
  courseCode: string;
  courseTitle: string;
  semester: CourseMaterialSemester;
  materials: T[];
  legacy: boolean;
  isNew: boolean;
  /** false = the administrator switched this course to "not available at the moment". */
  available: boolean;
  /** The course's topics, in order (none for a legacy group). */
  topics: Array<{ id: string; name: string }>;
  /** The course's outline, shown as its course structure (none for a legacy group). */
  outline: CourseOutlineChapter[];
}

export interface SemesterNode<T extends CourseMaterialEntry = CourseMaterialEntry> {
  semester: CourseMaterialSemester;
  courses: CourseNode<T>[];
  /** External links placed at semester level (the one exception to "materials live inside a course"). */
  links: T[];
}

const FORTNIGHT = 14 * 24 * 60 * 60 * 1000;

function byOrder(a: CourseMaterialEntry, b: CourseMaterialEntry) {
  return a.order - b.order || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

/** Older loose materials had no semester; the old screen guessed it from the last digit of the course code. */
function legacySemester(code: string): CourseMaterialSemester {
  const match = code.match(/(\d+)$/);
  return match && parseInt(match[1].slice(-1), 10) % 2 === 0 ? 2 : 1;
}

/**
 * Build both semesters of one academic year for one department from the flat list in course_materials.
 * Pass year = null for the "Unassigned" bucket (legacy rows with no year only).
 */
export function buildSemesters<T extends CourseMaterialEntry>(entries: T[], departmentId: string, year: CourseMaterialYear | null): SemesterNode<T>[] {
  const inDepartment = entries.filter((entry) => entry.departmentId === departmentId);
  const typeOf = (entry: T) => entry.entryType ?? "material";
  const sameYear = (entry: T) => (entry.studyYear ?? null) === year;
  const children = new Map<string, T[]>();
  for (const entry of inDepartment) {
    if (typeOf(entry) === "material" && entry.parentId) {
      children.set(entry.parentId, [...(children.get(entry.parentId) ?? []), entry]);
    }
  }

  return ([1, 2] as const).map((semester) => {
    const explicit: CourseNode<T>[] = inDepartment
      .filter((entry) => typeOf(entry) === "course" && sameYear(entry) && entry.semester === semester)
      .sort(byOrder)
      .map((course) => {
        const materials = [...(children.get(course.id) ?? [])].sort(byOrder);
        return {
          key: course.id,
          courseId: course.id,
          courseCode: (course.courseCode ?? "").trim(),
          courseTitle: course.courseTitle,
          semester,
          materials,
          legacy: false,
          available: course.available !== false,
          topics: course.topics ?? [],
          outline: course.outline ?? [],
          isNew: Date.now() - new Date(course.createdAt).getTime() < FORTNIGHT,
        };
      });

    const legacyGroups = new Map<string, CourseNode<T>>();
    for (const entry of inDepartment.filter((item) => typeOf(item) === "material" && !item.parentId && sameYear(item)).sort(byOrder)) {
      const code = (entry.courseCode ?? "").trim();
      if (legacySemester(code) !== semester) continue;
      const key = `legacy:${code}-${entry.courseTitle}`;
      const group = legacyGroups.get(key) ?? { key, courseCode: code, courseTitle: entry.courseTitle, semester, materials: [], legacy: true, isNew: false, available: true, topics: [], outline: [] };
      group.materials.push(entry);
      if (Date.now() - new Date(entry.createdAt).getTime() < FORTNIGHT) group.isNew = true;
      legacyGroups.set(key, group);
    }

    const links = inDepartment
      .filter((entry) => typeOf(entry) === "semester_link" && sameYear(entry) && entry.semester === semester)
      .sort(byOrder);

    return { semester, courses: [...explicit, ...legacyGroups.values()], links };
  });
}

/** True when some legacy material has no year yet (shows the "Unassigned" tab). */
export function hasUnassignedLegacy(entries: CourseMaterialEntry[], departmentId: string) {
  return entries.some((entry) => entry.departmentId === departmentId && (entry.entryType ?? "material") === "material" && !entry.parentId && entry.studyYear == null);
}

export function linkHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
