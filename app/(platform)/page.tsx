import type { Metadata } from "next";
import { HomePage } from "@/components/marketing/HomePage";
import { firstFreeLessonHref } from "@/lib/content/freeLessons";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/adminSession";
import { SKILLS_TRAINING } from "@/lib/site/skillsTraining";
import { isAllowlistedAdminUser } from "@/lib/lessonUnlock";

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
  // The new front page (Arduino Skills Training) shows to everyone once
  // SKILLS_TRAINING.live is true; until then only a signed-in admin sees it.
  // An admin is either signed in to the admin panel, or signed in to the
  // student portal with an account on the admin allowlist.
  let isAdmin = false;
  try {
    const cookieStore = await cookies();
    isAdmin = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value) !== null;
  } catch {
    isAdmin = false;
  }
  if (!isAdmin && !SKILLS_TRAINING.live) {
    try {
      const client = await createSupabaseServerClient();
      const { data } = await client.auth.getUser();
      isAdmin = data.user ? await isAllowlistedAdminUser(data.user.id) : false;
    } catch {
      isAdmin = false;
    }
  }
  const showSkillsTraining = SKILLS_TRAINING.live || isAdmin;
  return (
    <HomePage
      firstLessonHref={firstLesson}
      showSkillsTraining={showSkillsTraining}
      adminPreview={showSkillsTraining && !SKILLS_TRAINING.live}
    />
  );
}
