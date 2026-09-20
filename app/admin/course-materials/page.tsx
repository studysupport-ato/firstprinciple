"use client";

import Link from "next/link";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Library, Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminErrorState } from "@/components/admin/AdminErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTable } from "@/components/admin/AdminTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  getAdminDepartmentsAction,
  createDepartmentAction,
  reorderDepartmentsAction,
  setDepartmentStatusAction,
} from "@/lib/adminContentActions";
import type { AdminDepartmentListRow, CourseMaterialsDepartment } from "@/lib/content/adminContract";
import type { ContentStatus } from "@/lib/content/lifecycle";

const statuses: ContentStatus[] = ["draft", "published", "archived"];

export default function AdminCourseMaterialsPage() {
  const [departmentRows, setDepartmentRows] = useState<AdminDepartmentListRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ name: "", shortName: "", description: "", status: "draft" as ContentStatus });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDepartment, setConfirmDepartment] = useState<CourseMaterialsDepartment | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  async function refresh() {
    setLoading(true);
    const result = await getAdminDepartmentsAction();
    if (result.ok) {
      setDepartmentRows(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    setShowCreate(searchParams.get("create") === "1");
  }, [searchParams]);

  async function create() {
    try {
      const result = await createDepartmentAction({ name: draft.name.trim(), shortName: draft.shortName.trim() || undefined, description: draft.description.trim() || undefined, status: draft.status });
      if (!result.ok) throw new Error(result.error);
      setDraft({ name: "", shortName: "", description: "", status: "draft" });
      setShowCreate(false);
      setNotice("Department created.");
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The department could not be created.");
    }
  }

  async function move(id: string, direction: -1 | 1) {
    const index = departmentRows.findIndex((row) => row.department.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= departmentRows.length) return;
    const ids = departmentRows.map((row) => row.department.id);
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    await reorderDepartmentsAction(ids);
    refresh();
  }

  async function toggleArchive(department: CourseMaterialsDepartment) {
    if (department.status === "archived") {
      try {
        const result = await setDepartmentStatusAction(department.id, "draft");
        if (!result.ok) throw new Error(result.error);
        refresh();
        setNotice("Department restored as a draft.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The department status could not be saved.");
      }
      return;
    }

    setConfirmDepartment(department);
  }

  const [deleteTarget, setDeleteTarget] = useState<CourseMaterialsDepartment | null>(null);

  async function confirmArchiveDepartment() {
    if (!confirmDepartment) return;

    try {
      const result = await setDepartmentStatusAction(confirmDepartment.id, "archived");
      if (!result.ok) throw new Error(result.error);
      setNotice("Department archived.");
      setConfirmDepartment(null);
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The department status could not be saved.");
    }
  }

  async function confirmDeleteDepartment() {
    if (!deleteTarget) return;

    try {
      const { deleteDepartmentAction } = await import("@/lib/adminContentActions");
      const result = await deleteDepartmentAction(deleteTarget.id);
      if (!result.ok) throw new Error(result.error);
      setNotice("Department deleted.");
      setDeleteTarget(null);
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The department could not be deleted.");
    }
  }

  const rows = departmentRows.map((row, index) => ({
    id: row.department.id,
    department: row.department,
    count: row.materialCount,
    order: row.department.order + 1,
    updatedAt: row.department.updatedAt,
    index,
  }));

  if (error && !departmentRows.length) return <AdminErrorState title="Course Materials unavailable" description={error} onRetry={refresh} />;

  return (
    <div>
      <AdminPageHeader title="Course Materials" description="Organize external academic material links by department. Back2Basics with Kwamina stores metadata and links only." actionLabel="Create department" actionHref="/admin/course-materials?create=1" actionIcon={<Plus size={15} />} />
      {notice ? <div className="mb-6 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#15803D]">{notice}</div> : null}
      {error ? <div className="mb-6 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</div> : null}
      <ConfirmDialog open={!!confirmDepartment} title="Archive department" description={confirmDepartment ? `Archive "${confirmDepartment.name}"? Its materials will remain stored but hidden from students.` : "Archive this department?"} confirmLabel="Archive" onConfirm={confirmArchiveDepartment} onCancel={() => setConfirmDepartment(null)} />
      <ConfirmDialog open={!!deleteTarget} title="Delete department" description={deleteTarget ? `Permanently delete "${deleteTarget.name}" and all its materials? This cannot be undone.` : "Delete this department?"} confirmLabel="Delete" onConfirm={confirmDeleteDepartment} onCancel={() => setDeleteTarget(null)} />

      {showCreate ? <section id="create-department" className="mb-8 rounded-[24px] border border-[#E5E5E5] bg-white p-6"><div className="mb-5 flex items-center gap-3"><Library size={18} /><div><div className="field-label">New department</div><h2 className="mt-1 font-serif text-2xl">Department details</h2></div></div><div className="grid gap-4 md:grid-cols-2"><label className="space-y-2"><span className="field-label">Name</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="admin-input" placeholder="Department name" /></label><label className="space-y-2"><span className="field-label">Short name or code</span><input value={draft.shortName} onChange={(event) => setDraft({ ...draft, shortName: event.target.value })} className="admin-input" placeholder="Optional" /></label><label className="space-y-2 md:col-span-2"><span className="field-label">Description</span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={3} className="admin-input" /></label><label className="space-y-2"><span className="field-label">Status</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ContentStatus })} className="admin-input">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label></div><button type="button" onClick={create} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]"><Save size={15} />Create department</button></section> : null}

      {!departmentRows.length ? <AdminEmptyState title="No departments yet" description="Create the first department to start organizing external course materials." actionLabel="Create department" actionHref="/admin/course-materials?create=1" /> : <AdminTable columns={[{ key: "department", label: "Department", render: (row) => <div><Link href={`/admin/course-materials/${row.department.id}`} className="font-medium text-[#111111] hover:text-[#2563EB]">{row.department.name}</Link><div className="mt-1 text-xs text-[#666666]">{row.department.shortName ?? "No short name"}</div></div> }, { key: "count", label: "Materials" }, { key: "status", label: "Status", render: (row) => <AdminStatusBadge status={row.department.status} /> }, { key: "order", label: "Order" }, { key: "updatedAt", label: "Updated", render: (row) => new Date(row.updatedAt).toLocaleDateString() }, { key: "actions", label: "Actions", render: (row) => <div className="flex flex-wrap items-center gap-2"><Link href={`/admin/course-materials/${row.department.id}`} className="rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold hover:border-[#2563EB]">Manage</Link><button type="button" onClick={() => move(row.department.id, -1)} disabled={row.index === 0} className="rounded-full border border-[#E5E5E5] p-1.5 disabled:opacity-30" aria-label={`Move ${row.department.name} up`}><ArrowUp size={13} /></button><button type="button" onClick={() => move(row.department.id, 1)} disabled={row.index === departmentRows.length - 1} className="rounded-full border border-[#E5E5E5] p-1.5 disabled:opacity-30" aria-label={`Move ${row.department.name} down`}><ArrowDown size={13} /></button><button type="button" onClick={() => toggleArchive(row.department)} className="inline-flex items-center gap-1 rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold">{row.department.status === "archived" ? <ArchiveRestore size={12} /> : <Archive size={12} />}{row.department.status === "archived" ? "Restore" : "Archive"}</button><button type="button" onClick={() => setDeleteTarget(row.department)} className="inline-flex items-center gap-1 rounded-full border border-red-200 text-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-50">Delete</button></div> }]} rows={rows} emptyMessage="No departments match" emptyDescription="Create or restore a department to manage its external course material links." />}
    </div>
  );
}
