"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Archive, ArchiveRestore, ArrowLeft, ExternalLink, Link2, Minus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { GeoGebraProvider } from "@/components/learning/GeoGebraProvider";
import { AdminErrorState } from "@/components/admin/AdminErrorState";
import { AdminLoadingState } from "@/components/admin/AdminLoadingState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { getCourse, getCourses, getLesson, getWeek, getWeeks } from "@/lib/content/access";
import { getWeekDays } from "@/lib/curriculum";
import {
  getGeoGebraEmbedConfig,
  getGeoGebraSourceLabel,
  getYouTubeSourceLabel,
  getYouTubeThumbnailUrl,
  resolveGeoGebraEmbed,
  type GeoGebraAppName,
  type GeoGebraEmbedResolution,
} from "@/lib/content/resourcePresentation";
import {
  archiveResource,
  attachResource,
  detachResource,
  getResourceById,
  getResourcePlacements,
  restoreResource,
  createResource,
  updateResource,
  validateLearningResource,
} from "@/lib/content/resources";
import type {
  GeoGebraInteractiveConfig,
  LearningResource,
  LearningResourceInput,
  LearningResourceStatus,
  LearningResourceType,
  ResourcePlacement,
  ResourcePlacementTarget,
  YouTubeSourceType,
} from "@/lib/content/types";

const typeLabels: Record<LearningResourceType, string> = { youtube: "YouTube", geogebra: "GeoGebra", external: "External" };
const statuses: LearningResourceStatus[] = ["draft", "published", "archived"];

type ResourceForm = {
  type: LearningResourceType;
  title: string;
  description: string;
  tags: string;
  status: LearningResourceStatus;
  youtubeUrl: string;
  youtubeVideoId: string;
  youtubeSourceType: YouTubeSourceType;
  youtubeThumbnailUrl: string;
  geoMaterialId: string;
  geoSourceUrl: string;
  geoAppName: GeoGebraAppName | "";
  geoHeight: string;
  geoShowToolbar: boolean;
  geoShowAlgebraInput: boolean;
  geoShowMenuBar: boolean;
  geoShowResetIcon: boolean;
  geoShowNotes: boolean;
  externalUrl: string;
  externalProvider: string;
};

type PlacementLevel = "course" | "week" | "day";

function emptyForm(type: LearningResourceType = "youtube"): ResourceForm {
  return {
    type,
    title: "",
    description: "",
    tags: "",
    status: "draft",
    youtubeUrl: "",
    youtubeVideoId: "",
    youtubeSourceType: "ato",
    youtubeThumbnailUrl: "",
    geoMaterialId: "",
    geoSourceUrl: "",
    geoAppName: "",
    geoHeight: "420",
    geoShowToolbar: false,
    geoShowAlgebraInput: false,
    geoShowMenuBar: false,
    geoShowResetIcon: true,
    geoShowNotes: false,
    externalUrl: "",
    externalProvider: "",
  };
}

function parseYouTubeVideoId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0] ?? "";
    if (url.hostname.includes("youtube.com")) return url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).pop() ?? "";
  } catch {
    return trimmed;
  }
  return trimmed;
}

function formFromResource(resource: LearningResource): ResourceForm {
  const form = emptyForm(resource.type);
  form.title = resource.title;
  form.description = resource.description ?? "";
  form.tags = resource.tags.join(", ");
  form.status = resource.status;

  if (resource.type === "youtube") {
    form.youtubeUrl = resource.data.url;
    form.youtubeVideoId = resource.data.videoId;
    form.youtubeSourceType = resource.data.sourceType;
    form.youtubeThumbnailUrl = resource.data.thumbnail?.url ?? "";
  }

  if (resource.type === "geogebra") {
    form.geoMaterialId = resource.data.materialId ?? resource.data.config.materialId ?? "";
    form.geoSourceUrl = resource.data.sourceUrl ?? "";
    form.geoAppName = resource.data.appName ?? resource.data.config.appName ?? "";
    form.geoHeight = String(resource.data.config.height ?? 420);
    form.geoShowToolbar = Boolean(resource.data.config.showToolbar);
    form.geoShowAlgebraInput = Boolean(resource.data.config.showAlgebraInput);
    form.geoShowMenuBar = Boolean(resource.data.config.showMenuBar);
    form.geoShowResetIcon = resource.data.config.showResetIcon !== false;
    form.geoShowNotes = Boolean(resource.data.config.showNotes);
  }

  if (resource.type === "external") {
    form.externalUrl = resource.data.url;
    form.externalProvider = resource.data.provider ?? "";
  }

  return form;
}

function buildInput(form: ResourceForm): LearningResourceInput {
  const common = {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    status: form.status,
    tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    metadata: {},
  };

  if (form.type === "youtube") {
    const videoId = form.youtubeVideoId.trim() || parseYouTubeVideoId(form.youtubeUrl);
    const url = form.youtubeUrl.trim() || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "");
    return {
      ...common,
      type: "youtube",
      data: {
        videoId,
        url,
        sourceType: form.youtubeSourceType,
        thumbnail: form.youtubeThumbnailUrl.trim() ? { url: form.youtubeThumbnailUrl.trim() } : undefined,
      },
    };
  }

  if (form.type === "geogebra") {
    const materialId = form.geoMaterialId.trim() || undefined;
    const sourceUrl = form.geoSourceUrl.trim() || undefined;
    const appName = form.geoAppName || undefined;
    const height = Number(form.geoHeight);
    const config: GeoGebraInteractiveConfig = {
      visualizer: "geogebra",
      appName,
      materialId,
      height: Number.isFinite(height) && height > 0 ? height : undefined,
      showToolbar: form.geoShowToolbar,
      showAlgebraInput: form.geoShowAlgebraInput,
      showMenuBar: form.geoShowMenuBar,
      showResetIcon: form.geoShowResetIcon,
      showNotes: form.geoShowNotes,
    };
    return { ...common, type: "geogebra", data: { materialId, sourceUrl, appName, config } };
  }

  return {
    ...common,
    type: "external",
    data: { url: form.externalUrl.trim(), provider: form.externalProvider.trim() || undefined },
  };
}

function fieldLabel(label: string) {
  return <span className="field-label">{label}</span>;
}

function placementTarget(placement: ResourcePlacement): ResourcePlacementTarget {
  if (placement.dayId) return { dayId: placement.dayId };
  if (placement.weekId) return { weekId: placement.weekId };
  return { courseId: placement.courseId };
}

function placementLabel(placement: ResourcePlacement) {
  if (placement.dayId) {
    const day = getLesson(placement.dayId);
    const week = day ? getWeek(day.weekId) : undefined;
    const course = day ? getCourse(day.courseId) : undefined;
    return day ? `${course?.code ?? day.courseId} · ${week?.title ?? day.weekId} · Day ${day.title}` : `Day ${placement.dayId}`;
  }
  if (placement.weekId) return getWeek(placement.weekId)?.title ?? placement.weekId;
  return getCourse(placement.courseId ?? "")?.title ?? placement.courseId ?? "Course";
}

export default function AdminResourceEditorPage() {
  const params = useParams();
  const resourceId = Array.isArray(params.resourceId) ? params.resourceId[0] : (params.resourceId as string | undefined) ?? "";
  const isNew = resourceId === "new";
  const [resource, setResource] = useState<LearningResource | null>(null);
  const [form, setForm] = useState<ResourceForm>(() => emptyForm());
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [placementLevel, setPlacementLevel] = useState<PlacementLevel>("course");
  const [courseId, setCourseId] = useState("");
  const [weekId, setWeekId] = useState("");
  const [dayId, setDayId] = useState("");

  const courses = useMemo(() => getCourses(), []);
  const weeks = useMemo(() => courseId ? getWeeks(courseId) : [], [courseId]);
  const days = useMemo(() => {
    const week = weeks.find((candidate) => candidate.id === weekId);
    return week ? getWeekDays(courseId, week) : [];
  }, [courseId, weekId, weeks]);
  const placements = resource ? getResourcePlacements(resource.id) : [];

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }
    try {
      const found = getResourceById(resourceId);
      if (!found) setError("This resource does not exist in the local resource store.");
      else {
        setResource(found);
        setForm(formFromResource(found));
      }
    } catch {
      setError("The resource could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [isNew, resourceId]);

  function updateForm<K extends keyof ResourceForm>(field: K, value: ResourceForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setValidationErrors([]);
  }

  function save() {
    const input = buildInput(form);
    const errors = validateLearningResource(input);
    if (errors.length) {
      setValidationErrors(errors);
      return;
    }

    try {
      setSaving(true);
      if (resource) {
        const updated = updateResource(resource.id, {
          title: input.title,
          description: input.description,
          status: input.status,
          tags: input.tags,
          data: input.data,
        });
        if (updated) setResource(updated);
        setNotice("Resource changes saved.");
      } else {
        const created = createResource(input);
        setResource(created);
        setNotice("Resource created. You can now place it in the curriculum.");
        window.history.replaceState(null, "", `/admin/resources/${created.id}`);
      }
      setValidationErrors([]);
    } catch (caught) {
      setValidationErrors([caught instanceof Error ? caught.message : "The resource could not be saved."]);
    } finally {
      setSaving(false);
    }
  }

  function changeLifecycle() {
    if (!resource) return;
    try {
      const updated = resource.status === "archived" ? restoreResource(resource.id) : archiveResource(resource.id);
      if (updated) {
        setResource(updated);
        setForm(formFromResource(updated));
        setNotice(updated.status === "archived" ? "Resource archived." : "Resource restored as a draft.");
      }
    } catch {
      setError("The resource lifecycle change could not be saved.");
    }
  }

  function attach() {
    if (!resource) return;
    const target: ResourcePlacementTarget = placementLevel === "course" ? { courseId } : placementLevel === "week" ? { weekId } : { dayId };
    try {
      const before = getResourcePlacements(resource.id).length;
      attachResource(resource.id, target);
      const after = getResourcePlacements(resource.id).length;
      setNotice(before === after ? "That placement already exists." : "Resource placement added.");
      setResource({ ...resource });
      setCourseId("");
      setWeekId("");
      setDayId("");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "The placement could not be added.");
    }
  }

  function detach(placement: ResourcePlacement) {
    if (!resource) return;
    detachResource(resource.id, placementTarget(placement));
    setNotice("Resource placement removed.");
    setResource({ ...resource });
  }

  if (loading) return <AdminLoadingState />;
  if (error) return <AdminErrorState title="Resource unavailable" description={error} onRetry={() => window.location.reload()} />;

  const previewInput = buildInput(form);
  const youtubePreviewId = previewInput.type === "youtube" ? previewInput.data.videoId : "";
  const geoPreviewConfig = previewInput.type === "geogebra" ? getGeoGebraEmbedConfig(previewInput.data) : null;
  const geoResolution: GeoGebraEmbedResolution | null = geoPreviewConfig ? resolveGeoGebraEmbed(geoPreviewConfig) : null;

  return (
    <div>
      <AdminPageHeader
        title={isNew ? "Create resource" : "Resource details"}
        description={isNew ? "Create one reusable learning resource, then place it across the curriculum." : "Edit resource metadata, preview the student-facing source, and manage curriculum placements."}
        breadcrumbs={[{ label: "Resources", href: "/admin/resources" }, { label: isNew ? "New" : resource?.title ?? "Details" }]}
      />

      {notice ? <div className="mb-6 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#15803D]">{notice}</div> : null}
      {validationErrors.length ? <div className="mb-6 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#B91C1C]"><ul className="list-disc space-y-1 pl-5">{validationErrors.map((message) => <li key={message}>{message}</li>)}</ul></div> : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[24px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Resource metadata</div>
              <h2 className="mt-2 font-serif text-3xl text-[#111111]">Content record</h2>
            </div>
            {resource ? <AdminStatusBadge status={resource.status} /> : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm md:col-span-2">{fieldLabel("Title")}<input value={form.title} onChange={(event) => updateForm("title", event.target.value)} className="admin-input" placeholder="e.g. Ato's Tutorial: Complex numbers" /></label>
            <label className="space-y-2 text-sm md:col-span-2">{fieldLabel("Description")}<textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} rows={3} className="admin-input" placeholder="What should a student understand or explore?" /></label>
            <label className="space-y-2 text-sm">{fieldLabel("Resource type")}<select value={form.type} onChange={(event) => updateForm("type", event.target.value as LearningResourceType)} disabled={Boolean(resource)} className="admin-input disabled:bg-[#F7F7F8]"><option value="youtube">YouTube</option><option value="geogebra">GeoGebra</option><option value="external">External</option></select>{resource ? <span className="block text-xs text-[#666666]">Type is locked after creation to protect source-specific data.</span> : null}</label>
            <label className="space-y-2 text-sm">{fieldLabel("Status")}<select value={form.status} onChange={(event) => updateForm("status", event.target.value as LearningResourceStatus)} className="admin-input">{statuses.map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}</select></label>
            <label className="space-y-2 text-sm md:col-span-2">{fieldLabel("Tags")}
              <input value={form.tags} onChange={(event) => updateForm("tags", event.target.value)} className="admin-input" placeholder="complex-numbers, tutorial, week-2" />
              <span className="block text-xs text-[#666666]">Separate tags with commas.</span>
            </label>
          </div>

          <div className="mt-8 border-t border-[#E5E5E5] pt-6">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">{typeLabels[form.type]} details</div>
            {form.type === "youtube" ? <YouTubeFields form={form} updateForm={updateForm} /> : null}
            {form.type === "geogebra" ? <GeoGebraFields form={form} updateForm={updateForm} /> : null}
            {form.type === "external" ? <ExternalFields form={form} updateForm={updateForm} /> : null}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[#E5E5E5] pt-6">
            <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50"><Save size={15} />{saving ? "Saving..." : resource ? "Save changes" : "Create resource"}</button>
            <Link href="/admin/resources" className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] px-5 py-3 text-sm font-semibold text-[#666666] hover:border-[#2563EB]"><ArrowLeft size={15} />Back to resources</Link>
            {resource ? <button type="button" onClick={changeLifecycle} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] px-4 py-3 text-sm font-semibold text-[#111111] hover:border-[#2563EB]">{resource.status === "archived" ? <ArchiveRestore size={15} /> : <Archive size={15} />}{resource.status === "archived" ? "Restore as draft" : "Archive"}</button> : null}
          </div>
        </section>

        <aside className="space-y-6">
          <Preview input={previewInput} youtubePreviewId={youtubePreviewId} geoPreviewConfig={geoPreviewConfig} />
          {resource ? <PlacementManager resource={resource} courses={courses} placementLevel={placementLevel} setPlacementLevel={setPlacementLevel} courseId={courseId} setCourseId={setCourseId} weekId={weekId} setWeekId={setWeekId} dayId={dayId} setDayId={setDayId} weeks={weeks} days={days} attach={attach} placements={placements} detach={detach} /> : <div className="rounded-[24px] border border-dashed border-[#D9D9D9] bg-white p-6 text-sm leading-6 text-[#666666]">Save the resource first to add Course, Week, or Day placements.</div>}
        </aside>
      </div>
    </div>
  );
}

function YouTubeFields({ form, updateForm }: { form: ResourceForm; updateForm: <K extends keyof ResourceForm>(field: K, value: ResourceForm[K]) => void }) {
  return <div className="grid gap-5 md:grid-cols-2"><label className="space-y-2 text-sm md:col-span-2">{fieldLabel("YouTube URL or video ID")}<input value={form.youtubeUrl} onChange={(event) => { updateForm("youtubeUrl", event.target.value); updateForm("youtubeVideoId", parseYouTubeVideoId(event.target.value)); }} className="admin-input" placeholder="https://www.youtube.com/watch?v=..." /></label><label className="space-y-2 text-sm">{fieldLabel("Source classification")}<select value={form.youtubeSourceType} onChange={(event) => updateForm("youtubeSourceType", event.target.value as YouTubeSourceType)} className="admin-input"><option value="ato">Ato's Tutorial</option><option value="recommended">Recommended YouTube</option></select></label><label className="space-y-2 text-sm">{fieldLabel("Thumbnail URL (optional)")}<input value={form.youtubeThumbnailUrl} onChange={(event) => updateForm("youtubeThumbnailUrl", event.target.value)} className="admin-input" placeholder="https://..." /></label></div>;
}

function GeoGebraFields({ form, updateForm }: { form: ResourceForm; updateForm: <K extends keyof ResourceForm>(field: K, value: ResourceForm[K]) => void }) {
  return <div className="space-y-5"><div className="grid gap-5 md:grid-cols-2"><label className="space-y-2 text-sm">{fieldLabel("Material ID")}<input value={form.geoMaterialId} onChange={(event) => updateForm("geoMaterialId", event.target.value)} className="admin-input" placeholder="e.g. RHYH3UQ8" /><span className="block text-xs leading-5 text-[#666666]">Required unless a calculator app is chosen. Copy the short code from the activity link, for example the RHYH3UQ8 in geogebra.org/m/RHYH3UQ8.</span></label><label className="space-y-2 text-sm">{fieldLabel("Source URL (optional)")}<input value={form.geoSourceUrl} onChange={(event) => updateForm("geoSourceUrl", event.target.value)} className="admin-input" placeholder="https://www.geogebra.org/..." /></label><label className="space-y-2 text-sm">{fieldLabel("App type")}<select value={form.geoAppName} onChange={(event) => updateForm("geoAppName", event.target.value as ResourceForm["geoAppName"])} className="admin-input"><option value="graphing">Graphing</option><option value="geometry">Geometry</option><option value="3d">3D</option><option value="classic">Classic</option></select></label><label className="space-y-2 text-sm">{fieldLabel("Embed height (px)")}<input type="number" min="280" value={form.geoHeight} onChange={(event) => updateForm("geoHeight", event.target.value)} className="admin-input" /></label></div><div className="grid gap-3 sm:grid-cols-2">{([["geoShowToolbar", "Show toolbar"], ["geoShowAlgebraInput", "Show algebra input"], ["geoShowMenuBar", "Show menu bar"], ["geoShowResetIcon", "Show reset icon"], ["geoShowNotes", "Show notes"]] as const).map(([field, label]) => <label key={field} className="flex items-center gap-3 text-sm text-[#111111]"><input type="checkbox" checked={form[field]} onChange={(event) => updateForm(field, event.target.checked)} className="h-4 w-4 accent-[#111111]" />{label}</label>)}</div></div>;
}

function ExternalFields({ form, updateForm }: { form: ResourceForm; updateForm: <K extends keyof ResourceForm>(field: K, value: ResourceForm[K]) => void }) {
  return <div className="grid gap-5 md:grid-cols-2"><label className="space-y-2 text-sm md:col-span-2">{fieldLabel("External URL")}<input value={form.externalUrl} onChange={(event) => updateForm("externalUrl", event.target.value)} className="admin-input" placeholder="https://example.com/resource" /></label><label className="space-y-2 text-sm">{fieldLabel("Provider or source name")}<input value={form.externalProvider} onChange={(event) => updateForm("externalProvider", event.target.value)} className="admin-input" placeholder="Khan Academy" /></label></div>;
}

function Preview({ input, youtubePreviewId, geoPreviewConfig }: { input: LearningResourceInput; youtubePreviewId: string; geoPreviewConfig: GeoGebraInteractiveConfig | null }) {
  const youtubeThumbnail = input.type === "youtube" ? getYouTubeThumbnailUrl({ videoId: youtubePreviewId, thumbnail: input.data.thumbnail }) : undefined;
  return <section className="rounded-[24px] border border-[#E5E5E5] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,0.02)]"><div className="mb-4 flex items-center justify-between"><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Preview</div><AdminStatusBadge status={input.type} /></div>{input.type === "youtube" ? <div className="space-y-3">{youtubeThumbnail ? <img src={youtubeThumbnail} alt="YouTube thumbnail preview" className="aspect-video w-full rounded-xl object-cover" /> : <div className="flex aspect-video items-center justify-center rounded-xl bg-[#F7F7F8] text-sm text-[#999999]">Enter a YouTube URL or video ID.</div>}<p className="text-sm font-semibold text-[#111111]">{input.title || "Untitled YouTube resource"}</p><p className="text-xs text-[#666666]">{getYouTubeSourceLabel(input.data.sourceType)}</p></div> : null}{input.type === "geogebra" && geoPreviewConfig ? <GeoGebraProvider config={geoPreviewConfig} /> : null}{input.type === "external" ? <div className="space-y-3"><div className="flex h-24 items-center justify-center rounded-xl bg-[#F7F7F8] text-[#2563EB]"><ExternalLink size={28} /></div><p className="break-all text-sm font-semibold text-[#111111]">{input.data.url || "Enter an external URL."}</p><p className="text-xs text-[#666666]">{input.data.provider || "External source"}</p></div> : null}</section>;
}

function PlacementManager({ resource, courses, placementLevel, setPlacementLevel, courseId, setCourseId, weekId, setWeekId, dayId, setDayId, weeks, days, attach, placements, detach }: { resource: LearningResource; courses: ReturnType<typeof getCourses>; placementLevel: PlacementLevel; setPlacementLevel: (value: PlacementLevel) => void; courseId: string; setCourseId: (value: string) => void; weekId: string; setWeekId: (value: string) => void; dayId: string; setDayId: (value: string) => void; weeks: ReturnType<typeof getWeeks>; days: ReturnType<typeof getWeekDays>; attach: () => void; placements: ResourcePlacement[]; detach: (placement: ResourcePlacement) => void }) {
  return <section className="rounded-[24px] border border-[#E5E5E5] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,0.02)]"><div className="mb-4 flex items-center gap-2"><Link2 size={16} className="text-[#2563EB]" /><div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Placements</div><h2 className="mt-1 font-serif text-2xl text-[#111111]">Curriculum locations</h2></div></div><p className="mb-5 text-sm leading-6 text-[#666666]">Reuse this resource anywhere in the Course, Week, or Day hierarchy without creating another copy.</p><div className="space-y-3"><select value={placementLevel} onChange={(event) => setPlacementLevel(event.target.value as PlacementLevel)} className="admin-input"><option value="course">Attach to Course</option><option value="week">Attach to Week</option><option value="day">Attach to Day</option></select><select value={courseId} onChange={(event) => { setCourseId(event.target.value); setWeekId(""); setDayId(""); }} className="admin-input"><option value="">Select course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.code} · {course.title}</option>)}</select>{placementLevel !== "course" ? <select value={weekId} onChange={(event) => { setWeekId(event.target.value); setDayId(""); }} disabled={!courseId} className="admin-input disabled:bg-[#F7F7F8]"><option value="">Select week</option>{weeks.map((week) => <option key={week.id} value={week.id}>Week {week.weekNumber} · {week.title}</option>)}</select> : null}{placementLevel === "day" ? <select value={dayId} onChange={(event) => setDayId(event.target.value)} disabled={!weekId} className="admin-input disabled:bg-[#F7F7F8]"><option value="">Select day</option>{days.map((day) => <option key={day.lessonId} value={day.lessonId}>Day {day.dayNumber} · {day.title}</option>)}</select> : null}<button type="button" onClick={attach} disabled={!courseId || (placementLevel !== "course" && !weekId) || (placementLevel === "day" && !dayId)} className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><Link2 size={14} />Add placement</button></div><div className="mt-6 border-t border-[#E5E5E5] pt-5"><div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Existing placements · {placements.length}</div>{placements.length ? <ul className="space-y-2">{placements.map((placement) => <li key={placement.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#F7F7F8] px-3 py-2.5 text-sm"><span className="min-w-0 truncate text-[#111111]">{placementLabel(placement)}</span><button type="button" onClick={() => detach(placement)} className="shrink-0 rounded-full p-1.5 text-[#666666] hover:bg-white hover:text-[#E11D48]" aria-label={`Remove ${placementLabel(placement)}`}><Minus size={14} /></button></li>)}</ul> : <p className="text-sm text-[#999999]">This resource has no curriculum placements yet.</p>}</div></section>;
}
