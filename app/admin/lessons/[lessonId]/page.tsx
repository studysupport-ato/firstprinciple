"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowUpDown, Check, Eye, RefreshCcw, Save, Trash2, Upload, X } from "lucide-react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LessonRenderer } from "@/components/learning/LessonRenderer";
import { getLesson } from "@/lib/content/access";
import { createDefaultBlock, getLocalLessonOverride, getResolvedLesson, removeLessonOverride, saveLessonOverride, validateLessonForOverride } from "@/lib/content/overrides";
import type { ContentBlock, GeoGebraInteractiveConfig, Lesson } from "@/lib/content/types";
import { MathText } from "@/components/learning/blocks/MathText";
import { MarkdownBlock } from "@/components/learning/blocks/MarkdownBlock";
import { AssetPicker } from "@/components/admin/AssetPicker";

const supportedBlockTypes = [
  "heading",
  "text",
  "markdown",
  "math",
  "worked-example",
  "callout",
  "image",
  "video",
  "interactive",
  "question",
] as const;

type EditableField = "title" | "description";
type DraftBlock = ContentBlock;

function cloneBlock(block: ContentBlock): ContentBlock {
  return JSON.parse(JSON.stringify(block));
}

function getGeoGebraConfig(config: Record<string, unknown> | undefined): GeoGebraInteractiveConfig {
  const source = config && typeof config === "object" ? config : {};

  return {
    visualizer: "geogebra",
    appName: (source.appName as GeoGebraInteractiveConfig["appName"]) ?? "graphing",
    materialId: typeof source.materialId === "string" ? source.materialId : "",
    width: typeof source.width === "number" ? source.width : undefined,
    height: typeof source.height === "number" ? source.height : 440,
    showToolbar: typeof source.showToolbar === "boolean" ? source.showToolbar : true,
    showAlgebraInput: typeof source.showAlgebraInput === "boolean" ? source.showAlgebraInput : false,
    showMenuBar: typeof source.showMenuBar === "boolean" ? source.showMenuBar : false,
    showResetIcon: typeof source.showResetIcon === "boolean" ? source.showResetIcon : true,
  };
}

function buildGeoGebraConfig(partial?: Partial<GeoGebraInteractiveConfig>): GeoGebraInteractiveConfig {
  return {
    visualizer: "geogebra",
    appName: "graphing",
    materialId: "",
    height: 440,
    showToolbar: true,
    showAlgebraInput: false,
    showMenuBar: false,
    showResetIcon: true,
    ...partial,
  };
}

function buildLessonDraft(baseLesson: Lesson): Lesson {
  const override = getLocalLessonOverride(baseLesson.id);

  return {
    ...baseLesson,
    title: override?.title ?? baseLesson.title,
    description: override?.description ?? baseLesson.description,
    blocks: (override?.blocks ?? baseLesson.blocks).map((block) => cloneBlock(block)),
  };
}

export default function AdminLessonEditorPage({ params }: { params: { lessonId: string } }) {
  const baseLesson = getLesson(params.lessonId) ?? {
    id: params.lessonId,
    courseId: "math-151",
    chapterId: "real-number-theory",
    weekId: "math151-week-1",
    title: "Lesson",
    description: "Lesson content",
    order: 1,
    estimatedMinutes: 10,
    objectives: [],
    blocks: [],
  };

  const [draft, setDraft] = useState<Lesson>(() => buildLessonDraft(baseLesson));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  useEffect(() => {
    setDraft(buildLessonDraft(baseLesson));
    setSelectedBlockId(null);
  }, [baseLesson.id]);

  const activeBlock = useMemo(
    () => draft.blocks.find((block) => block.id === selectedBlockId) ?? draft.blocks[0] ?? null,
    [draft.blocks, selectedBlockId],
  );

  const hasLocalOverride = !!getLocalLessonOverride(baseLesson.id);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(buildLessonDraft(baseLesson));

  function triggerMessage(text: string) {
    setMessage(text);
    window.clearTimeout((triggerMessage as unknown as { timer?: number }).timer);
    (triggerMessage as unknown as { timer?: number }).timer = window.setTimeout(() => setMessage(null), 2500);
  }

  function updateLessonField(field: EditableField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateBlock(blockId: string, updater: (block: ContentBlock) => ContentBlock) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) => (block.id === blockId ? updater(block) : block)),
    }));
  }

  function addBlock(type: (typeof supportedBlockTypes)[number]) {
    const nextStep = Math.max(1, ...draft.blocks.map((block) => block.step ?? 1)) + 1;
    const block = createDefaultBlock(type, nextStep);
    setDraft((current) => ({ ...current, blocks: [...current.blocks, block] }));
    setSelectedBlockId(block.id);
  }

  function moveBlock(blockId: string, direction: "up" | "down") {
    setDraft((current) => {
      const index = current.blocks.findIndex((block) => block.id === blockId);
      if (index === -1) return current;

      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.blocks.length) return current;

      const nextBlocks = [...current.blocks];
      const [item] = nextBlocks.splice(index, 1);
      nextBlocks.splice(nextIndex, 0, item);
      return { ...current, blocks: nextBlocks };
    });
  }

  function removeBlock(blockId: string) {
    const target = draft.blocks.find((block) => block.id === blockId);

    if (!target) return;

    const shouldDelete = window.confirm("Delete this block from the local override?");
    if (!shouldDelete) return;

    setDraft((current) => ({
      ...current,
      blocks: current.blocks.filter((block) => block.id !== blockId),
    }));

    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  }

  function handleSave(status: "draft" | "published" = "draft") {
    const errors = validateLessonForOverride(draft);

    if (errors.length > 0) {
      triggerMessage(errors[0]);
      return;
    }

    const override = {
      lessonId: baseLesson.id,
      updatedAt: new Date().toISOString(),
      status: draft.blocks.some((block) => block.type === "markdown") ? status : undefined,
      title: draft.title !== baseLesson.title ? draft.title : undefined,
      description: draft.description !== baseLesson.description ? draft.description : undefined,
      blocks: draft.blocks,
    };

    setSaving(true);
    saveLessonOverride(override);
    setTimeout(() => {
      setSaving(false);
      triggerMessage("Changes saved locally.");
    }, 200);
  }

  function handleRevert() {
    const confirmed = window.confirm("Revert this lesson to the base content?");
    if (!confirmed) return;

    removeLessonOverride(baseLesson.id);
    setDraft(buildLessonDraft(baseLesson));
    setMessage("Local override removed.");
  }

  function renderBlockEditor(block: ContentBlock) {
    switch (block.type) {
      case "heading":
        return (
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">Heading text</label>
            <input
              value={block.text}
              onChange={(event) =>
                updateBlock(block.id, (item) => ({ ...item, type: "heading", text: event.target.value } as ContentBlock))
              }
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none ring-0"
            />
          </div>
        );
      case "text":
        return (
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">Body text</label>
            <textarea
              value={block.body}
              onChange={(event) =>
                updateBlock(block.id, (item) => ({ ...item, type: "text", body: event.target.value } as ContentBlock))
              }
              rows={5}
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
            />
          </div>
        );
      case "markdown":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">Markdown source</label>
              <p className="mt-2 text-xs leading-5 text-[#666666]">Use headings, lists, links, code, tables, blockquotes, and $inline math$. Raw HTML is intentionally rendered as text.</p>
            </div>
            <textarea
              aria-label="Markdown source"
              value={block.markdown}
              onChange={(event) => updateBlock(block.id, (item) => ({ ...item, type: "markdown", markdown: event.target.value } as ContentBlock))}
              rows={14}
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-3 font-mono text-sm leading-6 text-[#111111] outline-none focus:border-[#2563EB]"
              placeholder="# Lesson heading\n\nWrite the lesson content here."
            />
            <div className="rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] p-4">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Student preview</div>
              <MarkdownBlock markdown={block.markdown} />
            </div>
          </div>
        );
      case "math":
        return (
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">Math expression</label>
            <textarea
              value={block.expression}
              onChange={(event) =>
                updateBlock(block.id, (item) => ({ ...item, type: "math", expression: event.target.value } as ContentBlock))
              }
              rows={3}
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
            />
            <div className="rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Live preview</div>
              <MathText math={block.expression || ""} block />
            </div>
          </div>
        );
      case "worked-example":
        return (
          <div className="space-y-3">
            <input
              value={block.title}
              onChange={(event) =>
                updateBlock(block.id, (item) => ({ ...item, type: "worked-example", title: event.target.value } as ContentBlock))
              }
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
              placeholder="Worked example title"
            />
            <textarea
              value={block.prompt}
              onChange={(event) =>
                updateBlock(block.id, (item) => ({ ...item, type: "worked-example", prompt: event.target.value } as ContentBlock))
              }
              rows={3}
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
              placeholder="Prompt"
            />
            <textarea
              value={block.solution}
              onChange={(event) =>
                updateBlock(block.id, (item) => ({ ...item, type: "worked-example", solution: event.target.value } as ContentBlock))
              }
              rows={4}
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
              placeholder="Solution"
            />
          </div>
        );
      case "callout":
        return (
          <div className="space-y-3">
            <select
              value={block.tone}
              onChange={(event) =>
                updateBlock(block.id, (item) => ({ ...item, type: "callout", tone: event.target.value as "info" | "tip" | "warning" } as ContentBlock))
              }
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
            >
              <option value="info">Info</option>
              <option value="tip">Tip</option>
              <option value="warning">Warning</option>
            </select>
            <textarea
              value={block.text}
              onChange={(event) =>
                updateBlock(block.id, (item) => ({ ...item, type: "callout", text: event.target.value } as ContentBlock))
              }
              rows={4}
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
            />
          </div>
        );
      case "image":
        return (
          <div className="space-y-3">
            <AssetPicker type="image" value={block.assetId} onChange={(asset) => updateBlock(block.id, (item) => ({ ...item, type: "image", assetId: asset?.id, src: asset?.source.url ?? block.src, alt: asset?.altText ?? block.alt } as ContentBlock))} />
            <input
              value={block.src}
              onChange={(event) =>
                updateBlock(block.id, (item) => ({ ...item, type: "image", src: event.target.value } as ContentBlock))
              }
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
              placeholder="Image URL"
            />
            <input
              value={block.alt}
              onChange={(event) =>
                updateBlock(block.id, (item) => ({ ...item, type: "image", alt: event.target.value } as ContentBlock))
              }
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
              placeholder="Alt text"
            />
            <input
              value={block.caption ?? ""}
              onChange={(event) =>
                updateBlock(block.id, (item) => ({ ...item, type: "image", caption: event.target.value } as ContentBlock))
              }
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
              placeholder="Caption"
            />
          </div>
        );
      case "video":
        return (
          <div className="space-y-3">
            <AssetPicker type="video" value={block.assetId} onChange={(asset) => updateBlock(block.id, (item) => ({ ...item, type: "video", assetId: asset?.id, src: asset?.source.url ?? block.src, title: asset?.title ?? block.title } as ContentBlock))} />
            <input
              value={block.title}
              onChange={(event) =>
                updateBlock(block.id, (item) => ({ ...item, type: "video", title: event.target.value } as ContentBlock))
              }
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
              placeholder="Video title"
            />
            <input
              value={block.src}
              onChange={(event) =>
                updateBlock(block.id, (item) => ({ ...item, type: "video", src: event.target.value } as ContentBlock))
              }
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
              placeholder="Video URL"
            />
          </div>
        );
      case "interactive":
        return (
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">Provider</label>
            <select
              value={block.provider}
              onChange={(event) => {
                const nextProvider = event.target.value as "geogebra" | "custom";
                const nextConfig = nextProvider === "geogebra"
                  ? buildGeoGebraConfig(getGeoGebraConfig(block.config as Record<string, unknown> | undefined))
                  : { visualizer: "argand-plane", z: { re: 3, im: 4 } };

                updateBlock(block.id, (item) => ({ ...item, type: "interactive", provider: nextProvider, config: nextConfig } as ContentBlock));
              }}
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
            >
              <option value="custom">Existing Visualizer</option>
              <option value="geogebra">GeoGebra</option>
            </select>

            {block.provider === "geogebra" ? (
              <>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">Material ID</label>
                  <input
                    value={String((block.config as GeoGebraInteractiveConfig | undefined)?.materialId ?? "")}
                    onChange={(event) => {
                      const config = getGeoGebraConfig(block.config as Record<string, unknown> | undefined);
                      updateBlock(block.id, (item) => ({
                        ...item,
                        type: "interactive",
                        provider: "geogebra",
                        config: { ...config, materialId: event.target.value },
                      } as ContentBlock));
                    }}
                    className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
                    placeholder="Optional material ID"
                  />
                  <p className="text-[11px] text-[#666666]">Leave blank to launch the default GeoGebra app instead of a saved material.</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">App</label>
                  <select
                    value={String((block.config as GeoGebraInteractiveConfig | undefined)?.appName ?? "graphing")}
                    onChange={(event) => {
                      const config = getGeoGebraConfig(block.config as Record<string, unknown> | undefined);
                      updateBlock(block.id, (item) => ({
                        ...item,
                        type: "interactive",
                        provider: "geogebra",
                        config: { ...config, appName: event.target.value as GeoGebraInteractiveConfig["appName"] },
                      } as ContentBlock));
                    }}
                    className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
                  >
                    <option value="graphing">Graphing</option>
                    <option value="geometry">Geometry</option>
                    <option value="3d">3D</option>
                    <option value="classic">Classic</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">Height</label>
                  <input
                    type="number"
                    min={240}
                    max={1200}
                    value={Number((block.config as GeoGebraInteractiveConfig | undefined)?.height ?? 440)}
                    onChange={(event) => {
                      const config = getGeoGebraConfig(block.config as Record<string, unknown> | undefined);
                      const heightValue = Number(event.target.value || 440);
                      updateBlock(block.id, (item) => ({
                        ...item,
                        type: "interactive",
                        provider: "geogebra",
                        config: { ...config, height: Number.isFinite(heightValue) ? Math.max(240, heightValue) : 440 },
                      } as ContentBlock));
                    }}
                    className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center justify-between rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] px-3 py-2 text-sm text-[#111111]">
                    <span>Show toolbar</span>
                    <input
                      type="checkbox"
                      checked={Boolean((block.config as GeoGebraInteractiveConfig | undefined)?.showToolbar ?? true)}
                      onChange={(event) => {
                        const config = getGeoGebraConfig(block.config as Record<string, unknown> | undefined);
                        updateBlock(block.id, (item) => ({
                          ...item,
                          type: "interactive",
                          provider: "geogebra",
                          config: { ...config, showToolbar: event.target.checked },
                        } as ContentBlock));
                      }}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] px-3 py-2 text-sm text-[#111111]">
                    <span>Show algebra input</span>
                    <input
                      type="checkbox"
                      checked={Boolean((block.config as GeoGebraInteractiveConfig | undefined)?.showAlgebraInput ?? false)}
                      onChange={(event) => {
                        const config = getGeoGebraConfig(block.config as Record<string, unknown> | undefined);
                        updateBlock(block.id, (item) => ({
                          ...item,
                          type: "interactive",
                          provider: "geogebra",
                          config: { ...config, showAlgebraInput: event.target.checked },
                        } as ContentBlock));
                      }}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] px-3 py-2 text-sm text-[#111111]">
                    <span>Show menu bar</span>
                    <input
                      type="checkbox"
                      checked={Boolean((block.config as GeoGebraInteractiveConfig | undefined)?.showMenuBar ?? false)}
                      onChange={(event) => {
                        const config = getGeoGebraConfig(block.config as Record<string, unknown> | undefined);
                        updateBlock(block.id, (item) => ({
                          ...item,
                          type: "interactive",
                          provider: "geogebra",
                          config: { ...config, showMenuBar: event.target.checked },
                        } as ContentBlock));
                      }}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] px-3 py-2 text-sm text-[#111111]">
                    <span>Show reset icon</span>
                    <input
                      type="checkbox"
                      checked={Boolean((block.config as GeoGebraInteractiveConfig | undefined)?.showResetIcon ?? true)}
                      onChange={(event) => {
                        const config = getGeoGebraConfig(block.config as Record<string, unknown> | undefined);
                        updateBlock(block.id, (item) => ({
                          ...item,
                          type: "interactive",
                          provider: "geogebra",
                          config: { ...config, showResetIcon: event.target.checked },
                        } as ContentBlock));
                      }}
                    />
                  </label>
                </div>
              </>
            ) : (
              <textarea
                value={JSON.stringify(block.config, null, 2)}
                onChange={(event) => {
                  try {
                    const parsed = JSON.parse(event.target.value);
                    updateBlock(block.id, (item) => ({ ...item, type: "interactive", config: parsed } as ContentBlock));
                  } catch {
                    // ignore invalid JSON until it is valid
                  }
                }}
                rows={5}
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
              />
            )}
          </div>
        );
      case "question":
        return (
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">Question reference</label>
            <input
              value={block.questionId}
              onChange={(event) =>
                updateBlock(block.id, (item) => ({ ...item, type: "question", questionId: event.target.value } as ContentBlock))
              }
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
            />
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={draft.title}
        description={draft.description}
        breadcrumbs={[
          { label: "Lessons", href: "/admin/lessons" },
          { label: draft.title },
        ]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/lessons" className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111]">
          <ArrowLeft size={15} />
          Back to lessons
        </Link>
        <button
          type="button"
          onClick={() => setPreviewMode((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111]"
        >
          <Eye size={15} />
          {previewMode ? "Hide preview" : "Preview"}
        </button>
        <button
          type="button"
          onClick={() => handleSave()}
          className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-white"
        >
          <Save size={15} />
          {saving ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => handleSave("published")}
          className="inline-flex items-center gap-2 rounded-full border border-[#059669] bg-white px-4 py-2 text-sm font-semibold text-[#047857]"
        >
          <Upload size={15} />
          Publish locally
        </button>
        <button
          type="button"
          onClick={handleRevert}
          className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111]"
        >
          <RefreshCcw size={15} />
          Revert
        </button>
        {hasLocalOverride ? <span className="rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#059669]">Local changes</span> : <span className="rounded-full bg-[#F7F7F8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">Base content</span>}
      </div>

      {message ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3 text-sm text-[#111111]">
          <Check size={16} className="text-[#059669]" />
          <span>{message}</span>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">Lesson title</label>
              <input
                value={draft.title}
                onChange={(event) => updateLessonField("title", event.target.value)}
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">Description</label>
              <textarea
                value={draft.description}
                onChange={(event) => updateLessonField("description", event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
              />
            </div>

            <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">Lesson blocks</span>
                <div className="flex items-center gap-2">
                  {supportedBlockTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addBlock(type)}
                      className="rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#111111]"
                    >
                      + {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {draft.blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className={`rounded-2xl border p-3 transition-colors ${selectedBlockId === block.id ? "border-[#111111] bg-white" : "border-[#E5E5E5] bg-white"}`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <button type="button" onClick={() => setSelectedBlockId(block.id)} className="text-left text-sm font-semibold text-[#111111]">
                        {index + 1}. {block.type}
                      </button>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => moveBlock(block.id, "up")} className="rounded-full border border-[#E5E5E5] p-1.5 text-[#666666]" aria-label="Move up">
                          <ArrowUpDown size={14} className="rotate-[-90deg]" />
                        </button>
                        <button type="button" onClick={() => moveBlock(block.id, "down")} className="rounded-full border border-[#E5E5E5] p-1.5 text-[#666666]" aria-label="Move down">
                          <ArrowUpDown size={14} className="rotate-[90deg]" />
                        </button>
                        <button type="button" onClick={() => removeBlock(block.id)} className="rounded-full border border-[#E5E5E5] p-1.5 text-[#D33]" aria-label="Delete block">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {selectedBlockId === block.id ? renderBlockEditor(block) : (
                      <div className="text-sm leading-6 text-[#666666]">
                        {block.type === "heading" && block.text}
                        {block.type === "text" && block.body}
                        {block.type === "markdown" && (block.markdown.split("\n")[0] || "Markdown content")}
                        {block.type === "math" && <MathText math={block.expression} block />}
                        {block.type === "worked-example" && `${block.title}: ${block.prompt}`}
                        {block.type === "callout" && block.text}
                        {block.type === "image" && `${block.alt} (${block.src})`}
                        {block.type === "video" && block.title}
                        {block.type === "interactive" && `Interactive: ${block.provider}`}
                        {block.type === "question" && `Question ref: ${block.questionId}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Preview</div>
              <h2 className="mt-2 font-serif text-3xl text-[#111111]">Resolved lesson</h2>
            </div>
            <div className="rounded-full bg-[#F7F7F8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#111111]">LessonRenderer</div>
          </div>

          {previewMode || !selectedBlockId ? (
            <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-5">
              <LessonRenderer lesson={draft} step={1} />
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-5">
              <LessonRenderer lesson={draft} step={activeBlock?.step ?? 1} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
