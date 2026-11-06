"use client";

import { useState } from "react";
import { ChevronDown, FileText, Folder } from "lucide-react";
import type { CourseMaterialEntry } from "@/lib/courseMaterials";
import { isNewRepUpload, splitTopic, timeAgo } from "@/lib/site/materialsHub";
import { CREAM, GOLD, INK } from "./ui";

/** Week tag (or course code) and the topic, from a file's title. */
export function topicParts(title: string) {
  const { code, unit, topic } = splitTopic(title);
  const tag = unit ?? (topic ? code : undefined);
  const text = topic || (unit ? code ?? title : title);
  return { code, unit, tag, text };
}

/**
 * One file on one line: a gold week tag, the topic, a green dot when new and a
 * small arrow that shows the lecturer, who uploaded it and when.
 */
export function FileLine({ entry, tone, folder = false, onOpen, last }: { entry: CourseMaterialEntry; tone: "green" | "dark"; folder?: boolean; onOpen: () => void; last?: boolean }) {
  const [open, setOpen] = useState(false);
  const { code, tag, text } = topicParts(entry.courseTitle);
  const fresh = entry.fromRep && isNewRepUpload(entry, 7);
  const fg = tone === "green" ? "#FFFFFF" : CREAM;
  const line = tone === "green" ? "rgba(255,255,255,.14)" : "rgba(233,188,58,.14)";
  const details = [
    code && tag !== code ? code : null,
    entry.description === "handwritten" ? "Handwritten notes" : entry.description === "book" ? "Book" : null,
    entry.credit ? `Lecturer: ${entry.credit}` : null,
    entry.fromRep ? (entry.uploadedBy ? `Uploaded by ${entry.uploadedBy}` : "Uploaded by your course rep") : null,
    entry.replacedAt ? `Updated${entry.changeNote ? `: ${entry.changeNote}` : ""}` : null,
    timeAgo(entry.replacedAt ?? entry.createdAt),
  ].filter(Boolean) as string[];
  return (
    <div style={{ borderBottom: last ? "none" : `1px solid ${line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 54, padding: "0 10px 0 12px" }}>
        <button type="button" onClick={onOpen} className="hub-tap" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, minHeight: 54, border: 0, padding: 0, background: "transparent", color: fg, fontFamily: "inherit", textAlign: "left", cursor: "pointer" }}>
          <span aria-hidden style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 9, background: tone === "green" ? "#FFFFFF" : "#12804A", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {folder ? <Folder size={16} color={tone === "green" ? "#12804A" : "#fff"} /> : <FileText size={16} color={tone === "green" ? "#12804A" : "#fff"} />}
          </span>
          {tag ? <span style={{ flexShrink: 0, height: 22, padding: "0 8px", borderRadius: 7, background: GOLD, color: INK, fontSize: 12, fontWeight: 900, display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}>{tag}</span> : null}
          <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 15, fontWeight: 800 }}>{text}</span>
          {fresh || entry.replacedAt ? <span aria-label={entry.replacedAt ? "Updated" : "New"} style={{ flexShrink: 0, width: 9, height: 9, borderRadius: 999, background: entry.replacedAt ? GOLD : "#3DDC84" }} /> : null}
        </button>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "Hide details" : "Show details"} style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 999, border: `1px solid ${tone === "green" ? "rgba(255,255,255,.5)" : "rgba(233,188,58,.5)"}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ChevronDown size={16} strokeWidth={2.8} color={tone === "green" ? "#fff" : GOLD} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
        </button>
      </div>
      {open ? (
        <div style={{ padding: "0 14px 12px 54px", display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: fg }}>{entry.courseTitle}</span>
          {details.map((d) => (
            <span key={d} style={{ fontSize: 12, fontWeight: 600, color: tone === "green" ? "rgba(255,255,255,.75)" : "rgba(246,239,220,.6)" }}>{d}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
