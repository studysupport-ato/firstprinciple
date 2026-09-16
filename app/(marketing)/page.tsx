import { Hero } from "@/components/marketing/Hero";
import { TheIdea } from "@/components/marketing/TheIdea";
import { InteractiveDemo } from "@/components/marketing/InteractiveDemo";
import { LessonExperience } from "@/components/marketing/LessonExperience";
import { PracticeDemo } from "@/components/marketing/PracticeDemo";
import { ProgressDemo } from "@/components/marketing/ProgressDemo";
import { CourseDiscovery } from "@/components/marketing/CourseDiscovery";
import { LeaderboardTeaser } from "@/components/marketing/LeaderboardTeaser";
import { FinalCTA } from "@/components/marketing/FinalCTA";

export default function MarketingPage() {
  return (
    <>
      <Hero />
      <TheIdea />
      <InteractiveDemo />
      <LessonExperience />
      <PracticeDemo />
      <ProgressDemo />
      <CourseDiscovery />
      <LeaderboardTeaser />
      <FinalCTA />
    </>
  );
}
