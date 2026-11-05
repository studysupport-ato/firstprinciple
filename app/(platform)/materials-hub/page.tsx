import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminTestProgramme } from "@/components/materials-hub/AdminTestProgramme";
import { MaterialsHubView } from "@/components/materials-hub/MaterialsHubView";
import { MATERIALS_HUB_LIVE } from "@/lib/site/materialsHub";
import { isAdminVisitor } from "@/lib/site/isAdminVisitor";

export const metadata: Metadata = {
  title: "Course materials · Back2Basics with Kwamina",
  robots: { index: false },
};

export default async function MaterialsHubPage() {
  // Admin-only while testing: everyone else gets a normal 404.
  const isAdmin = await isAdminVisitor();
  if (!MATERIALS_HUB_LIVE && !isAdmin) notFound();
  return (
    <Suspense fallback={null}>
      {isAdmin ? <AdminTestProgramme /> : null}
      <MaterialsHubView />
    </Suspense>
  );
}
