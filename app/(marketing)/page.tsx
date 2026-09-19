import { Hero } from "@/components/marketing/Hero";
import { PracticeDemo } from "@/components/marketing/PracticeDemo";
import { CourseDiscovery } from "@/components/marketing/CourseDiscovery";
import { LeaderboardTeaser } from "@/components/marketing/LeaderboardTeaser";

export default function MarketingPage() {
  return (
    <>
      <Hero />
      <PracticeDemo />
      <CourseDiscovery />
      <LeaderboardTeaser />
    </>
  );
}
