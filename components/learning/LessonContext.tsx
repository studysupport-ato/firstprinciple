"use client";

import { createContext, useContext } from "react";

export type LessonSideContextValue = {
  /** The empty slot at the top of the right-hand pane. Quiz feedback is portalled here. */
  sideSlot: HTMLElement | null;
  /** A quiz tells the lesson whether the student has finished it, so Continue can wait for it. */
  reportQuiz: (blockId: string, done: boolean) => void;
  /** Tests the student already finished on an earlier visit: they no longer hold up Continue. */
  answeredQuizzes: ReadonlySet<string>;
};

export const LessonSideContext = createContext<LessonSideContextValue>({
  sideSlot: null,
  reportQuiz: () => undefined,
  answeredQuizzes: new Set(),
});

export function useLessonSide() {
  return useContext(LessonSideContext);
}
