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
import {
  archiveDepartment,
  getCourseMaterialsDirectory,
  restoreDepartment,
  reorderDepartments,
  createDepartment,
  type CourseMaterialsDepartment,
  type CourseMaterialsStatus,
} from "@/lib/courseMaterials";

const statuses: CourseMaterialsStatus[] = ["draft", "published", "archived"];

export default function AdminCourseMaterialsPage() {
  const [departments, setDepartments] = useState<CourseMaterialsDepartment[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ name: "", shortName: "", description: "", status: "draft" as CourseMaterialsStatus });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const searchParams = useSearchParams();

  function refresh() {
    try {
      setDepartments(getCourseMaterialsDirectory().departments);
      setError(null);
    } catch {
      setError("The Course Materials directory could not be loaded.");
    }
  }

  useEffect(() => {
    refresh();
    setShowCreate(searchParams.get("create") === "1");
  }, [searchParams]);

  function create() {
    try {
      createDepartment({ name: draft.name.trim(), shortName: draft.shortName.trim() || undefined, description: draft.description.trim() || undefined, status: draft.status });
      setDraft({ name: "", shortName: "", description: "", status: "draft" });
      setShowCreate(false);
      setNotice("Department created.");
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The department could not be created.");
    }
  }

  function move(id: string, direction: -1 | 1) {
    const index = departments.findIndex((department) => department.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= departments.length) return;
    const ids = departments.map((department) => department.id);
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    reorderDepartments(ids);
    refresh();
  }

  function toggleArchive(department: CourseMaterialsDepartment) {
    try {
      if (department.status === "archived") restoreDepartment(department.id);
      else if (window.confirm(`Archive ${department.name}? Its materials will remain stored but hidden from students.`)) archiveDepartment(department.id);
      refresh();
      setNotice(department.status === "archived" ? "Department restored as a draft." : "Department archived.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The department status could not be saved.");
    }
  }

  const directory = getCourseMaterialsDirectory();
  const rows = departments.map((department, index) => ({
    id: department.id,
    department,
    count: directory.entries.filter((entry) => entry.departmentId === department.id).length,
    order: department.order + 1,
    updatedAt: department.updatedAt,
    index,
  }));

  if (error && !departments.length) return <AdminErrorState title="Course Materials unavailable" description={error} onRetry={refresh} />;

  return (
    <div>
      <AdminPageHeader title="Course Materials" description="Organize external academic material links by department. First Principles stores metadata and links only." actionLabel="Create department" actionHref="/admin/course-materials?create=1" actionIcon={<Plus size={15} />} />
      {notice ? <div className="mb-6 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#15803D]">{notice}</div> : null}
      {error ? <div className="mb-6 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</div> : null}

      {showCreate ? <section id="create-department" className="mb-8 rounded-[24px] border border-[#E5E5E5] bg-white p-6"><div className="mb-5 flex items-center gap-3"><Library size={18} /><div><div className="field-label">New department</div><h2 className="mt-1 font-serif text-2xl">Department details</h2></div></div><div className="grid gap-4 md:grid-cols-2"><label className="space-y-2"><span className="field-label">Name</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="admin-input" placeholder="Department name" /></label><label className="space-y-2"><span className="field-label">Short name or code</span><input value={draft.shortName} onChange={(event) => setDraft({ ...draft, shortName: event.target.value })} className="admin-input" placeholder="Optional" /></label><label className="space-y-2 md:col-span-2"><span className="field-label">Description</span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={3} className="admin-input" /></label><label className="space-y-2"><span className="field-label">Status</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as CourseMaterialsStatus })} className="admin-input">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label></div><button type="button" onClick={create} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]"><Save size={15} />Create department</button></section> : null}

      {!departments.length ? <AdminEmptyState title="No departments yet" description="Create the first department to start organizing external course materials." actionLabel="Create department" actionHref="/admin/course-materials?create=1" /> : <AdminTable columns={[{ key: "department", label: "Department", render: (row) => <div><Link href={`/admin/course-materials/${row.department.id}`} className="font-medium text-[#111111] hover:text-[#2563EB]">{row.department.name}</Link><div className="mt-1 text-xs text-[#666666]">{row.department.shortName ?? "No short name"}</div></div> }, { key: "count", label: "Materials" }, { key: "status", label: "Status", render: (row) => <AdminStatusBadge status={row.department.status} /> }, { key: "order", label: "Order" }, { key: "updatedAt", label: "Updated", render: (row) => new Date(row.updatedAt).toLocaleDateString() }, { key: "actions", label: "Actions", render: (row) => <div className="flex flex-wrap items-center gap-2"><Link href={`/admin/course-materials/${row.department.id}`} className="rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold hover:border-[#2563EB]">Manage</Link><button type="button" onClick={() => move(row.department.id, -1)} disabled={row.index === 0} className="rounded-full border border-[#E5E5E5] p-1.5 disabled:opacity-30" aria-label={`Move ${row.department.name} up`}><ArrowUp size={13} /></button><button type="button" onClick={() => move(row.department.id, 1)} disabled={row.index === departments.length - 1} className="rounded-full border border-[#E5E5E5] p-1.5 disabled:opacity-30" aria-label={`Move ${row.department.name} down`}><ArrowDown size={13} /></button><button type="button" onClick={() => toggleArchive(row.department)} className="inline-flex items-center gap-1 rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold">{row.department.status === "archived" ? <ArchiveRestore size={12} /> : <Archive size={12} />}{row.department.status === "archived" ? "Restore" : "Archive"}</button></div> }]} rows={rows} emptyMessage="No departments match" emptyDescription="Create or restore a department to manage its external course material links." />}
    </div>
  );
}
