"use client";

import { useEffect, useRef, useState } from "react";

import { AdminErrorState } from "@/components/admin/AdminErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GeneralCoursesBuilder } from "@/components/admin/GeneralCoursesBuilder";
import { getAdminCourseMaterialsAction } from "@/lib/adminContentActions";
import type { CourseMaterialEntry } from "@/lib/content/adminContract";
import { GENERAL_DEPARTMENT_ID } from "@/lib/courseMaterials";

export default function AdminGeneralCoursesPage() {
  const [entries, setEntries] = useState<CourseMaterialEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedOnce = useRef(false);

  async function refresh() {
    if (!loadedOnce.current) setLoading(true);
    const result = await getAdminCourseMaterialsAction(GENERAL_DEPARTMENT_ID);
    if (result.ok) {
      setEntries(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    loadedOnce.current = true;
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (loading) return <div className="p-8 text-sm text-[#666666]">Loading general courses...</div>;
  if (error && !entries.length) return <AdminErrorState title="General courses unavailable" description={error} onRetry={refresh} />;

  return (
    <div>
      <AdminPageHeader title="General courses" description="Courses shared across the College of Engineering. Create a course here once, add its materials once, and every student sees it in the General courses panel." />
      {notice ? <div className="mb-6 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#15803D]">{notice}</div> : null}
      {error ? <div className="mb-6 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</div> : null}
      <GeneralCoursesBuilder
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
