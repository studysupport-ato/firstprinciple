"use client";

import Link from "next/link";
import { Copy, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTable } from "@/components/admin/AdminTable";
import { getAssessments } from "@/lib/content/access";
import { getAssessmentTotalMarks } from "@/lib/assessment/builder";
import { hasAssessmentOverride, saveAssessmentOverride } from "@/lib/content/overrides";
import type { Assessment } from "@/lib/content/types/assessment";
import { createStableId } from "@/lib/ids";

export default function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>(() => getAssessments());

  useEffect(() => {
    setAssessments(getAssessments());
  }, []);

  function duplicateAssessment(assessment: Assessment) {
    const duplicate: Assessment = {
      ...assessment,
      id: createStableId("assessment-copy", assessment.title),
      status: "draft",
      title: `${assessment.title} Copy`,
      blueprint: { rules: assessment.blueprint.rules.map((rule) => ({ ...rule, tags: rule.tags ? [...rule.tags] : undefined })) },
    };

    saveAssessmentOverride({ assessmentId: duplicate.id, updatedAt: new Date().toISOString(), assessment: duplicate });
    setAssessments(getAssessments());
  }

  const rows = assessments.map((assessment) => ({
    id: assessment.id,
    title: assessment.title,
    course: assessment.courseId,
    count: assessment.questionCount,
    marks: getAssessmentTotalMarks(assessment),
    status: hasAssessmentOverride(assessment.id) ? "Local override" : assessment.status ?? "published",
  }));

  return (
    <div>
      <AdminPageHeader
        title="Assessments"
        description="Build and manage assessments from the question bank."
        actionLabel="Create assessment"
        actionHref="/admin/assessments/new"
        actionIcon={<Plus size={15} />}
      />

      <AdminTable
        columns={[
          {
            key: "title",
            label: "Assessment",
            render: (row) => <Link href={`/admin/assessments/${row.id}`} className="font-medium text-[#111111] hover:text-[#2563EB]">{row.title}</Link>,
          },
          { key: "course", label: "Course" },
          { key: "count", label: "Questions" },
          { key: "marks", label: "Total marks" },
          { key: "status", label: "Status", render: (row) => <AdminStatusBadge status={row.status} /> },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <div className="flex items-center gap-3">
                <Link href={`/admin/assessments/${row.id}`} className="text-sm font-medium text-[#111111] hover:text-[#2563EB]">Open</Link>
                <button type="button" onClick={() => duplicateAssessment(assessments.find((assessment) => assessment.id === row.id)!)} className="inline-flex items-center gap-1 text-sm font-medium text-[#666666] hover:text-[#111111]">
                  <Copy size={14} />
                  Duplicate
                </button>
              </div>
            ),
          },
        ]}
        rows={rows}
        emptyMessage="No assessments yet"
        emptyDescription="Create a local assessment blueprint to assemble questions from the shared question bank."
      />
    </div>
  );
}
