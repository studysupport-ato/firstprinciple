"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useAuthSession } from "@/lib/auth/useAuthSession";

export function CourseMaterialsChrome({ children }: { children: ReactNode }) {
  const { authenticated, student } = useAuthSession();
  const displayName = (student?.displayName ?? "").trim();
  const profileLabel = authenticated === true ? (displayName || "Student") : "Sign in";
  const profileSubLabel = authenticated === true ? "Student profile" : "Access your account";
  const initials =
    authenticated === true
      ? displayName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join("") || "S"
      : "SI";

  return (
    <div
      className="relative min-h-screen overflow-x-clip pb-10"
      style={{ background: "var(--gold-sweep)" }}
    >
      {/* PAGE BACKGROUND GRID */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "linear-gradient(#1A1814 1px, transparent 1px), linear-gradient(90deg, #1A1814 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10 px-[40px] pt-[22px] max-[900px]:px-[18px] max-[900px]:pt-5">
        <div className="mx-auto max-w-[1220px]">
          <div className="relative overflow-visible">
            
            {/* ── TOP BAR ── */}
            <div className="mb-[14px] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[#26231C]/55">
                <span>Learning space</span>
                <span className="text-[8px]">·</span>
                <span className="text-[#26231C]/80">MATH 151</span>
              </div>

              <Link
                href={authenticated === true ? "/settings" : "/courses"}
                aria-label={authenticated === true ? "Open profile settings" : "Sign in to your account"}
                title={authenticated === true ? "Profile settings" : "Sign in"}
                className="group flex items-center gap-2.5 rounded-full bg-[#1A1814]/[0.10] py-1 pl-1 pr-4 backdrop-blur-[2px]"
              >
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#1A1814] text-[11px] font-black text-[#E9BC3A] transition-transform group-hover:scale-105">
                  {initials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block font-sans text-[13px] font-bold leading-tight text-[#1A1814]">{profileLabel}</span>
                  <span className="block font-sans text-[11px] leading-tight text-[#1A1814]/50">{profileSubLabel}</span>
                </span>
              </Link>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
