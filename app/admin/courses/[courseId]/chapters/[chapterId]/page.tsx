import { redirect } from "next/navigation";

/**
 * Retired legacy chapter route.
 *
 * This page used to render from `lib/content/access.ts` (fixtures + localStorage
 * overrides) and therefore ignored the authoritative Supabase `days` table â€”
 * deleted Days kept reappearing here. The product hierarchy is Course -> Week ->
 * Day, so this sends visitors to the canonical Supabase-backed Course page.
 */
export default async function AdminChapterDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; chapterId: string }>;
}) {
  const { courseId } = await params;
  redirect(`/admin/courses/${encodeURIComponent(courseId)}`);
}
