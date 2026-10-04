"use client";

import { useState, useEffect } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
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
  const [authOpen, setAuthOpen] = useState(false);
  const [authRedirectTo, setAuthRedirectTo] = useState<string | undefined>();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("auth") !== "required") return;

    const requestedDestination = searchParams.get("next");
    let destination = "/courses";
    if (requestedDestination?.startsWith("/") && !requestedDestination.startsWith("//")) {
      const parsedDestination = new URL(requestedDestination, window.location.origin);
      if (parsedDestination.origin === window.location.origin) {
        destination = `${parsedDestination.pathname}${parsedDestination.search}${parsedDestination.hash}`;
      }
    }

    setAuthRedirectTo(destination);
    setAuthOpen(true);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  useEffect(() => {
    const handleWelcomeDismissed = () => {
      setSidebarCollapsed(false);
    };

    window.addEventListener("welcome-dismissed", handleWelcomeDismissed);
    return () => window.removeEventListener("welcome-dismissed", handleWelcomeDismissed);
  }, []);

  return (
    <div id="platform-root" className="min-h-screen flex">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
        onSignIn={() => {
          // Signed-in users never see this, but clear any stale destination from
          // a previous ?auth=required redirect so the modal uses its default.
          setAuthRedirectTo(undefined);
          setAuthOpen(true);
        }}
      />

      <main
        className={`flex-1 relative ${sidebarCollapsed ? "ml-[104px]" : "ml-[224px]"} min-h-screen bg-[#FFC600] transition-[margin] duration-500 ease-in-out`}
      >
        <PreviewToolbar />
        {children}
      </main>
      <OnboardingTour />
      <ProfileCompletionModal />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        redirectTo={authRedirectTo}
      />
    </div>
  );
}
