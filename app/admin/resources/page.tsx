"use client";

import Link from "next/link";
import { Archive, ArchiveRestore, ExternalLink, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminErrorState } from "@/components/admin/AdminErrorState";
import { AdminLoadingState } from "@/components/admin/AdminLoadingState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTable } from "@/components/admin/AdminTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { getAdminResourcesAction, setResourceStatusAction } from "@/lib/adminContentActions";
import type { AdminResourceListRow } from "@/lib/content/adminContract";
import type { LearningResource, LearningResourceStatus, LearningResourceType } from "@/lib/content/types/resource";

const resourceTypes: LearningResourceType[] = ["youtube", "geogebra", "external"];
const resourceStatuses: LearningResourceStatus[] = ["draft", "published", "archived"];
const typeLabels: Record<LearningResourceType, string> = { youtube: "YouTube", geogebra: "GeoGebra", external: "External" };

type ResourceRow = {
  id: string;
  resource: LearningResource;
  type: string;
  status: string;
  placementCount: number;
  updatedAt: string;
};

function resourceSource(resource: LearningResource) {
  if (resource.type === "youtube") return resource.data.sourceType === "ato" ? "Ato's Tutorial" : "Recommended YouTube";
  if (resource.type === "geogebra") return resource.data.materialId ? `Material ${resource.data.materialId}` : resource.data.appName ?? "Interactive app";
  return resource.data.provider ?? resource.data.url;
}

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<AdminResourceListRow[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<LearningResourceType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<LearningResourceStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmResource, setConfirmResource] = useState<LearningResource | null>(null);

  async function refresh() {
    setLoading(true);
    const result = await getAdminResourcesAction();
    if (result.ok) {
      setResources(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(
    () =>
      resources
        .filter((row) => typeFilter === "all" || row.resource.type === typeFilter)
        .filter((row) => statusFilter === "all" || row.resource.status === statusFilter)
        .filter((row) => `${row.resource.title} ${row.resource.description ?? ""} ${row.resource.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())),
    [query, resources, statusFilter, typeFilter],
  );

  function changeLifecycle(resource: LearningResource) {
    setConfirmResource(resource);
  }

  async function confirmLifecycleChange() {
    if (!confirmResource) return;

    try {
      const newStatus = confirmResource.status === "archived" ? "draft" : "archived";
      const result = await setResourceStatusAction(confirmResource.id, newStatus);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice(confirmResource.status === "archived" ? "Resource restored as a draft." : "Resource archived. Existing placements remain available for review.");
      setConfirmResource(null);
      refresh();
    } catch {
      setError("The resource lifecycle change could not be saved.");
    }
  }

  const rows: ResourceRow[] = filtered.map((row) => ({
    id: row.resource.id,
    resource: row.resource,
    type: typeLabels[row.resource.type],
    status: row.resource.status,
    placementCount: row.placementCount,
    updatedAt: row.resource.updatedAt,
  }));

  if (loading) return <AdminLoadingState />;
  if (error) {
    return <AdminErrorState title="Resources could not be loaded" description={error} onRetry={refresh} />;
  }

  return (
    <div>
      <AdminPageHeader
        title="Resources"
        description="Manage reusable learning resources and place them across the Course, Week, and Day hierarchy."
        actionLabel="Create resource"
        actionHref="/admin/resources/new"
        actionIcon={<Plus size={15} />}
      />

      {notice ? <div className="mb-6 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#15803D]">{notice}</div> : null}
      <ConfirmDialog open={!!confirmResource} title={confirmResource?.status === "archived" ? "Restore resource" : "Archive resource"} description={confirmResource ? `${confirmResource.status === "archived" ? "Restore" : "Archive"} "${confirmResource.title}"? ${confirmResource.status === "archived" ? "This brings the resource back to the draft set." : "Existing placements will remain attached."}` : "Archive this resource?"} confirmLabel={confirmResource?.status === "archived" ? "Restore" : "Archive"} onConfirm={confirmLifecycleChange} onCancel={() => setConfirmResource(null)} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, description or tag" className="admin-input max-w-sm" />
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as LearningResourceType | "all")} className="admin-input max-w-xs">
          <option value="all">All types</option>
          {resourceTypes.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as LearningResourceStatus | "all")} className="admin-input max-w-xs">
          <option value="all">All statuses</option>
          {resourceStatuses.map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}
        </select>
      </div>

      {!resources.length ? (
        <AdminEmptyState title="No learning resources yet" description="Create a reusable YouTube, GeoGebra, or external resource to begin building the supplementary learning library." actionLabel="Create resource" actionHref="/admin/resources/new" />
      ) : (
        <AdminTable
          columns={[
            {
              key: "resource",
              label: "Resource",
              render: (row) => (
                <div className="min-w-[220px]">
                  <Link href={`/admin/resources/${row.resource.id}`} className="font-medium text-[#111111] hover:text-[#2563EB]">{row.resource.title}</Link>
                  <div className="mt-1 truncate text-xs text-[#666666]">{resourceSource(row.resource)}</div>
                </div>
              ),
            },
            { key: "type", label: "Type", render: (row) => <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">{row.type}</span> },
            { key: "status", label: "Status", render: (row) => <AdminStatusBadge status={row.status} /> },
            { key: "placementCount", label: "Placements", render: (row) => <span>{row.placementCount}</span> },
            { key: "updatedAt", label: "Updated", render: (row) => <span className="whitespace-nowrap text-[#666666]">{new Date(row.updatedAt).toLocaleDateString()}</span> },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/resources/${row.resource.id}`} className="inline-flex items-center gap-1 rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#2563EB]"><ExternalLink size={12} /> View</Link>
                  <button type="button" onClick={() => changeLifecycle(row.resource)} className="inline-flex items-center gap-1 rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#2563EB]">
                    {row.resource.status === "archived" ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                    {row.resource.status === "archived" ? "Restore" : "Archive"}
                  </button>
                </div>
              ),
            },
          ]}
          rows={rows}
          emptyMessage="No matching resources"
          emptyDescription="Try a different search or filter."
        />
      )}
    </div>
  );
}

