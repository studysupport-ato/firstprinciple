import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SkillsTraining } from "@/components/marketing/SkillsTraining";
import { SKILLS_TRAINING } from "@/lib/site/skillsTraining";
import { isAdminVisitor } from "@/lib/site/isAdminVisitor";

export const metadata: Metadata = {
  title: "Back2Basics × Innovation Centre · Back2Basics with Kwamina",
  description: "Certified courses with the Innovation Centre, College of Engineering, at a discounted price.",
};

export default async function InnovationCentrePage() {
  if (!SKILLS_TRAINING.live && !(await isAdminVisitor())) notFound();
  return (
    <main className="min-h-screen pb-24 md:pb-0">
      <div className="bg-[#1A1814] px-5 py-3">
        <Link href="/skills-workshop" className="inline-flex min-h-[40px] items-center gap-2 text-[15px] font-extrabold text-[#E9BC3A]">
          <ArrowLeft size={18} strokeWidth={2.6} /> Skills training
        </Link>
      </div>
      <SkillsTraining />
    </main>
  );
}
