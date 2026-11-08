/**
 * Skills training programmes (tiles on /skills-workshop), each with a
 * "coming next week" card and weekly galleries. The full photos and videos
 * live on Pixieset; a few preview photos per week are stored in the
 * Back2Basics Google Drive and shown on our site.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/client";

if (typeof window !== "undefined") throw new Error("lib/site/skillsProgrammes.ts is server-only.");

export type SkillsStatus = "" | "coming_soon" | "ongoing" | "ended";

export interface SkillsPreview {
  fileId: string;
}

export interface SkillsWeek {
  id: string;
  programmeId: string;
  weekNumber: number;
  title: string;
  heldOn: string | null;
  pixiesetUrl: string | null;
  previews: SkillsPreview[];
}

export interface SkillsProgramme {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  partner: string | null;
  partnerLogo: string | null;
  price: "free" | "paid";
  status: SkillsStatus;
  startsOn: string | null;
  endsOn: string | null;
  description: string | null;
  coverFileId: string | null;
  detailHref: string | null;
  registerUrl: string | null;
  visible: boolean;
  order: number;
  next: { week: number | null; topic: string | null; date: string | null; time: string | null; venue: string | null; note: string | null };
}

type ProgrammeRow = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  partner: string | null;
  partner_logo: string | null;
  price: "free" | "paid";
  status: SkillsStatus;
  starts_on: string | null;
  ends_on: string | null;
  description: string | null;
  cover_file_id: string | null;
  detail_href: string | null;
  register_url: string | null;
  visible: boolean;
  order_index: number;
  next_week: number | null;
  next_topic: string | null;
  next_date: string | null;
  next_time: string | null;
  next_venue: string | null;
  next_note: string | null;
};

type WeekRow = { id: string; programme_id: string; week_number: number; title: string; held_on: string | null; pixieset_url: string | null; previews: unknown };

export function db() {
  return createSupabaseAdminClient() as unknown as { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function toProgramme(r: ProgrammeRow): SkillsProgramme {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    subtitle: r.subtitle,
    partner: r.partner,
    partnerLogo: r.partner_logo,
    price: r.price,
    status: r.status,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    description: r.description,
    coverFileId: r.cover_file_id,
    detailHref: r.detail_href,
    registerUrl: r.register_url,
    visible: r.visible,
    order: r.order_index,
    next: { week: r.next_week, topic: r.next_topic, date: r.next_date, time: r.next_time, venue: r.next_venue, note: r.next_note },
  };
}

export function toWeek(r: WeekRow): SkillsWeek {
  const previews = Array.isArray(r.previews) ? (r.previews as Array<{ fileId?: unknown }>).filter((p) => typeof p?.fileId === "string").map((p) => ({ fileId: p.fileId as string })) : [];
  return { id: r.id, programmeId: r.programme_id, weekNumber: r.week_number, title: r.title, heldOn: r.held_on, pixiesetUrl: r.pixieset_url, previews };
}

export async function listProgrammes(options: { includeHidden?: boolean } = {}): Promise<SkillsProgramme[]> {
  let q = db().from("skills_programmes").select("*").order("order_index", { ascending: true }).order("created_at", { ascending: true });
  if (!options.includeHidden) q = q.eq("visible", true);
  const { data } = await q;
  return ((data ?? []) as ProgrammeRow[]).map(toProgramme);
}

export async function getProgramme(slug: string): Promise<SkillsProgramme | null> {
  const { data } = await db().from("skills_programmes").select("*").eq("slug", slug).maybeSingle();
  return data ? toProgramme(data as ProgrammeRow) : null;
}

export async function listWeeks(programmeId: string): Promise<SkillsWeek[]> {
  const { data } = await db().from("skills_weeks").select("*").eq("programme_id", programmeId).order("week_number", { ascending: false });
  return ((data ?? []) as WeekRow[]).map(toWeek);
}

/** Drive thumbnail for a public file. */
export function previewSrc(fileId: string, width = 1200) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${width}`;
}
