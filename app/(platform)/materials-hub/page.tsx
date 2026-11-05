import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminTestProgramme } from "@/components/materials-hub/AdminTestProgramme";
import { MaterialsHubView } from "@/components/materials-hub/MaterialsHubView";
import { materialsHubLive } from "@/lib/site/materialsHub";
import { isAdminVisitor } from "@/lib/site/isAdminVisitor";

export const metadata: Metadata = {
  title: "Course materials · Back2Basics with Kwamina",
  robots: { index: false },
};

export default async function MaterialsHubPage() {
  // Admin-only while testing: everyone else gets a normal 404.
  const isAdmin = await isAdminVisitor();
  if (!materialsHubLive() && !isAdmin) notFound();
  return (
    <Suspense fallback={null}>
      {isAdmin ? <AdminTestProgramme /> : null}
      <MaterialsHubView />
    </Suspense>
  );
}
