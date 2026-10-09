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
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { logoutMockStudent } from "@/lib/auth/mock";
import { useAuthSession } from "@/lib/auth/useAuthSession";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  /** Opens the layout-owned AuthModal. Shown only when signed out. */
  onSignIn?: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose, onSignIn }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, authenticated } = useAuthSession();
  const compact = collapsed && !mobileOpen;

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  const navItemClass = (path: string) =>
    `flex min-h-11 items-center ${compact ? "justify-center px-0" : "gap-3.5 px-[18px]"} py-3 rounded-xl font-sans font-bold text-[14.5px] transition-all ${
      isActive(path)
        ? "bg-[#FFC600] text-[#111111]"
        : "text-[#d7d7d7] hover:bg-[#1d1d1d] hover:text-white"
    }`;

  return (
    <aside
      id="platform-sidebar"
      className={`fixed inset-y-0 left-0 ${mobileOpen ? "z-50 flex w-[min(84vw,280px)] p-5 pb-[calc(1rem+env(safe-area-inset-bottom))]" : "z-20 hidden md:flex"} ${collapsed ? "md:w-[68px] md:px-2.5 md:py-4" : "md:w-[224px] md:p-5"} flex-col bg-[#111111] text-white transition-[width,transform] duration-200`}
    >
      <div className={`${compact ? "mb-6" : "mb-8"} flex items-center ${compact ? "justify-center" : "px-0"}`}>
        <Link href="/" onClick={onMobileClose} className={`flex items-center ${compact ? "justify-center" : "w-full"}`} title="Back2Basics with Kwamina">
          {compact ? (
            <img
              src="/logobg.png"
              alt="Back2Basics with Kwamina"
              className="h-9 w-9 rounded-lg object-cover"
            />
          ) : (
            <img
              src="/logobg.png"
              alt="Back2Basics with Kwamina"
              className="h-12 w-full rounded-xl object-cover object-center"
            />
          )}
        </Link>
        <button
          onClick={onToggle}
          className="absolute top-[3.5rem] -right-3 hidden h-6 w-6 items-center justify-center rounded-full border border-[#111111] bg-[#FFC600] text-[#111111] shadow-sm md:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={12} strokeWidth={3} /> : <PanelLeftClose size={12} strokeWidth={3} />}
        </button>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto">
        <nav className="flex flex-col gap-1.5">
          {!compact && <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a7a7a]">Menu</div>}
          <Link href="/dashboard" onClick={onMobileClose} className={navItemClass("/dashboard")} title="Dashboard">
            <Compass size={20} strokeWidth={2.5} />
            {!compact && <span>Dashboard</span>}
          </Link>
          <Link href="/courses" onClick={onMobileClose} data-tour="courses" className={navItemClass("/courses")} title="Courses">
            <BookOpen size={20} strokeWidth={2.5} />
            {!compact && <span>Courses</span>}
          </Link>
          <Link href="/course-materials" onClick={onMobileClose} data-tour="course-materials" className={navItemClass("/course-materials")} title="Course Materials">
            <Library size={20} strokeWidth={2.5} />
            {!compact && <span>Course Materials</span>}
          </Link>
          <Link href="/questions" onClick={onMobileClose} data-tour="questions" className={navItemClass("/questions")} title="Questions">
            <CircleHelp size={20} strokeWidth={2.5} />
            {!compact && <span>Questions</span>}
          </Link>
        </nav>

        <nav className={`${compact ? "mt-6" : "mt-10"} flex flex-col gap-1.5`}>
          {!compact && <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a7a7a]">Performance</div>}
          <Link href="/progress" onClick={onMobileClose} className={navItemClass("/progress")} title="Progress">
            <TrendingUp size={20} strokeWidth={2.5} />
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

      <div className={`mt-auto border-t border-[#2a2a2a] pt-4 ${compact ? "flex flex-col items-center" : ""}`}>
        <Link href="/settings" onClick={onMobileClose} data-tour="settings" className={navItemClass("/settings")} title="Settings">
          <Settings size={20} strokeWidth={2.5} />
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
          className={`mt-2 flex min-h-11 items-center text-[14.5px] ${compact ? "justify-center px-0" : "gap-3.5 px-[18px]"} w-full rounded-xl py-3 text-left font-bold text-[#ff5b5b] transition hover:bg-[#1d1d1d]`}
        >
          <LogOut size={20} strokeWidth={2.5} />
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
            className={`mt-2 flex min-h-11 items-center text-[14.5px] ${compact ? "justify-center px-0" : "gap-3.5 px-[18px]"} w-full rounded-xl py-3 text-left font-bold text-[#FFC700] transition hover:bg-[#1d1d1d]`}
          >
            <LogIn size={20} strokeWidth={2.5} />
            {!compact && <span>Sign in</span>}
          </button>
        ) : null}
        {!compact && (
          <p className="mt-4 px-[18px] text-[10px] font-medium tracking-wide text-[#7a7a7a]">
            Built by <span className="font-semibold text-[#a3a3a3]">Kxy</span>
          </p>
        )}
      </div>
    </aside>
  );
}
