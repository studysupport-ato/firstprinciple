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
    `flex items-center ${collapsed ? "justify-center px-0" : "gap-3 px-4"} py-2.5 rounded-xl text-sm font-sans font-medium transition-all ${
      isActive(path)
        ? "bg-[#111111] text-white shadow-sm"
        : "text-[#666666] hover:bg-[#FFF4E5] hover:text-[#A8561F]"
    }`;

  return (
    <aside
      className={`fixed inset-y-0 left-0 ${collapsed ? "w-20" : "w-64"} border-r border-[#E5E5E5] bg-white flex flex-col z-20 transition-[width] duration-200`}
    >
      <div className={`h-20 flex items-center ${collapsed ? "justify-center px-3" : "px-8"} border-b border-[#E5E5E5]`}>
        <Link href="/" className="flex items-center gap-3 group" title="Back2Basics with Kwamina">
          <div className="w-6 h-6 bg-[#111111] rounded-sm flex items-center justify-center transition-transform group-hover:scale-105">
            <span className="text-white text-[10px] font-bold font-sans">B2</span>
          </div>
          {!collapsed && (
            <span className="font-serif text-lg font-medium tracking-tight text-[#111111]">
              Back2Basics with Kwamina
            </span>
          )}
        </Link>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        title={collapsed ? "Expand navigation" : "Collapse navigation"}
        className="absolute top-[4.75rem] -right-3 flex h-6 w-6 items-center justify-center rounded-full border border-[#E5E5E5] bg-white text-[#666666] shadow-sm transition-colors hover:text-[#111111]"
      >
        {collapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
      </button>

      <nav className={`flex-1 ${collapsed ? "px-3" : "px-4"} py-8 flex flex-col gap-2`}>
        {!collapsed && (
          <span className="px-4 mb-2 text-[10px] font-sans font-semibold uppercase tracking-widest text-[#666666]">
            Menu
          </span>
        )}

        {/* <Link href="/dashboard" className={navItemClass("/dashboard")}>
          <Compass size={16} />
          {!collapsed && "Dashboard"}
        </Link> */}

        <Link href="/courses" data-tour="courses" className={navItemClass("/courses")}>
          <BookOpen size={16} />
          {!collapsed && "Courses"}
        </Link>

        <Link href="/course-materials" data-tour="course-materials" className={navItemClass("/course-materials")}>
          <Library size={16} />
          {!collapsed && "Course Materials"}
        </Link>

        <Link href="/questions" data-tour="questions" className={navItemClass("/questions")}>
          <CircleHelp size={16} />
          {!collapsed && "Questions"}
        </Link>

        {/* <Link href="/leaderboard" className={navItemClass("/leaderboard")}>
          <Trophy size={16} />
          {!collapsed && "Leaderboard"}
        </Link>

        <Link href="/progress" className={navItemClass("/progress")}>
          <TrendingUp size={16} />
          {!collapsed && "Performance"}
        </Link> */}
      </nav>

      <div className="p-4 border-t border-[#E5E5E5] flex flex-col gap-2">
        <Link href="/settings" data-tour="settings" className={navItemClass("/settings")}>
          <Settings size={16} />
          {!collapsed && "Settings"}
        </Link>
        <button
          type="button"
          className={`flex items-center ${collapsed ? "justify-center px-0" : "gap-3 px-4"} py-2.5 rounded-xl text-sm font-sans font-medium text-[#E11D48] hover:bg-[#E11D48]/5 transition-colors text-left w-full`}
        >
          <LogOut size={16} />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </aside>
  );
}
