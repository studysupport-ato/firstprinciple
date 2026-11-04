/**
 * Materials quick access (admin-only while testing).
 *
 * Students pick programme > year > semester once; the homepage then lists
 * their courses, and each course opens to Slides, YouTube playlist and Books.
 * Slides that live in a public Google Drive folder are listed and opened
 * inside the site through the Google Drive API.
 */
import {
  GENERAL_DEPARTMENT_ID,
  getEntryType,
  type CourseMaterialEntry,
  type CourseMaterialsDepartment,
  type CourseMaterialSemester,
  type CourseMaterialYear,
} from "@/lib/courseMaterials";
import { parseYouTubeVideoId } from "@/lib/youtube";
import { parseYouTubePlaylistId } from "@/lib/youtubePlaylist";

/** Flip to true to show the new flow to every student (it is admin-only until then). */
export const MATERIALS_HUB_LIVE = true;

/** The number students call to offer a resource. Leave empty to hide the call button. */
export const RESOURCE_CONTACT_PHONE = "";

/** Futura where the device has it (iPhone, Mac); the site's Futura-style Outfit everywhere else. */
export const HUB_FONT = `Futura, "Futura PT", "Futura Std", var(--font-outfit), ui-sans-serif, system-ui, sans-serif`;

export const HUB_YEARS: CourseMaterialYear[] = [1, 2, 3, 4];
export const HUB_SEMESTERS: CourseMaterialSemester[] = [1, 2];
export const YEAR_LABEL: Record<CourseMaterialYear, string> = { 1: "First year", 2: "Second year", 3: "Third year", 4: "Fourth year" };

/* ─── Saved choice ────────────────────────────────────────────────────── */

export interface HubChoice {
  departmentId: string;
  year: CourseMaterialYear;
  semester: CourseMaterialSemester;
}

const STORAGE_KEY = "b2b.materialsChoice.v1";
export const HUB_METADATA_KEY = "materials_choice";

export function isHubChoice(value: unknown): value is HubChoice {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.departmentId === "string" && [1, 2, 3, 4].includes(v.year as number) && [1, 2].includes(v.semester as number);
}

export function readLocalChoice(): HubChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    return isHubChoice(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLocalChoice(choice: HubChoice | null) {
  if (typeof window === "undefined") return;
  try {
    if (choice) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage can be unavailable (private mode); the choice then lasts for this visit only */
  }
}

/* ─── Courses, years and semesters ────────────────────────────────────── */

export interface HubCourse {
  id: string;
  code?: string;
  title: string;
  /** "course" opens the course page; "link" is a semester-level external link. */
  kind: "course" | "link";
  url?: string;
  general: boolean;
}

/** "ME 161" -> year 1, semester 1 (KNUST numbering: first digit is the year, odd last digit is semester 1). */
export function yearSemesterFromCode(code?: string): { year: CourseMaterialYear; semester: CourseMaterialSemester } | null {
  const match = code?.match(/(\d)(\d)(\d)\b/);
  if (!match) return null;
  const year = Number(match[1]);
  if (year < 1 || year > 4) return null;
  return { year: year as CourseMaterialYear, semester: Number(match[3]) % 2 === 1 ? 1 : 2 };
}

function isLive(entry: CourseMaterialEntry) {
  return entry.status === "published" && entry.available !== false;
}

function placeOf(entry: CourseMaterialEntry): { year: CourseMaterialYear; semester: CourseMaterialSemester } | null {
  if (entry.studyYear && entry.semester) return { year: entry.studyYear, semester: entry.semester };
  if (entry.departmentId === GENERAL_DEPARTMENT_ID) return yearSemesterFromCode(entry.courseCode);
  if (entry.studyYear) return { year: entry.studyYear, semester: 1 };
  return null;
}

/** "All First Year Slides", "All 2nd year materials": a whole-semester bundle, not a course. */
const SEMESTER_BUNDLE = /^\s*all\b.*\b(slides|materials|courses|notes)\b/i;

/** Courses a student in this programme, year and semester sees. */
export function coursesFor(entries: CourseMaterialEntry[], choice: HubChoice): HubCourse[] {
  const out: HubCourse[] = [];
  const ordered = [...entries].sort((a, b) => a.order - b.order);
  for (const entry of ordered) {
    if (!isLive(entry)) continue;
    const inProgramme = entry.departmentId === choice.departmentId;
    const general = entry.departmentId === GENERAL_DEPARTMENT_ID;
    if (!inProgramme && !general) continue;
    const place = placeOf(entry);
    if (!place || place.year !== choice.year || place.semester !== choice.semester) continue;
    const type = getEntryType(entry);
    // Only real courses are listed; semester-wide bundles (e.g. "All First Year Slides") are left out.
    if (type === "course" && !SEMESTER_BUNDLE.test(entry.courseTitle)) {
      out.push({ id: entry.id, code: entry.courseCode, title: entry.courseTitle, kind: "course", general });
    }
  }
  // A programme course that is really a general course (same code, or same name) shows once:
  // the programme's row, with the general course's code and its playlists folded in.
  const generals = out.filter((c) => c.general);
  const own = out.filter((c) => !c.general).map((c) => {
    const twin = generals.find((g) => sameCourse(c, g));
    return twin ? { ...c, code: c.code || twin.code, title: twin.code && !c.code ? twin.title : c.title } : c;
  });
  const shown = generals.filter((g) => !own.some((c) => sameCourse(c, g)));
  return [...own, ...shown];
}

function courseKey(text?: string) {
  return (text ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** "ME 161" = "ME161"; "BASIC MECHANICS" = "Basic Mechanics"; "MATH 151 ALGEBRA" matches code MATH 151. */
export function sameCourse(a: { code?: string; title: string }, b: { code?: string; title: string }) {
  const codeA = courseKey(a.code) || courseKey(a.title.match(/^[A-Za-z]{2,5}\s?\d{3}/)?.[0]);
  const codeB = courseKey(b.code) || courseKey(b.title.match(/^[A-Za-z]{2,5}\s?\d{3}/)?.[0]);
  if (codeA && codeB) return codeA === codeB;
  const nameA = courseKey(a.title.replace(/^[A-Za-z]{2,5}\s?\d{3}\s*/, "").replace(/\bI\b$/i, "1"));
  const nameB = courseKey(b.title.replace(/^[A-Za-z]{2,5}\s?\d{3}\s*/, "").replace(/\bI\b$/i, "1"));
  return Boolean(nameA) && nameA === nameB;
}

/** The general course that a programme course stands in for, if any (to fold in its playlists). */
export function generalTwin(entries: CourseMaterialEntry[], course: CourseMaterialEntry): CourseMaterialEntry | undefined {
  if (course.departmentId === GENERAL_DEPARTMENT_ID) return undefined;
  return entries.find((e) => e.departmentId === GENERAL_DEPARTMENT_ID && getEntryType(e) === "course" && isLive(e) && sameCourse({ code: course.courseCode, title: course.courseTitle }, { code: e.courseCode, title: e.courseTitle }));
}

export function hasAnything(entries: CourseMaterialEntry[], departmentId: string, year: CourseMaterialYear, semester?: CourseMaterialSemester) {
  const semesters = semester ? [semester] : HUB_SEMESTERS;
  return semesters.some((s) => coursesFor(entries, { departmentId, year, semester: s }).length > 0);
}

export function availableDepartments(departments: CourseMaterialsDepartment[]) {
  return departments.filter((d) => d.id !== GENERAL_DEPARTMENT_ID && d.status === "published").sort((a, b) => a.order - b.order);
}

/** "Civil Engineering" -> "CE", "Electrical & Electronics Engineering" -> "EE". */
const MONOGRAMS: Record<string, string> = {
  electrical: "EE", mechanical: "ME", petroleum: "PE", geomatic: "GM", marine: "MR", civil: "CE",
  metallurgical: "MT", biomedical: "BM", aerospace: "AE", industrial: "IE", geological: "GL", computer: "CO",
  agricultural: "AG", chemical: "CH", automobile: "AU", telecommunications: "TE", materials: "MA", petrochemical: "PC",
};

export function monogram(name: string) {
  const words = name.replace(/&/g, " ").split(/\s+/).filter((w) => w && !/^engineering$/i.test(w));
  const known = MONOGRAMS[(words[0] ?? "").toLowerCase()];
  if (known) return known;
  if (words.length === 1) return `${words[0][0]}E`.toUpperCase();
  return (words[0][0] + (words[1]?.[0] ?? "")).toUpperCase();
}

export function shortProgramme(name: string) {
  return name.replace(/\s*&\s*Electronics/i, "").replace(/Engineering/i, "Eng.").trim();
}

/* ─── Materials inside a course ──────────────────────────────────────── */

export interface CourseGroups {
  slides: CourseMaterialEntry[];
  videos: CourseMaterialEntry[];
  books: CourseMaterialEntry[];
  other: CourseMaterialEntry[];
}

const BOOK_PATTERN = /\b(book|textbook|text book|handbook|manual)\b/i;

export function groupCourseMaterials(entries: CourseMaterialEntry[], courseId: string | string[]): CourseGroups {
  const groups: CourseGroups = { slides: [], videos: [], books: [], other: [] };
  const ids = Array.isArray(courseId) ? courseId : [courseId];
  const children = entries.filter((e) => e.parentId && ids.includes(e.parentId) && isLive(e)).sort((a, b) => ids.indexOf(a.parentId as string) - ids.indexOf(b.parentId as string) || a.order - b.order);
  for (const entry of children) {
    const t = entry.materialType;
    if (entry.description === "book" || BOOK_PATTERN.test(entry.courseTitle)) groups.books.push(entry);
    else if (t === "slides" || t === "pdf") groups.slides.push(entry);
    else if (t === "playlist" || t === "video" || entry.kind === "youtube" || parseYouTubeVideoId(entry.url) || parseYouTubePlaylistId(entry.url)) groups.videos.push(entry);
    else if (/drive\.google\.com|onedrive|\.pdf\b/i.test(entry.url)) groups.slides.push(entry);
    else groups.other.push(entry);
  }
  return groups;
}

/* ─── YouTube ───────────────────────────────────────────────────────── */

/** An embeddable URL for a playlist row: "watch_videos?video_ids=a,b,c", "list=…", or a single video. */
export function playlistEmbedUrl(entry: Pick<CourseMaterialEntry, "url" | "provider" | "extraVideos">): string | null {
  try {
    const url = new URL(entry.url);
    const ids = url.searchParams.get("video_ids")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
    if (ids.length) return `https://www.youtube-nocookie.com/embed/${ids[0]}?playlist=${ids.join(",")}&rel=0`;
  } catch {
    /* not a URL; fall through */
  }
  const listId = parseYouTubePlaylistId(entry.url);
  if (listId) return `https://www.youtube-nocookie.com/embed/videoseries?list=${listId}&rel=0`;
  const videoId = parseYouTubeVideoId(entry.url) ?? parseYouTubeVideoId(entry.provider);
  if (videoId) return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
  const extras = entry.extraVideos?.map((v) => v.videoId) ?? [];
  if (extras.length) return `https://www.youtube-nocookie.com/embed/${extras[0]}?playlist=${extras.join(",")}&rel=0`;
  return null;
}

export function playlistVideoCount(entry: Pick<CourseMaterialEntry, "url" | "extraVideos" | "hiddenVideos">): number | null {
  try {
    const ids = new URL(entry.url).searchParams.get("video_ids")?.split(",").filter(Boolean) ?? [];
    if (ids.length) return ids.length - (entry.hiddenVideos?.length ?? 0) + (entry.extraVideos?.length ?? 0);
  } catch {
    /* ignore */
  }
  return null;
}

/* ─── Google Drive (public folders, read with an API key) ───────────── */

export const DRIVE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY?.trim() ?? "";

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  isFolder: boolean;
}

export function parseDriveFolderId(url: string): string | null {
  const match = url.match(/drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?)?folders\/([A-Za-z0-9_-]{10,})/);
  return match ? match[1] : null;
}

export function parseDriveFileId(url: string): string | null {
  const match = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([A-Za-z0-9_-]{10,})/);
  return match ? match[1] : null;
}

export async function listDriveFolder(folderId: string, signal?: AbortSignal): Promise<DriveItem[]> {
  if (!DRIVE_API_KEY) throw new Error("missing-key");
  const items: DriveItem[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, size)",
      pageSize: "200",
      orderBy: "folder,name_natural",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      key: DRIVE_API_KEY,
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { signal });
    if (!response.ok) throw new Error(`drive-${response.status}`);
    const body = (await response.json()) as { nextPageToken?: string; files?: Array<{ id: string; name: string; mimeType: string; size?: string }> };
    for (const f of body.files ?? []) {
      items.push({ id: f.id, name: f.name, mimeType: f.mimeType, size: f.size ? Number(f.size) : null, isFolder: f.mimeType === "application/vnd.google-apps.folder" });
    }
    pageToken = body.nextPageToken ?? "";
  } while (pageToken);
  return items;
}

export function driveFolderUrl(folderId: string) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export function drivePreviewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function driveDownloadUrl(fileId: string) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export function driveMediaUrl(fileId: string) {
  return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true&key=${DRIVE_API_KEY}`;
}

/** "ME_161_-3 Moments.pdf" -> "3 · Moments". */
export function tidyFileName(name: string) {
  const base = name.replace(/\.(pdf|pptx?|docx?)$/i, "").replace(/_/g, " ").trim();
  const numbered = base.match(/^[A-Z]{2,5}\s?\d{3}\s*-?\s*(\d{1,2})\s+(.+)$/i);
  if (numbered) return `${numbered[1]} · ${numbered[2]}`;
  return base.replace(/\s{2,}/g, " ");
}

export function formatBytes(bytes: number | null) {
  if (bytes === null || Number.isNaN(bytes)) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isDownloadable(item: DriveItem) {
  return !item.isFolder && !item.mimeType.startsWith("application/vnd.google-apps.");
}

/* ─── New from course reps ──────────────────────────────────────────── */

export const REP_NEW_DAYS = 14;
const SEEN_KEY = "b2b.repUploadsSeen.v1";

export interface RepUpload {
  entry: CourseMaterialEntry;
  course: HubCourse;
}

/** Slides and books course reps added recently to the student's courses, newest first. */
export function recentRepUploads(entries: CourseMaterialEntry[], courses: HubCourse[], days = REP_NEW_DAYS): RepUpload[] {
  const since = Date.now() - days * 86_400_000;
  const out: RepUpload[] = [];
  for (const course of courses) {
    if (course.kind !== "course") continue;
    for (const entry of entries) {
      if (entry.parentId !== course.id || !entry.fromRep || !isLive(entry)) continue;
      if (getEntryType(entry) === "course") continue;
      if (Date.parse(entry.createdAt) < since) continue;
      out.push({ entry, course });
    }
  }
  return out.sort((a, b) => b.entry.createdAt.localeCompare(a.entry.createdAt));
}

export function isNewRepUpload(entry: CourseMaterialEntry, days = REP_NEW_DAYS) {
  return Boolean(entry.fromRep) && Date.parse(entry.createdAt) >= Date.now() - days * 86_400_000;
}

export function readSeenUploads(): string[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function markUploadsSeen(ids: string[]) {
  try {
    const next = Array.from(new Set([...readSeenUploads(), ...ids])).slice(-300);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

/** "just now", "3 hours ago", "2 days ago". */
export function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
