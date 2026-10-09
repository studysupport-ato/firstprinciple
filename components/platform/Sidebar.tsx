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
  /** Opens the layout-owned AuthModal. Shown only when signed out. */
  onSignIn?: () => void;
}

export function Sidebar({ collapsed, onToggle, onSignIn }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, authenticated } = useAuthSession();

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  const navItemClass = (path: string) =>
    `flex items-center ${collapsed ? "justify-center px-0" : "gap-3.5 px-[18px]"} py-3 rounded-xl font-sans font-bold text-[14.5px] transition-all ${
      isActive(path)
        ? "bg-[#FFC600] text-[#111111]"
        : "text-[#d7d7d7] hover:bg-[#1d1d1d] hover:text-white"
    }`;

  return (
    <aside
      className={`fixed inset-y-0 left-0 ${collapsed ? "w-[68px] px-2.5 py-4" : "w-[224px] p-5"} z-20 flex flex-col bg-[#111111] text-white transition-[width] duration-200`}
    >
      <div className={`${collapsed ? "mb-6" : "mb-8"} flex items-center ${collapsed ? "justify-center" : "px-0"}`}>
        <Link href="/" className={`flex items-center ${collapsed ? "justify-center" : "w-full"}`} title="Back2Basics with Kwamina">
          {collapsed ? (
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
          className="absolute top-[3.5rem] -right-3 flex h-6 w-6 items-center justify-center rounded-full border border-[#111111] bg-[#FFC600] text-[#111111] shadow-sm"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={12} strokeWidth={3} /> : <PanelLeftClose size={12} strokeWidth={3} />}
        </button>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto">
        <nav className="flex flex-col gap-1.5">
          {!collapsed && <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a7a7a]">Menu</div>}
          <Link href="/dashboard" className={navItemClass("/dashboard")} title="Dashboard">
            <Compass size={20} strokeWidth={2.5} />
            {!collapsed && <span>Dashboard</span>}
          </Link>
          <Link href="/courses" data-tour="courses" className={navItemClass("/courses")} title="Courses">
            <BookOpen size={20} strokeWidth={2.5} />
            {!collapsed && <span>Courses</span>}
          </Link>
          <Link href="/course-materials" data-tour="course-materials" className={navItemClass("/course-materials")} title="Course Materials">
            <Library size={20} strokeWidth={2.5} />
            {!collapsed && <span>Course Materials</span>}
          </Link>
          <Link href="/questions" data-tour="questions" className={navItemClass("/questions")} title="Questions">
            <CircleHelp size={20} strokeWidth={2.5} />
            {!collapsed && <span>Questions</span>}
          </Link>
        </nav>

        <nav className={`${collapsed ? "mt-6" : "mt-10"} flex flex-col gap-1.5`}>
          {!collapsed && <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a7a7a]">Performance</div>}
          <Link href="/progress" className={navItemClass("/progress")} title="Progress">
            <TrendingUp size={20} strokeWidth={2.5} />
            {!collapsed && <span>Progress</span>}
          </Link>
          {/*
            Leaderboard is a deferred feature (Task 40D.1). The route is retained
            but no longer exposed as an active product destination. Its legacy
            selector dependencies are intentionally left in place until the
            separate selector-retirement task.
          */}
        </nav>
      </div>

      <div className={`mt-auto border-t border-[#2a2a2a] pt-4 ${collapsed ? "flex flex-col items-center" : ""}`}>
        <Link href="/settings" data-tour="settings" className={navItemClass("/settings")} title="Settings">
          <Settings size={20} strokeWidth={2.5} />
          {!collapsed && <span>Settings</span>}
        </Link>
        {authenticated === true ? (
          <button
            type="button"
            onClick={async () => {
            try {
              await signOut();
              logoutMockStudent();
              router.push("/courses");
              router.refresh();
            } catch (error) {
              console.error("[AuthSession] Failed to sign out:", error);
            }
          }}
          title="Sign out"
          className={`mt-2 flex items-center text-[14.5px] ${collapsed ? "justify-center px-0" : "gap-3.5 px-[18px]"} w-full rounded-xl py-3 text-left font-bold text-[#ff5b5b] transition hover:bg-[#1d1d1d]`}
        >
          <LogOut size={20} strokeWidth={2.5} />
          {!collapsed && <span>Sign out</span>}
            </button>
          ) : null}

        {authenticated === false && onSignIn ? (
          <button
            type="button"
            onClick={onSignIn}
            title="Sign in"
            className={`mt-2 flex items-center text-[14.5px] ${collapsed ? "justify-center px-0" : "gap-3.5 px-[18px]"} w-full rounded-xl py-3 text-left font-bold text-[#FFC700] transition hover:bg-[#1d1d1d]`}
          >
            <LogIn size={20} strokeWidth={2.5} />
            {!collapsed && <span>Sign in</span>}
          </button>
        ) : null}
        {!collapsed && (
          <p className="mt-4 px-[18px] text-[10px] font-medium tracking-wide text-[#7a7a7a]">
            Built by <span className="font-semibold text-[#a3a3a3]">Kxy</span>
          </p>
        )}
      </div>
    </aside>
  );
}
