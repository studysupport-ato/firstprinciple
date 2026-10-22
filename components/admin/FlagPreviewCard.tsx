"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EducationalText } from "@/components/learning/EducationalText";
import { MarkdownBlock } from "@/components/learning/blocks/MarkdownBlock";
import { getFlagPreviewAction, type FlagPreview, type FlagPreviewBlock } from "@/lib/flags/preview";

/** The flagged lesson step or question, shown right next to the reports. */
export function FlagPreviewCard({ targetKey }: { targetKey: string }) {
  const [preview, setPreview] = useState<FlagPreview | null>(null);

  useEffect(() => {
    let live = true;
    setPreview(null);
    void getFlagPreviewAction(targetKey).then((result) => {
      if (live) setPreview(result);
    });
    return () => {
      live = false;
    };
  }, [targetKey]);

  if (!preview) {
    return <div className="rounded-[14px] bg-[#FBF8EF] px-4 py-6 text-center text-[13.5px] text-[#666666]">Loading what was flagged…</div>;
  }
  if (preview.kind === "none") {
    return <div className="rounded-[14px] bg-[#FBF8EF] px-4 py-4 text-[13.5px] text-[#555555]">{preview.reason}</div>;
  }

  return (
    <section aria-label="What was flagged" className="overflow-hidden rounded-[14px] bg-[#FBF8EF] text-[#111111]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E2D2] px-4 py-2.5">
        <span className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#8A6D00]">
          {preview.kind === "lesson"
            ? preview.step !== null
              ? `Step ${preview.step} of ${preview.stepCount}`
              : `Lesson · first step`
            : `Question${preview.status !== "published" ? ` · ${preview.status}` : ""}`}
        </span>
        <span className="flex gap-3 text-[12.5px] font-bold">
          {preview.kind === "lesson" && preview.studentLink ? (
            <Link href={preview.studentLink} target="_blank" className="text-[#1F3A68] hover:underline">
              View as student ↗
            </Link>
          ) : null}
          <Link href={preview.editorLink} className="text-[#1F3A68] hover:underline">
            Edit
          </Link>
        </span>
      </header>
      <div className="max-h-[460px] space-y-3 overflow-y-auto px-4 py-3.5 text-[14px] leading-relaxed">
        {preview.kind === "lesson" ? (
          preview.blocks.length ? preview.blocks.map((block, index) => <PreviewBlock key={index} block={block} />) : <p className="text-[#666666]">This step is empty.</p>
        ) : (
          <>
            <p className="whitespace-pre-line text-[15px] font-semibold">
              <EducationalText text={preview.prompt} />
            </p>
            {preview.figure ? <Figure src={preview.figure} caption="Shown with the question" /> : null}
            {preview.options.length ? (
              <ul className="space-y-1.5">
                {preview.options.map((option) => (
                  <li key={option.label} className={`flex gap-2 rounded-lg border px-2.5 py-1.5 ${option.correct ? "border-[#16A34A] bg-[#F0FDF4]" : "border-[#E5E5E5] bg-white"}`}>
                    <span className="font-bold">{option.label}.</span>
                    <span className="min-w-0 flex-1">
                      <EducationalText text={option.text} />
                    </span>
                    {option.correct ? <span className="text-[12px] font-extrabold text-[#15803D]">correct</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {preview.answer ? <p className="font-semibold">Answer: {preview.answer}</p> : null}
            {preview.explanation ? (
              <div className="rounded-lg border border-[#E8E2D2] bg-white px-3 py-2.5">
                <div className="mb-1 text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-[#666666]">Solution</div>
                <p className="whitespace-pre-line text-[13.5px]">
                  <EducationalText text={preview.explanation} />
                </p>
              </div>
            ) : null}
            {preview.solutionFigure ? <Figure src={preview.solutionFigure} caption="Shown with the solution" /> : null}
          </>
        )}
      </div>
    </section>
  );
}

function Figure({ src, caption }: { src: string; caption: string }) {
  return (
    <figure className="rounded-lg border border-[#E5E5E5] bg-white p-2">
      <a href={src} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Diagram" className="mx-auto h-auto w-full" />
      </a>
      <figcaption className="mt-1 text-center text-[11px] text-[#888888]">{caption}</figcaption>
    </figure>
  );
}

function PreviewBlock({ block }: { block: FlagPreviewBlock }) {
  switch (block.kind) {
    case "heading":
      return <h3 className="text-[17px] font-extrabold">{block.text}</h3>;
    case "markdown":
      return <MarkdownBlock markdown={block.markdown} size="sm" />;
    case "callout":
      return (
        <p className="rounded-lg border-l-4 border-[#E9BC3A] bg-white px-3 py-2">
          <EducationalText text={block.text} />
        </p>
      );
    case "visualizer":
      return <p className="rounded-lg border border-dashed border-[#C9BFA6] bg-white px-3 py-2 text-[13px] text-[#555555]">Interactive board: {block.title} (open “View as student” to try it)</p>;
    case "quiz":
      return (
        <div className="space-y-2 rounded-lg border border-[#E8E2D2] bg-white px-3 py-2.5">
          <div className="text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-[#666666]">{block.variant === "end" ? "End-of-lesson test" : "Mid-lesson test"}</div>
          {block.questions.map((question, index) => (
            <div key={index} className="space-y-1">
              <p className="font-semibold">
                {index + 1}. <EducationalText text={question.prompt} />
              </p>
              <ul className="space-y-0.5 pl-4 text-[13.5px]">
                {question.options.map((option, optionIndex) => (
                  <li key={optionIndex} className={optionIndex === question.answerIndex ? "font-bold text-[#15803D]" : ""}>
                    <EducationalText text={option} />
                    {optionIndex === question.answerIndex ? " ✓" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    default:
      return <p className="text-[13px] text-[#666666]">[{block.label}]</p>;
  }
}
