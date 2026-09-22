"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/platform/Sidebar";
import { PreviewToolbar } from "@/components/platform/PreviewToolbar";
import { OnboardingTour } from "@/components/platform/OnboardingTour";
import { ProfileCompletionModal } from "@/components/platform/ProfileCompletionModal";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // If they haven't seen the welcome banner, start with the sidebar collapsed for the cinematic intro
    const hasSeenWelcome = localStorage.getItem("first-principles-welcome-v1");
    if (!hasSeenWelcome) {
      setSidebarCollapsed(true);
    }

    const handleWelcomeDismissed = () => {
      setSidebarCollapsed(false);
    };

    window.addEventListener("welcome-dismissed", handleWelcomeDismissed);
    return () => window.removeEventListener("welcome-dismissed", handleWelcomeDismissed);
  }, []);

  return (
    <div id="platform-root" className="min-h-screen bg-[#FAFAFA] flex">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
      />

      <main
        className={`flex-1 relative ${sidebarCollapsed ? "ml-20" : "ml-64"} min-h-screen transition-[margin] duration-500 ease-in-out`}
      >
        <PreviewToolbar />
        {children}
      </main>
      <OnboardingTour />
      <ProfileCompletionModal />
    </div>
  );
}
