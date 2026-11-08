"use server";

import { after } from "next/server";
import { requireAdmin } from "@/lib/adminSession";
import { finishUpload, skillsUploadFolder, startUpload, trashUploadedFile } from "@/lib/courseReps/googleDrive";
import { notifyClass } from "@/lib/courseReps/uploadPush";
import { db, listProgrammes, listWeeks, toProgramme, toWeek, type SkillsProgramme, type SkillsStatus, type SkillsWeek } from "./skillsProgrammes";
import { longDate } from "./skillsFormat";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    await requireAdmin();
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof Error && error.name === "AdminUnauthorizedError") return { ok: false, error: "Admin sign-in required." };
    console.error("[skills admin]", error);
    return { ok: false, error: error instanceof Error && /^(Upload a|Files can be|Google Drive|Uploads are|That file|Give |Pick |Use )/.test(error.message) ? error.message : "Something went wrong. Try again." };
  }
}

const clean = (v: unknown, max = 300) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "") || null;
const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
function url(v: unknown) {
  const s = clean(v, 500);
  if (!s) return null;
  if (!/^https:\/\//i.test(s) && !s.startsWith("/")) throw new Error("Use a full link starting with https://");
  return s;
}

export interface SkillsAdminData {
  programmes: SkillsProgramme[];
  weeks: Record<string, SkillsWeek[]>;
}

export async function skillsAdminDataAction(): Promise<Result<SkillsAdminData>> {
  return run(async () => {
    const programmes = await listProgrammes({ includeHidden: true });
    const weeks: Record<string, SkillsWeek[]> = {};
    for (const p of programmes) weeks[p.id] = await listWeeks(p.id);
    return { programmes, weeks };
  });
}

export async function createProgrammeAction(name: string): Promise<Result<SkillsProgramme>> {
  return run(async () => {
    const title = clean(name, 120);
    if (!title) throw new Error("Give the programme a name.");
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "programme";
    let slug = base;
    for (let i = 2; i < 50; i++) {
      const { data } = await db().from("skills_programmes").select("id").eq("slug", slug).maybeSingle();
      if (!data) break;
      slug = `${base}-${i}`;
    }
    const { data: last } = await db().from("skills_programmes").select("order_index").order("order_index", { ascending: false }).limit(1);
    const order = ((last?.[0]?.order_index as number | undefined) ?? 0) + 1;
    const { data, error } = await db().from("skills_programmes").insert({ slug, name: title, order_index: order, visible: false }).select("*").single();
    if (error || !data) throw new Error("Could not create the programme.");
    return toProgramme(data);
  });
}

export async function saveProgrammeAction(id: string, input: {
  name: string;
  subtitle?: string;
  partner?: string;
  partnerLogo?: string;
  price: "free" | "paid";
  status: SkillsStatus;
  startsOn?: string;
  endsOn?: string;
  description?: string;
  registerUrl?: string;
  detailHref?: string;
  visible: boolean;
}): Promise<Result<null>> {
  return run(async () => {
    const name = clean(input.name, 120);
    if (!name) throw new Error("Give the programme a name.");
    const startsOn = day(input.startsOn);
    const endsOn = day(input.endsOn);
    if (startsOn && endsOn && endsOn < startsOn) throw new Error("Pick an end date after the start date.");
    const { error } = await db()
      .from("skills_programmes")
      .update({
        name,
        subtitle: clean(input.subtitle, 120),
        partner: clean(input.partner, 80),
        partner_logo: url(input.partnerLogo),
        price: input.price === "paid" ? "paid" : "free",
        status: ["", "coming_soon", "ongoing", "ended"].includes(input.status) ? input.status : "",
        starts_on: startsOn,
        ends_on: endsOn,
        description: clean(input.description, 400),
        register_url: url(input.registerUrl),
        detail_href: url(input.detailHref),
        visible: Boolean(input.visible),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error("Could not save.");
    return null;
  });
}

export async function moveProgrammeAction(id: string, direction: "up" | "down"): Promise<Result<null>> {
  return run(async () => {
    const list = await listProgrammes({ includeHidden: true });
    const i = list.findIndex((p) => p.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= list.length) return null;
    [list[i], list[j]] = [list[j], list[i]];
    for (let k = 0; k < list.length; k++) await db().from("skills_programmes").update({ order_index: k }).eq("id", list[k].id);
    return null;
  });
}

export async function deleteProgrammeAction(id: string): Promise<Result<null>> {
  return run(async () => {
    await db().from("skills_programmes").delete().eq("id", id);
    return null;
  });
}

export async function saveNextSessionAction(id: string, input: { week?: number | null; topic?: string; date?: string; time?: string; venue?: string; note?: string; notify?: boolean }): Promise<Result<null>> {
  return run(async () => {
    const week = Number.isInteger(input.week) && (input.week as number) > 0 && (input.week as number) < 100 ? (input.week as number) : null;
    const next = { next_week: week, next_topic: clean(input.topic, 120), next_date: day(input.date), next_time: clean(input.time, 60), next_venue: clean(input.venue, 120), next_note: clean(input.note, 200) };
    const { data, error } = await db().from("skills_programmes").update({ ...next, updated_at: new Date().toISOString() }).eq("id", id).select("slug,name").single();
    if (error || !data) throw new Error("Could not save.");
    if (input.notify && next.next_date) {
      const what = [week ? `Week ${week}` : null, next.next_topic].filter(Boolean).join(": ");
      const when = [longDate(next.next_date), next.next_time, next.next_venue].filter(Boolean).join(", ");
      after(() =>
        notifyClass({ departmentId: "*", studyYear: 0, title: `Next ${data.name} session`, body: `${what ? `${what}. ` : ""}${when}.`, path: `/skills-workshop/${data.slug}`, tag: `skills-next-${data.slug}` }),
      );
    }
    return null;
  });
}

export async function addWeekAction(programmeId: string): Promise<Result<SkillsWeek>> {
  return run(async () => {
    const weeks = await listWeeks(programmeId);
    const n = (weeks[0]?.weekNumber ?? 0) + 1;
    const { data, error } = await db().from("skills_weeks").insert({ programme_id: programmeId, week_number: n }).select("*").single();
    if (error || !data) throw new Error("Could not add the week.");
    return toWeek(data);
  });
}

export async function saveWeekAction(id: string, input: { weekNumber: number; title?: string; heldOn?: string; pixiesetUrl?: string }): Promise<Result<null>> {
  return run(async () => {
    const n = Number(input.weekNumber);
    if (!Number.isInteger(n) || n < 1 || n > 99) throw new Error("Give the week a number.");
    const pix = url(input.pixiesetUrl);
    const { error } = await db().from("skills_weeks").update({ week_number: n, title: clean(input.title, 120) ?? "", held_on: day(input.heldOn), pixieset_url: pix, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error("Could not save.");
    return null;
  });
}

export async function deleteWeekAction(id: string): Promise<Result<null>> {
  return run(async () => {
    const { data } = await db().from("skills_weeks").select("previews").eq("id", id).maybeSingle();
    await db().from("skills_weeks").delete().eq("id", id);
    for (const p of (Array.isArray(data?.previews) ? data.previews : []) as Array<{ fileId?: string }>) if (p.fileId) await trashUploadedFile(p.fileId);
    return null;
  });
}

async function weekWithProgramme(weekId: string) {
  const { data: week } = await db().from("skills_weeks").select("*").eq("id", weekId).maybeSingle();
  if (!week) throw new Error("That week was removed.");
  const { data: programme } = await db().from("skills_programmes").select("name").eq("id", week.programme_id).maybeSingle();
  return { week: toWeek(week), programmeName: (programme?.name as string) ?? "Skills training" };
}

export async function startPreviewUploadAction(weekId: string, file: { name: string; type: string; size: number }): Promise<Result<{ uploadUrl: string }>> {
  return run(async () => {
    const { programmeName } = await weekWithProgramme(weekId);
    if (!file.type.startsWith("image/")) throw new Error("Upload a photo (JPG or PNG).");
    const folder = await skillsUploadFolder(programmeName);
    return { uploadUrl: await startUpload(folder, file, { images: true }) };
  });
}

export async function finishPreviewUploadAction(weekId: string, fileId: string): Promise<Result<null>> {
  return run(async () => {
    const { week, programmeName } = await weekWithProgramme(weekId);
    const folder = await skillsUploadFolder(programmeName);
    await finishUpload(fileId, folder);
    const previews = [...week.previews, { fileId }].slice(0, 12);
    await db().from("skills_weeks").update({ previews, updated_at: new Date().toISOString() }).eq("id", weekId);
    return null;
  });
}

export async function removePreviewAction(weekId: string, fileId: string): Promise<Result<null>> {
  return run(async () => {
    const { week } = await weekWithProgramme(weekId);
    await db().from("skills_weeks").update({ previews: week.previews.filter((p) => p.fileId !== fileId) }).eq("id", weekId);
    await db().from("skills_programmes").update({ cover_file_id: null }).eq("cover_file_id", fileId);
    await trashUploadedFile(fileId);
    return null;
  });
}

export async function movePreviewAction(weekId: string, fileId: string, direction: -1 | 1): Promise<Result<null>> {
  return run(async () => {
    const { week } = await weekWithProgramme(weekId);
    const list = [...week.previews];
    const i = list.findIndex((p) => p.fileId === fileId);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= list.length) return null;
    [list[i], list[j]] = [list[j], list[i]];
    await db().from("skills_weeks").update({ previews: list }).eq("id", weekId);
    return null;
  });
}

export async function setCoverAction(programmeId: string, fileId: string | null): Promise<Result<null>> {
  return run(async () => {
    await db().from("skills_programmes").update({ cover_file_id: fileId }).eq("id", programmeId);
    return null;
  });
}
