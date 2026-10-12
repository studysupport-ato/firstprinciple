"use client";

import { useState } from "react";
import { ArrowUpRight, ExternalLink, Sparkles } from "lucide-react";

import { GeoGebraProvider } from "@/components/learning/GeoGebraProvider";
import { YouTubeEmbed } from "@/components/learning/YouTubeEmbed";
import { EducationalText } from "@/components/learning/EducationalText";
import { getGeoGebraEmbedConfig, getYouTubeSourceLabel } from "@/lib/content/resourcePresentation";
import type { LearningResource } from "@/lib/content/types/resource";

function ResourceEyebrow({ children }: { children: string }) {
  return <span className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">{children}</span>;
}

function YouTubeResourceCard({ resource }: { resource: Extract<LearningResource, { type: "youtube" }> }) {
  const sourceLabel = getYouTubeSourceLabel(resource.data.sourceType);

  return (
    <article className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
      <YouTubeEmbed videoId={resource.data.videoId} title={resource.title} />
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <ResourceEyebrow>{sourceLabel}</ResourceEyebrow>
          <span className="text-xs text-[#666666]">YouTube · plays here</span>
        </div>
        <h3 className="font-serif text-xl leading-tight text-[#111111]"><EducationalText text={resource.title} /></h3>
        {resource.description ? <p className="text-sm leading-6 text-[#666666]"><EducationalText text={resource.description} /></p> : null}
      </div>
    </article>
  );
}

/** Lesson-end video: Day-scoped YouTube resources rendered AFTER core lesson content. */
export function LessonVideo({ resources }: { resources: LearningResource[] }) {
  // Only the current Day's own YouTube resources (day-level placements resolve first).
  const videos = resources.filter((resource) => resource.type === "youtube" && (resource as { placement?: { dayId?: string } }).placement?.dayId) as Array<Extract<LearningResource, { type: "youtube" }>>;
  const fallback = videos.length ? videos : (resources.filter((resource) => resource.type === "youtube") as Array<Extract<LearningResource, { type: "youtube" }>>);
  // Day page passes only Day-scoped resources already; keep the day-attached one if identifiable, else first YouTube.
  const video = fallback[0];
  if (!video) return null;
  return (
    <section aria-labelledby="lesson-video-heading" className="mt-12 border-t border-[#E5E5E5] pt-8">
      <span className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">Lesson video</span>
      <h2 id="lesson-video-heading" className="mt-2 font-serif text-3xl text-[#111111]">Watch the Tutorial</h2>
      <div className="mt-5"><YouTubeResourceCard resource={video} /></div>
    </section>
  );
}

function GeoGebraResourceCard({ resource }: { resource: Extract<LearningResource, { type: "geogebra" }> }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <ResourceEyebrow>Interactive</ResourceEyebrow>
          <h3 className="font-serif text-xl leading-tight text-[#111111]"><EducationalText text={resource.title} /></h3>
          {resource.description ? <p className="max-w-xl text-sm leading-6 text-[#666666]"><EducationalText text={resource.description} /></p> : null}
        </div>
        <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#111111] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#FFBE00] hover:text-[#111111]">
          <Sparkles size={14} />{open ? "Close interactive" : "Open inside lesson"}
        </button>
      </div>
      {open ? <div className="mt-5"><GeoGebraProvider config={getGeoGebraEmbedConfig(resource.data)} /></div> : null}
    </article>
  );
}

function ExternalResourceCard({ resource }: { resource: Extract<LearningResource, { type: "external" }> }) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-[#E5E5E5] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <ResourceEyebrow>External resource</ResourceEyebrow>
        <h3 className="font-serif text-xl leading-tight text-[#111111]"><EducationalText text={resource.title} /></h3>
        {resource.description ? <p className="text-sm leading-6 text-[#666666]"><EducationalText text={resource.description} /></p> : null}
        <p className="break-all text-xs text-[#666666]">{resource.data.provider ?? resource.data.url}</p>
      </div>
      <a href={resource.data.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[#E5E5E5] px-4 py-2.5 text-sm font-semibold text-[#111111] hover:border-[#FFBE00]">
        Open external resource <ExternalLink size={14} />
      </a>
    </article>
  );
}

function ResourceCard({ resource }: { resource: LearningResource }) {
  if (resource.type === "youtube") return <YouTubeResourceCard resource={resource} />;
  if (resource.type === "geogebra") return <GeoGebraResourceCard resource={resource} />;
  return <ExternalResourceCard resource={resource} />;
}

export function SupplementaryResources({ resources }: { resources: LearningResource[] }) {
  const rest = resources.filter((resource) => resource.type !== "youtube");
  if (!rest.length) return null;

  return (
    <section aria-labelledby="supplementary-resources-heading" className="mt-12 border-t border-[#E5E5E5] pt-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <ResourceEyebrow>Continue exploring</ResourceEyebrow>
          <h2 id="supplementary-resources-heading" className="mt-2 font-serif text-3xl text-[#111111]">Supplementary Resources</h2>
        </div>
        <span className="text-xs text-[#666666]">{rest.length} resource{rest.length === 1 ? "" : "s"}</span>
      </div>
      <div className="space-y-4">
        {rest.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}
      </div>
    </section>
  );
}
