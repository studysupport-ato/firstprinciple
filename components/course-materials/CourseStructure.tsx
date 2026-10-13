"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import type { CourseOutlineChapter } from "@/lib/courseMaterials";

/** Same colours, in the same order, as the course's topics. */
const CHAPTER_COLORS = ["#E9BC3A", "#E0835A", "#8FB8E8", "#7FC9A2", "#B9A4EA", "#F2A7C3", "#C9B27C", "#9AD0D6"];

function Cases({ items, muted }: { items: string[]; muted?: boolean }) {
  if (!items.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-[5px]">
      {items.map((item) => (
        <span key={item} className={`rounded-full border-[1.5px] px-2.5 py-0.5 text-[11px] font-bold ${muted ? "border-[#F6EFDC]/30 text-[#F6EFDC]/80" : "border-[#F6EFDC]/35 text-[#F6EFDC]/85"}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

/**
 * The course outline, closed behind one button. Tapping it brings the chapters in;
 * tapping a chapter opens its sections and subtopics. Only one chapter is open at a time.
 */
export function CourseStructure({ outline }: { outline: CourseOutlineChapter[] }) {
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState(-1);
  if (!outline.length) return null;

  const sections = outline.reduce((sum, chapter) => sum + chapter.secs.length, 0);
  const subtopics = outline.reduce((sum, chapter) => sum + chapter.secs.reduce((n, sec) => n + sec.subs.length, 0), 0);

  return (
    <div className="mt-6 max-w-[860px]">
      <button
        type="button"
        aria-expanded={shown}
        onClick={() => {
          setShown((value) => !value);
          setOpen(-1);
        }}
        className={`flex min-h-[64px] w-full items-center gap-3.5 rounded-[18px] bg-[#1A1814] px-[18px] py-3 text-left text-[#F6EFDC] transition hover:brightness-110 ${shown ? "" : "cs-pulse"}`}
      >
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E9BC3A] text-[#1A1814]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="5" cy="5" r="2" />
            <circle cx="5" cy="19" r="2" />
            <path d="M5 7v10M9 5h11M9 12h8M9 19h11M5 12h1" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-black">{shown ? "Hide course structure" : "Tap here to see course structure"}</span>
          <span className="mt-0.5 block text-[12px] text-[#F6EFDC]/60">
            {outline.length} chapters · {sections} sections · {subtopics} subtopics
          </span>
        </span>
        <ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 text-[#E9BC3A] transition-transform duration-300 ${shown ? "rotate-180" : ""}`} />
      </button>

      {shown ? (
        <div className="relative mt-[18px] pl-[46px] sm:pl-[52px]">
          <div aria-hidden="true" className="cs-spine absolute bottom-[26px] left-4 top-2 w-1 rounded-sm bg-[#1A1814]" />
          {outline.map((chapter, index) => {
            const isOpen = index === open;
            const color = CHAPTER_COLORS[index % CHAPTER_COLORS.length];
            const subCount = chapter.secs.reduce((n, sec) => n + sec.subs.length, 0);
            const meta = `${chapter.secs.length} sections${subCount ? ` · ${subCount} subtopics` : ""}`;
            let step = 0;
            const delay = () => `${(step += 1) * 0.035}s`;
            return (
              <div key={`${chapter.n}-${chapter.t}`} className="cs-rise relative mb-2.5" style={{ animationDelay: `${index * 0.07}s` }}>
                <span
                  aria-hidden="true"
                  className="absolute top-3 flex h-9 w-9 items-center justify-center rounded-full border-[3px] bg-[#1A1814] text-[15px] font-black text-[#E9BC3A] -left-[46px] sm:-left-[52px]"
                  style={{ borderColor: color }}
                >
                  {chapter.n}
                </span>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  // Only one chapter at a time: opening one closes the other; tapping the open one closes it.
                  onClick={() => setOpen(isOpen ? -1 : index)}
                  style={{ borderTop: `5px solid ${color}` }}
                  className={`flex min-h-[60px] w-full items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-left transition-colors duration-200 ${isOpen ? "bg-[#1A1814] text-[#F6EFDC]" : "bg-[#FFFAEB]/55 text-[#1A1814] hover:bg-[#FFFAEB]/75"}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[11px] font-black tracking-[0.12em] ${isOpen ? "text-[#E9BC3A]" : "text-[#1A1814]/55"}`}>CHAPTER {chapter.n}</span>
                    <span className="mt-0.5 block text-[16px] font-black leading-tight">{chapter.t}</span>
                    <span className={`mt-[3px] block text-[12px] font-bold sm:hidden ${isOpen ? "text-[#F6EFDC]/60" : "text-[#1A1814]/60"}`}>{meta}</span>
                  </span>
                  <span className={`hidden shrink-0 text-[12px] font-bold sm:inline ${isOpen ? "text-[#F6EFDC]/60" : "text-[#1A1814]/60"}`}>{meta}</span>
                  <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen ? (
                  <div className="-mt-2.5 rounded-b-[14px] bg-[#1A1814] px-3.5 pb-2.5 pt-[18px] text-[#F6EFDC]">
                    {chapter.secs.map((sec) => (
                      <div key={sec.num + sec.t} className="cs-drop pb-3" style={{ animationDelay: delay() }}>
                        <div className="flex items-baseline gap-2.5">
                          <span className="shrink-0 rounded-md bg-[#E9BC3A] px-[7px] py-0.5 text-[12px] font-black text-[#1A1814]">{sec.num}</span>
                          <span className="text-[15px] font-extrabold leading-snug">{sec.t}</span>
                        </div>
                        {sec.cases.length ? (
                          <div className="ml-11">
                            <Cases items={sec.cases} />
                          </div>
                        ) : null}
                        {sec.subs.length ? (
                          <div className="ml-[18px] mt-2 flex flex-col gap-[7px] border-l-2 border-[#3A3428] pl-4">
                            {sec.subs.map((sub) => (
                              <div key={sub.num + sub.t} className="cs-drop" style={{ animationDelay: delay() }}>
                                <div className="flex items-baseline gap-[9px]">
                                  <span className="min-w-[34px] shrink-0 text-[11px] font-black text-[#F6EFDC]/55">{sub.num}</span>
                                  <span className="text-[13.5px] font-semibold leading-snug text-[#F6EFDC]/92">{sub.t}</span>
                                </div>
                                {sub.cases.length ? (
                                  <div className="ml-[43px]">
                                    <Cases items={sub.cases} muted />
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
