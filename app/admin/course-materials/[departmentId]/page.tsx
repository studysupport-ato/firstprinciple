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
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  getAdminDepartmentAction,
  getAdminCourseMaterialsAction,
  updateDepartmentAction,
  setDepartmentStatusAction,
  createCourseMaterialAction,
  updateCourseMaterialAction,
  setCourseMaterialStatusAction,
  reorderCourseMaterialsAction,
  archiveCourseMaterialAction,
} from "@/lib/adminContentActions";
import type { CourseMaterialEntry, CourseMaterialsDepartment } from "@/lib/content/adminContract";
import type { ContentStatus } from "@/lib/content/lifecycle";

const statuses: ContentStatus[] = ["draft", "published", "archived"];

export default function AdminCourseMaterialsDepartmentPage() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const [department, setDepartment] = useState<CourseMaterialsDepartment | undefined>();
  const [entries, setEntries] = useState<CourseMaterialEntry[]>([]);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [departmentForm, setDepartmentForm] = useState({ name: "", shortName: "", description: "", status: "draft" as ContentStatus });
  const [entryForm, setEntryForm] = useState({ courseCode: "", courseTitle: "", description: "", url: "", provider: "", status: "draft" as ContentStatus });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmEntry, setConfirmEntry] = useState<CourseMaterialEntry | null>(null);
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<CourseMaterialEntry | null>(null);
  const [confirmDepartmentArchive, setConfirmDepartmentArchive] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  async function refresh() {
    setLoading(true);
    try {
      const [deptResult, materialsResult] = await Promise.all([
        getAdminDepartmentAction(departmentId),
        getAdminCourseMaterialsAction(departmentId),
      ]);
      
      if (!deptResult.ok) throw new Error(deptResult.error);
      if (!materialsResult.ok) throw new Error(materialsResult.error);
      
      const found = deptResult.data;
      setDepartment(found || undefined);
      setEntries(materialsResult.data);
      if (found) setDepartmentForm({ name: found.name, shortName: found.shortName ?? "", description: found.description ?? "", status: found.status });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The department could not be loaded.");
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    setShowEntryForm(searchParams.get("create") === "1");
  }, [departmentId, searchParams]);

  async function saveDepartment() {
    try {
      const result = await updateDepartmentAction(departmentId, {
        name: departmentForm.name.trim(),
        shortName: departmentForm.shortName.trim() || undefined,
        description: departmentForm.description.trim() || undefined,
        status: departmentForm.status,
      });
      if (!result.ok) throw new Error(result.error);
      if (result.data) setDepartment(result.data);
      setNotice("Department details saved.");
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Department details could not be saved.");
    }
  }

  function startNewEntry() {
    setEditingEntryId(null);
    setEntryForm({ courseCode: "", courseTitle: "", description: "", url: "", provider: "", status: "draft" });
    setShowEntryForm(true);
  }

  function startEditEntry(entry: CourseMaterialEntry) {
    setEditingEntryId(entry.id);
    setEntryForm({
      courseCode: entry.courseCode ?? "",
      courseTitle: entry.courseTitle,
      description: entry.description ?? "",
      url: entry.url,
      provider: entry.provider ?? "",
      status: entry.status,
    });
    setShowEntryForm(true);
  }

  async function saveEntry() {
    try {
      const input = {
        departmentId,
        courseCode: entryForm.courseCode.trim() || undefined,
        courseTitle: entryForm.courseTitle.trim(),
        description: entryForm.description.trim() || undefined,
        url: entryForm.url.trim(),
        provider: entryForm.provider.trim() || undefined,
        status: entryForm.status,
      };
      let result;
      if (editingEntryId) {
        result = await updateCourseMaterialAction(editingEntryId, input);
      } else {
        result = await createCourseMaterialAction(input);
      }
      
      if (!result.ok) throw new Error(result.error);
      setShowEntryForm(false);
      setNotice(editingEntryId ? "Course material updated." : "Course material created.");
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Course material could not be saved.");
    }
  }

  async function toggleEntry(entry: CourseMaterialEntry) {
    if (entry.status === "archived") {
      try {
        const result = await setCourseMaterialStatusAction(entry.id, "draft");
        if (!result.ok) throw new Error(result.error);
        refresh();
        setNotice("Course material restored as a draft.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Course material status could not be saved.");
      }
      return;
    }

    setConfirmEntry(entry);
  }

  async function confirmArchiveEntry() {
    if (!confirmEntry) return;

    try {
      const result = await archiveCourseMaterialAction(confirmEntry.id);
      if (!result.ok) throw new Error(result.error);
      setNotice("Course material archived.");
      setConfirmEntry(null);
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Course material status could not be saved.");
    }
  }

  async function confirmDeleteEntry() {
    if (!deleteEntryTarget) return;
    try {
      const { deleteMaterialAction } = await import("@/lib/adminContentActions");
      const result = await deleteMaterialAction(deleteEntryTarget.id);
      if (!result.ok) throw new Error(result.error);
      setNotice("Course material deleted.");
      setDeleteEntryTarget(null);
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Course material could not be deleted.");
    }
  }

  async function moveEntry(id: string, direction: -1 | 1) {
    const index = entries.findIndex((entry) => entry.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= entries.length) return;
    const ids = entries.map((entry) => entry.id);
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    await reorderCourseMaterialsAction(departmentId, ids);
    refresh();
  }

  if (loading) return <div>Loading...</div>;
  if (error && !department) return <AdminErrorState title="Department unavailable" description={error} onRetry={refresh} />;
  if (!department) return <AdminErrorState title="Department not found" description="This department is not present in the local Course Materials directory." />;

  return (
    <div>
      <AdminPageHeader
        title={department.name}
        description={department.description ?? "Manage the external course-material links in this department."}
        breadcrumbs={[{ label: "Course Materials", href: "/admin/course-materials" }, { label: department.name }]}
        actionLabel="Add material"
        actionHref={`/admin/course-materials/${department.id}?create=1`}
        actionIcon={<Plus size={15} />}
      />

      {notice ? <div className="mb-6 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#15803D]">{notice}</div> : null}
      {error ? <div className="mb-6 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</div> : null}

      <ConfirmDialog
        open={!!confirmEntry}
        title="Archive course material"
        description={confirmEntry ? `Archive "${confirmEntry.courseTitle}"?` : "Archive this course material?"}
        confirmLabel="Archive"
        onConfirm={confirmArchiveEntry}
        onCancel={() => setConfirmEntry(null)}
      />

      <ConfirmDialog
        open={!!deleteEntryTarget}
        title="Delete course material"
        description={deleteEntryTarget ? `Permanently delete "${deleteEntryTarget.courseTitle}"? This cannot be undone.` : "Delete this course material?"}
        confirmLabel="Delete"
        onConfirm={confirmDeleteEntry}
        onCancel={() => setDeleteEntryTarget(null)}
      />

      <ConfirmDialog
        open={confirmDepartmentArchive}
        title="Archive department"
        description={`Archive "${department.name}"? Its materials will remain stored but hidden from students.`}
        confirmLabel="Archive"
        onConfirm={async () => {
          await setDepartmentStatusAction(department.id, "archived");
          setConfirmDepartmentArchive(false);
          refresh();
          setNotice("Department archived.");
        }}
        onCancel={() => setConfirmDepartmentArchive(false)}
      />

      <section className="mb-8 rounded-[24px] border border-[#E5E5E5] bg-white p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="field-label">Department metadata</div>
            <h2 className="mt-1 font-serif text-2xl">Edit department</h2>
          </div>
          <AdminStatusBadge status={department.status} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="field-label">Name</span>
            <input value={departmentForm.name} onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })} className="admin-input" />
          </label>

          <label className="space-y-2">
            <span className="field-label">Short name or code</span>
            <input value={departmentForm.shortName} onChange={(event) => setDepartmentForm({ ...departmentForm, shortName: event.target.value })} className="admin-input" />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="field-label">Description</span>
            <textarea value={departmentForm.description} onChange={(event) => setDepartmentForm({ ...departmentForm, description: event.target.value })} rows={3} className="admin-input" />
          </label>

          <label className="space-y-2">
            <span className="field-label">Status</span>
            <select value={departmentForm.status} onChange={(event) => setDepartmentForm({ ...departmentForm, status: event.target.value as ContentStatus })} className="admin-input">
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={saveDepartment} className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]">
            <Save size={15} />
            Save department
          </button>

          <button
            type="button"
            onClick={async () => {
              if (department.status === "archived") {
                await setDepartmentStatusAction(department.id, "draft");
                refresh();
                setNotice("Department restored as a draft.");
              } else {
                setConfirmDepartmentArchive(true);
              }
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-5 py-2.5 text-sm font-semibold text-[#111111] hover:border-[#111111]"
          >
            {department.status === "archived" ? <ArchiveRestore size={15} /> : <Archive size={15} />}
            {department.status === "archived" ? "Restore" : "Archive"}
          </button>

          <Link href="/admin/course-materials" className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] px-4 py-2.5 text-sm font-semibold">
            <ArrowLeft size={14} />
            All departments
          </Link>
        </div>
      </section>

      {showEntryForm ? (
        <section id="material-form" className="mb-8 rounded-[24px] border border-[#E5E5E5] bg-white p-6">
          <div className="mb-5">
            <div className="field-label">{editingEntryId ? "Edit course material" : "New course material"}</div>
            <h2 className="mt-1 font-serif text-2xl">External link details</h2>
            <p className="mt-2 text-sm text-[#666666]">Only metadata and the external destination are stored. No external page is embedded or imported.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="field-label">Course code</span>
              <input value={entryForm.courseCode} onChange={(event) => setEntryForm({ ...entryForm, courseCode: event.target.value })} className="admin-input" placeholder="Optional" />
            </label>

            <label className="space-y-2">
              <span className="field-label">Course title</span>
              <input value={entryForm.courseTitle} onChange={(event) => setEntryForm({ ...entryForm, courseTitle: event.target.value })} className="admin-input" />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="field-label">External URL</span>
              <input value={entryForm.url} onChange={(event) => setEntryForm({ ...entryForm, url: event.target.value })} className="admin-input" placeholder="https://example.com/materials" />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="field-label">Description</span>
              <textarea value={entryForm.description} onChange={(event) => setEntryForm({ ...entryForm, description: event.target.value })} rows={3} className="admin-input" />
            </label>

            <label className="space-y-2">
              <span className="field-label">Provider or source</span>
              <input value={entryForm.provider} onChange={(event) => setEntryForm({ ...entryForm, provider: event.target.value })} className="admin-input" placeholder="Optional" />
            </label>

            <label className="space-y-2">
              <span className="field-label">Status</span>
              <select value={entryForm.status} onChange={(event) => setEntryForm({ ...entryForm, status: event.target.value as ContentStatus })} className="admin-input">
                {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-5 flex gap-3">
            <button type="button" onClick={saveEntry} className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]">
              <Save size={15} />
              {editingEntryId ? "Save material" : "Create material"}
            </button>
            <button type="button" onClick={() => setShowEntryForm(false)} className="rounded-full border border-[#E5E5E5] px-5 py-2.5 text-sm font-semibold">
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {!entries.length ? (
        <AdminEmptyState
          title="No course materials yet"
          description="Add the first external course-material link for this department."
          actionLabel="Add course material"
          actionHref={`/admin/course-materials/${department.id}?create=1`}
        />
      ) : (
        <AdminTable
          columns={[
            {
              key: "entry",
              label: "Course material",
              render: (row) => (
                <div>
                  <div className="font-medium text-[#111111]">
                    {row.entry.courseCode ? `${row.entry.courseCode} · ` : ""}
                    {row.entry.courseTitle}
                  </div>
                  <div className="mt-1 max-w-[280px] truncate text-xs text-[#666666]">{row.entry.provider ?? row.entry.url}</div>
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (row) => <AdminStatusBadge status={row.entry.status} />,
            },
            { key: "order", label: "Order" },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => startEditEntry(row.entry)} className="rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold">
                    Edit
                  </button>
                  <a href={row.entry.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold">
                    Open <ExternalLink size={12} />
                  </a>
                  <button type="button" onClick={() => moveEntry(row.entry.id, -1)} disabled={row.index === 0} className="rounded-full border border-[#E5E5E5] p-1.5 disabled:opacity-30" aria-label={`Move ${row.entry.courseTitle} up`}>
                    <ArrowUp size={13} />
                  </button>
                  <button type="button" onClick={() => moveEntry(row.entry.id, 1)} disabled={row.index === entries.length - 1} className="rounded-full border border-[#E5E5E5] p-1.5 disabled:opacity-30" aria-label={`Move ${row.entry.courseTitle} down`}>
                    <ArrowDown size={13} />
                  </button>
                  <button type="button" onClick={() => toggleEntry(row.entry)} className="inline-flex items-center gap-1 rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs font-semibold">
                    {row.entry.status === "archived" ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                    {row.entry.status === "archived" ? "Restore" : "Archive"}
                  </button>
                  <button type="button" onClick={() => setDeleteEntryTarget(row.entry)} className="inline-flex items-center gap-1 rounded-full border border-red-200 text-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-50">
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          rows={entries.map((entry, index) => ({ id: entry.id, entry, order: entry.order + 1, index }))}
          emptyMessage="No materials found"
          emptyDescription="Add a link to begin organizing this department."
        />
      )}
    </div>
  );
}
