import type { Metadata } from "next";
import { HomePage } from "@/components/marketing/HomePage";
import { firstFreeLessonHref } from "@/lib/content/freeLessons";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Back2Basics with Kwamina",
  description: "Step-by-step mathematics courses and self tests with worked answers, with industry skills and real-life opportunities coming soon.",
};

export default async function MarketingPage() {
  // The opening buttons link straight to the first free Algebra lesson.
  let firstLesson: string | null = null;
  try {
    const client = await createSupabaseServerClient();
    firstLesson = await firstFreeLessonHref(client, "math-151");
  } catch {
    firstLesson = null;
  }
  return <HomePage firstLessonHref={firstLesson} />;
}
