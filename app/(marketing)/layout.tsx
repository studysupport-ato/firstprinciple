"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BuiltByKxy } from "@/components/marketing/BuiltByKxy";
import { AuthModal } from "@/components/auth/AuthModal";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSolid, setIsSolid] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    const handler = () => {
      const scrollY = window.scrollY;
      let solid = scrollY > 60;

      const finalCta = document.getElementById("final-cta");
      if (finalCta) {
        if (scrollY >= finalCta.offsetTop - 40) {
          solid = false;
        }
      }

      setIsSolid(solid);
    };

    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFBF5] flex flex-col">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 h-20 z-50 flex items-center justify-between px-8 md:px-16 transition-all duration-500 ${
          isSolid
            ? "bg-[#FFFBF5]/95 backdrop-blur-md border-b border-[#E9D8C3] shadow-sm"
            : "bg-transparent border-b border-white/10"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-sm transition-colors duration-500 ${isSolid ? "bg-[#1A1714]" : "bg-white"}`}>
            <span className={`text-[10px] font-black transition-colors duration-500 ${isSolid ? "text-white" : "text-[#1A1714]"}`}>B2</span>
          </div>
          <span className={`whitespace-nowrap font-serif text-lg font-medium tracking-tight transition-colors duration-500 ${isSolid ? "text-[#1A1714]" : "text-white"}`}>
            Back2Basics with Kwamina
          </span>
        </div>

        <nav className="hidden items-center gap-7 md:flex">
          {[
            { label: "Math 151", href: "#interactive-systems" },
            { label: "Learn", href: "#lesson-environment" },
            { label: "Practice", href: "#practice" },
            { label: "Resources", href: "#platform" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`text-xs font-sans font-medium transition-colors duration-500 ${
                isSolid ? "text-[#666666] hover:text-[#111111]" : "text-white/70 hover:text-white"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => {
            setAuthView("signin");
            setAuthOpen(true);
          }}
          className={`text-xs font-sans font-semibold px-5 py-2.5 rounded-full border transition-all duration-500 ${
            isSolid
              ? "text-[#111111] border-[#E5E5E5] hover:border-[#111111]"
              : "text-white border-white/30 hover:border-white hover:bg-white/10"
          }`}
        >
          Open App
        </button>
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialView={authView} />

      {/* Footer */}
      <footer className="border-t border-[#E9D8C3] py-6 px-8 md:px-16 flex items-center justify-between bg-[#FFFBF5]">
        <span className="font-sans text-xs text-[#666666]">
          © 2026 Back2Basics with Kwamina. All rights reserved.
        </span>
        <BuiltByKxy />
      </footer>
    </div>
  );
}

