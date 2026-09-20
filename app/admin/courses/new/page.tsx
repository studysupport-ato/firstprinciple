"use client";

import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { createCourseAction } from "@/lib/adminContentActions";
import type { ContentStatus } from "@/lib/content/lifecycle";

export default function AdminNewCoursePage() {
  const router = useRouter();
  const [draft, setDraft] = useState({ code: "", title: "", shortTitle: "", description: "", department: "", status: "draft" as ContentStatus });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateField(field: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleCreate() {
    const code = draft.code.trim().toUpperCase();
    const title = draft.title.trim();

    if (!code || !title || !draft.description.trim()) {
      setError("Course code, title, and description are required.");
      return;
    }

    const id = code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    setSaving(true);
    const result = await createCourseAction({
      id,
      code,
      title,
      shortTitle: draft.shortTitle.trim() || title,
      description: draft.description.trim(),
      department: draft.department.trim() || undefined,
      status: draft.status,
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.error.includes("duplicate") || result.error.includes("unique") ? "A course with this code already exists." : result.error);
      return;
    }

    router.push(`/admin/courses/${result.data.id}`);
  }

  return (
    <div>
      <AdminPageHeader title="Create course" description="Add a course to the hosted Back2Basics with Kwamina curriculum." breadcrumbs={[{ label: "Courses", href: "/admin/courses" }, { label: "New course" }]} />
      <section className="max-w-3xl rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
        <div className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2"><span className="field-label">Course code</span><input value={draft.code} onChange={(event) => updateField("code", event.target.value)} placeholder="CSC 101" className="admin-input" /></label>
            <label className="space-y-2"><span className="field-label">Course title</span><input value={draft.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Introduction to Computer Science" className="admin-input" /></label>
          </div>
          <label className="space-y-2"><span className="field-label">Short title</span><input value={draft.shortTitle} onChange={(event) => updateField("shortTitle", event.target.value)} placeholder="Computer Science" className="admin-input" /></label>
          <label className="space-y-2"><span className="field-label">Department</span><input value={draft.department} onChange={(event) => updateField("department", event.target.value)} placeholder="Computer Science" className="admin-input" /></label>
          <label className="space-y-2"><span className="field-label">Description</span><textarea value={draft.description} onChange={(event) => updateField("description", event.target.value)} rows={5} placeholder="What does this course teach?" className="admin-input" /></label>
          <label className="space-y-2"><span className="field-label">Status</span><select value={draft.status} onChange={(event) => updateField("status", event.target.value)} className="admin-input"><option value="draft">draft</option><option value="published">published</option></select></label>
        </div>
        {error ? <p className="mt-5 rounded-xl bg-[#FEF2F2] px-4 py-3 text-sm text-[#E11D48]">{error}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/admin/courses" className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] px-4 py-2.5 text-sm font-medium text-[#111111]"><ArrowLeft size={15} />Cancel</Link>
          <button type="button" disabled={saving} onClick={() => void handleCreate()} className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50"><Save size={15} />{saving ? "Saving…" : "Create course"}</button>
        </div>
      </section>
    </div>
  );
}

