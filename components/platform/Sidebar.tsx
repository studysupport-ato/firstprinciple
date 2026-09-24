"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Compass,
  Library,
  CircleHelp,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  TrendingUp,
  Trophy,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

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
      className={`fixed inset-y-0 left-0 ${collapsed ? "w-[104px]" : "w-[224px]"} z-20 flex flex-col bg-[#111111] p-5 text-white transition-[width] duration-200`}
    >
      <div className={`mb-8 flex items-center ${collapsed ? "justify-center" : "px-0"}`}>
        <Link href="/" className={`flex items-center ${collapsed ? "justify-center" : "w-full"}`} title="Back2Basics with Kwamina">
          {collapsed ? (
            <img
              src="/logobg.png"
              alt="Back2Basics with Kwamina"
              className="h-10 w-10 rounded-xl object-cover"
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
          <Link href="/courses" className={navItemClass("/courses")} title="Courses">
            <BookOpen size={20} strokeWidth={2.5} />
            {!collapsed && <span>Courses</span>}
          </Link>
          <Link href="/course-materials" className={navItemClass("/course-materials")} title="Course Materials">
            <Library size={20} strokeWidth={2.5} />
            {!collapsed && <span>Course Materials</span>}
          </Link>
          <Link href="/questions" className={navItemClass("/questions")} title="Questions">
            <CircleHelp size={20} strokeWidth={2.5} />
            {!collapsed && <span>Questions</span>}
          </Link>
        </nav>

        <nav className="mt-10 flex flex-col gap-1.5">
          {!collapsed && <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a7a7a]">Performance</div>}
          <Link href="/progress" className={navItemClass("/progress")} title="Progress">
            <TrendingUp size={20} strokeWidth={2.5} />
            {!collapsed && <span>Progress</span>}
          </Link>
          <Link href="/leaderboard" className={navItemClass("/leaderboard")} title="Leaderboard">
            <Trophy size={20} strokeWidth={2.5} />
            {!collapsed && <span>Leaderboard</span>}
          </Link>
        </nav>
      </div>

      <div className={`mt-auto border-t border-[#2a2a2a] pt-4 ${collapsed ? "flex flex-col items-center" : ""}`}>
        <Link href="/settings" className={navItemClass("/settings")} title="Settings">
          <Settings size={20} strokeWidth={2.5} />
          {!collapsed && <span>Settings</span>}
        </Link>
        <button
          type="button"
          title="Sign out"
          className={`mt-2 flex items-center text-[14.5px] ${collapsed ? "justify-center px-0" : "gap-3.5 px-[18px]"} w-full rounded-xl py-3 text-left font-bold text-[#ff5b5b] transition hover:bg-[#1d1d1d]`}
        >
          <LogOut size={20} strokeWidth={2.5} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
