import { createEmptyProgress, PROGRESS_STORAGE_KEY, readProgress, writeProgress } from "./store";
import type { StudentProgress } from "./types";

export interface ProgressRepository {
  read(): StudentProgress;
  write(progress: StudentProgress): StudentProgress | undefined;
  clear(): void;
}

export const localProgressRepository: ProgressRepository = {
  read: readProgress,
  write: writeProgress,
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
  },
};

export function createEmptyStudentProgress() {
  return createEmptyProgress();
}
