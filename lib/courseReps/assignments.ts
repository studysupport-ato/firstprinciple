/**
 * Assignments on the notice board.
 *
 * A course rep posts text, a picture or a PDF for one of their courses; the
 * class gets a phone notification. Students can mark one done (just for their
 * own records) and ask for repeated phone reminders until a time they choose.
 *
 * All reads and writes go through here with the service role; the tables have
 * RLS on and no browser policies.
 */
import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerVapidConfig, isPushServerConfigured } from "@/lib/push/config";
import { sendOneNotification } from "@/lib/push/dispatch";
import { validateSubscriptionEndpoint, validateSubscriptionKeys } from "@/lib/push/validation";
import { isAdminVisitor } from "@/lib/site/isAdminVisitor";
import { RepAccessError, requireApprovedRep, requireOwnCourse } from "./repService";
import { courseUploadFolder, finishUpload, startUpload, trashUploadedFile } from "./googleDrive";
import { notifyClass } from "./uploadPush";

if (typeof window !== "undefined") throw new Error("lib/courseReps/assignments.ts is server-only.");

export interface Assignment {
  id: string;
  courseId: string;
  courseTitle: string;
  body: string;
  fileId: string | null;
  fileKind: "image" | "pdf" | null;
  fileName: string | null;
  urgent: boolean;
  postedBy: string | null;
  createdAt: string;
}

export interface AssignmentWithMine extends Assignment {
  done: boolean;
  reminder: { everyMinutes: number; endsAt: string } | null;
}

type Row = {
  id: string;
  course_id: string;
  course_title: string;
  body: string;
  file_id: string | null;
  file_kind: "image" | "pdf" | null;
  file_name: string | null;
  urgent: boolean;
  posted_by: string | null;
  created_at: string;
};

const COLUMNS = "id,course_id,course_title,body,file_id,file_kind,file_name,urgent,posted_by,created_at";

function db() {
  return createSupabaseAdminClient() as unknown as { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

function toAssignment(r: Row): Assignment {
  return { id: r.id, courseId: r.course_id, courseTitle: r.course_title, body: r.body, fileId: r.file_id, fileKind: r.file_kind, fileName: r.file_name, urgent: r.urgent, postedBy: r.posted_by, createdAt: r.created_at };
}

/* ─── Who is asking (student side) ───────────────────────────────────── */

/** Signed-in students are tracked by account; everyone else by a random id kept in their browser. */
async function ownerKey(deviceId: unknown): Promise<string> {
  try {
    const { data } = await (await createSupabaseServerClient()).auth.getUser();
    if (data.user?.id) return `u:${data.user.id}`;
  } catch {
    /* not signed in */
  }
  if (typeof deviceId === "string" && /^[a-zA-Z0-9-]{16,64}$/.test(deviceId)) return `d:${deviceId}`;
  throw new Error("Refresh the page and try again.");
}

async function publishedDepartment(departmentId: string) {
  const { data } = await db().from("departments").select("id,status").eq("id", departmentId).maybeSingle();
  if (!data) return false;
  if (data.status === "published") return true;
  // Hidden programmes (like the test one) are visible to the admin only.
  return isAdminVisitor();
}

/* ─── Students ───────────────────────────────────────────────────────── */

export async function listClassAssignments(input: { departmentId: string; studyYear: number; deviceId?: string }): Promise<AssignmentWithMine[]> {
  const departmentId = String(input.departmentId ?? "").slice(0, 120);
  const studyYear = Number(input.studyYear);
  if (!departmentId || !Number.isInteger(studyYear) || !(await publishedDepartment(departmentId))) return [];
  const { data } = await db().from("course_assignments").select(COLUMNS).eq("department_id", departmentId).eq("study_year", studyYear).order("created_at", { ascending: false }).limit(100);
  const list = ((data ?? []) as Row[]).map(toAssignment);
  if (!list.length) return [];
  let owner: string | null = null;
  try {
    owner = await ownerKey(input.deviceId);
  } catch {
    owner = null;
  }
  const done = new Set<string>();
  const reminders = new Map<string, { everyMinutes: number; endsAt: string }>();
  if (owner) {
    const ids = list.map((a) => a.id);
    const [p, r] = await Promise.all([
      db().from("assignment_progress").select("assignment_id,done").eq("owner", owner).in("assignment_id", ids),
      db().from("assignment_reminders").select("assignment_id,every_minutes,ends_at").eq("owner", owner).in("assignment_id", ids),
    ]);
    for (const row of (p.data ?? []) as Array<{ assignment_id: string; done: boolean }>) if (row.done) done.add(row.assignment_id);
    for (const row of (r.data ?? []) as Array<{ assignment_id: string; every_minutes: number; ends_at: string }>) {
      if (Date.parse(row.ends_at) > Date.now()) reminders.set(row.assignment_id, { everyMinutes: row.every_minutes, endsAt: row.ends_at });
    }
  }
  return list.map((a) => ({ ...a, done: done.has(a.id), reminder: reminders.get(a.id) ?? null }));
}

export async function setAssignmentDone(input: { assignmentId: string; done: boolean; deviceId?: string }) {
  const owner = await ownerKey(input.deviceId);
  const { data: exists } = await db().from("course_assignments").select("id").eq("id", input.assignmentId).maybeSingle();
  if (!exists) throw new Error("That assignment was removed.");
  await db().from("assignment_progress").upsert({ owner, assignment_id: input.assignmentId, done: Boolean(input.done), updated_at: new Date().toISOString() }, { onConflict: "owner,assignment_id" });
  // Done means no more nagging.
  if (input.done) await db().from("assignment_reminders").delete().eq("owner", owner).eq("assignment_id", input.assignmentId);
}

export const REMINDER_INTERVALS = [30, 60, 180, 360, 720, 1440] as const;

export async function setAssignmentReminder(input: { assignmentId: string; everyMinutes: number; endsAt: string; endpoint: string; keys: { p256dh: string; auth: string }; deviceId?: string }) {
  const owner = await ownerKey(input.deviceId);
  const endpoint = validateSubscriptionEndpoint(input.endpoint);
  if (!endpoint.ok) throw new Error("Your browser didn’t give us a notification address.");
  const keys = validateSubscriptionKeys(input.keys);
  if (!keys.ok) throw new Error("Your browser didn’t give us a notification address.");
  const every = Number(input.everyMinutes);
  if (!(REMINDER_INTERVALS as readonly number[]).includes(every)) throw new Error("Pick how often to remind you.");
  const ends = Date.parse(input.endsAt);
  if (!Number.isFinite(ends) || ends <= Date.now() + 60_000) throw new Error("Pick an end time later than now.");
  if (ends > Date.now() + 60 * 86_400_000) throw new Error("Pick an end time within the next 60 days.");
  const { data: exists } = await db().from("course_assignments").select("id").eq("id", input.assignmentId).maybeSingle();
  if (!exists) throw new Error("That assignment was removed.");
  const { error } = await db()
    .from("assignment_reminders")
    .upsert(
      {
        owner,
        assignment_id: input.assignmentId,
        endpoint: endpoint.data,
        p256dh: keys.data.p256dh,
        auth: keys.data.auth,
        every_minutes: every,
        next_at: new Date(Date.now() + every * 60_000).toISOString(),
        ends_at: new Date(ends).toISOString(),
        failed_attempts: 0,
      },
      { onConflict: "owner,assignment_id" },
    );
  if (error) throw new Error("Could not save the reminder.");
  // Setting a reminder means it isn't done yet.
  await db().from("assignment_progress").upsert({ owner, assignment_id: input.assignmentId, done: false, updated_at: new Date().toISOString() }, { onConflict: "owner,assignment_id" });
}

export async function clearAssignmentReminder(input: { assignmentId: string; deviceId?: string }) {
  const owner = await ownerKey(input.deviceId);
  await db().from("assignment_reminders").delete().eq("owner", owner).eq("assignment_id", input.assignmentId);
}

/* ─── Course reps ────────────────────────────────────────────────────── */

export async function repListAssignments(): Promise<Assignment[]> {
  const rep = await requireApprovedRep();
  const { data } = await db().from("course_assignments").select(COLUMNS).eq("department_id", rep.departmentId).eq("study_year", rep.studyYear).order("created_at", { ascending: false }).limit(200);
  return ((data ?? []) as Row[]).map(toAssignment);
}

export async function repStartAssignmentUpload(input: { courseId: string; fileName: string; fileType: string; size: number }) {
  const rep = await requireApprovedRep();
  const course = await requireOwnCourse(rep, input.courseId);
  const folder = await courseUploadFolder(course, rep.departmentName);
  return { uploadUrl: await startUpload(folder, { name: input.fileName, type: input.fileType, size: input.size }, { images: true }) };
}

export async function repPostAssignment(input: { courseId: string; body: string; fileId?: string; urgent?: boolean }) {
  const rep = await requireApprovedRep();
  const course = await requireOwnCourse(rep, input.courseId);
  const body = String(input.body ?? "").replace(/\r\n/g, "\n").trim().slice(0, 4000);
  let file: { id: string; name: string; kind: "image" | "pdf" } | null = null;
  if (input.fileId) {
    if (!course.driveFolderId) throw new RepAccessError("Start the upload again.");
    const done = await finishUpload(input.fileId, course.driveFolderId);
    file = { id: done.id, name: done.name, kind: /\.pdf$/i.test(done.name) ? "pdf" : "image" };
  }
  if (!body && !file) throw new RepAccessError("Type the assignment or add a picture or PDF.");
  const { data, error } = await db()
    .from("course_assignments")
    .insert({
      department_id: rep.departmentId,
      study_year: rep.studyYear,
      course_id: course.id,
      course_title: course.courseTitle,
      body,
      file_id: file?.id ?? null,
      file_kind: file?.kind ?? null,
      file_name: file?.name ?? null,
      urgent: Boolean(input.urgent),
      posted_by: rep.fullName,
      rep_id: rep.id,
    })
    .select(COLUMNS)
    .single();
  if (error || !data) throw new RepAccessError("Could not post the assignment.");
  const posted = toAssignment(data as Row);
  const preview = body ? body.replace(/\s+/g, " ").slice(0, 120) : file?.kind === "pdf" ? "PDF attached" : "Picture attached";
  after(() =>
    notifyClass({
      departmentId: rep.departmentId,
      studyYear: rep.studyYear,
      title: `${posted.urgent ? "Urgent assignment" : "New assignment"}: ${course.courseTitle}`,
      body: `${preview}. Tap to open.`,
      path: `/?notice=${posted.id}#materials`,
      tag: `assignment-${posted.id}`,
    }),
  );
  return posted;
}

async function requireOwnAssignment(id: string) {
  const rep = await requireApprovedRep();
  const { data } = await db().from("course_assignments").select("id,department_id,study_year,file_id").eq("id", id).maybeSingle();
  if (!data || data.department_id !== rep.departmentId || data.study_year !== rep.studyYear) throw new RepAccessError("That assignment is not part of your access.");
  return data as { id: string; file_id: string | null };
}

export async function repSetAssignmentUrgent(id: string, urgent: boolean) {
  await requireOwnAssignment(id);
  await db().from("course_assignments").update({ urgent, updated_at: new Date().toISOString() }).eq("id", id);
}

export async function repRemoveAssignment(id: string) {
  const row = await requireOwnAssignment(id);
  await db().from("course_assignments").delete().eq("id", id);
  if (row.file_id) await trashUploadedFile(row.file_id);
}

/* ─── Reminder worker (called every few minutes) ─────────────────────── */

export async function sendDueReminders() {
  if (!isPushServerConfigured()) return { sent: 0 };
  const vapid = getServerVapidConfig();
  const now = new Date();
  // Finished reminders first.
  await db().from("assignment_reminders").delete().lt("ends_at", now.toISOString());
  const { data } = await db().from("assignment_reminders").select("id,owner,assignment_id,endpoint,p256dh,auth,every_minutes,next_at,ends_at,failed_attempts").lte("next_at", now.toISOString()).limit(500);
  const due = (data ?? []) as Array<{ id: string; owner: string; assignment_id: string; endpoint: string; p256dh: string; auth: string; every_minutes: number; next_at: string; ends_at: string; failed_attempts: number }>;
  if (!due.length) return { sent: 0 };
  const ids = [...new Set(due.map((d) => d.assignment_id))];
  const { data: rows } = await db().from("course_assignments").select("id,course_title,body,file_kind").in("id", ids);
  const byId = new Map(((rows ?? []) as Array<{ id: string; course_title: string; body: string; file_kind: string | null }>).map((r) => [r.id, r]));
  let sent = 0;
  for (const r of due) {
    const a = byId.get(r.assignment_id);
    if (!a) continue;
    const next = Date.parse(r.next_at) + r.every_minutes * 60_000;
    const preview = a.body ? a.body.replace(/\s+/g, " ").slice(0, 110) : a.file_kind === "pdf" ? "PDF attached" : "Picture attached";
    const payload = JSON.stringify({
      title: `Reminder: ${a.course_title} assignment`,
      body: `${preview}. Tap to open, or mark it done to stop reminders.`.slice(0, 200),
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: `assignment-reminder-${a.id}`,
      url: `https://www.b2bwithkwamina.com/?notice=${a.id}#materials`,
      data: { url: `https://www.b2bwithkwamina.com/?notice=${a.id}#materials` },
    });
    const outcome = await sendOneNotification({ id: r.id, endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }, payload, vapid);
    if (outcome.kind === "success") sent++;
    if (outcome.kind === "expired_endpoint" || (outcome.kind !== "success" && r.failed_attempts >= 4) || next > Date.parse(r.ends_at)) {
      await db().from("assignment_reminders").delete().eq("id", r.id);
    } else {
      // Skip any slots missed while the worker was down, so a phone never gets a burst.
      let upcoming = next;
      while (upcoming <= now.getTime()) upcoming += r.every_minutes * 60_000;
      await db()
        .from("assignment_reminders")
        .update({ next_at: new Date(upcoming).toISOString(), failed_attempts: outcome.kind === "success" ? 0 : r.failed_attempts + 1 })
        .eq("id", r.id);
    }
  }
  return { sent };
}
