import { config } from "dotenv";
import { createSupabaseAdminClient } from "../lib/supabase/client";

config({ path: ".env.local" });

async function main() {
  const admin = createSupabaseAdminClient();
  const questions = await admin.from("questions").select("id,course_id,chapter_id,lesson_id,topic,subtopic,type,difficulty,marks,status,source,tags,correct_answer").limit(50);
  console.log("=== questions ===");
  for (const row of questions.data ?? []) console.log(JSON.stringify(row));
  const assessments = await admin.from("assessments").select("id,course_id,title,duration_minutes,question_count,status,blueprint").limit(50);
  console.log("=== assessments ===");
  for (const row of assessments.data ?? []) console.log(JSON.stringify(row));
  const resources = await admin.from("learning_resources").select("id,type,title,status,tags,data").limit(50);
  console.log("=== learning_resources ===");
  for (const row of resources.data ?? []) console.log(JSON.stringify(row));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
