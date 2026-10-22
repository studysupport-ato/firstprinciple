"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FlagPreviewCard } from "@/components/admin/FlagPreviewCard";
import { listFlagsAction, updateFlagGroupAction } from "@/lib/flags/actions";
import { FLAG_KIND_LABEL, type FlagRecord, type FlagStatus, type FlagTargetType } from "@/lib/flags/shared";

type Tab = "open" | "in_progress" | "done";
type Kind = "all" | "lesson" | "question" | "media";

interface FlagGroup {
  key: string;
  type: FlagTargetType;
  title: string;
  location: string;
  link: string | null;
  courseId: string | null;
  reports: FlagRecord[];
  status: Tab;
  latest: string;
  topReason: string;
}

function ago(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

function groupStatus(reports: FlagRecord[]): Tab {
  if (reports.some((report) => report.status === "open")) return "open";
  if (reports.some((report) => report.status === "in_progress")) return "in_progress";
  return "done";
}

function groupFlags(flags: FlagRecord[]): FlagGroup[] {
  const byKey = new Map<string, FlagRecord[]>();
  for (const flag of flags) byKey.set(flag.targetKey, [...(byKey.get(flag.targetKey) ?? []), flag]);
  return [...byKey.entries()]
    .map(([key, reports]) => {
      const live = reports.filter((report) => report.status === "open" || report.status === "in_progress");
      const shown = live.length ? live : reports;
      const counts = new Map<string, number>();
      for (const report of shown) counts.set(report.reason, (counts.get(report.reason) ?? 0) + 1);
      const topReason = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
      const first = reports[0];
      return {
        key,
        type: first.targetType,
        title: first.title,
        location: first.location,
        link: first.link,
        courseId: first.courseId,
        reports: shown,
        status: groupStatus(reports),
        latest: shown[0]?.createdAt ?? first.createdAt,
        topReason,
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length || b.latest.localeCompare(a.latest));
}

const KIND_STYLE: Record<FlagTargetType, string> = {
  lesson: "bg-[#F2E4B8] text-[#5A4300]",
  question: "bg-[#DCE6F7] text-[#1F3A68]",
  video: "bg-[#F6D5DC] text-[#6B1A2B]",
  playlist: "bg-[#F6D5DC] text-[#6B1A2B]",
};

function courseOf(group: FlagGroup) {
  if (group.courseId) return group.courseId.replace(/-/g, " ").toUpperCase();
  return group.location.split(" · ")[0] || "Other";
}

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<FlagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("open");
  const [kind, setKind] = useState<Kind>("all");
  const [course, setCourse] = useState("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const result = await listFlagsAction();
    if (result.ok) {
      setFlags(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const groups = useMemo(() => groupFlags(flags), [flags]);
  const courses = useMemo(() => [...new Set(groups.map(courseOf))].sort(), [groups]);
  const counts = useMemo(
    () => ({
      open: groups.filter((group) => group.status === "open").length,
      in_progress: groups.filter((group) => group.status === "in_progress").length,
      fixedThisWeek: groups.filter((group) => group.status === "done" && group.reports.some((report) => report.status === "fixed" && report.resolvedAt && Date.now() - new Date(report.resolvedAt).getTime() < 7 * 86400000)).length,
    }),
    [groups],
  );
  const inTab = groups.filter((group) => group.status === tab && (course === "all" || courseOf(group) === course));
  const kindCount = (value: Kind) => inTab.filter((group) => matchesKind(group, value)).length;
  const visible = inTab.filter((group) => matchesKind(group, kind));
  const selected = visible.find((group) => group.key === selectedKey) ?? visible[0] ?? null;

  useEffect(() => {
    setResolution("");
    setNotify(true);
  }, [selected?.key]);

  async function act(status: FlagStatus, message: string) {
    if (!selected) return;
    setBusy(true);
    const result = await updateFlagGroupAction(selected.key, { status, resolution, notify });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(message);
    setSelectedKey(null);
    await refresh();
  }

  const tabButton = (value: Tab, label: string) => (
    <button
      key={value}
      type="button"
      role="tab"
      aria-selected={tab === value}
      onClick={() => {
        setTab(value);
        setSelectedKey(null);
      }}
      className={`min-h-10 rounded-full px-4 text-[13.5px] font-bold transition ${tab === value ? "bg-[#111111] text-white" : "text-[#111111] hover:bg-white/60"}`}
    >
      {label}
    </button>
  );

  const kindButton = (value: Kind, label: string) => (
    <button
      key={value}
      type="button"
      aria-pressed={kind === value}
      onClick={() => setKind(value)}
      className={`min-h-10 rounded-full px-3.5 text-[13.5px] transition ${kind === value ? "border-[1.5px] border-[#111111] bg-white font-bold" : "border border-[#D6D0C4] font-semibold hover:border-[#111111]"}`}
    >
      {label}
      {value !== "all" ? ` · ${kindCount(value)}` : ""}
    </button>
  );

  return (
    <div>
      <AdminPageHeader title="Flags" description="What students reported on lessons, questions, videos and playlists. Reports on the same item are grouped together." breadcrumbs={[{ label: "Flags" }]} />

      {notice ? <div role="status" className="mb-4 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm font-semibold text-[#15803D]">{notice}</div> : null}
      {error ? <div role="alert" className="mb-4 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#B91C1C]">{error}</div> : null}

      <div className="mb-5 flex flex-wrap gap-3">
        {[
          ["Open", counts.open],
          ["In progress", counts.in_progress],
          ["Fixed this week", counts.fixedThisWeek],
        ].map(([label, value]) => (
          <div key={label} className="min-w-[120px] rounded-2xl border border-[#E5E5E5] bg-white px-5 py-3">
            <div className="text-[12.5px] font-bold text-[#666666]">{label}</div>
            <div className="text-[28px] font-extrabold leading-tight">{value}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div role="tablist" aria-label="Status" className="flex gap-1 rounded-full bg-[#EDEBE5] p-1">
          {tabButton("open", `Open · ${counts.open}`)}
          {tabButton("in_progress", `In progress · ${counts.in_progress}`)}
          {tabButton("done", "Fixed or closed")}
        </div>
        <div role="group" aria-label="Kind" className="flex flex-wrap gap-1.5">
          {kindButton("all", "All")}
          {kindButton("lesson", "Lessons")}
          {kindButton("question", "Questions")}
          {kindButton("media", "Videos and playlists")}
        </div>
        <label className="ml-auto flex items-center gap-2 text-[13.5px] font-semibold">
          Course
          <select value={course} onChange={(event) => setCourse(event.target.value)} className="min-h-10 rounded-xl border border-[#D6D0C4] bg-white px-2.5 text-[13.5px] font-semibold">
            <option value="all">All courses</option>
            {courses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-[#666666]">Loading flags…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-[20px] border border-[#E5E5E5] bg-white px-6 py-10 text-center text-[15px] text-[#666666]">
          {tab === "open" ? "No open flags. Nothing waiting on you." : tab === "in_progress" ? "Nothing in progress." : "No fixed or closed flags yet."}
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-4">
          <section aria-label="Flagged items" className="min-w-0 flex-[999_1_460px] overflow-hidden rounded-[20px] border border-[#E5E5E5] bg-white">
            {visible.map((group) => {
              const on = selected?.key === group.key;
              return (
                <button
                  key={group.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelectedKey(group.key)}
                  className={`flex w-full items-start gap-4 border-b border-[#EEEBE3] px-5 py-4 text-left last:border-b-0 ${on ? "bg-[#FBF3DA] shadow-[inset_4px_0_0_#E9BC3A]" : "bg-white hover:bg-[#FAFAF8]"}`}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-extrabold uppercase tracking-[0.06em] ${KIND_STYLE[group.type]}`}>{FLAG_KIND_LABEL[group.type]}</span>
                      <span className="text-[12.5px] font-bold text-[#666666]">{group.location}</span>
                    </span>
                    <span className="text-[15.5px] font-bold">{group.title}</span>
                    {group.reports[0]?.note ? <span className="truncate text-[13.5px] text-[#555555]">“{group.reports[0].note}”</span> : null}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="rounded-full bg-[#FFF1EA] px-2.5 py-1 text-[12.5px] font-extrabold text-[#8F3414]">{group.topReason}</span>
                    <span className="text-[12.5px] text-[#666666]">
                      {group.reports.length} {group.reports.length === 1 ? "report" : "reports"} · {ago(group.latest)}
                    </span>
                  </span>
                </button>
              );
            })}
          </section>

          {selected ? (
            <aside aria-label="Selected flag" className="flex min-w-0 max-w-[580px] flex-[1_1_420px] flex-col gap-4 rounded-[20px] bg-[#1A1814] p-5 text-[#F6EFDC]">
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#E9BC3A]">
                  {FLAG_KIND_LABEL[selected.type]} · {selected.location}
                </span>
                <h2 className="text-[22px] font-extrabold leading-tight">{selected.title}</h2>
                {selected.link ? (
                  <Link href={selected.link} className="self-start text-[14px] font-bold text-[#E9BC3A] hover:underline">
                    Open in the editor →
                  </Link>
                ) : null}
              </div>

              <FlagPreviewCard targetKey={selected.key} />

              <div className="flex flex-col gap-2.5">
                <div className="text-[14px] font-bold">
                  {selected.reports.length} {selected.reports.length === 1 ? "report" : "reports"}
                </div>
                {selected.reports.map((report) => (
                  <div key={report.id} className="flex flex-col gap-1.5 rounded-[14px] border border-[#3A3428] px-3.5 py-3">
                    <div className="flex justify-between gap-2 text-[12.5px] text-[#C9BFA6]">
                      <span className="font-bold text-[#F6EFDC]">{report.reporterName || (report.signedIn ? "Student" : "Signed-out visitor")}</span>
                      <span>{ago(report.createdAt)}</span>
                    </div>
                    <span className="self-start rounded-full bg-[#F09A73]/15 px-2.5 py-0.5 text-[12px] font-extrabold text-[#FFC4A8]">{report.reason}</span>
                    {report.note ? <p className="whitespace-pre-line text-[14px] leading-relaxed">{report.note}</p> : null}
                    {report.resolution ? <p className="text-[13px] text-[#C9BFA6]">Fix: {report.resolution}</p> : null}
                  </div>
                ))}
              </div>

              {selected.status === "done" ? (
                <button type="button" disabled={busy} onClick={() => void act("open", "Reopened.")} className="min-h-[46px] rounded-full border border-[#F6EFDC]/40 text-[14px] font-bold disabled:opacity-50">
                  Reopen
                </button>
              ) : (
                <>
                  <label className="flex flex-col gap-1.5 text-[14px] font-bold">
                    What did you change?
                    <textarea
                      value={resolution}
                      onChange={(event) => setResolution(event.target.value)}
                      rows={2}
                      maxLength={1000}
                      placeholder="e.g. Moved 0 out of the naturals circle."
                      className="resize-none rounded-xl border border-[#5A4F3A] bg-[#26231C] px-3 py-2.5 text-[14px] font-normal text-[#F6EFDC] placeholder:text-[#8F8671] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9BC3A]"
                    />
                  </label>
                  <label className="flex items-center gap-2.5 text-[14px]">
                    <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} className="h-[18px] w-[18px] accent-[#E9BC3A]" />
                    Tell the signed-in students who flagged it
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    <button type="button" disabled={busy} onClick={() => void act("dismissed", "Closed as not a problem.")} className="min-h-[46px] flex-[1_1_120px] rounded-full border border-[#F6EFDC]/40 text-[14px] font-bold disabled:opacity-50">
                      Not a problem
                    </button>
                    {selected.status === "open" ? (
                      <button type="button" disabled={busy} onClick={() => void act("in_progress", "Moved to In progress.")} className="min-h-[46px] flex-[1_1_120px] rounded-full border border-[#F6EFDC]/40 text-[14px] font-bold disabled:opacity-50">
                        Working on it
                      </button>
                    ) : null}
                    <button type="button" disabled={busy} onClick={() => void act("fixed", notify ? "Marked fixed. The students who flagged it will be told." : "Marked fixed.")} className="min-h-[46px] flex-[2_1_160px] rounded-full bg-[#E9BC3A] text-[14.5px] font-extrabold text-[#1A1814] disabled:opacity-50">
                      Mark fixed
                    </button>
                  </div>
                </>
              )}
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}

function matchesKind(group: FlagGroup, kind: Kind) {
  if (kind === "all") return true;
  if (kind === "media") return group.type === "video" || group.type === "playlist";
  return group.type === kind;
}
