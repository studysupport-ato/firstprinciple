"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, FileText, Play } from "lucide-react";
import { programmeUploads, uploadDayGroup, uploadTimeLabel, type LoggedUpload } from "@/lib/site/materialsHub";
import { CREAM, GOLD, INK, Panel, ROW_LINE, backButtonStyle } from "./ui";
import { useHubChoice, useHubData } from "./useHub";

const GREEN = "#12804A";
const FRESH_MS = 2 * 86_400_000;

function href(u: LoggedUpload) {
  return `/materials-hub?course=${encodeURIComponent(u.course.id)}&view=${u.kind}${u.kind === "videos" ? "" : "&folder=rep"}`;
}

function Row({ u, last, compact }: { u: LoggedUpload; last: boolean; compact?: boolean }) {
  const fresh = Date.now() - Date.parse(u.entry.createdAt) < FRESH_MS;
  const Icon = u.kind === "books" ? BookOpen : u.kind === "videos" ? Play : FileText;
  return (
    <Link href={href(u)} className="hub-tap hub-dark-row" style={{ display: "flex", alignItems: "center", gap: 12, minHeight: compact ? 60 : 66, padding: "10px 14px", borderBottom: last ? "none" : `1px solid ${ROW_LINE}`, color: CREAM, textDecoration: "none" }}>
      <span aria-hidden style={{ width: compact ? 36 : 40, height: compact ? 36 : 40, flexShrink: 0, borderRadius: 11, background: fresh ? GREEN : "#2A251C", color: fresh ? "#fff" : GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={compact ? 16 : 18} strokeWidth={2.3} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: compact ? 14 : 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.entry.courseTitle}</span>
        <span style={{ display: "block", marginTop: 2, fontSize: 12, color: "rgba(246,239,220,.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {[u.course.courseTitle, u.year ? `Year ${u.year}` : null, u.entry.credit].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: "rgba(246,239,220,.55)", whiteSpace: "nowrap" }}>{compact && uploadDayGroup(u.entry.createdAt) !== "Today" ? uploadDayGroup(u.entry.createdAt).replace("This week", uploadTimeLabel(u.entry.createdAt)).replace("Earlier", uploadTimeLabel(u.entry.createdAt)) : uploadTimeLabel(u.entry.createdAt)}</span>
    </Link>
  );
}

/** The newest uploads for the student's programme, with a link to the full log. */
export function RecentUploadsCard({ departmentId, style }: { departmentId: string; style?: React.CSSProperties }) {
  const data = useHubData();
  const uploads = useMemo(() => programmeUploads(data.entries, departmentId).slice(0, 5), [data.entries, departmentId]);
  return (
    <div className="hub-row" style={{ animationDelay: "200ms", ...style }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: "-.03em" }}>Recent uploads</h3>
        {uploads.length ? <Link href="/materials-hub?view=recent" style={{ fontSize: 13, fontWeight: 800, color: INK, textDecoration: "underline", textUnderlineOffset: 3 }}>See all</Link> : null}
      </div>
      {uploads.length ? (
        <Panel style={{ marginTop: 10 }}>
          {uploads.map((u, i) => <Row key={u.entry.id} u={u} last={i === uploads.length - 1} compact />)}
        </Panel>
      ) : (
        <p style={{ margin: "10px 0 0", borderRadius: 18, border: "2px dashed rgba(26,24,20,.3)", padding: "16px 14px", fontSize: 13, fontWeight: 700, color: "rgba(26,24,20,.7)" }}>New slides from your programme’s course reps will show up here.</p>
      )}
    </div>
  );
}

/** Full log: every recent upload for the programme, grouped by day, filterable by year. */
export function RecentUploadsView() {
  const data = useHubData();
  const { choice } = useHubChoice();
  const [year, setYear] = useState<number | null>(null);
  const department = data.departments.find((d) => d.id === choice?.departmentId);
  const all = useMemo(() => (choice ? programmeUploads(data.entries, choice.departmentId, 120) : []), [data.entries, choice]);
  const shown = year ? all.filter((u) => u.year === year) : all;
  const groups = useMemo(() => {
    const map = new Map<string, LoggedUpload[]>();
    for (const u of shown) {
      const g = uploadDayGroup(u.entry.createdAt);
      map.set(g, [...(map.get(g) ?? []), u]);
    }
    return [...map.entries()];
  }, [shown]);

  return (
    <div className="hub-row" style={{ maxWidth: 760 }}>
      <Link href="/" className="hub-tap" style={backButtonStyle}><ArrowLeft size={22} strokeWidth={2.8} aria-hidden />Home</Link>
      {!choice || !department ? (
        <p style={{ marginTop: 16, fontSize: 15, fontWeight: 700 }}>Pick your programme on the home page first.</p>
      ) : (
        <>
          <p style={{ margin: "14px 0 0", fontSize: 11, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(26,24,20,.65)" }}>{department.name}</p>
          <h1 style={{ margin: "4px 0 0", fontSize: 36, fontWeight: 900, letterSpacing: "-.035em" }}>Recent uploads</h1>
          <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[null, 1, 2, 3, 4].map((y) => (
              <button key={String(y)} type="button" onClick={() => setYear(y)} className="hub-tap" style={{ height: 32, padding: "0 13px", border: 0, borderRadius: 999, background: year === y ? INK : "rgba(26,24,20,.1)", color: year === y ? GOLD : INK, fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                {y ? `Year ${y}` : "All years"}
              </button>
            ))}
          </div>
          {groups.length === 0 ? (
            <p style={{ marginTop: 18, borderRadius: 20, border: "2px dashed rgba(26,24,20,.35)", padding: "26px 16px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "rgba(26,24,20,.7)" }}>Nothing uploaded {year ? `for Year ${year} ` : ""}yet.</p>
          ) : (
            groups.map(([label, list]) => (
              <section key={label}>
                <p style={{ margin: "20px 4px 8px", fontSize: 12, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(26,24,20,.65)" }}>{label}</p>
                <Panel>{list.map((u, i) => <Row key={u.entry.id} u={u} last={i === list.length - 1} />)}</Panel>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}
