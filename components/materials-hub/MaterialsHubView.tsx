"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Check, Download, ExternalLink, FileText, Folder, Link2, Play, X } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import {
  driveDownloadUrl,
  driveFolderUrl,
  driveMediaUrl,
  drivePreviewUrl,
  formatBytes,
  generalTwin,
  groupCourseMaterials,
  isDownloadable,
  isNewRepUpload,
  timeAgo,
  listDriveFolder,
  parseDriveFileId,
  parseDriveFolderId,
  shortProgramme,
  tidyFileName,
  type DriveItem,
} from "@/lib/site/materialsHub";
import { getEntryType, type CourseMaterialEntry } from "@/lib/courseMaterials";
import { BROWN, CREAM, Overlay, OVERLAY_Z, Eyebrow, GOLD, HubStyles, INK, MUTED, Panel, Pill, RoundChevron, Sheet, SOFT, YT_RED, BlueprintCard, goldPlate, ROW_LINE, backButtonStyle, backLabelStyle, goldGround, hubFont, panelShadow } from "./ui";
import { useHubChoice, useHubData } from "./useHub";
import { SlideDeck, preloadSlides } from "./SlideDeck";
import { CourseYouTube } from "@/components/course-materials/CourseDetail";
import { deriveMaterialType } from "@/lib/courseMaterialsDisplay";

type View = "course" | "slides" | "videos" | "books";

export function MaterialsHubView() {
  const params = useSearchParams();
  const courseId = params.get("course") ?? "";
  const viewParam = params.get("view");
  const view: View = viewParam === "slides" || viewParam === "videos" || viewParam === "books" ? viewParam : "course";
  const folderId = params.get("folder");
  const data = useHubData();
  const course = data.entries.find((e) => e.id === courseId && getEntryType(e) === "course");
  const groups = useMemo(() => {
    const own = data.entries.find((e) => e.id === courseId);
    const twin = own ? generalTwin(data.entries, own) : undefined;
    return groupCourseMaterials(data.entries, twin ? [courseId, twin.id] : courseId);
  }, [data.entries, courseId]);

  return (
    <div style={{ ...goldGround, ...hubFont, color: INK, minHeight: "100dvh" }}>
      <HubStyles />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 18px 40px" }}>
        {data.status === "loading" ? <p style={{ fontWeight: 700 }}>Loading…</p> : null}
        {data.status === "error" ? <p style={{ fontWeight: 700 }}>Course materials could not load. Refresh to try again.</p> : null}
        {data.status === "ready" && !course ? (
          <div>
            <BackLink href="/">Home</BackLink>
            <p style={{ fontWeight: 700 }}>This course is not available.</p>
          </div>
        ) : null}
        {course ? (
          view === "course" ? (
            <CourseView course={course} groups={groups} />
          ) : view === "slides" ? (
            <DriveMaterials kind="slides" course={course} slides={groups.slides} folderId={folderId} />
          ) : view === "videos" ? (
            <VideosView course={course} videos={groups.videos} />
          ) : (
            <BooksView course={course} books={groups.books} folderId={folderId} />
          )
        ) : null}
      </div>
      {course && view !== "course" ? <SignUpPrompt /> : null}
    </div>
  );
}

function hubHref(courseId: string, view?: View, folder?: string) {
  const q = new URLSearchParams({ course: courseId });
  if (view && view !== "course") q.set("view", view);
  if (folder) q.set("folder", folder);
  return `/materials-hub?${q}`;
}

function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="hub-tap" style={backButtonStyle}>
      <ArrowLeft size={22} strokeWidth={2.8} aria-hidden style={{ flexShrink: 0 }} />
      <span style={backLabelStyle}>{children}</span>
    </Link>
  );
}

/** The student's programme name, for the line drawing on the dark cards. */
function useProgrammeName() {
  const { choice } = useHubChoice();
  const data = useHubData();
  return data.departments.find((d) => d.id === choice?.departmentId)?.name;
}

function courseLabel(course: CourseMaterialEntry) {
  return course.courseCode ? `${course.courseCode} · ${course.courseTitle}` : course.courseTitle;
}

/* ─── Course ────────────────────────────────────────────────────────── */

function CourseView({ course, groups }: { course: CourseMaterialEntry; groups: ReturnType<typeof groupCourseMaterials> }) {
  const { choice } = useHubChoice();
  const data = useHubData();
  const department = data.departments.find((d) => d.id === choice?.departmentId);
  const slidesCount = groups.slides.length;
  const repCount = [...groups.slides, ...groups.books, ...groups.videos].filter((m) => isNewRepUpload(m)).length;
  const rows: Array<{ view: View; title: string; sub: string; tile: React.ReactNode }> = [
    { view: "slides", title: "Slides", sub: slidesCount ? (slidesCount === 1 && parseDriveFolderId(groups.slides[0].url) ? "PDF folder" : `${slidesCount} ${slidesCount === 1 ? "item" : "items"}`) : "Coming soon", tile: <Tile plate><FileText size={22} color={INK} strokeWidth={2.2} /></Tile> },
    { view: "videos", title: "YouTube playlist", sub: groups.videos.length ? (groups.videos.every((v) => /^\s*chapter\s*\d/i.test(v.courseTitle)) ? `${groups.videos.length} ${groups.videos.length === 1 ? "chapter" : "chapters"}` : `${groups.videos.length} ${groups.videos.length === 1 ? "playlist" : "playlists"}`) : "Coming soon", tile: <Tile bg={YT_RED}><Play size={20} color="#fff" fill="#fff" /></Tile> },
    { view: "books", title: "Books", sub: groups.books.length ? `${groups.books.length} ${groups.books.length === 1 ? "book" : "books"}` : "Coming soon", tile: <Tile bg={CREAM}><BookOpen size={20} color={INK} strokeWidth={2.2} /></Tile> },
  ];
  return (
    <div className="hub-row">
      <BackLink href="/">Your courses</BackLink>
      <BlueprintCard department={department?.name} style={{ marginTop: 10 }}>
        {course.courseCode ? <span style={{ display: "inline-flex", alignItems: "center", height: 24, padding: "0 9px", borderRadius: 7, ...goldPlate, fontSize: 11, fontWeight: 900, letterSpacing: ".06em" }}>{course.courseCode}</span> : null}
        <h1 style={{ margin: course.courseCode ? "14px 0 0" : 0, maxWidth: "58%", fontSize: 32, fontWeight: 800, letterSpacing: "-.035em", lineHeight: 1, color: CREAM }}>{course.courseTitle}</h1>
        {repCount ? (
          <span style={{ marginTop: 12, display: "inline-flex", alignItems: "center", height: 26, padding: "0 10px", borderRadius: 999, background: "#12804A", color: "#fff", fontSize: 11, fontWeight: 900, letterSpacing: ".05em" }}>{repCount} NEW FROM YOUR COURSE REP</span>
        ) : null}
      </BlueprintCard>
      <Eyebrow style={{ margin: "24px 4px 10px", color: "rgba(26,24,20,.65)" }}>Materials</Eyebrow>
      <Panel>
        {rows.map((row, i) => (
          <Link key={row.view} href={hubHref(course.id, row.view)} className="hub-row hub-tap hub-dark-row" style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 76, padding: "12px 14px", borderBottom: `1px solid ${ROW_LINE}`, textDecoration: "none", animationDelay: `${60 + i * 70}ms` }}>
            {row.tile}
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: CREAM }}>{row.title}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(246,239,220,.5)" }}>{row.sub}</span>
            </span>
            <RoundChevron />
          </Link>
        ))}
        {groups.other.map((entry) => (
          <a key={entry.id} href={entry.url} target="_blank" rel="noopener noreferrer" className="hub-tap hub-dark-row" style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 72, padding: "12px 14px", borderBottom: `1px solid ${ROW_LINE}`, textDecoration: "none" }}>
            <Tile bg="#2A251C"><Link2 size={20} color={GOLD} /></Tile>
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: CREAM }}>{entry.courseTitle}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(246,239,220,.5)" }}>Opens a link</span>
            </span>
            <ExternalLink size={16} color="rgba(246,239,220,.55)" />
          </a>
        ))}
      </Panel>
    </div>
  );
}

function Tile({ bg, plate, children, size = 48 }: { bg?: string; plate?: boolean; children: React.ReactNode; size?: number }) {
  return <span aria-hidden style={{ width: size, height: size, flexShrink: 0, borderRadius: size > 42 ? 14 : 11, display: "flex", alignItems: "center", justifyContent: "center", ...(plate ? goldPlate : { background: bg }), ...(bg === "#2A251C" ? { border: "1px solid rgba(233,188,58,.25)" } : null) }}>{children}</span>;
}

/** Back button, then a dark blueprint card naming the course and the kind of material. */
function ListHeader({ course, title, sub, children, back }: { course: CourseMaterialEntry; title: string; sub?: string; children?: React.ReactNode; back?: React.ReactNode }) {
  const programme = useProgrammeName();
  return (
    <>
      {back ?? <BackLink href={hubHref(course.id)}>{courseLabel(course)}</BackLink>}
      <BlueprintCard department={programme} compact style={{ marginTop: 10 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", color: GOLD }}>{course.courseCode ? `${course.courseCode} · ` : ""}{title}</p>
        <h1 style={{ margin: "6px 0 0", maxWidth: "60%", fontSize: 30, fontWeight: 800, letterSpacing: "-.035em", lineHeight: 1, color: CREAM }}>{sub ?? title}</h1>
        {children}
      </BlueprintCard>
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ marginTop: 16, borderRadius: 24, border: "2px dashed rgba(26,24,20,.35)", padding: "30px 18px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "rgba(26,24,20,.7)" }}>{text}</div>;
}

/* ─── Slides ────────────────────────────────────────────────────────── */

type DriveKind = "slides" | "books";
const KIND_TITLE: Record<DriveKind, string> = { slides: "Slides", books: "Books" };

/** Slides and books: Drive folders are listed and opened inside the site. */
function DriveMaterials({ kind, course, slides, folderId }: { kind: DriveKind; course: CourseMaterialEntry; slides: CourseMaterialEntry[]; folderId: string | null }) {
  // One Drive folder: list its files straight away. A sub-folder: list that one.
  const driveRoots = slides.map((s) => parseDriveFolderId(s.url)).filter((id): id is string => Boolean(id));
  const activeFolder = folderId ?? (slides.length === 1 && driveRoots.length === 1 ? driveRoots[0] : null);
  const [viewing, setViewing] = useState<DriveItem | null>(null);
  useEffect(() => preloadSlides(), []);

  if (activeFolder) {
    return (
      <div className="hub-row">
        <DriveFolder kind={kind} course={course} folderId={activeFolder} isRoot={!folderId} hidden={slides.flatMap((m) => m.hiddenFiles ?? [])} />
      </div>
    );
  }
  return (
    <div className="hub-row">
      <ListHeader course={course} title={KIND_TITLE[kind]} sub={slides.length ? `${slides.length} ${slides.length === 1 ? "item" : "items"}` : KIND_TITLE[kind]} />
      {slides.length === 0 ? <Empty text={`Your course rep hasn’t uploaded ${kind === "books" ? "books" : "slides"} yet.`} /> : null}
      {(() => {
        const fromRep = slides.filter((m) => m.fromRep).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const bank = slides.filter((m) => !m.fromRep);
        const rows = (list: CourseMaterialEntry[], rep: boolean) => (
          <Panel style={{ marginTop: 10, ...(rep ? { border: "2px solid #12804A" } : {}) }}>
            {list.map((s, i) => {
              const folder = parseDriveFolderId(s.url);
              const fileId = parseDriveFileId(s.url);
              const fresh = isNewRepUpload(s);
              const style = { display: "flex", alignItems: "center", gap: 14, minHeight: 64, padding: "10px 12px", borderBottom: i < list.length - 1 ? `1px solid ${ROW_LINE}` : "none", textDecoration: "none", animationDelay: `${i * 50}ms` } as const;
              const body = (
                <>
                  <Tile bg={rep ? "#12804A" : "#2A251C"} size={40}>{folder ? <Folder size={18} color={rep ? "#fff" : GOLD} /> : <FileText size={18} color={rep ? "#fff" : GOLD} />}</Tile>
                  <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: CREAM }}>{s.courseTitle}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12, fontWeight: 600, color: "rgba(246,239,220,.5)" }}>
                      {fresh ? <span style={{ height: 18, padding: "0 7px", borderRadius: 999, background: "#12804A", color: "#fff", fontSize: 10, fontWeight: 900, letterSpacing: ".06em", display: "inline-flex", alignItems: "center" }}>NEW</span> : null}
                      {rep ? `Course rep · ${timeAgo(s.createdAt)}` : folder ? "Folder" : fileId ? "PDF" : "Opens a link"}
                    </span>
                  </span>
                  {folder || fileId ? <RoundChevron /> : <ExternalLink size={16} color="rgba(246,239,220,.55)" />}
                </>
              );
              if (folder) return <Link key={s.id} href={hubHref(course.id, kind, folder)} className="hub-row hub-tap hub-dark-row" style={style}>{body}</Link>;
              if (fileId) return <button key={s.id} type="button" onPointerEnter={() => preloadSlides(fileId)} onTouchStart={() => preloadSlides(fileId)} onClick={() => setViewing({ id: fileId, name: s.courseTitle, mimeType: "application/pdf", size: null, isFolder: false })} className="hub-row hub-tap hub-dark-row" style={{ ...style, width: "100%", border: 0, borderBottom: style.borderBottom, background: "transparent", textAlign: "left", fontFamily: "inherit", cursor: "pointer" }}>{body}</button>;
              return <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="hub-row hub-tap hub-dark-row" style={style}>{body}</a>;
            })}
          </Panel>
        );
        return (
          <>
            {fromRep.length ? (
              <>
                <SectionLabel color="#12804A">Uploaded by your course rep</SectionLabel>
                {rows(fromRep, true)}
              </>
            ) : null}
            {bank.length ? (
              <>
                {fromRep.length ? <SectionLabel>Slide bank</SectionLabel> : <div style={{ height: 6 }} />}
                {rows(bank, false)}
              </>
            ) : null}
          </>
        );
      })()}
      {viewing ? <PdfViewer item={viewing} courseCode={course.courseCode} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}

function SectionLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <p style={{ margin: "22px 4px 0", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase", color: color ?? "rgba(26,24,20,.65)" }}>
      <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: color ?? "rgba(26,24,20,.45)" }} />
      {children}
    </p>
  );
}

type FolderState = { status: "loading" } | { status: "ready"; items: DriveItem[] } | { status: "error"; reason: string };

function DriveFolder({ kind, course, folderId, isRoot, hidden = [] }: { kind: DriveKind; course: CourseMaterialEntry; folderId: string; isRoot: boolean; hidden?: string[] }) {
  const [state, setState] = useState<FolderState>({ status: "loading" });
  const [viewing, setViewing] = useState<DriveItem | null>(null);
  useEffect(() => preloadSlides(), []);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    listDriveFolder(folderId, controller.signal)
      .then((items) => setState({ status: "ready", items: items.filter((item) => !hidden.includes(item.id)) }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", reason: error instanceof Error ? error.message : "error" });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, hidden.join(",")]);

  const files = state.status === "ready" ? state.items.filter(isDownloadable) : [];
  const totalBytes = files.reduce((sum, f) => sum + (f.size ?? 0), 0);
  const fileCount = state.status === "ready" ? state.items.filter((i) => !i.isFolder).length : 0;

  return (
    <>
      <ListHeader
        course={course}
        title={KIND_TITLE[kind]}
        sub={state.status === "ready" ? `${fileCount} ${fileCount === 1 ? (kind === "books" ? "book" : "file") : kind === "books" ? "books" : "files"}` : KIND_TITLE[kind]}
        back={isRoot ? undefined : <button type="button" onClick={() => router.back()} className="hub-tap" style={backButtonStyle}><ArrowLeft size={22} strokeWidth={2.8} aria-hidden style={{ flexShrink: 0 }} />Back</button>}
      >
        {state.status === "ready" && totalBytes ? <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 600, color: "rgba(246,239,220,.6)" }}>{formatBytes(totalBytes)} in total</p> : null}
        {state.status === "ready" && files.length > 1 ? (
          <button type="button" onClick={() => setDownloadOpen(true)} className="hub-tap hub-plate" style={{ marginTop: 14, width: "100%", height: 50, border: 0, borderRadius: 999, ...goldPlate, fontFamily: "inherit", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer" }}>
            <Download size={18} strokeWidth={2.5} aria-hidden />
            Download all
          </button>
        ) : null}
      </ListHeader>

      {state.status === "loading" ? <SkeletonList /> : null}
      {state.status === "error" ? (
        <div style={{ marginTop: 16, borderRadius: 24, background: "#FFFBF0", padding: 18, boxShadow: panelShadow }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{state.reason === "missing-key" ? "In-site viewing isn’t switched on yet." : "This folder couldn’t be opened here."}</p>
          <p style={{ margin: "6px 0 14px", fontSize: 13, fontWeight: 600, color: "rgba(26,24,20,.65)" }}>You can still open it in Google Drive.</p>
          <a href={driveFolderUrl(folderId)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 18px", borderRadius: 999, background: INK, color: GOLD, fontSize: 14, fontWeight: 800, textDecoration: "none" }}>Open in Google Drive <ExternalLink size={15} /></a>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <>
          {state.items.length === 0 ? <Empty text="This folder is empty for now." /> : (
            <Panel style={{ marginTop: 12 }}>
              {state.items.map((item, i) => {
                const rowStyle = { display: "flex", alignItems: "center", gap: 12, minHeight: 58, padding: "8px 10px 8px 12px", borderBottom: i < state.items.length - 1 ? `1px solid ${ROW_LINE}` : "none", animationDelay: `${Math.min(i, 12) * 40}ms` } as const;
                if (item.isFolder) {
                  return (
                    <Link key={item.id} href={hubHref(course.id, kind, item.id)} className="hub-row hub-tap hub-dark-row" style={{ ...rowStyle, textDecoration: "none" }}>
                      <Tile bg="#2A251C" size={38}><Folder size={18} color={GOLD} /></Tile>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 800, color: CREAM }}>{item.name}</span>
                      <RoundChevron />
                    </Link>
                  );
                }
                return (
                  <div key={item.id} className="hub-row hub-dark-row" style={rowStyle}>
                    <button type="button" onPointerEnter={() => preloadSlides(item.id)} onTouchStart={() => preloadSlides(item.id)} onClick={() => setViewing(item)} className="hub-tap" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, border: 0, background: "none", padding: 0, textAlign: "left", fontFamily: "inherit", cursor: "pointer" }}>
                      {kind === "books" ? (
                        <span aria-hidden style={{ width: 34, height: 44, flexShrink: 0, borderRadius: "3px 7px 7px 3px", borderLeft: `4px solid ${BROWN}`, ...goldPlate }} />
                      ) : (
                        <Tile bg="#2A251C" size={38}><FileText size={18} color={GOLD} /></Tile>
                      )}
                      <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: CREAM, overflowWrap: "anywhere" }}>{tidyFileName(item.name)}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(246,239,220,.5)" }}>{formatBytes(item.size) || "Google file"}</span>
                      </span>
                    </button>
                    {isDownloadable(item) ? (
                      <a href={driveDownloadUrl(item.id)} aria-label={`Download ${tidyFileName(item.name)}`} style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 999, border: "1px solid rgba(233,188,58,.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Download size={15} color={GOLD} strokeWidth={2.5} />
                      </a>
                    ) : null}
                  </div>
                );
              })}
            </Panel>
          )}
        </>
      ) : null}

      {viewing ? <PdfViewer item={viewing} courseCode={course.courseCode} onClose={() => setViewing(null)} /> : null}
      <DownloadAllSheet open={downloadOpen} onClose={() => setDownloadOpen(false)} files={files} totalBytes={totalBytes} zipName={`${(course.courseCode ?? course.courseTitle).replace(/\s+/g, "")}-${KIND_TITLE[kind]}.zip`} folderId={folderId} label={course.courseCode ?? course.courseTitle} />
    </>
  );
}

function SkeletonList() {
  return (
    <Panel style={{ marginTop: 16 }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, height: 58, padding: "0 12px", borderBottom: `1px solid ${ROW_LINE}` }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, background: "#2A251C" }} />
          <span style={{ flex: 1, height: 12, maxWidth: 180, borderRadius: 6, background: "#2A251C" }} />
        </div>
      ))}
    </Panel>
  );
}

/* ─── In-site PDF viewer (Google Drive preview) ──────────────────────── */

function PdfViewer({ item, courseCode, onClose }: { item: DriveItem; courseCode?: string; onClose: () => void }) {
  const [counter, setCounter] = useState<string | null>(null);
  const onPage = useCallback((page: number, total: number) => setCounter(`${page} / ${total}`), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <Overlay>
    <div role="dialog" aria-modal="true" aria-label={tidyFileName(item.name)} className="hub-sheet" style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh", zIndex: OVERLAY_Z, background: "#211D17", display: "flex", flexDirection: "column", ...hubFont }}>
      <div style={{ minHeight: 68, paddingTop: "env(safe-area-inset-top, 0px)", background: INK, display: "flex", alignItems: "center", gap: 12, paddingLeft: 12, paddingRight: 12, flexShrink: 0 }}>
        <button type="button" onClick={onClose} aria-label="Close" style={{ width: 44, height: 44, flexShrink: 0, border: 0, borderRadius: 999, background: "#2A251C", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={18} color={CREAM} strokeWidth={2.5} />
        </button>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: CREAM, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tidyFileName(item.name)}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(246,239,220,.5)" }}>{[courseCode, formatBytes(item.size)].filter(Boolean).join(" · ")}</span>
        </span>
        {counter ? <span style={{ flexShrink: 0, fontSize: 14, fontWeight: 800, color: CREAM, whiteSpace: "nowrap" }}>{counter}</span> : null}
        {isDownloadable(item) ? (
          <a href={driveDownloadUrl(item.id)} aria-label="Download this file" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 999, ...goldPlate, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Download size={18} color={INK} strokeWidth={2.5} />
          </a>
        ) : null}
      </div>
      <SlideDeck item={item} title={tidyFileName(item.name)} onPage={onPage} />
    </div>
    </Overlay>
  );
}

/* ─── Download all (zipped in the browser) ───────────────────────────── */

type DlState = { phase: "idle" } | { phase: "working"; done: number; bytes: number } | { phase: "done" } | { phase: "error" };

function DownloadAllSheet({ open, onClose, files, totalBytes, zipName, folderId, label }: { open: boolean; onClose: () => void; files: DriveItem[]; totalBytes: number; zipName: string; folderId: string; label: string }) {
  const [state, setState] = useState<DlState>({ phase: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ phase: "working", done: 0, bytes: 0 });
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      let bytes = 0;
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const response = await fetch(driveMediaUrl(file.id), { signal: controller.signal });
        if (!response.ok) throw new Error(`drive-${response.status}`);
        const blob = await response.blob();
        zip.file(file.name, blob);
        bytes += file.size ?? blob.size;
        setState({ phase: "working", done: i + 1, bytes });
      }
      const archive = await zip.generateAsync({ type: "blob", compression: "STORE" });
      const url = URL.createObjectURL(archive);
      const a = document.createElement("a");
      a.href = url;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setState({ phase: "done" });
    } catch {
      if (!controller.signal.aborted) setState({ phase: "error" });
    }
  }, [files, zipName]);

  useEffect(() => {
    if (open) void start();
    else {
      abortRef.current?.abort();
      setState({ phase: "idle" });
    }
  }, [open, start]);

  const progress = state.phase === "done" ? 1 : state.phase === "working" && totalBytes ? Math.min(1, state.bytes / totalBytes) : state.phase === "working" ? state.done / Math.max(1, files.length) : 0;
  const R = 26;
  const C = 2 * Math.PI * R;
  const done = state.phase === "done";

  return (
    <Sheet open={open} onClose={state.phase === "working" ? undefined : onClose} label="Download all slides">
      <div style={{ padding: "20px 22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }} aria-hidden>
              <circle cx="32" cy="32" r={R} fill="none" stroke="#EFEADF" strokeWidth="7" />
              <circle cx="32" cy="32" r={R} fill="none" stroke={done ? GOLD : INK} strokeWidth="7" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} style={{ transition: "stroke-dashoffset .3s ease" }} />
            </svg>
            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900 }}>{done ? <Check size={22} strokeWidth={3} /> : `${Math.round(progress * 100)}%`}</span>
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-.025em" }}>{done ? "Downloaded" : state.phase === "error" ? "Couldn’t download" : "Downloading slides"}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: MUTED }} aria-live="polite">
              {done ? `${files.length} files · ${formatBytes(totalBytes)} saved` : state.phase === "working" ? `${state.done} of ${files.length} files · ${formatBytes(state.bytes) || "0 KB"} of ${formatBytes(totalBytes)}` : state.phase === "error" ? "Google Drive can download the whole folder instead." : `${label} · ${files.length} files`}
            </span>
          </span>
        </div>
        <div style={{ marginTop: 18, borderRadius: 16, background: SOFT, padding: "13px 14px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, color: "#4A453C" }}>
          <FileText size={18} color={BROWN} aria-hidden />
          {zipName} · saves to your device
        </div>
        {state.phase === "error" ? (
          <a href={driveFolderUrl(folderId)} target="_blank" rel="noopener noreferrer" style={{ marginTop: 16, height: 52, borderRadius: 999, background: INK, color: GOLD, fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none" }}>Open folder in Google Drive <ExternalLink size={16} /></a>
        ) : null}
        <button
          type="button"
          onClick={() => {
            abortRef.current?.abort();
            onClose();
          }}
          style={{ marginTop: 12, width: "100%", height: 52, borderRadius: 999, border: `2px solid ${INK}`, background: done ? INK : "transparent", color: done ? GOLD : INK, fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}
        >
          {done || state.phase === "error" ? "Done" : "Cancel"}
        </button>
      </div>
    </Sheet>
  );
}

/* ─── YouTube ───────────────────────────────────────────────────────── */

function VideosView({ course, videos }: { course: CourseMaterialEntry; videos: CourseMaterialEntry[] }) {
  // The same chapters → player layout as the Course Materials page.
  const rows = useMemo(() => videos.map((entry) => ({ ...entry, type: deriveMaterialType(entry) })), [videos]);
  return (
    <div className="hub-row">
      <BackLink href={hubHref(course.id)}>{courseLabel(course)}</BackLink>
      <div style={{ marginTop: 14 }}>
        {rows.length === 0 ? <Empty text="Your course rep hasn’t added playlists yet." /> : <CourseYouTube course={course} materials={rows} where={`Materials quick access · ${courseLabel(course)}`} />}
      </div>
    </div>
  );
}

/* ─── Books ─────────────────────────────────────────────────────────── */

function BooksView({ course, books, folderId }: { course: CourseMaterialEntry; books: CourseMaterialEntry[]; folderId: string | null }) {
  return <DriveMaterials kind="books" course={course} slides={books} folderId={folderId} />;
}

/* ─── Sign up to save the choice ────────────────────────────────────── */

const PROMPT_KEY = "b2b.materialsSignupPrompted";

function SignUpPrompt() {
  const { choice, signedIn, ready } = useHubChoice();
  const data = useHubData();
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<"login" | "signup" | null>(null);
  const department = data.departments.find((d) => d.id === choice?.departmentId);

  useEffect(() => {
    if (!ready || signedIn || !choice) return;
    let prompted = false;
    try {
      prompted = window.sessionStorage.getItem(PROMPT_KEY) === "1";
    } catch {
      prompted = false;
    }
    if (prompted) return;
    const timer = window.setTimeout(() => {
      setOpen(true);
      try {
        window.sessionStorage.setItem(PROMPT_KEY, "1");
      } catch {
        /* ignore */
      }
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [ready, signedIn, choice]);

  return (
    <>
      <Sheet open={open && !signedIn} onClose={() => setOpen(false)} label="Save your choices">
        <div style={{ padding: "20px 22px 24px" }}>
          {department && choice ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Pill>{shortProgramme(department.name)}</Pill>
              <Pill>Year {choice.year}</Pill>
              <Pill>Sem {choice.semester}</Pill>
            </div>
          ) : null}
          <h2 style={{ margin: "16px 0 0", fontSize: 26, fontWeight: 900, letterSpacing: "-.03em" }}>Save your choices?</h2>
          <p style={{ margin: "8px 0 0", fontSize: 15, fontWeight: 500, lineHeight: 1.45, color: "#6B655A" }}>Sign up once, and the app opens straight to your courses next time.</p>
          <button type="button" onClick={() => { setOpen(false); setAuth("signup"); }} style={{ marginTop: 20, width: "100%", height: 52, border: 0, borderRadius: 999, background: INK, color: GOLD, fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Sign up for free</button>
          <button type="button" onClick={() => { setOpen(false); setAuth("login"); }} style={{ marginTop: 10, width: "100%", height: 52, borderRadius: 999, border: `2px solid ${INK}`, background: "transparent", color: INK, fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Log in</button>
          <button type="button" onClick={() => setOpen(false)} style={{ width: "100%", height: 44, border: 0, background: "none", color: MUTED, fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Not now</button>
        </div>
      </Sheet>
      <AuthModal open={auth !== null} initialView={auth ?? "signup"} onClose={() => setAuth(null)} />
    </>
  );
}
