"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink, Pencil, X } from "lucide-react";
import { getAssessments } from "@/lib/content/access";

export function PreviewToolbar() {
  const pathname = usePathname();
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    setIsPreview(new URLSearchParams(window.location.search).get("preview") === "1");
  }, [pathname]);

  if (!isPreview) return null;

  const courseMatch = pathname.match(/^\/courses\/([^/]+)/);
  const courseId = courseMatch?.[1] ?? "";
  const lessonMatch = pathname.match(/\/lesson\/([^/]+)/);
  const lessonId = lessonMatch?.[1];
  const chapterMatch = pathname.match(/\/chapter\/([^/]+)/);
  const chapterId = chapterMatch?.[1];
  const assessment = courseId ? getAssessments(courseId)[0] : undefined;
  const editHref = lessonId ? `/admin/lessons/${lessonId}` : undefined;
  const exitHref = courseId ? `/admin/courses/${courseId}` : "/admin/courses";

  return (
    <div className="sticky top-0 z-40 flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-[#E5E5E5] bg-[#FBFBFA]/95 px-5 py-2 backdrop-blur-sm md:px-8">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563EB]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
          Preview mode
        </span>
        <span className="hidden text-xs text-[#666666] sm:inline">Viewing the student experience</span>
      </div>
      <div className="flex items-center gap-2">
        {editHref ? <Link href={editHref} className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#111111]"><Pencil size={13} />Edit Day</Link> : null}
        {chapterId && lessonId ? <Link href={`/courses/${courseId}/chapter/${chapterId}/practice?preview=1`} className="hidden rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#111111] sm:inline-flex">Practice</Link> : null}
        {chapterId && assessment ? <Link href={`/courses/${courseId}/chapter/${chapterId}/assessment/${assessment.id}?preview=1`} className="hidden rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#111111] sm:inline-flex">Assessment</Link> : null}
        <Link href={exitHref} className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#111111]"><X size={13} />Exit preview</Link>
        <Link href={pathname} target="_blank" className="hidden items-center gap-1.5 text-xs text-[#666666] hover:text-[#111111] md:inline-flex" aria-label="Open student view in a new tab"><ExternalLink size={13} /></Link>
      </div>
    </div>
  );
}
