"use client";

import Link from "next/link";
import { Archive, ArchiveRestore, ArrowDown, ArrowLeft, ArrowUp, ExternalLink, Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminErrorState } from "@/components/admin/AdminErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTable } from "@/components/admin/AdminTable";
import {
  archiveCourseMaterial,
  archiveDepartment,
  createCourseMaterial,
  getCourseMaterialsDirectory,
  getDepartmentById,
  restoreCourseMaterial,
  restoreDepartment,
  reorderCourseMaterials,
  updateCourseMaterial,
  updateDepartment,
  type CourseMaterialEntry,
  type CourseMaterialsDepartment,
  type CourseMaterialsStatus,
} from "@/lib/courseMaterials";

const statuses: CourseMaterialsStatus[] = ["draft", "published", "archived"];

export default function AdminCourseMaterialsDepartmentPage() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const [department, setDepartment] = useState<CourseMaterialsDepartment | undefined>();
  const [entries, setEntries] = useState<CourseMaterialEntry[]>([]);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [departmentForm, setDepartmentForm] = useState({ name: "", shortName: "", description: "", status: "draft" as CourseMaterialsStatus });
  const [entryForm, setEntryForm] = useState({ courseCode: "", courseTitle: "", description: "", url: "", provider: "", status: "draft" as CourseMaterialsStatus });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const searchParams = useSearchParams();

  function refresh() {
    const directory = getCourseMaterialsDirectory();
    const found = directory.departments.find((item) => item.id === departmentId);
    setDepartment(found);
    setEntries(directory.entries.filter((entry) => entry.departmentId === departmentId));
    if (found) setDepartmentForm({ name: found.name, shortName: found.shortName ?? "", description: found.description ?? "", status: found.status });
  }

  useEffect(() => {
    try {
      refresh();
      setShowEntryForm(searchParams.get("create") === "1");
    } catch {
      setError("The department could not be loaded.");
    }
  }, [departmentId, searchParams]);

  function saveDepartment() {
    try {
      const updated = updateDepartment(departmentId, { name: departmentForm.name.trim(), shortName: departmentForm.shortName.trim() || undefined, description: departmentForm.description.trim() || undefined, status: departmentForm.status });
      if (updated) setDepartment(updated);
      setNotice("Department details saved.");
      refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Department details could not be saved."); }
  }

  function startNewEntry() {
    setEditingEntryId(null);
    setEntryForm({ courseCode: "", courseTitle: "", description: "", url: "", provider: "", status: "draft" });
    setShowEntryForm(true);
  }

  function startEditEntry(entry: CourseMaterialEntry) {
    setEditingEntryId(entry.id);
    setEntryForm({ courseCode: entry.courseCode ?? "", courseTitle: entry.courseTitle, description: entry.description ?? "", url: entry.url, provider: entry.provider ?? "", status: entry.status });
    setShowEntryForm(true);
  }

  function saveEntry() {
    try {
      const input = { departmentId, courseCode: entryForm.courseCode.trim() || undefined, courseTitle: entryForm.courseTitle.trim(), description: entryForm.description.trim() || undefined, url: entryForm.url.trim(), provider: entryForm.provider.trim() || undefined, status: entryForm.status };
      if (editingEntryId) updateCourseMaterial(editingEntryId, input);
      else createCourseMaterial(input);
      setShowEntryForm(false);
      setNotice(editingEntryId ? "Course material updated." : "Course material created.");
      refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Course material could not be saved."); }
  }

  function toggleEntry(entry: CourseMaterialEntry) {
    try {
      if (entry.status === "archived") restoreCourseMaterial(entry.id);
      else if (window.confirm(`Archive ${entry.courseTitle}?`)) archiveCourseMaterial(entry.id);
      refresh();
      setNotice(entry.status === "archived" ? "Course material restored as a draft." : "Course material archived.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Course material status could not be saved."); }
  }

  function moveEntry(id: string, direction: -1 | 1) {
    const index = entries.findIndex((entry) => entry.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= entries.length) return;
    const ids = entries.map((entry) => entry.id);
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    reorderCourseMaterials(departmentId, ids);
    refresh();
  }

  if (error && !department) return <AdminErrorState title="Department unavailable" description={error} onRetry={refresh} />;
  if (!department) return <AdminErrorState title="Department not found" description="This department is not present in the local Course Materials directory." />;

  return (
    <div>
      <AdminPageHeader title={department.name} description={department.description ?? "Manage the external course-material links in this department."} breadcrumbs={[{ label: "Course Materials", href: "/admin/course-materials" }, { label: department.name }]} actionLabel="Add material" actionHref={`/admin/course-materials/${department.id}?create=1`} actionIcon={<Plus size={15} />} />
      {notice ? <div className="mb-6 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#15803D]">{notice}</div> : null}
      {error ? <div className="mb-6 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</div> : null}

      <section className="mb-8 rounded-[24px] border border-[#E5E5E5] bg-white p-6"><div className="mb-5 flex items-center justify-between gap-4"><div><div className="field-label">Department metadata</div><h2 className="mt-1 font-serif text-2xl">Edit department</h2></div><AdminStatusBadge status={department.status} /></div><div className="grid gap-4 md:grid-cols-2"><label className="space-y-2"><span className="field-label">Name</span><input value={departmentForm.name} onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })} className="admin-input" /></label><label className="space-y-2"><span className="field-label">Short name or code</span><input value={departmentForm.shortName} onChange={(event) => setDepartmentForm({ ...departmentForm, shortName: event.target.value })} className="admin-input" /></label><label className="space-y-2 md:col-span-2"><span className="field-label">Description</span><textarea value={departmentForm.description} onChange={(event) => setDepartmentForm({ ...departmentForm, description: event.target.value })} rows={3} className="admin-input" /></label><label className="space-y-2"><span className="field-label">Status</span><select value={departmentForm.status} onChange={(event) => setDepartmentForm({ ...departmentForm, status: event.target.value as CourseMaterialsStatus })} className="admin-input">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label></div><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={saveDepartment} className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]"><Save size={15} />Save department</button><button type="button" onClick={() => { if (department.status === "archived") restoreDepartment(department.id); else if (window.confirm(`Archive ${department.name}?`)) archiveDepartment(department.id); refresh(); }} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] px-4 py-2.5 text-sm font-semibold">{department.status === "archived" ? <ArchiveRestore size={14} /> : <Archive size={14} />}{department.status === "archived" ? "Restore as draft" : "Archive"}</button><Link href="/admin/course-materials" className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] px-4 py-2.5 text-sm font-semibold"><ArrowLeft size={14} />All departments</Link></div></section>

      {showEntryForm ? <section id="material-form" className="mb-8 rounded-[24px] border border-[#E5E5E5] bg-white p-6"><div className="mb-5"><div className="field-label">{editingEntryId ? "Edit course material" : "New course material"}</div><h2 className="mt-1 font-serif text-2xl">External link details</h2><p className="mt-2 text-sm text-[#666666]">Only metadata and the external destination are stored. No external page is embedded or imported.</p></div><div className="grid gap-4 md:grid-cols-2"><label className="space-y-2"><span className="field-label">Course code</span><input value={entryForm.courseCode} onChange={(event) => setEntryForm({ ...entryForm, courseCode: event.target.value })} className="admin-input" placeholder="Optional" /></label><label className="space-y-2"><span className="field-label">Course title</span><input value={entryForm.courseTitle} onChange={(event) => setEntryForm({ ...entryForm, courseTitle: event.target.value })} className="admin-input" /></label><label className="space-y-2 md:col-span-2"><span className="field-label">External URL</span><input value={entryForm.url} onChange={(event) => setEntryForm({ ...entryForm, url: event.target.value })} className="admin-input" placeholder="https://example.com/materials" /></label><label className="space-y-2 md:col-span-2"><span className="field-label">Description</span><textarea value={entryForm.description} onChange={(event) => setEntryForm({ ...entryForm, description: event.target.value })} rows={3} className="admin-input" /></label><label className="space-y-2"><span className="field-label">Provider or source</span><input value={entryForm.provider} onChange={(event) => setEntryForm({ ...entryForm, provider: event.target.value })} className="admin-input" placeholder="Optional" /></label><label className="space-y-2"><span className="field-label">Status</span><select value={entryForm.status} onChange={(event) => setEntryForm({ ...entryForm, status: event.target.value as CourseMaterialsStatus })} className="admin-input">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label></div><div className="mt-5 flex gap-3"><button type="button" onClick={saveEntry} className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]"><Save size={15} />{editingEntryId ? "Save material" : "Create material"}</button><button type="button" onClick={() => setShowEntryForm(false)} className="rounded-full border border-[#E5E5E5] px-5 py-2.5 text-sm font-semibold">Cancel</button></div></section> : null}

      {!entries.length ? <AdminEmptyState title="No course materials yet" description="Add the first external course-material link for this department." actionLabel="Add course material" actionHref={`/admin/course-materials/${department.id}?create=1`} /> : <AdminTable columns={[{ key: "entry", label: "Course material", render: (row) => <div><div className="font-medium text-[#111111]">{row.entry.courseCode ? `${row.entry.courseCode} · ` : ""}{row.entry.courseTitle}</div><div className="mt-1 max-w-[280px] truncate text-xs text-[#666666]">{row.entry.provider ?? row.entry.url}</div></div> }, { key: "status", label: "Status", render: (row) => <AdminStatusBadge status={row.entry.status} /> }, { key: "order", label: "Order" }, { key: "actions", label: "Actions", render: (row) => <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => startEditEntry(row.entry)} className="rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold">Edit</button><a href={row.entry.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold">Open <ExternalLink size={12} /></a><button type="button" onClick={() => moveEntry(row.entry.id, -1)} disabled={row.index === 0} className="rounded-full border border-[#E5E5E5] p-1.5 disabled:opacity-30" aria-label={`Move ${row.entry.courseTitle} up`}><ArrowUp size={13} /></button><button type="button" onClick={() => moveEntry(row.entry.id, 1)} disabled={row.index === entries.length - 1} className="rounded-full border border-[#E5E5E5] p-1.5 disabled:opacity-30" aria-label={`Move ${row.entry.courseTitle} down`}><ArrowDown size={13} /></button><button type="button" onClick={() => toggleEntry(row.entry)} className="inline-flex items-center gap-1 rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold">{row.entry.status === "archived" ? <ArchiveRestore size={12} /> : <Archive size={12} />}{row.entry.status === "archived" ? "Restore" : "Archive"}</button></div> }]} rows={entries.map((entry, index) => ({ id: entry.id, entry, order: entry.order + 1, index }))} emptyMessage="No materials found" emptyDescription="Add a link to begin organizing this department." />}
    </div>
  );
}
