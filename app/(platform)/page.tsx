import type { Metadata } from "next";
import { HomePage } from "@/components/marketing/HomePage";
import { firstFreeLessonHref } from "@/lib/content/freeLessons";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SKILLS_TRAINING } from "@/lib/site/skillsTraining";
import { materialsHubLive } from "@/lib/site/materialsHub";
import { isAdminVisitor } from "@/lib/site/isAdminVisitor";

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
  // New features show to everyone once their "live" switch is on; until then
  // only an admin (admin panel session, or an allowlisted student account) sees them.
  const isAdmin = await isAdminVisitor();
  const showSkillsTraining = SKILLS_TRAINING.live || isAdmin;
  const showMaterialsHub = materialsHubLive() || isAdmin;
  return (
    <HomePage
      firstLessonHref={firstLesson}
      showSkillsTraining={showSkillsTraining}
      adminPreview={showSkillsTraining && !SKILLS_TRAINING.live}
      showMaterialsHub={showMaterialsHub}
      materialsHubPreview={showMaterialsHub && !materialsHubLive()}
      isAdmin={isAdmin}
    />
  );
}
