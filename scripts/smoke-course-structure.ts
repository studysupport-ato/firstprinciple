import { config } from "dotenv";
import { smokeTestCourseStructureRepository, smokeTestDayContentRepository } from "../lib/supabase/smoke";

config({ path: ".env.local" });

async function main() {
  try {
    const result = await smokeTestCourseStructureRepository();
    console.log("Supabase connection/query succeeded.");
    console.log(`courses = ${result.courseCount}`);
    console.log(`weeks = ${result.weekCount}`);
    console.log(`days = ${result.dayCount}`);
    const dayContent = await smokeTestDayContentRepository();
    console.log(`day content query succeeded; matching day = ${dayContent.found ? "yes" : "no"}`);
    console.log(`day content blocks = ${dayContent.blockCount}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Supabase course structure smoke test failed: ${message}`);
    process.exitCode = 1;
  }
}

void main();