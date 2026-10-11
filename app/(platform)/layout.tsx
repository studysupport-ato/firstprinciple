"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { AuthModal } from "@/components/auth/AuthModal";
import { BrandLogo } from "@/components/branding/BrandLogo";
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
      <div
        aria-hidden={!mobileNavOpen}
        role="presentation"
        className={`mobile-nav-backdrop fixed inset-0 z-40 bg-black/50 md:hidden ${
          mobileNavOpen ? "is-open visible opacity-100" : "invisible pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileNavOpen(false)}
      />

      <main
        className={`relative min-h-screen w-full min-w-0 flex-1 transition-[margin] duration-500 ease-in-out md:pb-0 pb-[80px] ${sidebarCollapsed ? "md:ml-[68px]" : "md:ml-[220px]"}`}
      >
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between bg-[#1A1814] px-4 pt-[env(safe-area-inset-top)] md:hidden">
          <button
            type="button"
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileNavOpen}
            aria-controls="platform-sidebar"
            onClick={() => setMobileNavOpen((open) => !open)}
            className="flex h-11 w-11 shrink-0 items-center justify-start text-[#F6EFDC] transition focus-visible:outline-none"
          >
            {mobileNavOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <Link href="/" aria-label="Back2Basics with Kwamina home" className="flex items-center justify-center">
            <BrandLogo className="h-12 w-40" priority />
          </Link>

          <div className="w-11 shrink-0" /> {/* Spacer for centering */}
        </header>

        <PreviewToolbar />
        {children}

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-[76px] items-center justify-around bg-[#1A1814] pb-[env(safe-area-inset-bottom)] px-2 md:hidden">
          <MobileNavItem href="/" icon="Compass" label="Home" current={pathname === "/"} />
          <MobileNavItem href="/courses" icon="BookOpen" label="Courses" current={pathname === "/courses" || pathname?.startsWith("/courses/")} />
          <MobileNavItem href="/course-materials" icon="Library" label="Materials" current={pathname === "/course-materials"} />
          <MobileNavItem href="/questions" icon="HelpCircle" label="Questions" current={pathname === "/questions"} />
        </nav>
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

import { Compass, BookOpen, Library, HelpCircle } from "lucide-react";

function MobileNavItem({ href, icon, label, current }: { href: string; icon: string; label: string; current: boolean }) {
  const IconComponent = {
    Compass: Compass,
    BookOpen: BookOpen,
    Library: Library,
    HelpCircle: HelpCircle
  }[icon] || Compass;

  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 rounded-[16px] px-4 py-2 transition ${
        current ? "bg-[#F0C84A] text-[#1A1814]" : "text-[#F6EFDC] hover:bg-white/5"
      }`}
    >
      <IconComponent size={20} strokeWidth={current ? 2.5 : 2} />
      <span className="text-[11px] font-bold tracking-wide">{label}</span>
    </Link>
  );
}
