"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const socials = [
  {
    name: "TikTok",
    handle: "@kxystaysup",
    href: "https://tiktok.com/@kxystaysup",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.75a8.17 8.17 0 0 0 4.78 1.52V6.82a4.85 4.85 0 0 1-1.01-.13z"/>
      </svg>
    ),
    color: "hover:text-[#ff0050]",
  },
  {
    name: "Snapchat",
    handle: "@kxystaysup",
    href: "https://snapchat.com/add/kxystaysup",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.166 3C9.036 3 6.5 5.536 6.5 8.666v.91c-.457.185-.924.137-1.277.029-.178-.054-.344-.017-.47.097a.49.49 0 0 0-.153.446c.074.476.423.88.895 1.066.116.044.229.076.34.1-.26.478-.627.93-1.183 1.31-.306.208-.422.6-.271.93.092.203.274.345.49.384.627.113 1.264.47 1.49.65-.04.15-.117.28-.215.39-.274.307-.69.456-1.147.405a.496.496 0 0 0-.544.502c.003.264.207.485.47.503.738.052 2.24.372 2.865 1.842.07.164.219.281.394.307.184.028 1.843.252 3.016-.682.593.474 1.37.68 2.25.682.882-.002 1.66-.208 2.25-.682 1.173.934 2.832.71 3.016.682a.497.497 0 0 0 .394-.307c.625-1.47 2.127-1.79 2.866-1.842a.497.497 0 0 0 .469-.503.496.496 0 0 0-.544-.502c-.457.051-.873-.098-1.147-.405a1.217 1.217 0 0 1-.215-.39c.226-.18.863-.537 1.49-.65a.497.497 0 0 0 .49-.384c.151-.33.035-.722-.271-.93-.556-.38-.923-.832-1.183-1.31.111-.024.224-.056.34-.1.472-.186.821-.59.895-1.066a.49.49 0 0 0-.153-.446c-.126-.114-.292-.15-.47-.097-.353.108-.82.156-1.277-.03v-.909C17.5 5.536 14.964 3 11.834 3H12.166z"/>
      </svg>
    ),
    color: "hover:text-[#FFFC00]",
  },
  {
    name: "Instagram",
    handle: "@kxystaysup",
    href: "https://instagram.com/kxystaysup",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    color: "hover:text-[#E1306C]",
  },
];

export function BuiltByKxy() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Trigger Text */}
      <button className="font-sans text-xs font-semibold text-[#666666] hover:text-[#111111] transition-colors tracking-wide cursor-default select-none">
        Built by{" "}
        <span className="text-[#111111] underline underline-offset-4 decoration-dotted">
          Kxy
        </span>
      </button>

      {/* Hover Card */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 bg-[#111111] rounded-2xl p-5 shadow-2xl border border-white/10 z-50"
          >
            {/* Arrow */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#111111] rotate-45 border-r border-b border-white/10" />

            <div className="flex flex-col items-center mb-5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] mb-3 flex items-center justify-center">
                <span className="text-white font-serif font-bold text-xl">K</span>
              </div>
              <span className="font-sans font-bold text-white text-sm">Kxy</span>
              <span className="font-sans text-[10px] text-white/40 tracking-widest uppercase mt-0.5">Designer & Builder</span>
            </div>

            <div className="flex flex-col gap-2">
              {socials.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group text-white/60 ${s.color}`}
                >
                  <span className="transition-colors">{s.icon}</span>
                  <div>
                    <span className="block font-sans text-xs font-semibold text-white group-hover:text-white transition-colors">{s.name}</span>
                    <span className="block font-sans text-[10px] text-white/40">{s.handle}</span>
                  </div>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
