import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourseRepPage } from "@/components/course-reps/CourseRepPage";
import { MATERIALS_HUB_LIVE } from "@/lib/site/materialsHub";
import { isAdminVisitor } from "@/lib/site/isAdminVisitor";

export const metadata: Metadata = {
  title: "Course reps · Back2Basics with Kwamina",
  robots: { index: false },
};

export default async function CourseRepRoute() {
  // Opens to everyone together with course-materials quick access; admin-only until then.
  if (!MATERIALS_HUB_LIVE && !(await isAdminVisitor())) notFound();
  return <CourseRepPage />;
}
