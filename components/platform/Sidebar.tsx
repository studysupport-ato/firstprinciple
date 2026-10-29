"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Compass,
  Library,
  CircleHelp,
  LogIn,
  LogOut,
  MonitorPlay,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { logoutMockStudent } from "@/lib/auth/mock";
import { useAuthSession } from "@/lib/auth/useAuthSession";
import { BrandLogo } from "@/components/branding/BrandLogo";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  /** Opens the layout-owned AuthModal. Shown only when signed out. */
  onSignIn?: () => void;
}

import { NotificationBell } from "@/components/platform/NotificationBell";

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose, onSignIn }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, authenticated } = useAuthSession();
  const compact = collapsed && !mobileOpen;

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    // The general-courses playlist has its own menu item.
    if (path === "/course-materials") return pathname.startsWith(path) && !pathname.startsWith("/course-materials/general");
    return pathname.startsWith(path);
  };

  const navItemClass = (path: string) =>
    `flex min-h-11 items-center ${compact ? "justify-center px-0" : "gap-3.5 px-[14px]"} py-2.5 rounded-xl font-sans font-bold text-[14px] transition-all ${
      isActive(path)
        ? "bg-[#E9BC3A] text-[#1A1814]"
        : "text-[#F6EFDC]/70 hover:bg-[#3A3428] hover:text-[#F6EFDC]"
    }`;

  return (
    <aside
      id="platform-sidebar"
      className={`mobile-nav-drawer fixed inset-y-0 left-0 z-50 flex w-[min(84vw,280px)] flex-col bg-[#1A1814] p-5 pb-[calc(1rem+env(safe-area-inset-bottom))] text-white md:visible md:pointer-events-auto md:z-20 md:translate-x-0 ${mobileOpen ? "is-open visible translate-x-0" : "is-closed"} ${collapsed ? "md:w-[68px] md:px-2.5 md:py-4" : "md:w-[220px] md:p-5"}`}
    >
      <div className={`${compact ? "mb-6" : "mb-7"} flex items-center ${compact ? "justify-center" : "px-0"}`}>
        <Link href="/" onClick={onMobileClose} className={`flex items-center ${compact ? "justify-center" : "w-full"}`} title="Back2Basics with Kwamina">
          {compact ? (
            <BrandLogo className="h-9 w-9 rounded-lg bg-[#E9BC3A]/10 object-contain p-1" priority />
          ) : (
            <BrandLogo className="h-14 w-auto max-w-full rounded-md object-contain object-left" priority />
          )}
        </Link>
        <button
          onClick={onToggle}
          className="absolute top-[3.5rem] -right-3 hidden h-6 w-6 items-center justify-center rounded-full border border-[#1A1814] bg-[#E9BC3A] text-[#1A1814] shadow-sm md:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={12} strokeWidth={3} /> : <PanelLeftClose size={12} strokeWidth={3} />}
        </button>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto">
        <nav className="flex flex-col gap-0.5">
          {!compact && <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#F6EFDC]/30">Menu</div>}
          <Link href="/dashboard" onClick={onMobileClose} className={navItemClass("/dashboard")} title="Dashboard">
            <Compass size={19} strokeWidth={2.5} />
            {!compact && <span>Dashboard</span>}
          </Link>
          <Link href="/courses" onClick={onMobileClose} data-tour="courses" className={navItemClass("/courses")} title="Courses">
            <BookOpen size={19} strokeWidth={2.5} />
            {!compact && <span>Courses</span>}
          </Link>
          <Link href="/course-materials" onClick={onMobileClose} data-tour="course-materials" className={navItemClass("/course-materials")} title="Course Materials">
            <Library size={19} strokeWidth={2.5} />
            {!compact && <span>Course Materials</span>}
          </Link>
          <Link
            href="/course-materials/general"
            onClick={onMobileClose}
            className={navItemClass("/course-materials/general")}
            title="YouTube Playlist for General Courses"
          >
            <MonitorPlay size={19} strokeWidth={2.5} className="shrink-0" />
            {!compact && <span className="leading-tight">YouTube Playlist for General Courses</span>}
          </Link>
          <Link href="/questions" onClick={onMobileClose} data-tour="questions" className={navItemClass("/questions")} title="Questions">
            <CircleHelp size={19} strokeWidth={2.5} />
            {!compact && <span>Questions</span>}
          </Link>
        </nav>

        <nav className={`${compact ? "mt-6" : "mt-8"} flex flex-col gap-0.5`}>
          {!compact && <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#F6EFDC]/30">Performance</div>}
          <Link href="/progress" onClick={onMobileClose} className={navItemClass("/progress")} title="Progress">
            <TrendingUp size={19} strokeWidth={2.5} />
            {!compact && <span>Progress</span>}
          </Link>
          {/*
            Leaderboard is a deferred feature (Task 40D.1). The route is retained
            but no longer exposed as an active product destination. Its legacy
            selector dependencies are intentionally left in place until the
            separate selector-retirement task.
          */}
        </nav>
      </div>

      <div className={`mt-auto border-t border-[#3A3428] pt-4 ${compact ? "flex flex-col items-center" : ""}`}>
        {!pathname.includes("/lesson/") ? (
          <div className="mb-0.5 hidden w-full md:block">
            <NotificationBell variant="sidebar" compact={compact} />
          </div>
        ) : null}
        <Link href="/settings" onClick={onMobileClose} data-tour="settings" className={navItemClass("/settings")} title="Settings">
          <Settings size={19} strokeWidth={2.5} />
          {!compact && <span>Settings</span>}
        </Link>
        {authenticated === true ? (
          <button
            type="button"
            onClick={async () => {
            try {
              await signOut();
              logoutMockStudent();
              onMobileClose();
              router.push("/courses");
              router.refresh();
            } catch (error) {
              console.error("[AuthSession] Failed to sign out:", error);
            }
          }}
          title="Sign out"
          className={`mt-2 flex min-h-11 items-center text-[14px] ${compact ? "justify-center px-0" : "gap-3.5 px-[14px]"} w-full rounded-xl py-2.5 text-left font-bold text-[#ff5b5b] transition hover:bg-[#3A3428]`}
        >
          <LogOut size={19} strokeWidth={2.5} />
          {!compact && <span>Sign out</span>}
            </button>
          ) : null}

        {authenticated === false && onSignIn ? (
          <button
            type="button"
            onClick={() => {
              onMobileClose();
              onSignIn?.();
            }}
            title="Sign in"
            className={`mt-2 flex min-h-11 items-center text-[14px] ${compact ? "justify-center px-0" : "gap-3.5 px-[14px]"} w-full rounded-xl py-2.5 text-left font-bold text-[#E9BC3A] transition hover:bg-[#3A3428]`}
          >
            <LogIn size={19} strokeWidth={2.5} />
            {!compact && <span>Sign in</span>}
          </button>
        ) : null}
        {!compact && (
          <p className="mt-4 px-[14px] text-[10px] font-medium tracking-wide text-[#F6EFDC]/25">
            Built by{" "}
            <a
              href="https://www.linkedin.com/in/kwartengkwame"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#F6EFDC]/40 hover:text-[#E9BC3A] transition-colors underline underline-offset-2 decoration-dotted"
            >
              Kxy
            </a>
          </p>
        )}
      </div>
    </aside>
  );
}
