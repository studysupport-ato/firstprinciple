"use client";

import { useState } from "react";
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

  return (
    <div id="platform-root" className="min-h-screen bg-[#FFFBF5] flex">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
      />

      <main
        className={`flex-1 ${sidebarCollapsed ? "ml-20" : "ml-64"} min-h-screen transition-[margin] duration-200`}
      >
        <PreviewToolbar />
        {children}
      </main>
      <OnboardingTour />
      <ProfileCompletionModal />
    </div>
  );
}
