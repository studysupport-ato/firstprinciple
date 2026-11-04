import { redirect } from "next/navigation";

/**
 * /courses/[courseId]/course-materials is not a valid route.
 * Course materials live at the top-level /course-materials page.
 * Redirect the user there seamlessly.
 */
export default function CourseCourseMaterialsRedirect() {
  redirect("/course-materials");
}
