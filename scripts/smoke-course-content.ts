import { config } from "dotenv";
import { createCourseStructureServerRepository, createDayContentServerRepository } from "../lib/content/serverRepository";
import { getLessons } from "../lib/content/access";

config({ path: ".env.local" });

const COURSE_ID = "math-151";

function normalizeForComparison(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForComparison(item));
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, nested]) => nested !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, normalizeForComparison(nested)] as const);
    return Object.fromEntries(entries);
  }
  return value;
}

function firstDiff(local: unknown, remote: unknown, path: string): { path: string; local: unknown; remote: unknown } | undefined {
  if (Array.isArray(local) && Array.isArray(remote)) {
    for (let index = 0; index < Math.max(local.length, remote.length); index += 1) {
      if (index >= local.length || index >= remote.length) {
        return { path: `${path}[${index}]`, local: local[index], remote: remote[index] };
      }
      const child = firstDiff(local[index], remote[index], `${path}[${index}]`);
      if (child) return child;
    }
    return undefined;
  }
  if (local !== null && typeof local === "object" && remote !== null && typeof remote === "object") {
    const localEntries = Object.entries(normalizeForComparison(local) as Record<string, unknown>);
    const remoteEntries = Object.entries(normalizeForComparison(remote) as Record<string, unknown>);
    const keys = Array.from(new Set([...localEntries.map(([key]) => key), ...remoteEntries.map(([key]) => key)])).sort();
    for (const key of keys) {
      const localValue = (local as Record<string, unknown>)[key];
      const remoteValue = (remote as Record<string, unknown>)[key];
      const child = firstDiff(localValue, remoteValue, `${path}.${key}`);
      if (child) return child;
    }
    return undefined;
  }
  if (JSON.stringify(normalizeForComparison(local)) !== JSON.stringify(normalizeForComparison(remote))) {
    return { path, local: normalizeForComparison(local), remote: normalizeForComparison(remote) };
  }
  return undefined;
}

async function main() {
  const structure = createCourseStructureServerRepository();
  const content = createDayContentServerRepository();
  const courses = await structure.listCourses();
  const course = await structure.getCourse(COURSE_ID);
  const weeks = await structure.listWeeksForCourse(COURSE_ID);
  const days = await structure.listDaysForCourse(COURSE_ID);
  if (!course) throw new Error("Hosted MATH 151 course was not found.");

  const publishedWeeks = weeks.filter((week) => week.status === "published");
  const publishedDays = days.filter((day) => day.status === "published");
  const localDays = getLessons(COURSE_ID);
  const representatives = ["math151-real-numbers", "math151-argand-plane", "math151-cross-product"];
  const comparisons: Array<{ dayId: string; sameTitle: boolean; sameBlockCount: boolean; fidelity: "PASS" | "FAIL"; firstDiff?: { path: string; local: unknown; remote: unknown } }> = [];

  for (const dayId of representatives) {
    const local = localDays.find((day) => day.id === dayId);
    const remote = await structure.getDay(COURSE_ID, local?.weekId ?? "", dayId);
    const remoteBlocks = local ? await content.getDayContent(COURSE_ID, local.weekId, dayId) : undefined;
    if (!local || !remote || !remoteBlocks) throw new Error(`Representative Day ${dayId} could not be read from hosted Supabase.`);

    const normalizedLocal = normalizeForComparison(local.blocks);
    const normalizedRemote = normalizeForComparison(remoteBlocks);
    const diff = firstDiff(normalizedLocal, normalizedRemote, "blocks");
    const sameTitle = local.title === remote.title;
    const sameBlockCount = local.blocks.length === remoteBlocks.length;
    const fidelity = diff ? "FAIL" : "PASS";
    comparisons.push({ dayId, sameTitle, sameBlockCount, fidelity, firstDiff: diff });
  }

  console.log("Supabase course content verification succeeded.");
  console.log(`courses=${courses.length}`);
  console.log(`math151Weeks=${weeks.length} publishedWeeks=${publishedWeeks.length}`);
  console.log(`math151Days=${days.length} publishedDays=${publishedDays.length}`);
  console.log(`contentBlocks=${publishedDays.reduce((count, day) => count + day.blocks.length, 0)}`);
  for (const comparison of comparisons) {
    console.log(`Day ${comparison.dayId}: title=${comparison.sameTitle ? "OK" : "DIFF"}; blocks=${comparison.sameBlockCount ? "OK" : "DIFF"}; fidelity=${comparison.fidelity}`);
    if (comparison.firstDiff) {
      console.log(`  firstDiff path=${comparison.firstDiff.path}`);
      console.log(`  local=${JSON.stringify(comparison.firstDiff.local)}`);
      console.log(`  remote=${JSON.stringify(comparison.firstDiff.remote)}`);
    }
  }
  console.log("read-only verification: no rows were inserted, updated, or deleted.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});