"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Link from "next/link";
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const inLesson = /\/lesson\//.test(pathname ?? "");
  const [authOpen, setAuthOpen] = useState(false);
  const [authRedirectTo, setAuthRedirectTo] = useState<string | undefined>();
  const collapsedBeforeLesson = useRef<boolean | null>(null);

  // Entering a lesson folds the sidebar into a thin icon rail to give the board the room.
  // Leaving the lesson restores whatever the learner had before.
  useEffect(() => {
    if (inLesson) {
      if (collapsedBeforeLesson.current === null) {
        setSidebarCollapsed((current) => {
          collapsedBeforeLesson.current = current;
          return true;
        });
      }
    } else if (collapsedBeforeLesson.current !== null) {
      const previous = collapsedBeforeLesson.current;
      collapsedBeforeLesson.current = null;
      setSidebarCollapsed(previous);
    }
  }, [inLesson]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

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
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        onSignIn={() => {
          // Signed-in users never see this, but clear any stale destination from
          // a previous ?auth=required redirect so the modal uses its default.
          setAuthRedirectTo(undefined);
          setAuthOpen(true);
        }}
      />
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <main
        className={`relative min-h-screen w-full min-w-0 flex-1 bg-[#FFC600] transition-[margin] duration-500 ease-in-out ${sidebarCollapsed ? "md:ml-[68px]" : "md:ml-[224px]"}`}
      >
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-black/10 bg-[#FFC600] px-4 pt-[env(safe-area-inset-top)] md:hidden">
          <Link href="/" aria-label="Back2Basics with Kwamina home" className="flex h-12 w-[200px] max-w-[calc(100vw-80px)] items-center overflow-hidden">
            <img src="/logobg.png" alt="Back2Basics with Kwamina" className="h-full w-full object-cover object-center" />
          </Link>
          <button
            type="button"
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileNavOpen}
            aria-controls="platform-sidebar"
            onClick={() => setMobileNavOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#111111] transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]"
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </header>
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
