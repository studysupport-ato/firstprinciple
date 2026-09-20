import { config } from "dotenv";
import { createSupabaseAdminClient, createSupabaseBrowserClient } from "../lib/supabase/client";

config({ path: ".env.local" });

const PROBE_ID = "tmp-rls-probe-course";

async function main() {
  const browser = createSupabaseBrowserClient();
  const { error } = await browser.from("courses").insert({ id: PROBE_ID, code: "TMP 000", title: "probe", short_title: "probe", description: "probe" } as never);
  console.log(`BROWSER insert courses => ${error ? `BLOCKED: ${error.code} ${error.message}` : "ALLOWED"}`);
  if (!error) {
    const admin = createSupabaseAdminClient();
    const { error: deleteError } = await admin.from("courses").delete().eq("id", PROBE_ID);
    console.log(`cleanup => ${deleteError ? deleteError.message : "ok"}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
