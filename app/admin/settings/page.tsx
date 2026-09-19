import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";

export default function AdminSettingsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Settings"
        description="This local admin view does not yet manage a real global platform configuration layer or persisted settings system."
      />

      <AdminEmptyState
        title="No global settings yet"
        description="Platform configuration will appear here when persistence and admin authorization are connected. For now, settings remain local and intentionally minimal."
      />
    </div>
  );
}
