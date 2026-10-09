"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowUpDown, Check, Eye, RefreshCcw, Save, Trash2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { LessonRenderer } from "@/components/learning/LessonRenderer";
import { createDefaultBlock } from "@/lib/content/overrides";
import { getAdminDayAction, getAdminDayContentAction, saveDayContentAction, setDayStatusAction, updateDayAction, uploadLessonImageAction } from "@/lib/adminContentActions";
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
  "visualizer",
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
    showNotes: typeof source.showNotes === "boolean" ? source.showNotes : false,
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
    showNotes: false,
    ...partial,
  };
}

export default function AdminLessonEditorPage() {
  const params = useParams();
  const lessonId = Array.isArray(params.lessonId) ? params.lessonId[0] : (params.lessonId as string | undefined) ?? "";

  const [baseLesson, setBaseLesson] = useState<Lesson | null>(null);
  const [draft, setDraft] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [revertTarget, setRevertTarget] = useState(false);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const dayRes = await getAdminDayAction(lessonId);
        if (!dayRes.ok || !dayRes.data) {
          setError("Lesson not found. Open the lesson from the curriculum or create a new lesson.");
          return;
        }
        const lesson = dayRes.data;
        // Fetch blocks separately
        const contentRes = await getAdminDayContentAction(lesson.courseId, lesson.weekId, lesson.id);
        const blocks = (contentRes.ok && contentRes.data) ? contentRes.data : (lesson.blocks ?? []);
        const full: Lesson = { ...lesson, blocks: blocks.map(cloneBlock) };
        setBaseLesson(full);
        setDraft(full);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load lesson");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lessonId]);

  const activeBlock = useMemo(
    () => draft?.blocks.find((block) => block.id === selectedBlockId) ?? draft?.blocks[0] ?? null,
    [draft?.blocks, selectedBlockId],
  );

  function triggerMessage(text: string) {
    setSaveError(null);
    setMessage(text);
    window.clearTimeout((triggerMessage as unknown as { timer?: number }).timer);
    (triggerMessage as unknown as { timer?: number }).timer = window.setTimeout(() => setMessage(null), 2500);
  }

  function triggerSaveError(text: string) {
    setMessage(null);
    setSaveError(text);
  }

  function updateLessonField(field: EditableField, value: string) {
    setDraft((current) => current ? { ...current, [field]: value } : current);
  }

  function updateBlock(blockId: string, updater: (block: ContentBlock) => ContentBlock) {
    setDraft((current) =>
      current
        ? { ...current, blocks: current.blocks.map((block) => (block.id === blockId ? updater(block) : block)) }
        : current,
    );
  }

  function addBlock(type: (typeof supportedBlockTypes)[number]) {
    if (!draft) return;
    // Default new blocks to the same step as the currently active block (or step 1
    // when the lesson is empty). The old behaviour of always using max+1 silently
    // placed every new block on a brand-new step, hiding it from students who had
    // not yet clicked "Continue" through all prior steps.
    const activeStep = activeBlock?.step ?? (draft.blocks.length > 0 ? Math.max(1, ...draft.blocks.map((block) => block.step ?? 1)) : 1);
    const block = createDefaultBlock(type, activeStep);
    setDraft((current) => current ? { ...current, blocks: [...current.blocks, block] } : current);
    setSelectedBlockId(block.id);
  }

  function moveBlock(blockId: string, direction: "up" | "down") {
    setDraft((current) => {
      if (!current) return current;
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
    setDraft((current) => {
      if (!current) return current;
      const nextBlocks = current.blocks.filter((block) => block.id !== blockId);
      setSelectedBlockId((currentSelected) => {
        if (currentSelected !== blockId) return currentSelected;
        return nextBlocks[0]?.id ?? null;
      });
      return { ...current, blocks: nextBlocks };
    });
  }

  async function uploadImage(block: Extract<ContentBlock, { type: "image" }>, file: File) {
    if (!baseLesson) return;
    setUploadingBlockId(block.id);
    setSaveError(null);
    const result = await uploadLessonImageAction(baseLesson.courseId, baseLesson.weekId, baseLesson.id, file, block.alt);
    if (!result.ok) {
      triggerSaveError(result.error ?? "Image upload failed.");
    } else {
      updateBlock(block.id, (item) => ({ ...item, type: "image", assetId: result.data.id, src: result.data.source.url, alt: item.type === "image" && item.alt ? item.alt : result.data.altText ?? "Lesson image" } as ContentBlock));
      triggerMessage("Image uploaded. Save the Day to persist the block.");
    }
    setUploadingBlockId(null);
  }

  async function handleSave(status?: "draft" | "published") {
    if (!draft || !baseLesson) return;
    setSaving(true);
    try {
      const dayRes = await updateDayAction(baseLesson.courseId, baseLesson.weekId, baseLesson.id, {
        title: draft.title,
        description: draft.description,
      });
      if (!dayRes.ok) {
        triggerSaveError(dayRes.error ?? "Day details could not be saved.");
        return;
      }
      const res = await saveDayContentAction(baseLesson.courseId, baseLesson.weekId, baseLesson.id, draft.blocks);
      if (!res.ok) {
        triggerSaveError(res.error ?? "Save failed.");
        return;
      }
      if (status) {
        await setDayStatusAction(baseLesson.courseId, baseLesson.weekId, baseLesson.id, status);
      }
      setBaseLesson({ ...baseLesson, title: draft.title, description: draft.description, blocks: draft.blocks });
      triggerMessage(status === "published" ? "Published to Supabase." : "Changes saved to Supabase.");
    } finally {
      setSaving(false);
    }
  }

  function handleRevert() {
    setRevertTarget(true);
  }

  function confirmRevert() {
    if (baseLesson) {
      setDraft({ ...baseLesson, blocks: baseLesson.blocks.map(cloneBlock) });
      setMessage("Reverted to last saved version.");
    }
    setRevertTarget(false);
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
              placeholder="# Lesson heading&#10;&#10;Write the lesson content here."
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
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">Worked example title</label>
              <input
                value={block.title}
                onChange={(event) =>
                  updateBlock(block.id, (item) => ({ ...item, type: "worked-example", title: event.target.value } as ContentBlock))
                }
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm font-semibold text-[#111111] outline-none"
                placeholder="E.g. Find the modulus..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">Content (Markdown)</label>
              <p className="mt-1 text-[11px] leading-5 text-[#666666]">Use <code className="bg-[#F1F1F1] px-1 py-0.5 rounded text-[#111111]">$inline math$</code> or <code className="bg-[#F1F1F1] px-1 py-0.5 rounded text-[#111111]">$$display math$$</code>.</p>
            </div>
            <textarea
              value={block.markdown ?? ""}
              onChange={(event) =>
                updateBlock(block.id, (item) => ({ ...item, type: "worked-example", markdown: event.target.value } as ContentBlock))
              }
              rows={8}
              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-3 font-mono text-sm leading-6 text-[#111111] outline-none focus:border-[#2563EB]"
              placeholder="Write the problem and solution here..."
            />

            {!block.markdown && (block.prompt || block.solution) && (
               <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-4">
                 <p className="text-xs text-[#991B1B] font-semibold mb-2">Legacy Content Found (will be ignored if Markdown is provided)</p>
                 <div className="text-[10px] uppercase font-bold text-[#991B1B] mb-1">Prompt</div>
                 <p className="text-xs text-[#991B1B] mb-3">{block.prompt}</p>
                 <div className="text-[10px] uppercase font-bold text-[#991B1B] mb-1">Solution</div>
                 <p className="text-xs text-[#991B1B]">{block.solution}</p>
               </div>
            )}

            <div className="rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] p-4">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Local Preview</div>
              <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 pointer-events-none">
                <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">Worked example</span>
                <h3 className="mt-2 font-serif text-2xl text-[#111111]">{block.title || "Example"}</h3>
                <div className="mt-3 border-t border-[#E5E5E5] pt-1">
                  {block.markdown ? <MarkdownBlock markdown={block.markdown} /> : <p className="text-sm text-[#999999] mt-3">Type markdown to see preview.</p>}
                </div>
              </div>
            </div>
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
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">Upload image</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingBlockId === block.id}
                onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(block, file); event.currentTarget.value = ""; }}
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
              />
              {uploadingBlockId === block.id ? <p className="text-xs text-[#666666]">Uploading image...</p> : null}
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
                      updateBlock(block.id, (item) => ({ ...item, type: "interactive", provider: "geogebra", config: { ...config, materialId: event.target.value } } as ContentBlock));
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
                      updateBlock(block.id, (item) => ({ ...item, type: "interactive", provider: "geogebra", config: { ...config, appName: event.target.value as GeoGebraInteractiveConfig["appName"] } } as ContentBlock));
                    }}
                    className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
                  >
                    <option value="graphing">Graphing</option>
                    <option value="geometry">Geometry</option>
                    <option value="3d">3D</option>
                    <option value="classic">Classic</option>
                    <option value="notes">Notes</option>
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
                      updateBlock(block.id, (item) => ({ ...item, type: "interactive", provider: "geogebra", config: { ...config, height: Number.isFinite(heightValue) ? Math.max(240, heightValue) : 440 } } as ContentBlock));
                    }}
                    className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
                  />
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
      case "visualizer":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">Visualizer title</label>
              <input
                value={block.title ?? ""}
                onChange={(event) => updateBlock(block.id, (item) => ({ ...item, type: "visualizer", title: event.target.value } as ContentBlock))}
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
                placeholder="Custom visualizer"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">Height</label>
              <input
                type="number"
                min={280}
                max={900}
                value={block.height ?? 420}
                onChange={(event) => {
                  const height = Number(event.target.value || 420);
                  updateBlock(block.id, (item) => ({ ...item, type: "visualizer", height: Number.isFinite(height) ? Math.max(280, Math.min(900, height)) : 420 } as ContentBlock));
                }}
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#666666]">HTML / CSS / JavaScript source</label>
              <p className="text-xs leading-5 text-[#666666]">Runs in a sandboxed preview with scripts enabled but without same-origin, storage, parent-page, or network access.</p>
              <textarea
                value={block.source}
                onChange={(event) => updateBlock(block.id, (item) => ({ ...item, type: "visualizer", source: event.target.value } as ContentBlock))}
                rows={14}
                spellCheck={false}
                className="w-full rounded-xl border border-[#E5E5E5] bg-[#111827] px-3 py-3 font-mono text-xs leading-5 text-[#F9FAFB] outline-none"
                placeholder={'<div id="app"></div>\n<script>...</script>'}
              />
            </div>
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

  if (loading) return <div className="p-8 text-sm text-[#666666]">Loading lesson...</div>;
  if (error) return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-[28px] border border-[#E5E5E5] bg-white p-8 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
        <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Lesson unavailable</div>
        <h1 className="mt-3 font-serif text-3xl text-[#111111]">This lesson could not be found.</h1>
        <p className="mt-3 text-sm leading-6 text-[#666666]">{error}</p>
      </div>
    </div>
  );
  if (!draft) return null;

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
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Save size={15} />
          {saving ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => handleSave("published")}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full border border-[#059669] bg-white px-4 py-2 text-sm font-semibold text-[#047857] disabled:opacity-60"
        >
          <Upload size={15} />
          Publish to Supabase
        </button>
        <button
          type="button"
          onClick={handleRevert}
          className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111]"
        >
          <RefreshCcw size={15} />
          Revert
        </button>
      </div>

      <ConfirmDialog
        open={revertTarget}
        title="Revert changes"
        description="Discard unsaved edits and revert to the last saved version from Supabase?"
        confirmLabel="Revert"
        onConfirm={confirmRevert}
        onCancel={() => setRevertTarget(false)}
      />

      {message ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3 text-sm text-[#111111]">
          <Check size={16} className="text-[#059669]" />
          <span>{message}</span>
        </div>
      ) : null}

      {saveError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#DC2626]" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold">Save failed — block was not persisted</p>
            <p className="leading-5">{saveError}</p>
          </div>
          <button type="button" onClick={() => setSaveError(null)} className="shrink-0 text-[#991B1B] opacity-60 hover:opacity-100" aria-label="Dismiss error">
            <X size={16} />
          </button>
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
                <div className="flex flex-wrap items-center gap-2">
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
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">Step</span>
                          <input
                            type="number"
                            min={1}
                            value={block.step ?? 1}
                            onChange={(event) => {
                              const stepValue = Math.max(1, Number(event.target.value) || 1);
                              updateBlock(block.id, (item) => ({ ...item, step: stepValue }));
                            }}
                            className="w-12 rounded-lg border border-[#E5E5E5] bg-white px-1.5 py-1 text-center text-xs text-[#111111] outline-none"
                            aria-label="Step number for this block"
                          />
                        </div>
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
                        {block.type === "visualizer" && (block.title || "Custom visualizer")}
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
