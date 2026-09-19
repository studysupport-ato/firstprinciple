import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";

export default function AdminStudentsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Students"
        description="The student roster is not yet connected to a persisted identity or database layer. This page reflects the current local-only state."
      />

      <AdminEmptyState
        title="No student records yet"
        description="Student accounts will appear here once authentication and persistence are connected. Until then, this view intentionally stays empty and accurate."
      />
    </div>
  );
}
