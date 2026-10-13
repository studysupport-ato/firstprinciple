"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";

import type { ContentBlock } from "@/lib/content/types";

type Side = "main" | "side";

/** One line that tells the blocks apart on the board. */
export function blockSummary(block: ContentBlock): string {
  switch (block.type) {
    case "heading":
      return block.text;
    case "text":
      return block.body;
    case "markdown":
      return block.markdown.split("\n").find((line) => line.trim())?.replace(/^#+\s*/, "") ?? "Markdown";
    case "math":
      return block.expression;
    case "worked-example":
      return `${block.title}: ${block.prompt}`;
    case "callout":
      return block.text;
    case "image":
      return block.alt || "Image";
    case "video":
      return block.title;
    case "interactive":
      return `Interactive: ${block.provider}`;
    case "visualizer":
      return block.title || "Custom visualizer";
    case "question":
      return `Question ${block.questionId}`;
    case "quiz":
      return `${block.variant === "end" ? "End" : "Mid"}-lesson test, ${block.questions.length} question(s)`;
    default:
      return "Block";
  }
}

export function lessonPages(blocks: ContentBlock[]) {
  return Array.from(new Set(blocks.map((block) => block.step ?? 1))).sort((a, b) => a - b);
}

const sideOf = (block: ContentBlock): Side => (block.pane === "side" ? "side" : "main");

const iconButton =
  "flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-1.5 text-[11px] font-bold text-[#333] transition hover:border-[#111] disabled:cursor-not-allowed disabled:opacity-30";

/**
 * The lesson laid out as students see it: one page at a time, its left and right sides.
 * Each block can move to the other side, to the previous or next page, or up and down its side.
 */
export function LessonPageLayout({
  blocks,
  page,
  onPageChange,
  onBlocksChange,
  onSelect,
  selectedId,
}: {
  blocks: ContentBlock[];
  page: number;
  onPageChange: (page: number) => void;
  onBlocksChange: (blocks: ContentBlock[], notice?: string) => void;
  onSelect: (blockId: string) => void;
  selectedId: string | null;
}) {
  const pages = lessonPages(blocks);
  // A page that has just been emptied (or a brand-new one) still shows, so the board never jumps.
  const shownPages = pages.includes(page) ? pages : [...pages, page].sort((a, b) => a - b);
  const pageIndex = shownPages.indexOf(page);
  const onPage = blocks.filter((block) => (block.step ?? 1) === page);
  const hasRight = onPage.some((block) => sideOf(block) === "side");

  function patch(blockId: string, change: Partial<Pick<ContentBlock, "step" | "pane">>, notice: string) {
    onBlocksChange(
      blocks.map((block) => (block.id === blockId ? ({ ...block, ...change } as ContentBlock) : block)),
      notice,
    );
  }

  function toPage(block: ContentBlock, direction: -1 | 1) {
    const current = block.step ?? 1;
    const at = pages.indexOf(current);
    let target: number;
    if (direction === 1) target = at >= 0 && at < pages.length - 1 ? pages[at + 1] : current + 1;
    else target = at > 0 ? pages[at - 1] : current - 1;
    if (target < 1) return;
    const label = shownPages.includes(target) ? `page ${shownPages.indexOf(target) + 1}` : "a new page";
    patch(block.id, { step: target }, `Moved to ${label}.`);
  }

  function shiftWithinSide(block: ContentBlock, direction: -1 | 1) {
    const index = blocks.findIndex((item) => item.id === block.id);
    let swap = index + direction;
    while (swap >= 0 && swap < blocks.length && ((blocks[swap].step ?? 1) !== page || sideOf(blocks[swap]) !== sideOf(block))) swap += direction;
    if (swap < 0 || swap >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[swap]] = [next[swap], next[index]];
    onBlocksChange(next);
  }

  function column(side: Side) {
    const items = onPage.filter((block) => sideOf(block) === side);
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-xl border border-dashed border-[#D9D4C7] bg-[#FFFDF6] p-2.5">
        <div className="flex items-baseline justify-between px-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#666]">{side === "main" ? "Left side" : "Right side"}</span>
          <span className="text-[11px] text-[#999]">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="px-1 py-3 text-[12px] leading-5 text-[#999]">
            {side === "side" ? "Empty. The left side fills the whole page until something is moved here." : "Nothing on the left of this page."}
          </p>
        ) : null}
        {items.map((block, index) => {
          const selected = block.id === selectedId;
          return (
            <div key={block.id} className={`rounded-lg border bg-white p-2 ${selected ? "border-[#111]" : "border-[#E5E5E5]"}`}>
              <button type="button" onClick={() => onSelect(block.id)} className="block w-full text-left">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A6D00]">{block.type}</span>
                <span className="mt-0.5 line-clamp-2 block text-[13px] leading-5 text-[#111]">{blockSummary(block) || "Empty block"}</span>
              </button>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => toPage(block, -1)} disabled={(block.step ?? 1) <= 1 && pageIndex === 0} className={iconButton} aria-label="Move to the previous page" title="Previous page">
                  <ChevronLeft size={14} /> Page
                </button>
                <button type="button" onClick={() => toPage(block, 1)} className={iconButton} aria-label="Move to the next page" title="Next page">
                  Page <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => patch(block.id, { pane: side === "main" ? "side" : "main" }, side === "main" ? "Moved to the right side." : "Moved to the left side.")}
                  className={iconButton}
                  aria-label={side === "main" ? "Move to the right side" : "Move to the left side"}
                  title={side === "main" ? "Move to the right side" : "Move to the left side"}
                >
                  {side === "main" ? (
                    <>
                      Right <ArrowRight size={13} />
                    </>
                  ) : (
                    <>
                      <ArrowLeft size={13} /> Left
                    </>
                  )}
                </button>
                <span className="flex-1" />
                <button type="button" onClick={() => shiftWithinSide(block, -1)} disabled={index === 0} className={iconButton} aria-label="Move up this side">
                  <ArrowUp size={13} />
                </button>
                <button type="button" onClick={() => shiftWithinSide(block, 1)} disabled={index === items.length - 1} className={iconButton} aria-label="Move down this side">
                  <ArrowDown size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">Page layout</span>
        <span className="text-[11px] text-[#666]">{hasRight ? "This page is split: left and right." : "This page uses the full width."}</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Lesson pages">
        {shownPages.map((value, index) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={value === page}
            onClick={() => onPageChange(value)}
            className={`h-8 rounded-full px-3 text-[12px] font-bold transition ${value === page ? "bg-[#111] text-white" : "border border-[#E5E5E5] bg-white text-[#111] hover:border-[#111]"}`}
          >
            Page {index + 1}
            <span className="ml-1.5 font-normal opacity-60">{blocks.filter((block) => (block.step ?? 1) === value).length}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange((pages[pages.length - 1] ?? 0) + 1)}
          className="h-8 rounded-full border border-dashed border-[#BBB] px-3 text-[12px] font-bold text-[#666] hover:border-[#111]"
        >
          + New page
        </button>
      </div>
      {onPage.length === 0 ? (
        <p className="mb-2 rounded-lg bg-white px-3 py-2 text-[12px] text-[#666]">
          This page is empty. Use “Page ▸” on a block on the page before it to bring it here, or add a block while this page is open.
        </p>
      ) : null}
      <div className="flex flex-col gap-2.5 md:flex-row">
        {column("main")}
        {column("side")}
      </div>
    </div>
  );
}
