import { config } from "dotenv";
import { createSupabaseAdminClient } from "../lib/supabase/client";

config({ path: ".env.local" });

async function main() {
  const admin = createSupabaseAdminClient();
  for (const table of ["courses", "weeks", "days", "questions", "assessments", "learning_resources", "resource_placements", "departments", "course_materials"] as const) {
    const { data, error } = await admin.from(table).select("*").limit(50);
    console.log(`=== ${table} ===`);
    if (error) { console.log(error.message); continue; }
    for (const row of data ?? []) {
      const entries = Object.entries(row as Record<string, unknown>).map(([key, value]) => {
        const text = typeof value === "string" ? value : JSON.stringify(value);
        return `${key}=${text.length > 160 ? `${text.slice(0, 160)}…` : text}`;
      });
      console.log(`  ${entries.join(" | ")}`);
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
