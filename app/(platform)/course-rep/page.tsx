import type { Metadata } from "next";
import { CourseRepPage } from "@/components/course-reps/CourseRepPage";

export const metadata: Metadata = {
  title: "Course reps · Back2Basics with Kwamina",
  description: "Course reps: apply to upload slides, books and playlists for your programme.",
};

/** Open to everyone: anyone signed in can apply; only approved reps get the panel. */
export default function CourseRepRoute() {
  return <CourseRepPage />;
}
