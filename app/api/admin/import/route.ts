import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import { createCourseMaterialsAdminRepository } from "@/lib/content/adminRepository";
import { courseUploadFolder, finishUpload, startUpload } from "@/lib/courseReps/googleDrive";

export const dynamic = "force-dynamic";

/**
 * Bulk import of course files into the Back2Basics Drive, used by an admin's import script.
 * It is authorised by a short-lived import key (Authorization: Bearer <key>); only the key's
 * SHA-256 is stored, in admin_import_keys, and each key is tied to one programme.
 *
 * POST { action: "start", year, semester, courseCode?, courseTitle, fileName, fileType, size }
 *   -> { courseId, uploadUrl }   (the script PUTs the bytes to uploadUrl, Google answers with the file id)
 * POST { action: "finish", courseId, fileId, title, credit? }
 *   -> { materialId, url }
 */

type Db = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const db = () => createSupabaseAdminClient() as unknown as Db;

async function authorise(request: Request) {
  const key = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (key.length < 32) return null;
  const hash = createHash("sha256").update(key).digest("hex");
  const { data } = await db().from("admin_import_keys").select("department_id, credit, expires_at, revoked").eq("key_hash", hash).maybeSingle();
  if (!data || data.revoked || new Date(data.expires_at).getTime() < Date.now()) return null;
  const { data: department } = await db().from("departments").select("id, name").eq("id", data.department_id).maybeSingle();
  if (!department) return null;
  return { departmentId: department.id as string, departmentName: department.name as string, credit: (data.credit as string | null) ?? undefined };
}

function text(value: unknown, max = 160) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

async function findOrCreateCourse(departmentId: string, year: number, semester: 1 | 2, courseCode: string, courseTitle: string) {
  const repository = createCourseMaterialsAdminRepository();
  const all = await repository.listCourseMaterials({ departmentId });
  const norm = (s?: string) => (s ?? "").toLowerCase().replace(/\s+/g, "");
  const existing = all.find(
    (entry) => entry.entryType === "course" && entry.studyYear === year && entry.status !== "archived" &&
      (courseCode ? norm(entry.courseCode) === norm(courseCode) : norm(entry.courseTitle) === norm(courseTitle)),
  );
  if (existing) return existing;
  return repository.createCourseMaterial({
    departmentId,
    studyYear: year as never,
    semester,
    entryType: "course",
    courseCode: courseCode || undefined,
    courseTitle,
    url: "",
    status: "published",
  } as never);
}

export async function POST(request: Request) {
  const access = await authorise(request);
  if (!access) return NextResponse.json({ error: "This import key is not valid or has expired." }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }

  try {
    if (body.action === "start") {
      const year = Number(body.year);
      const semester = Number(body.semester) === 2 ? 2 : 1;
      const courseTitle = text(body.courseTitle);
      const courseCode = text(body.courseCode, 20);
      const size = Number(body.size);
      if (!(year >= 1 && year <= 6) || !courseTitle) return NextResponse.json({ error: "Give a year (1-6) and a course title." }, { status: 400 });
      const course = await findOrCreateCourse(access.departmentId, year, semester, courseCode, courseTitle);
      const folder = await courseUploadFolder(course, access.departmentName);
      const uploadUrl = await startUpload(folder, { name: text(body.fileName, 200), type: text(body.fileType, 120), size }, { images: true });
      return NextResponse.json({ courseId: course.id, uploadUrl });
    }

    if (body.action === "finish") {
      const courseId = text(body.courseId, 64);
      const repository = createCourseMaterialsAdminRepository();
      const course = await repository.getCourseMaterial(courseId);
      if (!course || course.departmentId !== access.departmentId || course.entryType !== "course") return NextResponse.json({ error: "Unknown course." }, { status: 404 });
      const { data } = await db().from("course_materials").select("drive_folder_id").eq("id", courseId).maybeSingle();
      if (!data?.drive_folder_id) return NextResponse.json({ error: "Start the upload again." }, { status: 409 });
      const file = await finishUpload(text(body.fileId, 120), data.drive_folder_id as string);
      const url = `https://drive.google.com/file/d/${file.id}/view`;
      const title = text(body.title, 160) || file.name.replace(/\.[a-z0-9]{2,5}$/i, "");
      const created = await repository.createCourseMaterial({
        departmentId: access.departmentId,
        studyYear: course.studyYear,
        semester: course.semester ?? null,
        entryType: "material",
        parentId: course.id,
        courseTitle: title,
        url,
        status: "published",
        materialType: "slides",
        kind: "link",
        credit: text(body.credit, 80) || access.credit,
      } as never);
      return NextResponse.json({ materialId: created.id, url });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed." }, { status: 500 });
  }
}
