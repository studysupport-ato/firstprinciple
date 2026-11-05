"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MaterialsQuickAccess } from "@/components/materials-hub/MaterialsQuickAccess";
import { addAdminHubData } from "@/components/materials-hub/useHub";
import { adminTestHubDataAction } from "@/lib/courseReps/actions";

/** The student side (Slides, Assignments, notice board) with the hidden test programme added. Admin only. */
export default function AdminStudentViewPage() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void adminTestHubDataAction().then((result) => {
      if (result.ok) {
        addAdminHubData(result.data);
        setState("ready");
      } else {
        setError(result.error);
        setState("error");
      }
    });
  }, []);

  return (
    <div>
      <AdminPageHeader title="Student view" description="What students see after picking a programme and year. Inter Science (test) is added here for you only." />
      <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.5, color: "#555" }}>
        Tap <b>Change</b> on the programme card and pick <b>Inter Science (test)</b>, Year 1. Then post from the test course rep account in a private window and watch it land on the notice board here.
        {" "}
        <Link href="/admin/course-reps" className="underline underline-offset-2">Back to course reps</Link>
      </p>
      {state === "loading" ? <p style={{ fontWeight: 700 }}>Loading…</p> : null}
      {state === "error" ? <p style={{ fontWeight: 700, color: "#B3261E" }}>{error}</p> : null}
      {state === "ready" ? (
        <div style={{ borderRadius: 18, overflow: "hidden", border: "2px solid #1A1814" }}>
          <MaterialsQuickAccess adminPreview />
        </div>
      ) : null}
    </div>
  );
}
