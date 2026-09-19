"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTable } from "@/components/admin/AdminTable";
import {
  archiveAsset,
  createAsset,
  deleteAsset,
  getAssetUsage,
  getAssetUsageCount,
  getAssetUsageCounts,
  getAssets,
  restoreAsset,
  updateAsset,
} from "@/lib/content/assets";
import type { AssetUsageReference } from "@/lib/content/assets";
import type { Asset, AssetSourceKind, AssetStatus, AssetType } from "@/lib/content/types/asset";

const ASSET_TYPES: AssetType[] = ["image", "video", "document", "audio"];
const ASSET_STATUSES: AssetStatus[] = ["draft", "ready", "archived"];
const TYPE_LABELS: Record<AssetType, string> = { image: "Image", video: "Video", document: "Document", audio: "Audio" };

function formatBytes(bytes?: number) {
  if (bytes === undefined || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(seconds?: number) {
  if (seconds === undefined || !Number.isFinite(seconds)) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function parseOptionalNumber(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

interface AssetForm {
  name: string;
  title: string;
  description: string;
  type: AssetType;
  kind: AssetSourceKind;
  url: string;
  fileSize: string;
  width: string;
  height: string;
  duration: string;
  altText: string;
  tags: string;
  status: AssetStatus;
}

function formFromAsset(asset: Asset): AssetForm {
  return {
    name: asset.name,
    title: asset.title ?? "",
    description: asset.description ?? "",
    type: asset.type,
    kind: asset.source.kind,
    url: asset.source.url,
    fileSize: asset.fileSize !== undefined ? String(asset.fileSize) : "",
    width: asset.width !== undefined ? String(asset.width) : "",
    height: asset.height !== undefined ? String(asset.height) : "",
    duration: asset.duration !== undefined ? String(asset.duration) : "",
    altText: asset.altText ?? "",
    tags: (asset.tags ?? []).join(", "),
    status: asset.status,
  };
}

function formToAssetPatch(form: AssetForm) {
  return {
    name: form.name.trim(),
    title: form.title.trim() || undefined,
    description: form.description.trim() || undefined,
    type: form.type,
    source: { kind: form.kind, url: form.url.trim() },
    fileSize: parseOptionalNumber(form.fileSize),
    width: parseOptionalNumber(form.width),
    height: parseOptionalNumber(form.height),
    duration: parseOptionalNumber(form.duration),
    altText: form.altText.trim(),
    tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    status: form.status,
  };
}

const emptyForm: AssetForm = {
  name: "",
  title: "",
  description: "",
  type: "image",
  kind: "external",
  url: "",
  fileSize: "",
  width: "",
  height: "",
  duration: "",
  altText: "",
  tags: "",
  status: "draft",
};

type MediaRow = {
  id: string;
  asset: Asset;
  usageCount: number;
  deleted: null;
};

export default function AdminMediaPage() {
  const [assets, setAssets] = useState<Asset[]>(() => getAssets());
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "all">("all");
  const [showRegister, setShowRegister] = useState(false);
  const [registerDraft, setRegisterDraft] = useState<AssetForm>(emptyForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<AssetForm>(emptyForm);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = () => setAssets(getAssets());
  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2500);
  };

  const selected = selectedId ? assets.find((asset) => asset.id === selectedId) ?? null : null;
  const selectedUsage: AssetUsageReference[] = selected ? getAssetUsage(selected.id) : [];
  const editFormValid = Boolean(editForm.name.trim() && editForm.url.trim());

  const filtered = assets
    .filter((asset) => typeFilter === "all" || asset.type === typeFilter)
    .filter((asset) => statusFilter === "all" || asset.status === statusFilter)
    .filter((asset) =>
      `${asset.name} ${asset.title ?? ""} ${asset.description ?? ""} ${(asset.tags ?? []).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase().trim())
    );

  const registerAsset = () => {
    if (!registerDraft.name.trim() || !registerDraft.url.trim()) return;
    const created = createAsset(formToAssetPatch(registerDraft));
    flash(`Registered “${created.name}” as a ${TYPE_LABELS[created.type].toLowerCase()} reference (no file was uploaded).`);
    setRegisterDraft(emptyForm);
    setShowRegister(false);
    refresh();
  };

  const openAsset = (asset: Asset) => {
    setSelectedId(asset.id);
    setEditing(false);
  };

  const beginEdit = (asset: Asset) => {
    setEditForm(formFromAsset(asset));
    setEditing(true);
  };

  const saveEdit = () => {
    if (!selected) return;
    if (!editForm.name.trim() || !editForm.url.trim()) {
      flash("Name and source URL are required before this asset can be saved.");
      return;
    }
    updateAsset(selected.id, formToAssetPatch(editForm));
    flash("Asset metadata updated.");
    setEditing(false);
    refresh();
  };

  const confirmArchive = (asset: Asset) => {
    setArchiveConfirmId(asset.id);
  };

  const doArchive = () => {
    if (!archiveConfirmId) return;
    archiveAsset(archiveConfirmId);
    flash("Asset archived. Existing references still resolve.");
    setArchiveConfirmId(null);
    refresh();
  };

  const doRestore = (id: string) => {
    restoreAsset(id);
    flash("Asset restored and available again.");
    refresh();
  };

  const confirmDelete = (asset: Asset) => {
    setDeleteConfirmId(asset.id);
  };

  const doDelete = () => {
    if (!deleteConfirmId) return;
    const ok = deleteAsset(deleteConfirmId);
    if (ok) {
      flash("Unused asset removed from the local library.");
      if (selectedId === deleteConfirmId) setSelectedId(null);
    } else {
      flash("This asset is still referenced by content. Archive it instead of deleting.");
    }
    setDeleteConfirmId(null);
    refresh();
  };

  const usageCounts = getAssetUsageCounts();
  const rows: MediaRow[] = filtered.map((asset) => ({ id: asset.id, asset, usageCount: usageCounts.get(asset.id) ?? 0, deleted: null }));

  const archiveTarget = archiveConfirmId ? assets.find((asset) => asset.id === archiveConfirmId) ?? null : null;
  const archiveCount = archiveTarget ? getAssetUsageCount(archiveTarget.id) : 0;
  const deleteTarget = deleteConfirmId ? assets.find((asset) => asset.id === deleteConfirmId) ?? null : null;
  const deleteCount = deleteTarget ? getAssetUsageCount(deleteTarget.id) : 0;

  const columns = [
    {
      key: "asset",
      label: "Asset",
      render: (row: MediaRow) => (
        <div className="flex items-center gap-3">
          {row.asset.type === "image" ? (
            <img src={row.asset.source.url} alt={row.asset.altText ?? ""} className="h-10 w-14 shrink-0 rounded object-cover" />
          ) : (
            <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded bg-[#111111] text-[8px] font-bold uppercase tracking-[0.1em] text-white">{row.asset.type}</div>
          )}
          <div className="min-w-0">
            <button type="button" onClick={() => openAsset(row.asset)} className="block truncate text-sm font-medium text-[#111111] hover:text-[#2563EB]">
              {row.asset.name}
            </button>
            <div className="truncate text-xs text-[#666666]">{row.asset.source.kind} · {row.asset.source.url}</div>
          </div>
        </div>
      ),
    },
    { key: "type", label: "Type", render: (row: MediaRow) => <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">{TYPE_LABELS[row.asset.type]}</span> },
    { key: "status", label: "Status", render: (row: MediaRow) => <AdminStatusBadge status={row.asset.status} /> },
    { key: "usage", label: "Used In", render: (row: MediaRow) => (row.usageCount ? <span className="text-sm text-[#111111]">{row.usageCount} lesson{row.usageCount === 1 ? "" : "s"}</span> : <span className="text-sm text-[#999999]">Unused</span>) },
    { key: "updated", label: "Updated", render: (row: MediaRow) => <span className="text-sm text-[#666666]">{new Date(row.asset.updatedAt).toLocaleDateString()}</span> },
    {
      key: "actions",
      label: "Actions",
      render: (row: MediaRow) => (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => openAsset(row.asset)} className="rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#2563EB]">View</button>
          {row.asset.status === "archived" ? (
            <button type="button" onClick={() => doRestore(row.asset.id)} className="rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#2563EB]">Restore</button>
          ) : (
            <button type="button" onClick={() => confirmArchive(row.asset)} className="rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#2563EB]">Archive</button>
          )}
          <button type="button" onClick={() => confirmDelete(row.asset)} className="rounded-full border border-[#FEE2E2] px-3 py-1.5 text-xs font-semibold text-[#E11D48] hover:bg-[#FEF2F2]">Delete</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Media Library"
        description="Register and manage local or external media references used by lesson content. Metadata-first: no binary files are uploaded to a server in this prototype."
      />

      {notice ? (
        <div className="mb-6 rounded-2xl border border-[#E5E5E5] bg-[#F0FDF4] px-4 py-3 text-sm text-[#15803D]">{notice}</div>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, title, description or tag"
          className="admin-input max-w-sm"
        />
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as AssetType | "all")}
          className="admin-input max-w-xs"
        >
          <option value="all">All types</option>
          {ASSET_TYPES.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}s
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as AssetStatus | "all")}
          className="admin-input max-w-xs"
        >
          <option value="all">All statuses</option>
          {ASSET_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowRegister((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]"
        >
          {showRegister ? <X size={15} /> : <Plus size={15} />}
          {showRegister ? "Close" : "Add asset"}
        </button>
      </div>

      {showRegister ? (
        <section className="mb-8 rounded-[24px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="mb-4">
            <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Register media reference</div>
            <p className="mt-2 text-sm text-[#666666]">
              This records metadata and where the media lives. Choose an external URL or an existing local /public path. No file is
              uploaded anywhere — a real upload flow belongs to the future storage task.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-[#111111]">
              <span className="field-label">Name</span>
              <input value={registerDraft.name} onChange={(event) => setRegisterDraft({ ...registerDraft, name: event.target.value })} placeholder="e.g. Argand plane diagram" className="admin-input" />
            </label>
            <label className="space-y-2 text-sm text-[#111111]">
              <span className="field-label">Type</span>
              <select value={registerDraft.type} onChange={(event) => setRegisterDraft({ ...registerDraft, type: event.target.value as AssetType })} className="admin-input">
                {ASSET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-[#111111]">
              <span className="field-label">Source kind</span>
              <select value={registerDraft.kind} onChange={(event) => setRegisterDraft({ ...registerDraft, kind: event.target.value as AssetSourceKind })} className="admin-input">
                <option value="external">External URL</option>
                <option value="local">Local /public path</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-[#111111]">
              <span className="field-label">URL</span>
              <input value={registerDraft.url} onChange={(event) => setRegisterDraft({ ...registerDraft, url: event.target.value })} placeholder={registerDraft.kind === "external" ? "https://example.com/video.mp4" : "/media/math151/argand-plane.png"} className="admin-input" />
            </label>
            <label className="space-y-2 text-sm text-[#111111]">
              <span className="field-label">Alt text</span>
              <input value={registerDraft.altText} onChange={(event) => setRegisterDraft({ ...registerDraft, altText: event.target.value })} placeholder="Accessible description (images)" className="admin-input" />
            </label>
            <label className="space-y-2 text-sm text-[#111111]">
              <span className="field-label">Tags (comma separated)</span>
              <input value={registerDraft.tags} onChange={(event) => setRegisterDraft({ ...registerDraft, tags: event.target.value })} placeholder="complex-numbers, diagram" className="admin-input" />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={registerAsset} disabled={!registerDraft.name.trim() || !registerDraft.url.trim()} className="rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
              Register {TYPE_LABELS[registerDraft.type].toLowerCase()} reference
            </button>
            <span className="text-xs text-[#666666]">
              New assets begin as <span className="font-semibold">Draft</span> until name and source are valid.
            </span>
          </div>
        </section>
      ) : null}

      {selected ? (
        <section className="mb-8 rounded-[24px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Asset detail</div>
              <h2 className="mt-2 font-serif text-3xl text-[#111111]">{selected.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#666666]">
                <AdminStatusBadge status={selected.status} />
                <span>{TYPE_LABELS[selected.type]}</span>
                <span>·</span>
                <span>{selected.source.kind}</span>
                <span>·</span>
                <span>updated {new Date(selected.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!editing ? (
                <button type="button" onClick={() => beginEdit(selected)} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] px-3 py-2 text-sm font-semibold text-[#111111] hover:border-[#2563EB]">
                  <Pencil size={14} /> Edit
                </button>
              ) : null}
              <button type="button" onClick={() => { setSelectedId(null); setEditing(false); }} className="rounded-full border border-[#E5E5E5] p-2 text-[#666666]" aria-label="Close detail">
                <X size={15} />
              </button>
            </div>
          </div>

          {editing ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-[#111111]">
                <span className="field-label">Name</span>
                <input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} className="admin-input" />
              </label>
              <label className="space-y-2 text-sm text-[#111111]">
                <span className="field-label">Title</span>
                <input value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} className="admin-input" />
              </label>
              <label className="space-y-2 text-sm text-[#111111] md:col-span-2">
                <span className="field-label">Description</span>
                <textarea value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} rows={2} className="admin-input" />
              </label>
              <label className="space-y-2 text-sm text-[#111111]">
                <span className="field-label">Type</span>
                <select value={editForm.type} onChange={(event) => setEditForm({ ...editForm, type: event.target.value as AssetType })} className="admin-input">
                  {ASSET_TYPES.map((type) => (
                    <option key={type} value={type}>{TYPE_LABELS[type]}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-[#111111]">
                <span className="field-label">Status</span>
                <select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value as AssetStatus })} className="admin-input">
                  {ASSET_STATUSES.map((status) => (
                    <option key={status} value={status} disabled={status === "ready" && !editFormValid}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-[#111111]">
                <span className="field-label">Source kind</span>
                <select value={editForm.kind} onChange={(event) => setEditForm({ ...editForm, kind: event.target.value as AssetSourceKind })} className="admin-input">
                  <option value="external">External URL</option>
                  <option value="local">Local /public path</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-[#111111]">
                <span className="field-label">URL</span>
                <input value={editForm.url} onChange={(event) => setEditForm({ ...editForm, url: event.target.value })} className="admin-input" />
              </label>
              <label className="space-y-2 text-sm text-[#111111]">
                <span className="field-label">Alt text</span>
                <input value={editForm.altText} onChange={(event) => setEditForm({ ...editForm, altText: event.target.value })} className="admin-input" placeholder="Empty is fine for decorative images" />
              </label>
              <label className="space-y-2 text-sm text-[#111111]">
                <span className="field-label">Width</span>
                <input value={editForm.width} onChange={(event) => setEditForm({ ...editForm, width: event.target.value })} className="admin-input" placeholder="px (optional)" />
              </label>
              <label className="space-y-2 text-sm text-[#111111]">
                <span className="field-label">Height</span>
                <input value={editForm.height} onChange={(event) => setEditForm({ ...editForm, height: event.target.value })} className="admin-input" placeholder="px (optional)" />
              </label>
              <label className="space-y-2 text-sm text-[#111111]">
                <span className="field-label">Duration</span>
                <input value={editForm.duration} onChange={(event) => setEditForm({ ...editForm, duration: event.target.value })} className="admin-input" placeholder="seconds (optional)" />
              </label>
              <label className="space-y-2 text-sm text-[#111111]">
                <span className="field-label">File size</span>
                <input value={editForm.fileSize} onChange={(event) => setEditForm({ ...editForm, fileSize: event.target.value })} className="admin-input" placeholder="bytes (optional)" />
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-3 md:col-span-2">
                <button type="button" onClick={saveEdit} className="rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white">Save changes</button>
                <button type="button" onClick={() => setEditing(false)} className="rounded-full border border-[#E5E5E5] px-5 py-2.5 text-sm font-semibold text-[#666666]">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
              <div>
                {selected.type === "image" ? (
                  <img src={selected.source.url} alt={selected.altText ?? ""} className="h-auto w-full rounded-2xl border border-[#E5E5E5] object-cover" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-[#E5E5E5] bg-[#111111] text-[10px] font-bold uppercase tracking-[0.2em] text-white">{TYPE_LABELS[selected.type]}</div>
                )}
              </div>
              <div className="space-y-4">
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">Source</dt><dd className="mt-1 break-all text-[#111111]">{selected.source.kind} · {selected.source.url}</dd></div>
                  <div><dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">Dimensions</dt><dd className="mt-1 text-[#111111]">{selected.width && selected.height ? `${selected.width} × ${selected.height}` : "—"}</dd></div>
                  <div><dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">Duration</dt><dd className="mt-1 text-[#111111]">{formatDuration(selected.duration)}</dd></div>
                  <div><dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">File size</dt><dd className="mt-1 text-[#111111]">{formatBytes(selected.fileSize)}</dd></div>
                  <div><dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">MIME type</dt><dd className="mt-1 text-[#111111]">{selected.mimeType ?? "—"}</dd></div>
                  <div><dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">Alt text</dt><dd className="mt-1 text-[#111111]">{selected.altText?.trim() ? selected.altText : "None (decorative or needs text)"}</dd></div>
                </dl>
                {selected.description ? <p className="text-sm leading-6 text-[#666666]">{selected.description}</p> : null}
                <div className="flex flex-wrap gap-2">
                  {(selected.tags ?? []).length ? (selected.tags ?? []).map((tag) => <span key={tag} className="rounded-full bg-[#F7F7F8] px-2.5 py-1 text-xs text-[#666666]">#{tag}</span>) : <span className="text-xs text-[#999999]">No tags</span>}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-[#E5E5E5] pt-5">
            <div className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Used in</div>
            {selectedUsage.length ? (
              <ul className="space-y-2">
                {selectedUsage.map((ref) => (
                  <li key={`${ref.lessonId}-${ref.blockId}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <AdminStatusBadge status={ref.blockType} />
                    <span className="text-[#111111]">{ref.lessonTitle}</span>
                    <span className="text-xs text-[#666666]">in</span>
                    <span className="text-[#666666]">{ref.courseTitle || ref.courseId} · {ref.weekTitle || ref.weekId}</span>
                    <a href={`/admin/lessons/${ref.lessonId}`} className="text-xs font-semibold text-[#2563EB] hover:underline">Open lesson</a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#999999]">Not used by any current lesson content.</p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#E5E5E5] pt-5">
            {selected.status === "archived" ? (
              <button type="button" onClick={() => doRestore(selected.id)} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] px-4 py-2 text-sm font-semibold text-[#111111] hover:border-[#2563EB]">
                <ArchiveRestore size={14} /> Restore
              </button>
            ) : (
              <button type="button" onClick={() => confirmArchive(selected)} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] px-4 py-2 text-sm font-semibold text-[#111111] hover:border-[#2563EB]">
                <Archive size={14} /> Archive
              </button>
            )}
            <button type="button" onClick={() => confirmDelete(selected)} className="inline-flex items-center gap-2 rounded-full border border-[#FEE2E2] px-4 py-2 text-sm font-semibold text-[#E11D48] hover:bg-[#FEF2F2]">
              <Trash2 size={14} /> Delete
            </button>
            <span className="text-xs text-[#666666]">
              {selectedUsage.length ? `This asset is used by ${selectedUsage.length} piece${selectedUsage.length === 1 ? "" : "s"} of content.` : "This asset is unused."}
            </span>
          </div>
        </section>
      ) : null}

      <AdminTable
        columns={columns}
        rows={rows}
        emptyMessage="No assets found"
        emptyDescription="Try a different search or filter, or register a new asset reference."
      />

      {archiveTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[24px] border border-[#E5E5E5] bg-white p-6 shadow-2xl">
            <h3 className="font-serif text-2xl text-[#111111]">Archive {archiveTarget.name}</h3>
            <p className="mt-3 text-sm leading-6 text-[#666666]">
              {archiveCount > 0
                ? `This asset is used by ${archiveCount} piece${archiveCount === 1 ? "" : "s"} of content. Archiving it will prevent it from being selected for new content. Existing references may still resolve.`
                : "This asset is not used by any current content. Archiving it prevents it from being selected for new content."}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setArchiveConfirmId(null)} className="rounded-full border border-[#E5E5E5] px-4 py-2 text-sm font-semibold text-[#666666]">Cancel</button>
              <button type="button" onClick={doArchive} className="rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-white">Archive</button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[24px] border border-[#E5E5E5] bg-white p-6 shadow-2xl">
            <h3 className="font-serif text-2xl text-[#111111]">Delete {deleteTarget.name}</h3>
            <p className="mt-3 text-sm leading-6 text-[#666666]">
              {deleteCount > 0
                ? `This asset is used by ${deleteCount} piece${deleteCount === 1 ? "" : "s"} of content, so it cannot be deleted. Archive it instead to keep existing references working while hiding it from new content.`
                : "This asset is unused and can be removed from the local library. Local-only removal — no binary file is affected."}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteConfirmId(null)} className="rounded-full border border-[#E5E5E5] px-4 py-2 text-sm font-semibold text-[#666666]">Cancel</button>
              <button type="button" onClick={doDelete} disabled={deleteCount > 0} className="rounded-full bg-[#E11D48] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                {deleteCount > 0 ? "Use archive instead" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

