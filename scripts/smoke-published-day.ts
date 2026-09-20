import { config } from "dotenv";
import { getPublishedDay } from "../lib/content/publishedDay";

config({ path: ".env.local" });

async function main() {
  const result = await getPublishedDay("smoke-course-not-found", "smoke-week-not-found", "smoke-day-not-found");
  console.log("Supabase published Day query succeeded.");
  console.log(`result=${result.kind}`);
  console.log("read-only: no content was inserted or modified.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Supabase published Day smoke test failed: ${message}`);
  process.exitCode = 1;
});