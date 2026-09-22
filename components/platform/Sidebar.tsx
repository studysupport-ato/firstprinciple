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
    `flex items-center ${collapsed ? "justify-center px-0" : "gap-3 px-4"} py-2.5 rounded-xl text-sm font-sans font-bold transition-all ${
      isActive(path)
        ? "bg-[#111111] text-[#FFBE00] border-2 border-[#111111] shadow-[2px_2px_0_#E53935]"
        : "text-[#111111]/80 hover:bg-[#111111]/10 hover:text-[#111111] border-2 border-transparent"
    }`;

  return (
    <aside
      className={`fixed inset-y-0 left-0 ${collapsed ? "w-20" : "w-64"} border-r-2 border-[#111111] bg-transparent flex flex-col z-20 transition-[width] duration-200`}
    >
      <div className={`h-20 flex items-center ${collapsed ? "justify-center px-3" : "px-8"} border-b-2 border-[#111111]`}>
        <Link href="/" className="flex items-center gap-3 group" title="Back2Basics with Kwamina">
          <div className="w-6 h-6 bg-[#111111] rounded-sm flex items-center justify-center transition-transform group-hover:scale-105 border-2 border-[#111111] shadow-[2px_2px_0_#E53935]">
            <span className="text-[#FFBE00] text-[10px] font-black font-sans">B2</span>
          </div>
          {!collapsed && (
            <span className="font-serif text-lg font-black tracking-tight text-[#111111]">
              Back2Basics
            </span>
          )}
        </Link>
        <button
          onClick={onToggle}
          className="absolute top-[4.75rem] -right-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#111111] bg-[#FFBE00] text-[#111111] transition-transform hover:scale-110"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={12} strokeWidth={3} /> : <PanelLeftClose size={12} strokeWidth={3} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-8 px-4 flex flex-col gap-8 scrollbar-hide">
        <nav className="flex flex-col gap-2">
          {!collapsed && <div className="px-4 text-[10px] font-black uppercase tracking-widest text-[#111111]/60 mb-2">Menu</div>}
          <Link href="/dashboard" className={navItemClass("/dashboard")} title="Dashboard">
            <Compass size={18} strokeWidth={2.5} />
            {!collapsed && <span>Dashboard</span>}
          </Link>
          <Link href="/courses" className={navItemClass("/courses")} title="Courses">
            <BookOpen size={18} strokeWidth={2.5} />
            {!collapsed && <span>Courses</span>}
          </Link>
          <Link href="/course-materials" className={navItemClass("/course-materials")} title="Course Materials">
            <Library size={18} strokeWidth={2.5} />
            {!collapsed && <span>Course Materials</span>}
          </Link>
          <Link href="/questions" className={navItemClass("/questions")} title="Questions">
            <CircleHelp size={18} strokeWidth={2.5} />
            {!collapsed && <span>Questions</span>}
          </Link>
        </nav>

        <nav className="flex flex-col gap-2">
          {!collapsed && <div className="px-4 text-[10px] font-black uppercase tracking-widest text-[#111111]/60 mb-2">Performance</div>}
          <Link href="/progress" className={navItemClass("/progress")} title="Progress">
            <TrendingUp size={18} strokeWidth={2.5} />
            {!collapsed && <span>Progress</span>}
          </Link>
          <Link href="/leaderboard" className={navItemClass("/leaderboard")} title="Leaderboard">
            <Trophy size={18} strokeWidth={2.5} />
            {!collapsed && <span>Leaderboard</span>}
          </Link>
        </nav>
      </div>

      <div className={`p-4 border-t-2 border-[#111111] ${collapsed ? "flex flex-col items-center" : ""}`}>
        <Link href="/settings" className={navItemClass("/settings")} title="Settings">
          <Settings size={18} strokeWidth={2.5} />
          {!collapsed && <span>Settings</span>}
        </Link>
        <button
          type="button"
          title="Sign out"
          className={`flex items-center ${collapsed ? "justify-center px-0 mt-2" : "gap-3 px-4 mt-2"} py-2.5 rounded-xl text-sm font-sans font-black text-[#E53935] hover:bg-[#E53935]/10 border-2 border-transparent transition-colors text-left w-full`}
        >
          <LogOut size={18} strokeWidth={2.5} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
