/**
 * Course reps: apply, get approved by an admin, then manage course materials
 * for ONE programme and ONE year.
 *
 * Every rep write goes through `requireApprovedRep()` and a scope check here,
 * on the server, before the service-role client touches course_materials.
 * Browsers have no write access to these tables at all (see the
 * 20261104090000_course_rep_access migration), so a rep cannot reach lessons,
 * the admin panel, other programmes, other years or the shared general courses.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCourseMaterialsAdminRepository } from "@/lib/content/adminRepository";
import { GENERAL_DEPARTMENT_ID, getEntryType, type CourseMaterialEntry, type CourseMaterialSemester, type CourseMaterialYear } from "@/lib/courseMaterials";
import { parseYouTubeVideoId } from "@/lib/youtube";
import { parseYouTubePlaylistId } from "@/lib/youtubePlaylist";
import { getArkeselConfiguration } from "@/lib/smsCampaigns/config";
import { submitArkeselSmsBatch } from "@/lib/smsCampaigns/arkeselProvider";
import { courseUploadFolder, finishUpload, startUpload, trashUploadedFile } from "./googleDrive";
import { parseDriveFileId, parseDriveFolderId } from "@/lib/site/materialsHub";
import { notifyRepUpload } from "./uploadPush";
import { after } from "next/server";

if (typeof window !== "undefined") {
  throw new Error("lib/courseReps/repService.ts is server-only.");
}

export type RepStatus = "pending" | "approved" | "declined" | "revoked";

export interface RepApplication {
  id: string;
  userId: string;
  fullName: string;
  departmentId: string;
  departmentName: string;
  studyYear: CourseMaterialYear;
  phone: string;
  email: string | null;
  status: RepStatus;
  createdAt: string;
  reviewedAt: string | null;
  uploads?: number;
}

type Row = {
  id: string;
  user_id: string;
  full_name: string;
  department_id: string;
  study_year: number;
  phone: string;
  email: string | null;
  status: RepStatus;
  created_at: string;
  reviewed_at: string | null;
};

export class RepAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepAccessError";
  }
}

// Untyped handle: course_rep_applications is newer than the generated types.
function db() {
  return createSupabaseAdminClient() as unknown as {
    from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
}

/** "024 123 4567" / "233241234567" / "+233 24 123 4567" -> "+233241234567". */
export function normalizeGhanaPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let e164 = digits;
  if (/^0\d{9}$/.test(digits)) e164 = `+233${digits.slice(1)}`;
  else if (/^233\d{9}$/.test(digits)) e164 = `+${digits}`;
  else if (/^\d{9}$/.test(digits)) e164 = `+233${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

async function currentUser() {
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  return data.user ?? null;
}

async function departmentNames(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const { data } = await db().from("departments").select("id,name").in("id", ids);
  return new Map<string, string>(((data ?? []) as Array<{ id: string; name: string }>).map((d) => [d.id, d.name]));
}

function map(row: Row, names: Map<string, string>): RepApplication {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    departmentId: row.department_id,
    departmentName: names.get(row.department_id) ?? row.department_id,
    studyYear: row.study_year as CourseMaterialYear,
    phone: row.phone,
    email: row.email,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

/* ─── Student side ───────────────────────────────────────────────────── */

export async function getMyApplication(): Promise<RepApplication | null> {
  const user = await currentUser();
  if (!user) return null;
  const { data } = await db().from("course_rep_applications").select("*").eq("user_id", user.id).maybeSingle();
  if (!data) return null;
  return map(data as Row, await departmentNames([(data as Row).department_id]));
}

export async function applyAsRep(input: { fullName: string; departmentId: string; studyYear: number; phone: string }): Promise<RepApplication> {
  const user = await currentUser();
  if (!user) throw new RepAccessError("Sign in first, then apply.");
  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  if (fullName.length < 3 || !fullName.includes(" ")) throw new RepAccessError("Enter your full name (first and last name).");
  if (![1, 2, 3, 4].includes(input.studyYear)) throw new RepAccessError("Choose your year.");
  const phone = normalizeGhanaPhone(input.phone);
  if (!phone) throw new RepAccessError("Enter a valid phone number, e.g. 024 123 4567.");
  if (input.departmentId === GENERAL_DEPARTMENT_ID) throw new RepAccessError("Choose your programme.");
  const { data: dept } = await db().from("departments").select("id,status").eq("id", input.departmentId).maybeSingle();
  if (!dept || dept.status !== "published") throw new RepAccessError("Choose your programme.");

  const existing = await getMyApplication();
  if (existing?.status === "pending") throw new RepAccessError("Your application is already waiting for review.");
  if (existing?.status === "approved") throw new RepAccessError("You are already a course rep.");

  const now = new Date().toISOString();
  const row = { user_id: user.id, full_name: fullName, department_id: input.departmentId, study_year: input.studyYear, phone, email: user.email ?? null, status: "pending", updated_at: now, reviewed_at: null };
  const { error } = existing
    ? await db().from("course_rep_applications").update({ ...row, created_at: now }).eq("id", existing.id)
    : await db().from("course_rep_applications").insert(row);
  if (error) throw new RepAccessError("Your application could not be sent. Try again.");
  return (await getMyApplication()) as RepApplication;
}

/** The signed-in user's approved rep record, or an error. Called before every rep read or write. */
export async function requireApprovedRep(): Promise<RepApplication> {
  const application = await getMyApplication();
  if (!application || application.status !== "approved") throw new RepAccessError("Only approved course reps can do this.");
  return application;
}

/* ─── Rep scope: one programme, one year, never the general courses ──── */

async function loadEntry(id: string): Promise<CourseMaterialEntry | undefined> {
  return createCourseMaterialsAdminRepository().getCourseMaterial(id);
}

function inScope(rep: RepApplication, entry: CourseMaterialEntry) {
  return entry.departmentId === rep.departmentId && entry.departmentId !== GENERAL_DEPARTMENT_ID && entry.studyYear === rep.studyYear;
}

async function requireOwnCourse(rep: RepApplication, courseId: string) {
  const course = await loadEntry(courseId);
  if (!course || getEntryType(course) !== "course" || !inScope(rep, course) || course.status === "archived") {
    throw new RepAccessError("That course is not part of your access.");
  }
  return course;
}

async function requireOwnEntry(rep: RepApplication, id: string) {
  const entry = await loadEntry(id);
  if (!entry || !inScope(rep, entry)) throw new RepAccessError("That item is not part of your access.");
  if (getEntryType(entry) === "material" && entry.parentId) await requireOwnCourse(rep, entry.parentId);
  return entry;
}

export interface RepScope {
  rep: RepApplication;
  courses: Array<CourseMaterialEntry & { materials: CourseMaterialEntry[] }>;
}

export async function getRepScope(): Promise<RepScope> {
  const rep = await requireApprovedRep();
  const all = await createCourseMaterialsAdminRepository().listCourseMaterials({ departmentId: rep.departmentId });
  const mine = all.filter((e) => e.studyYear === rep.studyYear && e.status !== "archived");
  const courses = mine
    .filter((e) => getEntryType(e) === "course")
    .sort((a, b) => (a.semester ?? 1) - (b.semester ?? 1) || a.order - b.order || a.courseTitle.localeCompare(b.courseTitle))
    .map((course) => ({ ...course, materials: mine.filter((m) => m.parentId === course.id).sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt)) }));
  return { rep, courses };
}

/** Who gave the slides, e.g. "Dr. Mensah" (optional). */
function cleanLecturer(value?: string) {
  const clean = (value ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  return clean || undefined;
}

async function markRep(id: string, rep: RepApplication) {
  await db().from("course_materials").update({ created_by_rep: rep.id, uploaded_by: rep.fullName }).eq("id", id);
}

export async function repCreateCourse(input: { semester: number; courseCode: string; courseTitle: string }) {
  const rep = await requireApprovedRep();
  if (input.semester !== 1 && input.semester !== 2) throw new RepAccessError("Choose semester 1 or 2.");
  const title = input.courseTitle.trim();
  if (title.length < 2) throw new RepAccessError("Enter the course name.");
  const code = input.courseCode.trim().toUpperCase().replace(/\s+/g, " ");
  const created = await createCourseMaterialsAdminRepository().createCourseMaterial({
    departmentId: rep.departmentId,
    studyYear: rep.studyYear,
    semester: input.semester as CourseMaterialSemester,
    entryType: "course",
    courseCode: code || undefined,
    courseTitle: title,
    url: "",
    status: "published",
  });
  await markRep(created.id, rep);
  return created;
}

export type RepMaterialType = "slides" | "books" | "youtube";

function materialFields(type: RepMaterialType, url: string) {
  const clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) throw new RepAccessError("Paste a full link that starts with https://");
  if (type === "youtube") {
    const listId = parseYouTubePlaylistId(clean);
    const isMulti = /youtube\.com\/watch_videos\?/i.test(clean);
    const videoId = parseYouTubeVideoId(clean);
    if (!listId && !isMulti && !videoId) throw new RepAccessError("Paste a YouTube playlist or video link.");
    if (listId || isMulti) return { materialType: "playlist" as const, kind: "link" as const, description: undefined };
    return { materialType: "video" as const, kind: "youtube" as const, description: undefined };
  }
  if (/youtube\.com|youtu\.be/i.test(clean)) throw new RepAccessError("YouTube links go under YouTube playlist.");
  return type === "books"
    ? { materialType: "pdf" as const, kind: "link" as const, description: "book" }
    : { materialType: "slides" as const, kind: "link" as const, description: undefined };
}

export async function repAddMaterial(input: { courseId: string; type: RepMaterialType; title: string; url: string; lecturer?: string }) {
  const rep = await requireApprovedRep();
  const course = await requireOwnCourse(rep, input.courseId);
  const title = input.title.trim();
  if (title.length < 2) throw new RepAccessError("Give it a title.");
  const fields = materialFields(input.type, input.url);
  const created = await createCourseMaterialsAdminRepository().createCourseMaterial({
    departmentId: rep.departmentId,
    studyYear: rep.studyYear,
    semester: course.semester ?? null,
    entryType: "material",
    parentId: course.id,
    courseTitle: title,
    url: input.url.trim(),
    status: "published",
    credit: cleanLecturer(input.lecturer),
    ...fields,
  });
  await markRep(created.id, rep);
  after(() => notifyRepUpload({ departmentId: rep.departmentId, studyYear: rep.studyYear, courseId: course.id, courseTitle: course.courseTitle, title, kind: input.type === "youtube" ? "videos" : input.type }));
  return created;
}

export async function repUpdateEntry(id: string, patch: { title?: string; url?: string; courseCode?: string }) {
  const rep = await requireApprovedRep();
  const entry = await requireOwnEntry(rep, id);
  const next: Partial<CourseMaterialEntry> = {};
  if (patch.title !== undefined) {
    if (patch.title.trim().length < 2) throw new RepAccessError("Give it a title.");
    next.courseTitle = patch.title.trim();
  }
  if (getEntryType(entry) === "course" && patch.courseCode !== undefined) next.courseCode = patch.courseCode.trim().toUpperCase() || undefined;
  if (getEntryType(entry) === "material" && patch.url !== undefined) {
    const type: RepMaterialType = entry.materialType === "playlist" || entry.materialType === "video" ? "youtube" : entry.description === "book" ? "books" : "slides";
    Object.assign(next, materialFields(type, patch.url), { url: patch.url.trim() });
  }
  // Scope fields are never taken from the rep.
  return createCourseMaterialsAdminRepository().updateCourseMaterial(id, next);
}

export async function repRemoveEntry(id: string) {
  const rep = await requireApprovedRep();
  const entry = await requireOwnEntry(rep, id);
  const repository = createCourseMaterialsAdminRepository();
  if (getEntryType(entry) === "course") {
    const children = (await repository.listCourseMaterials({ departmentId: rep.departmentId })).filter((m) => m.parentId === entry.id);
    for (const child of children) await repository.archiveCourseMaterial(child.id);
  }
  await repository.archiveCourseMaterial(id);
  // A file the site uploaded to the Back2Basics Drive goes to that Drive's bin (drive.file can't touch anyone else's files).
  const fileId = getEntryType(entry) === "material" ? parseDriveFileId(entry.url) : null;
  if (fileId) await trashUploadedFile(fileId);
}

/* ─── Uploads to the Back2Basics Drive ───────────────────────────────── */

export type UploadKind = "slides" | "books";

export async function repStartUpload(input: { courseId: string; fileName: string; fileType: string; size: number }) {
  const rep = await requireApprovedRep();
  const course = await requireOwnCourse(rep, input.courseId);
  const folder = await courseUploadFolder(course, rep.departmentName);
  const uploadUrl = await startUpload(folder, { name: input.fileName, type: input.fileType, size: input.size });
  return { uploadUrl };
}

export async function repFinishUpload(input: { courseId: string; kind: UploadKind; fileId: string; title: string; lecturer?: string }) {
  const rep = await requireApprovedRep();
  const course = await requireOwnCourse(rep, input.courseId);
  if (!course.driveFolderId) throw new RepAccessError("Start the upload again.");
  const file = await finishUpload(input.fileId, course.driveFolderId);
  const title = input.title.trim() || file.name.replace(/\.(pdf|pptx?|docx?)$/i, "");
  const created = await createCourseMaterialsAdminRepository().createCourseMaterial({
    departmentId: rep.departmentId,
    studyYear: rep.studyYear,
    semester: course.semester ?? null,
    entryType: "material",
    parentId: course.id,
    courseTitle: title,
    url: `https://drive.google.com/file/d/${file.id}/view`,
    status: "published",
    materialType: input.kind === "books" ? "pdf" : "slides",
    description: input.kind === "books" ? "book" : undefined,
    kind: "link",
    credit: cleanLecturer(input.lecturer),
  });
  await markRep(created.id, rep);
  after(() => notifyRepUpload({ departmentId: rep.departmentId, studyYear: rep.studyYear, courseId: course.id, courseTitle: course.courseTitle, title, kind: input.kind }));
  return created;
}

/* ─── Hiding files inside a linked Drive folder ─────────────────────── */

export async function repSetHiddenFiles(materialId: string, fileIds: string[]) {
  const rep = await requireApprovedRep();
  const entry = await requireOwnEntry(rep, materialId);
  if (getEntryType(entry) !== "material" || !parseDriveFolderId(entry.url)) throw new RepAccessError("Only Drive folders have files to hide.");
  const ids = [...new Set(fileIds.filter((id) => /^[A-Za-z0-9_-]{10,}$/.test(id)))].slice(0, 2000);
  const { error } = await db().from("course_materials").update({ hidden_files: ids, updated_at: new Date().toISOString() }).eq("id", materialId);
  if (error) throw new RepAccessError("Could not save that change.");
}

/* ─── Admin: turn existing slide folders into courses ───────────────── */

export interface ImportSource {
  materialId: string;
  departmentId: string;
  departmentName: string;
  studyYear: number;
  semester: 1 | 2;
  title: string;
  folderId: string;
  alreadyImported: string[];
}

export async function listImportSources(): Promise<ImportSource[]> {
  const repository = createCourseMaterialsAdminRepository();
  const [departments, entries] = await Promise.all([repository.listDepartments(), repository.listCourseMaterials()]);
  const names = new Map(departments.map((d) => [d.id, d.name]));
  const linked = new Map<string, Set<string>>();
  for (const e of entries) {
    if (e.status === "archived" || getEntryType(e) !== "material" || !e.parentId) continue;
    const folder = parseDriveFolderId(e.url);
    if (!folder) continue;
    const parent = entries.find((p) => p.id === e.parentId);
    if (!parent || /^\s*all\b|semester|first year|slides$/i.test(parent.courseTitle)) continue; // the bundle itself, not an imported course
    if (!linked.has(e.departmentId)) linked.set(e.departmentId, new Set());
    linked.get(e.departmentId)!.add(folder);
  }
  return entries
    .filter((e) => e.status === "published" && e.departmentId !== GENERAL_DEPARTMENT_ID && getEntryType(e) !== "course" && parseDriveFolderId(e.url))
    .filter((e) => /\b(all|slides|semester|year)\b/i.test(e.courseTitle))
    .map((e) => ({
      materialId: e.id,
      departmentId: e.departmentId,
      departmentName: names.get(e.departmentId) ?? e.departmentId,
      studyYear: e.studyYear ?? 1,
      semester: (/second\s+sem/i.test(e.courseTitle) ? 2 : e.semester ?? 1) as 1 | 2,
      title: e.courseTitle,
      folderId: parseDriveFolderId(e.url) as string,
      alreadyImported: [...(linked.get(e.departmentId) ?? [])],
    }));
}

export async function importCoursesFromFolder(sourceMaterialId: string, folders: Array<{ folderId: string; code: string; title: string }>) {
  const source = (await listImportSources()).find((s) => s.materialId === sourceMaterialId);
  if (!source) throw new Error("That slides folder was not found.");
  const repository = createCourseMaterialsAdminRepository();
  let created = 0;
  for (const folder of folders) {
    if (!/^[A-Za-z0-9_-]{10,}$/.test(folder.folderId) || source.alreadyImported.includes(folder.folderId)) continue;
    const title = folder.title.trim();
    if (!title) continue;
    const course = await repository.createCourseMaterial({
      departmentId: source.departmentId,
      studyYear: source.studyYear as CourseMaterialYear,
      semester: source.semester,
      entryType: "course",
      courseCode: folder.code.trim().toUpperCase() || undefined,
      courseTitle: title,
      url: "",
      status: "published",
    });
    await repository.createCourseMaterial({
      departmentId: source.departmentId,
      studyYear: source.studyYear as CourseMaterialYear,
      semester: source.semester,
      entryType: "material",
      parentId: course.id,
      courseTitle: "Slides",
      url: `https://drive.google.com/drive/folders/${folder.folderId}`,
      status: "published",
      materialType: "slides",
      kind: "link",
    });
    created += 1;
  }
  return created;
}

/* ─── Admin side ─────────────────────────────────────────────────────── */

export async function listApplicationsForAdmin(): Promise<RepApplication[]> {
  const { data, error } = await db().from("course_rep_applications").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  const names = await departmentNames([...new Set(rows.map((r) => r.department_id))]);
  const { data: uploads } = await db().from("course_materials").select("created_by_rep").not("created_by_rep", "is", null).neq("status", "archived");
  const counts = new Map<string, number>();
  for (const u of (uploads ?? []) as Array<{ created_by_rep: string }>) counts.set(u.created_by_rep, (counts.get(u.created_by_rep) ?? 0) + 1);
  return rows.map((r) => ({ ...map(r, names), uploads: counts.get(r.id) ?? 0 }));
}

async function textRep(application: RepApplication, message: string) {
  try {
    const configuration = getArkeselConfiguration();
    await submitArkeselSmsBatch(configuration, { recipients: [{ phoneNumber: application.phone }], message });
  } catch {
    /* SMS is a courtesy; the decision stands even if the text fails */
  }
}

export async function setApplicationStatus(id: string, status: Exclude<RepStatus, "pending">): Promise<void> {
  const { data, error } = await db()
    .from("course_rep_applications")
    .update({ status, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error || !data) throw new Error("Could not update that application.");
  const application = map(data as Row, await departmentNames([(data as Row).department_id]));
  const first = application.fullName.split(" ")[0];
  if (status === "approved") {
    await textRep(application, `Hi ${first}, you're now the Back2Basics course rep for ${application.departmentName}, Year ${application.studyYear}. Sign in at b2bwithkwamina.com/course-rep to add materials for your class.`);
  } else if (status === "declined") {
    await textRep(application, `Hi ${first}, your Back2Basics course rep application for ${application.departmentName}, Year ${application.studyYear} was not approved. Reply to this number if you think this is a mistake.`);
  }
}
