import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SkillsTiles } from "@/components/skills/SkillsTiles";
import { SKILLS_TRAINING } from "@/lib/site/skillsTraining";
import { isAdminVisitor } from "@/lib/site/isAdminVisitor";
import { listProgrammes, listWeeks } from "@/lib/site/skillsProgrammes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Skills Workshop · Back2Basics with Kwamina",
  description: "Free Arduino Skills Training with IEEE, and certified courses with the Innovation Centre, College of Engineering.",
};

export default async function SkillsWorkshopPage() {
  // Public once SKILLS_TRAINING.live is true; until then only an admin sees it.
  if (!SKILLS_TRAINING.live && !(await isAdminVisitor())) notFound();
  const programmes = await listProgrammes();
  // A tile's picture: the chosen cover, else the newest week's first preview photo.
  const covers: Record<string, string | null> = {};
  for (const p of programmes) {
    if (p.coverFileId) covers[p.id] = p.coverFileId;
    else covers[p.id] = (await listWeeks(p.id)).find((w) => w.previews.length)?.previews[0]?.fileId ?? null;
  }
  return (
    <main className="min-h-screen pb-24 md:pb-0">
      <SkillsTiles programmes={programmes} covers={covers} />
    </main>
  );
}
