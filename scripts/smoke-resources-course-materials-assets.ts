import { config } from "dotenv";
import { createResourceRepository } from "../lib/content/resourceRepository";
import { createCourseMaterialsRepository } from "../lib/courseMaterialsRepository";
import { createAssetRepository } from "../lib/content/assetRepository";

config({ path: ".env.local" });

async function main() {
  const resources = createResourceRepository("supabase");
  const courseMaterials = createCourseMaterialsRepository("supabase");
  const assets = createAssetRepository("supabase");

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