import { config } from "dotenv";
import { createSupabaseAdminClient } from "../lib/supabase/client";
import type { Database } from "../lib/supabase/types";

config({ path: ".env.local" });

type DepartmentSeed = Database["public"]["Tables"]["departments"]["Insert"];
type CourseMaterialSeed = Database["public"]["Tables"]["course_materials"]["Insert"];

const departments: DepartmentSeed[] = [
  {
    id: "department-mathematics",
    name: "Mathematics",
    short_name: "MATH",
    description: "Core university mathematics and proof-based reasoning.",
    order_index: 0,
    status: "published",
  },
  {
    id: "department-computer-science",
    name: "Computer Science",
    short_name: "CS",
    description: "Foundations of computation, logic, and algorithms.",
    order_index: 1,
    status: "published",
  },
  {
    id: "department-science",
    name: "Science",
    short_name: "SCI",
    description: "Quantitative and scientific reasoning resources.",
    order_index: 2,
    status: "published",
  },
] as const;

const courseMaterials: CourseMaterialSeed[] = [
  {
    id: "material-openstax-college-algebra",
    department_id: "department-mathematics",
    course_code: "MATH 151",
    course_title: "OpenStax College Algebra",
    description: "Foundational algebraic reasoning and problem-solving practice.",
    url: "https://openstax.org/details/books/college-algebra",
    provider: "OpenStax",
    order_index: 0,
    status: "published",
  },
  {
    id: "material-khan-algebra-foundations",
    department_id: "department-mathematics",
    course_code: "MATH 151",
    course_title: "Khan Academy Algebra Foundations",
    description: "Short explanatory lessons and guided practice on equations and functions.",
    url: "https://www.khanacademy.org/math/algebra",
    provider: "Khan Academy",
    order_index: 1,
    status: "published",
  },
  {
    id: "material-mit-single-variable-calculus",
    department_id: "department-mathematics",
    course_code: "MATH 151",
    course_title: "MIT Single Variable Calculus",
    description: "Lecture notes and problem sets covering core calculus concepts.",
    url: "https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/",
    provider: "MIT OpenCourseWare",
    order_index: 2,
    status: "published",
  },
  {
    id: "material-discrete-structures-reading-pack",
    department_id: "department-computer-science",
    course_code: "CS 101",
    course_title: "Discrete Structures Reading Pack",
    description: "Logic, sets, and proof techniques for computation.",
    url: "https://www.csd.uwo.ca/~abrady/CS1027/notes/logic.pdf",
    provider: "Western University",
    order_index: 0,
    status: "published",
  },
  {
    id: "material-algorithms-by-design",
    department_id: "department-computer-science",
    course_code: "CS 101",
    course_title: "Algorithms by Design",
    description: "An introductory resource on algorithmic thinking and complexity.",
    url: "https://www.khanacademy.org/computing/computer-science/algorithms",
    provider: "Khan Academy",
    order_index: 1,
    status: "published",
  },
  {
    id: "material-scientific-reasoning-overview",
    department_id: "department-science",
    course_code: "SCI 101",
    course_title: "Scientific Reasoning Overview",
    description: "Quantitative science methods and practical reasoning examples.",
    url: "https://www.britannica.com/science/science",
    provider: "Encyclopedia Britannica",
    order_index: 0,
    status: "published",
  },
] as const;

async function main() {
  const client = createSupabaseAdminClient();

  const departmentRowsForUpsert: Database["public"]["Tables"]["departments"]["Insert"][] = departments.map((department) => ({
    id: department.id,
    name: department.name,
    short_name: department.short_name ?? null,
    description: department.description ?? null,
    order_index: department.order_index ?? 0,
    status: department.status ?? "draft",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const departmentUpsert = await client.from("departments").upsert(departmentRowsForUpsert as never[], { onConflict: "id" });

  if (departmentUpsert.error) {
    throw new Error(`Department seed failed: ${departmentUpsert.error.message}`);
  }

  const materialRowsForUpsert: Database["public"]["Tables"]["course_materials"]["Insert"][] = courseMaterials.map((material) => ({
    id: material.id,
    department_id: material.department_id,
    course_code: material.course_code ?? null,
    course_title: material.course_title,
    description: material.description ?? null,
    url: material.url,
    provider: material.provider ?? null,
    order_index: material.order_index ?? 0,
    status: material.status ?? "draft",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const materialUpsert = await client.from("course_materials").upsert(materialRowsForUpsert as never[], { onConflict: "id" });

  if (materialUpsert.error) {
    throw new Error(`Course material seed failed: ${materialUpsert.error.message}`);
  }

  const [{ data: departmentRows, error: departmentReadError }, { data: materialRows, error: materialReadError }] = await Promise.all([
    client.from("departments").select("*").order("order_index", { ascending: true }),
    client.from("course_materials").select("*").order("order_index", { ascending: true }),
  ]) as [
    { data: Database["public"]["Tables"]["departments"]["Row"][] | null; error: { message: string } | null },
    { data: Database["public"]["Tables"]["course_materials"]["Row"][] | null; error: { message: string } | null },
  ];

  if (departmentReadError) throw new Error(`Department read failed: ${departmentReadError.message}`);
  if (materialReadError) throw new Error(`Course material read failed: ${materialReadError.message}`);

  const publishedDepartments = (departmentRows ?? []).filter((row) => row.status === "published").length;
  const draftDepartments = (departmentRows ?? []).filter((row) => row.status === "draft").length;
  const archivedDepartments = (departmentRows ?? []).filter((row) => row.status === "archived").length;

  const publishedCourseMaterials = (materialRows ?? []).filter((row) => row.status === "published").length;
  const draftCourseMaterials = (materialRows ?? []).filter((row) => row.status === "draft").length;
  const archivedCourseMaterials = (materialRows ?? []).filter((row) => row.status === "archived").length;

  console.log(`departments=${departmentRows?.length ?? 0}`);
  console.log(`publishedDepartments=${publishedDepartments}`);
  console.log(`draftDepartments=${draftDepartments}`);
  console.log(`archivedDepartments=${archivedDepartments}`);
  console.log(`courseMaterials=${materialRows?.length ?? 0}`);
  console.log(`publishedCourseMaterials=${publishedCourseMaterials}`);
  console.log(`draftCourseMaterials=${draftCourseMaterials}`);
  console.log(`archivedCourseMaterials=${archivedCourseMaterials}`);
  console.log(JSON.stringify({ departmentIds: (departmentRows ?? []).map((row) => row.id), materialIds: (materialRows ?? []).map((row) => row.id) }, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Course materials seed failed: ${message}`);
  process.exitCode = 1;
});
