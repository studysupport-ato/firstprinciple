import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SkillsTraining } from "@/components/marketing/SkillsTraining";
import { SKILLS_TRAINING } from "@/lib/site/skillsTraining";
import { isAdminVisitor } from "@/lib/site/isAdminVisitor";

export const metadata: Metadata = {
  title: "Skills Workshop · Back2Basics with Kwamina",
  description: "Free practical Arduino Skills Training with the Innovation Centre, College of Engineering, plus discounted courses.",
};

export default async function SkillsWorkshopPage() {
  // Public once SKILLS_TRAINING.live is true; until then only an admin sees it.
  if (!SKILLS_TRAINING.live && !(await isAdminVisitor())) notFound();
  return (
    <main className="min-h-screen pb-24 md:pb-0">
      <SkillsTraining />
    </main>
  );
}
