import type { Assessment } from "./types/assessment";
import type { Chapter, Course, Week } from "./types/course";
import type { ContentBlock, Lesson } from "./types/lesson";
import type { Question } from "./types/question";
import type { LearningResource, LearningResourceInput, ResourcePlacement, ResourcePlacementTarget } from "./types/resource";
import type { ContentStatus } from "./lifecycle";
import type { CourseMaterialEntry, CourseMaterialEntryType, CourseMaterialSemester, CourseMaterialType, CourseMaterialYear, CourseMaterialsDepartment } from "../courseMaterials";

/**
 * Task 39E — Admin content write contract (shared, client-safe types only).
 *
 * These types are the only shapes that cross the admin server boundary. They are
 * intentionally free of any Supabase/service-role import so client components can
 * import them safely (`import type`) without pulling server-only code.
 */

export type AdminActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type AdminQuestionDirectoryRow = {
  id: string;
  prompt: string;
  topic: string;
  difficulty: Question["difficulty"];
  type: Question["type"];
  status: ContentStatus;
  courseId: string;
  chapterId: string;
  lessonId: string;
};

export type AdminQuestionDirectoryPage = {
  questions: AdminQuestionDirectoryRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminCourseListRow = { course: Course; weekCount: number; dayCount: number };

export type AdminWeekView = { week: Week; days: Lesson[] };

export type AdminCourseStructure = {
  course: Course;
  weeks: AdminWeekView[];
  days: Lesson[];
  /** Legacy labels derived from `days.chapter_id`; NOT a chapters table. */
  chapters: Chapter[];
};

export type AdminDayListRow = { day: Lesson; week?: Week; course?: Course; chapterTitle: string };

export type AdminResourceListRow = { resource: LearningResource; placementCount: number };

export type AdminDepartmentListRow = { department: CourseMaterialsDepartment; materialCount: number };

export type AdminCourseInput = Pick<Course, "id" | "code" | "title" | "shortTitle" | "description"> & {
  department?: string;
  status?: ContentStatus;
};

export type AdminWeekInput = Pick<Week, "id" | "courseId" | "title" | "description" | "weekNumber"> & {
  status?: ContentStatus;
};

export type AdminDayInput = Pick<Lesson, "id" | "courseId" | "weekId" | "chapterId" | "title" | "description" | "order"> & {
  estimatedMinutes?: number;
  objectives?: string[];
  blocks?: ContentBlock[];
  status?: ContentStatus;
};

export type AdminDepartmentInput = Pick<CourseMaterialsDepartment, "name" | "status"> & {
  shortName?: string;
  description?: string;
};

export type AdminCourseMaterialInput = Pick<CourseMaterialEntry, "departmentId" | "courseTitle" | "url" | "status"> & {
  studyYear?: CourseMaterialYear | null;
  available?: boolean;
  courseCode?: string;
  description?: string;
  provider?: string;
  kind?: CourseMaterialEntry["kind"];
  entryType?: CourseMaterialEntryType;
  semester?: CourseMaterialSemester | null;
  parentId?: string | null;
  materialType?: CourseMaterialType | null;
  hiddenVideos?: string[];
  extraVideos?: Array<{ videoId: string; title: string; channel?: string; kind?: "lesson" | "worked"; minutes?: number }>;
  topics?: Array<{ id: string; name: string }>;
  outline?: import("@/lib/courseMaterials").CourseOutlineChapter[];
  topicId?: string | null;
};

export type AdminPlacementTarget = ResourcePlacementTarget;

export type AdminResourceInput = LearningResourceInput;

export type { Assessment, Chapter, ContentBlock, Course, CourseMaterialEntry, CourseMaterialsDepartment, LearningResource, Lesson, Question, ResourcePlacement, Week };
