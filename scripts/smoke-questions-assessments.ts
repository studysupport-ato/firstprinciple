import { config } from "dotenv";
import { createQuestionRepository } from "../lib/questions/repository";
import { createAssessmentRepository } from "../lib/assessment/repository";
import { createSupabaseAdminClient } from "../lib/supabase/client";

config({ path: ".env.local" });

async function main() {
  // Task 40G.4: this read-only verification script runs outside a request scope,
  // so there is no cookie session to bind. It explicitly requests the service-role
  // client (the same privilege it always resolved implicitly) so it can assert on
  // the full question set. Production student reads no longer use this path.
  const questionsRepository = createQuestionRepository("supabase", createSupabaseAdminClient);
  const assessmentsRepository = createAssessmentRepository("supabase");
  const questions = await questionsRepository.listQuestions();
  const assessments = await assessmentsRepository.listAssessments();

  console.log("Supabase connection/query succeeded.");
  console.log(`questions=${questions.length} assessments=${assessments.length}`);

  if (questions[0]) {
    await questionsRepository.getQuestion(questions[0].id);
    console.log("question single-record read succeeded.");
  } else {
    console.log("question single-record read skipped: no hosted question rows.");
  }

  if (assessments[0]) {
    await assessmentsRepository.getAssessment(assessments[0].id);
    console.log("assessment single-record read succeeded.");
  } else {
    console.log("assessment single-record read skipped: no hosted assessment rows.");
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Supabase questions/assessments smoke test failed: ${message}`);
  process.exitCode = 1;
});