import { config } from "dotenv";
import { getCourses, getLessons, getWeeks } from "../lib/content/access";
import { validateBlock } from "../lib/content/overrides";
import { math151Assessments } from "../lib/content/math151/assessments";
import { math151Questions } from "../lib/content/math151/questions";
import { createSupabaseAdminClient } from "../lib/supabase/client";
import type { Course, Week } from "../lib/content/types/course";
import type { Lesson } from "../lib/content/types/lesson";

config({ path: ".env.local" });

const COURSE_ID = "math-151";
const PUBLISHED = "published" as const;

type SeedDataset = { course: Course; weeks: Week[]; days: Lesson[] };

function resolvedDataset(): SeedDataset {
  const course = getCourses().find((candidate) => candidate.id === COURSE_ID);
  const weeks = getWeeks(COURSE_ID).sort((first, second) => first.weekNumber - second.weekNumber);
  const lessons = getLessons(COURSE_ID);
  if (!course) throw new Error(`Canonical course ${COURSE_ID} was not found.`);
  return { course, weeks, days: lessons };
}

function validateDataset(dataset: SeedDataset) {
  const errors: string[] = [];
  const weekIds = new Set<string>();
  const dayIds = new Set<string>();

  if (!dataset.course.id || dataset.course.id !== COURSE_ID) errors.push(`Unexpected course ID: ${dataset.course.id}.`);
  if (!dataset.course.code || !dataset.course.title) errors.push("Course is missing required metadata.");
  if (dataset.weeks.length === 0) errors.push("No canonical MATH 151 weeks were found.");

  for (const week of dataset.weeks) {
    if (weekIds.has(week.id)) errors.push(`Duplicate week ID: ${week.id}.`);
    weekIds.add(week.id);
    if (week.courseId !== COURSE_ID) errors.push(`Week ${week.id} points to ${week.courseId}, not ${COURSE_ID}.`);
    if (!Number.isInteger(week.weekNumber) || week.weekNumber < 1) errors.push(`Week ${week.id} has an invalid week number.`);
    for (const dayId of week.sessionIds) {
      const day = dataset.days.find((candidate) => candidate.id === dayId);
      if (!day) errors.push(`Week ${week.id} references missing Day ${dayId}.`);
      else if (day.weekId !== week.id) errors.push(`Day ${day.id} points to ${day.weekId}, not ${week.id}.`);
    }
  }

  for (const day of dataset.days) {
    if (dayIds.has(day.id)) errors.push(`Duplicate Day ID: ${day.id}.`);
    dayIds.add(day.id);
    if (day.courseId !== COURSE_ID) errors.push(`Day ${day.id} points to ${day.courseId}, not ${COURSE_ID}.`);
    if (!weekIds.has(day.weekId)) errors.push(`Day ${day.id} references missing Week ${day.weekId}.`);
    if (!day.title.trim() || !day.description.trim()) errors.push(`Day ${day.id} is missing title or description.`);
    if (!Array.isArray(day.blocks)) errors.push(`Day ${day.id} has no content block array.`);
    for (const block of day.blocks) {
      const blockErrors = validateBlock(block);
      if (blockErrors.length) errors.push(`Day ${day.id}, block ${block.id}: ${blockErrors.join("; ")}`);
    }
  }

  if (errors.length) throw new Error(`MATH 151 seed validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
}

function courseRow(course: Course) {
  return { id: course.id, code: course.code, title: course.title, short_title: course.shortTitle, description: course.description, department: course.department ?? null, status: course.status ?? PUBLISHED };
}

function weekRow(week: Week) {
  return { id: week.id, course_id: week.courseId, title: week.title, description: week.description, week_number: week.weekNumber, status: week.status ?? PUBLISHED };
}

function dayRows(dataset: SeedDataset) {
  return dataset.days.map((day) => {
    const week = dataset.weeks.find((candidate) => candidate.id === day.weekId);
    const order = week?.sessionIds.indexOf(day.id) ?? -1;
    if (!week || order < 0) throw new Error(`Day ${day.id} is not present in its Week session order.`);
    return {
      id: day.id,
      course_id: day.courseId,
      week_id: day.weekId,
      chapter_id: day.chapterId || null,
      title: day.title,
      description: day.description,
      order_index: order + 1,
      estimated_minutes: day.estimatedMinutes,
      objectives: day.objectives,
      content_blocks: day.blocks,
      status: day.status ?? PUBLISHED,
    };
  });
}

function questionRows() {
  return math151Questions.map((question) => ({
    id: question.id,
    course_id: question.courseId,
    chapter_id: question.chapterId || null,
    lesson_id: question.lessonId || null,
    topic: question.topic,
    subtopic: question.subtopic,
    type: question.type,
    difficulty: question.difficulty,
    prompt: question.prompt,
    options: question.options ?? null,
    correct_answer: question.correctAnswer,
    explanation: question.explanation,
    hint: question.hint ?? null,
    marks: question.marks,
    tags: question.tags,
    status: question.metadata?.status ?? PUBLISHED,
    source: question.metadata?.source ?? "authored",
    variant_of: question.metadata?.variantOf ?? null,
    author: question.metadata?.author ?? null,
  }));
}

function assessmentRows() {
  return math151Assessments.map((assessment) => ({
    id: assessment.id,
    course_id: assessment.courseId,
    title: assessment.title,
    description: assessment.description,
    duration_minutes: assessment.durationMinutes,
    question_count: assessment.questionCount,
    blueprint: assessment.blueprint,
    status: assessment.status ?? PUBLISHED,
  }));
}

// Only Argand Plane has a GeoGebra resource. Real Numbers does not.
// The "Real Number Systems Explorer" resource was removed because GeoGebra has no
// pedagogical role in the Real Numbers lesson. The incorrect placement
// (placement-math151-real-numbers-resource) was deleted from Supabase.
const RESOURCE_SEEDS = [
  {
    id: "math151-argand-plane-resource",
    type: "geogebra",
    title: "Argand Plane Visualizer",
    description: "A GeoGebra interactive for plotting complex numbers in the complex plane.",
    tags: ["math-151", "complex-numbers", "argand-plane"],
    metadata: { lessonId: "math151-argand-plane", canonical: true },
    data: {
      materialId: "dtrhtr3h",
      appName: "graphing",
      config: {
        visualizer: "geogebra",
        appName: "graphing",
        materialId: "dtrhtr3h",
        height: 420,
        showToolbar: true,
        showAlgebraInput: false,
        showMenuBar: false,
        showResetIcon: true,
        showNotes: true,
      },
    },
  },
] as const;

const RESOURCE_PLACEMENTS = [
  // Real Numbers: no GeoGebra placement (intentional).
  { id: "placement-math151-argand-plane-resource", resource_id: "math151-argand-plane-resource", day_id: "math151-argand-plane", order_index: 0 },
] as const;

async function main() {
  const dataset = resolvedDataset();
  validateDataset(dataset);
  console.log(`Validated MATH 151 dataset: courses=1 weeks=${dataset.weeks.length} days=${dataset.days.length} blocks=${dataset.days.reduce((count, day) => count + day.blocks.length, 0)}`);

  if (process.argv.includes("--check")) {
    console.log("Validation-only mode; no Supabase writes performed.");
    return;
  }

  const client = createSupabaseAdminClient();
  const { error: courseError } = await client.from("courses").upsert(courseRow(dataset.course) as never, { onConflict: "id" });
  if (courseError) throw courseError;
  const { error: weekError } = await client.from("weeks").upsert(dataset.weeks.map(weekRow) as never, { onConflict: "id" });
  if (weekError) throw weekError;
  const rows = dayRows(dataset);
  const { error: dayError } = await client.from("days").upsert(rows as never, { onConflict: "id" });
  if (dayError) throw dayError;

  const { error: questionError } = await client.from("questions").upsert(questionRows() as never, { onConflict: "id" });
  if (questionError) throw questionError;

  const { error: assessmentError } = await client.from("assessments").upsert(assessmentRows() as never, { onConflict: "id" });
  if (assessmentError) throw assessmentError;

  const { error: resourceError } = await client.from("learning_resources").upsert(
    RESOURCE_SEEDS.map((resource) => ({
      id: resource.id,
      type: resource.type,
      title: resource.title,
      description: resource.description,
      tags: resource.tags,
      metadata: resource.metadata,
      data: resource.data,
      status: "published",
    })) as never,
    { onConflict: "id" },
  );
  if (resourceError) throw resourceError;

  const { error: placementError } = await client.from("resource_placements").upsert(
    RESOURCE_PLACEMENTS.map((placement) => ({
      id: placement.id,
      resource_id: placement.resource_id,
      course_id: null,
      week_id: null,
      day_id: placement.day_id,
      order_index: placement.order_index,
    })) as never,
    { onConflict: "id" },
  );
  if (placementError) throw placementError;

  console.log(`Seeded MATH 151 idempotently: courses=1 weeks=${dataset.weeks.length} days=${rows.length} questions=${math151Questions.length} assessments=${math151Assessments.length} resources=${RESOURCE_SEEDS.length} placements=${RESOURCE_PLACEMENTS.length}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});