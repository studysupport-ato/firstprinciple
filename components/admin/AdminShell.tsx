"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  BriefcaseBusiness,
  FileText,
  Grid2x2,
  ImageIcon,
  LayoutDashboard,
  Library,
  Menu,
  Plus,
  Link2,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/branding/BrandLogo";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Courses", href: "/admin/courses", icon: BriefcaseBusiness },
  { label: "Lessons", href: "/admin/lessons", icon: BookOpen },
  { label: "Questions", href: "/admin/questions", icon: FileText },
  { label: "Assessments", href: "/admin/assessments", icon: ShieldCheck },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Media", href: "/admin/media", icon: ImageIcon },
  { label: "Resources", href: "/admin/resources", icon: Link2 },
  { label: "Course Materials", href: "/admin/course-materials", icon: Library },
  { label: "Settings", href: "/admin/settings", icon: Settings },
] as const;

function isNavActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F7F8] text-[#111111]">
      <div className="flex min-h-screen">
        <aside
          className={[
            "fixed inset-y-0 left-0 z-40 border-r border-[#E5E5E5] bg-white transition-all duration-200 md:static md:flex",
            mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
            "w-[268px] flex-col",
          ].join(" ")}
        >
          <div className="flex h-20 items-center justify-between border-b border-[#E5E5E5] px-6">
            <Link href="/admin" className="flex items-center gap-3" aria-label="Back2Basics with Kwamina admin home">
              <BrandLogo className="h-10 w-44 rounded-md" priority />
              <span className="sr-only">Back2Basics with Kwamina Admin</span>
            </Link>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E5E5] text-[#666666] md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X size={16} />
            </button>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            {navigation.map(({ label, href, icon: Icon }) => {
              const active = isNavActive(pathname, href);

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={[
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[#111111] text-white shadow-[0_8px_20px_rgba(17,17,17,0.12)]"
                      : "text-[#666666] hover:bg-[#F7F7F8] hover:text-[#111111]",
                  ].join(" ")}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[#E5E5E5] p-4">
            <div className="flex items-center gap-3 rounded-2xl bg-[#F7F7F8] p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] text-xs font-bold text-white">
                AM
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[#111111]">Admin Manager</div>
                <div className="truncate text-[10px] uppercase tracking-[0.2em] text-[#666666]">Operations</div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[#E5E5E5] bg-white/90 backdrop-blur-sm">
            <div className="flex h-20 items-center justify-between gap-4 px-4 md:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E5E5] text-[#666666] md:hidden"
                  onClick={() => setMobileOpen((value) => !value)}
                  aria-label="Toggle navigation"
                >
                  <Menu size={18} />
                </button>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#666666]">
                  <Grid2x2 size={12} />
                  Administration
                </div>
              </div>

              <div className="hidden flex-1 max-w-xl items-center gap-3 rounded-full border border-[#E5E5E5] bg-[#F7F7F8] px-4 py-2 md:flex">
                <Search size={15} className="text-[#666666]" />
                <input
                  type="text"
                  aria-label="Search admin"
                  placeholder="Search content, students or assessments"
                  className="w-full bg-transparent text-sm text-[#111111] outline-none placeholder:text-[#888888]"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="hidden h-10 w-10 items-center justify-center rounded-full border border-[#E5E5E5] text-[#666666] md:inline-flex"
                  aria-label="New item"
                >
                  <Plus size={16} />
                </button>
                <div className="flex items-center gap-3 rounded-full border border-[#E5E5E5] bg-white px-2.5 py-1.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111111] text-[10px] font-bold text-white">
                    AM
                  </div>
                  <div className="hidden text-left md:block">
                    <div className="text-xs font-semibold text-[#111111]">Admin Manager</div>
                    <div className="text-[10px] text-[#666666]">Platform lead</div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
