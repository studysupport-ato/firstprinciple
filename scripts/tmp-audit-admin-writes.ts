import { config } from "dotenv";
import { createSupabaseAdminClient, createSupabaseBrowserClient } from "../lib/supabase/client";

config({ path: ".env.local" });

const TABLES = ["courses", "weeks", "days", "questions", "assessments", "learning_resources", "resource_placements", "departments", "course_materials"] as const;

async function main() {
  const admin = createSupabaseAdminClient();
  for (const table of TABLES) {
    const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
    console.log(`ADMIN ${table} count=${error ? `ERROR ${error.message}` : count}`);
  }
  console.log("---");
  for (const table of TABLES) {
    const { count, error } = await (await import("../lib/supabase/client")).createSupabaseBrowserClient().from(table).select("*", { count: "exact", head: true });
    console.log(`BROWSER ${table} count=${error ? `ERROR ${error.message}` : count}`);
  }
  console.log("--- read-only baseline recorded");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
