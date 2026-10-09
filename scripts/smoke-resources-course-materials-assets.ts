import { config } from "dotenv";
import { createResourceRepository } from "../lib/content/resourceRepository";
import { createSupabaseAdminClient } from "../lib/supabase/client";
import { createCourseMaterialsRepository } from "../lib/courseMaterialsRepository";
import { createAssetRepository } from "../lib/content/assetRepository";

config({ path: ".env.local" });

async function main() {
  // Task 40G.6C: this script asserts on the full resource/placement set, so it
  // states its privilege explicitly instead of inheriting an implicit default.
  const resources = createResourceRepository("supabase", createSupabaseAdminClient);
  const courseMaterials = createCourseMaterialsRepository("supabase");
  // Task 40G.7B: this script asserts on the full asset set, so it states its
  // privilege explicitly instead of inheriting an implicit browser client.
  const assets = createAssetRepository("supabase", createSupabaseAdminClient);

  const resourceRows = await resources.listResources();
  const placements = await resources.listPlacements();
  const departments = await courseMaterials.listDepartments();
  const materials = await courseMaterials.listCourseMaterials();
  const assetRows = await assets.listAssets();

  console.log("Supabase connection/query succeeded.");
  console.log(`resources=${resourceRows.length}`);
  console.log(`placements=${placements.length}`);
  console.log(`departments=${departments.length}`);
  console.log(`courseMaterials=${materials.length}`);
  console.log(`assets=${assetRows.length}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Supabase resources/course materials/assets smoke test failed: ${message}`);
  process.exitCode = 1;
});