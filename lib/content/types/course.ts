import type { ContentStatus } from "../lifecycle";

export interface Course {
  id: string;
  code: string;
  title: string;
  shortTitle: string;
  description: string;
  department?: string;
  /** Legacy taxonomy metadata; Week/sessionIds define the product curriculum. */
  chapterIds: string[];
  weekIds: string[];
  status?: ContentStatus;
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
}

export interface Week {
  id: string;
  courseId: string;
  chapterIds: string[];
  title: string;
  description: string;
  weekNumber: number;
  /** Canonical Day references. The internal Lesson record is the Day model. */
  sessionIds: string[];
  status?: ContentStatus;
}
