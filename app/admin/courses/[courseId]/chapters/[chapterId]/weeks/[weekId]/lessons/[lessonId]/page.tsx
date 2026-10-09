import { redirect } from "next/navigation";

/**
 * Retired legacy chapter-routed Day ("lesson") preview page.
 *
 * This page read `getLesson()` from `lib/content/access.ts` (fixtures + local
 * overrides), so it could show content that does not exist in the authoritative
 * Supabase `days` table. Deep links are preserved by forwarding to the
 * canonical, Supabase-backed Day editor at `/admin/lessons/[lessonId]`.
 */
export default async function AdminLegacyLessonRedirect({
  params,
}: {
  params: Promise<{ courseId: string; chapterId: string; weekId: string; lessonId: string }>;
}) {
  const { lessonId } = await params;
  redirect(`/admin/lessons/${encodeURIComponent(lessonId)}`);
}