import "server-only";

import type { createSupabaseServerClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * The first published lesson of every week (topic) is open without an account,
 * so visitors can try a lesson before they sign up. Every other lesson still
 * asks them to log in.
 */
export async function isFreeLesson(client: ServerClient, courseId: string, dayId: string): Promise<boolean> {
  const { data: dayData } = await client
    .from("days")
    .select("id, week_id, status")
    .eq("id", dayId)
    .eq("course_id", courseId)
    .maybeSingle();
  const day = dayData as { id: string; week_id: string | null; status: string } | null;
  if (!day || day.status !== "published" || !day.week_id) return false;

  const { data: firstData } = await client
    .from("days")
    .select("id")
    .eq("course_id", courseId)
    .eq("week_id", day.week_id)
    .eq("status", "published")
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (firstData as { id: string } | null)?.id === dayId;
}

/** Link to the first free lesson of a course's first published week, if there is one. */
export async function firstFreeLessonHref(client: ServerClient, courseId: string): Promise<string | null> {
  const { data: weeks } = await client
    .from("weeks")
    .select("id, week_number, status")
    .eq("course_id", courseId)
    .eq("status", "published")
    .order("week_number", { ascending: true })
    .limit(1);
  const week = (weeks as { id: string; week_number: number }[] | null)?.[0];
  if (!week) return null;

  const { data: dayData } = await client
    .from("days")
    .select("id, chapter_id")
    .eq("course_id", courseId)
    .eq("week_id", week.id)
    .eq("status", "published")
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle();
  const day = dayData as { id: string; chapter_id: string | null } | null;
  if (!day?.chapter_id) return null;

  return `/courses/${encodeURIComponent(courseId)}/chapter/${encodeURIComponent(day.chapter_id)}/lesson/${encodeURIComponent(day.id)}?week=${week.week_number}`;
}
