"use client";

import Link from "next/link";
import { Archive, ArchiveRestore, ArrowLeft, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { AdminErrorState } from "@/components/admin/AdminErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { CourseMaterialsBuilder } from "@/components/admin/CourseMaterialsBuilder";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  getAdminDepartmentAction,
  getAdminCourseMaterialsAction,
  updateDepartmentAction,
  setDepartmentStatusAction,
} from "@/lib/adminContentActions";
import type { CourseMaterialEntry, CourseMaterialsDepartment } from "@/lib/content/adminContract";
import type { ContentStatus } from "@/lib/content/lifecycle";

const statuses: ContentStatus[] = ["draft", "published", "archived"];

export default function AdminCourseMaterialsDepartmentPage() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const [department, setDepartment] = useState<CourseMaterialsDepartment | undefined>();
  const [entries, setEntries] = useState<CourseMaterialEntry[]>([]);
  const [departmentForm, setDepartmentForm] = useState({ name: "", shortName: "", description: "", status: "draft" as ContentStatus });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDepartmentArchive, setConfirmDepartmentArchive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Only the first load shows the full-page spinner; later refreshes keep the builder (and its open course) in place.
  const loadedOnce = useRef(false);

  async function refresh() {
    if (!loadedOnce.current) setLoading(true);
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
    loadedOnce.current = true;
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [departmentId]);

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

  if (loading) return <div>Loading...</div>;
  if (error && !department) return <AdminErrorState title="Department unavailable" description={error} onRetry={refresh} />;
  if (!department) return <AdminErrorState title="Department not found" description="This department is not present in the local Course Materials directory." />;

  return (
    <div>
      <AdminPageHeader
        title={department.name}
        description={department.description ?? "Build this programme: years, semesters and courses. Materials live inside each course."}
        breadcrumbs={[{ label: "Course Materials", href: "/admin/course-materials" }, { label: department.name }]}
      />

      {notice ? <div className="mb-6 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#15803D]">{notice}</div> : null}
      {error ? <div className="mb-6 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</div> : null}

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

      <CourseMaterialsBuilder
        departmentId={department.id}
        entries={entries}
        onChanged={refresh}
        onNotice={(message) => {
          setError(null);
          setNotice(message);
        }}
        onError={(message) => {
          setNotice(null);
          setError(message);
        }}
      />
    </div>
  );
}
