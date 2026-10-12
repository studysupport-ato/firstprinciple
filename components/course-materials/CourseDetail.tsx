"use client";

import { ArrowLeft, BookOpenText, Bookmark, Play } from "lucide-react";
import { useState } from "react";

import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { YouTubeEmbed } from "@/components/learning/YouTubeEmbed";
import { getCourseMaterialVideoId } from "@/lib/youtube";
import type { MaterialRow, MaterialType } from "@/lib/courseMaterialsDisplay";

interface CourseDetailProps {
  course: { courseCode?: string; courseTitle: string };
  materials: MaterialRow[];
  backLabel: string;
  onBack: () => void;
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
}

/** One course and its materials: type filter pills, then the list. Materials switched off show greyed out. */
export function CourseDetail({ course, materials, backLabel, onBack, bookmarks, toggleBookmark }: CourseDetailProps) {
  const [typeFilter, setTypeFilter] = useState<"ALL" | MaterialType>("ALL");
  return (
          <div>
            {/* ── BACK ── */}
            <button
              type="button"
              onClick={onBack}
              className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1A1814]/60 transition hover:text-[#1A1814]"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
              {backLabel}
            </button>

            {/* ── COURSE BADGE + TITLE ── */}
            {course.courseCode && (
              <div className="mb-3">
                <span className="rounded-[6px] bg-[#E9BC3A] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#1A1814]">
                  {course.courseCode}
                </span>
              </div>
            )}
            <h1 className="font-sans text-[clamp(2.2rem,6vw,4rem)] font-black leading-[1.0] tracking-[-0.02em] text-[#1A1814]">
              {course.courseTitle}
            </h1>

            {/* ── STATS ── */}
            {(() => {
              const typeCounts = materials.reduce((acc, m) => {
                let short = "";
                if (m.type === "PDF Document") short = "PDF";
                else if (m.type === "Lecture Slides") short = "slides";
                else if (m.type === "Past Questions") short = "past questions";
                else if (m.type === "Video Lecture") short = "video";
                if (short) acc[short] = (acc[short] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              const parts = Object.entries(typeCounts).map(([type, count]) => `${count} ${type}`);
              return (
                <p className="mt-2 text-[16px] font-medium text-[#26231C]/75">
                  {materials.length} materials{parts.length ? ` · ${parts.join(" · ")}` : ""}
                </p>
              );
            })()}

            {/* ── FILTER PILLS ── */}
            {(() => {
              const types: Array<"ALL" | MaterialType> = ["ALL", ...([...new Set(materials.map(m => m.type))] as MaterialType[])];
              const pillLabel: Record<string, string> = {
                ALL: "All",
                "PDF Document": "PDF",
                "Lecture Slides": "Slides",
                "Past Questions": "Past Questions",
                "Video Lecture": "Video",
                "External Link": "Links",
              };
              return (
                <div className="mt-6 flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-x-visible md:pb-0">
                  {types.map(t => {
                    const dead = t !== "ALL" && !materials.some(m => m.type === t && m.available !== false);
                    return dead ? (
                      <span
                        key={t}
                        className="shrink-0 cursor-not-allowed rounded-full border border-dashed border-[#6F6753] bg-[#3B372E] px-6 py-2 text-[14px] font-bold text-[#9A917B]"
                        title="Not available at the moment"
                      >
                        {pillLabel[t] ?? t} · none yet
                      </span>
                    ) : (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        className={`shrink-0 rounded-full px-6 py-2 text-[14px] font-bold transition ${typeFilter === t ? "bg-[#8F6500] text-[#F6EFDC]" : "bg-[#1A1814] text-[#F6EFDC] hover:bg-[#333333]"}`}
                      >
                        {pillLabel[t] ?? t}
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* ── MATERIALS LIST ── */}
            <div className="mt-6 overflow-hidden rounded-[24px] bg-[#1A1814] shadow-[0_2px_14px_rgba(0,0,0,0.22)]">
              {materials
                .filter(entry => typeFilter === "ALL" || entry.type === typeFilter)
                .map((entry, index, arr) => {
                  const off = entry.available === false;
                  const isSaved = bookmarks.includes(entry.id);
                  const videoId = getCourseMaterialVideoId(entry);
                  const isLast = index === arr.length - 1;

                  // Icon background: gold for video, medium brown for others
                  const iconBg = videoId ? "bg-[#E9BC3A]" : "bg-[#F0C84A]";
                  const iconEl = videoId
                    ? <Play className="h-5 w-5 fill-current text-[#1A1814]" />
                    : <BookOpenText className="h-5 w-5 text-[#1A1814]" strokeWidth={2} />;

                  const ActionLabel = videoId ? "Watch" : "Open";
                  const ActionHref = videoId ? `#material-video-${entry.id}` : entry.url;

                  return (
                    <AnimatedItem key={entry.id} index={index}>
                      <article className={`flex flex-col px-5 py-6 sm:px-7 sm:py-6 ${!isLast ? "border-b border-[#3A3428]" : ""} ${off ? "opacity-55" : ""}`}>
                        <div className="flex items-start sm:items-center gap-4">
                          {/* Icon */}
                          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] ${iconBg}`}>
                            {iconEl}
                          </span>

                          {/* Text */}
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#F6EFDC]">
                              {entry.type}
                            </p>
                            <h3 className="mt-[2px] font-sans text-[20px] sm:text-[17px] font-black leading-[1.15] tracking-tight text-[#F6EFDC]">
                              {entry.courseTitle}
                            </h3>
                            {entry.description && entry.description !== entry.courseTitle && (
                              <p className="mt-1.5 text-[14px] sm:text-[13px] leading-snug text-[#F6EFDC]/70">
                                {entry.description}
                              </p>
                            )}
                          </div>

                          {/* Actions (Desktop) */}
                          {off ? (
                            <span className="hidden shrink-0 rounded-full border border-dashed border-[#6F6753] px-4 py-2 text-[12px] font-bold text-[#B8AE95] sm:inline-flex">
                              Not available at the moment
                            </span>
                          ) : null}
                          <div className={`hidden shrink-0 items-center gap-2 ${off ? "" : "sm:flex"}`}>
                            <a
                              href={ActionHref}
                              target={videoId ? undefined : "_blank"}
                              rel={videoId ? undefined : "noreferrer"}
                              className="inline-flex h-10 items-center justify-center rounded-full bg-[#8F6500] px-5 text-[13px] font-bold text-[#F6EFDC] transition hover:brightness-110"
                            >
                              {ActionLabel}
                            </a>
                            <button
                              type="button"
                              onClick={() => toggleBookmark(entry.id)}
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${isSaved ? "border-[#E9BC3A] text-[#E9BC3A]" : "border-[#3A3428] text-[#F6EFDC]/40 hover:border-[#F6EFDC]/40 hover:text-[#F6EFDC]"}`}
                            >
                              <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                            </button>
                          </div>
                        </div>

                        {/* Actions (Mobile Full Width) */}
                        {off ? (
                          <p className="mt-4 text-[13px] font-bold text-[#B8AE95] sm:hidden">Not available at the moment</p>
                        ) : null}
                        <div className={`mt-5 w-full sm:hidden ${off ? "!hidden" : ""}`}>
                          <a
                            href={ActionHref}
                            target={videoId ? undefined : "_blank"}
                            rel={videoId ? undefined : "noreferrer"}
                            className="flex h-12 w-full items-center justify-center rounded-full bg-[#8F6500] text-[15px] font-bold text-[#F6EFDC] transition hover:brightness-110"
                          >
                            {ActionLabel}
                          </a>
                        </div>

                        {videoId && !off ? (
                          <div id={`material-video-${entry.id}`} className="ml-[60px] mt-4 scroll-mt-6">
                            <YouTubeEmbed videoId={videoId} title={entry.courseTitle} />
                          </div>
                        ) : null}
                      </article>
                    </AnimatedItem>
                  );
                })}
            </div>
          </div>
  );
}
