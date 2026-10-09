import { redirect } from "next/navigation";
import { getAdminCourseStructureAction } from "@/lib/adminContentActions";

/**
 * Retired legacy chapter-routed Week page.
 *
 * This page previously rendered Days from `getWeek()` / `getLessonsByWeek()`
 * (`lib/content/access.ts`), i.e. fixtures + localStorage overrides, so it never
 * reflected the authoritative Supabase `days` table. That is why Days deleted in
 * the canonical workspace kept reappearing here.
 *
 * Rather than maintaining a second, competing Week management UI, deep links are
 * preserved by resolving the real Week through the same Supabase-backed admin
 * structure the canonical page uses, then redirecting to it. The canonical Week
 * page is addressed by `week_number`, which is why an id -> number lookup is
 * needed rather than a plain string substitution.
 *
 * No second Day/delete/reorder implementation is introduced here.
 */
export default async function AdminLegacyWeekRedirect({
  params,
}: {
  params: Promise<{ courseId: string; chapterId: string; weekId: string }>;
}) {
  const { courseId, weekId } = await params;

  const courseHref = `/admin/courses/${encodeURIComponent(courseId)}`;
  const res = await getAdminCourseStructureAction(courseId);

  // Authoritative read failed or the Week is unknown: fall back to the Course page
  // rather than rendering anything fixture-derived.
  if (!res.ok || !res.data) redirect(courseHref);

  const match = res.data.weeks.find((entry) => entry.week.id === weekId);
  if (!match) redirect(courseHref);

  redirect(`/admin/courses/${encodeURIComponent(courseId)}/weeks/${match.week.weekNumber}`);
}