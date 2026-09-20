import { getAssessment, getAssessments } from "../content/access";
import { getLocalAssessmentOverride, removeAssessmentOverride, saveAssessmentOverride } from "../content/overrides";
import { isPreviewVisible, legacyStatus } from "../content/lifecycle";
import type { Assessment } from "../content/types/assessment";
import type { ContentStatus } from "../content/lifecycle";
import { createSupabaseBrowserClient } from "../supabase/client";
import type { Database } from "../supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AssessmentRepositoryListOptions = {
  courseId?: string;
  status?: ContentStatus;
  visibility?: "all" | "student";
  includeDraft?: boolean;
  limit?: number;
};

export interface AssessmentRepository {
  listAssessments(options?: AssessmentRepositoryListOptions): Promise<Assessment[]>;
  getAssessment(assessmentId: string, options?: Pick<AssessmentRepositoryListOptions, "visibility" | "includeDraft">): Promise<Assessment | undefined>;
  createAssessment(assessment: Assessment): Promise<Assessment>;
  updateAssessment(assessment: Assessment): Promise<Assessment>;
  deleteAssessment(assessmentId: string): Promise<void>;
}

function applyStudentVisibility(assessments: Assessment[], options: AssessmentRepositoryListOptions) {
  if (options.visibility !== "student") return assessments;
  return assessments.filter((assessment) => isPreviewVisible(legacyStatus(assessment.status), { preview: options.includeDraft }));
}

export const assessmentLocalRepository: AssessmentRepository = {
  async listAssessments(options = {}) {
    let assessments = getAssessments(options.courseId);
    if (options.status) assessments = assessments.filter((assessment) => legacyStatus(assessment.status) === options.status);
    return applyStudentVisibility(assessments, options).slice(0, options.limit && options.limit > 0 ? options.limit : undefined);
  },
  async getAssessment(assessmentId, options = {}) {
    const assessment = getAssessment(assessmentId);
    return assessment ? applyStudentVisibility([assessment], options)[0] : undefined;
  },
  async createAssessment(assessment) {
    saveAssessmentOverride({ assessmentId: assessment.id, updatedAt: new Date().toISOString(), assessment });
    return assessment;
  },
  async updateAssessment(assessment) {
    const existingOverride = getLocalAssessmentOverride(assessment.id);
    saveAssessmentOverride({ assessmentId: assessment.id, updatedAt: new Date().toISOString(), status: existingOverride?.status, assessment });
    return assessment;
  },
  async deleteAssessment(assessmentId) {
    removeAssessmentOverride(assessmentId);
  },
};

type SupabaseAssessmentRow = Database["public"]["Tables"]["assessments"]["Row"];

function mapAssessment(row: SupabaseAssessmentRow): Assessment {
  if (!row.blueprint || typeof row.blueprint !== "object" || Array.isArray(row.blueprint)) {
    throw new Error(`Assessment ${row.id} has an invalid blueprint.`);
  }

  const assessment = {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    durationMinutes: row.duration_minutes,
    questionCount: row.question_count,
    blueprint: row.blueprint as unknown as Assessment["blueprint"],
    status: row.status as ContentStatus,
  } satisfies Assessment;
  if (!Array.isArray(assessment.blueprint.rules)) throw new Error(`Assessment ${row.id} has an invalid blueprint rule list.`);
  return assessment;
}

function applyAssessmentFilters(query: any, options: AssessmentRepositoryListOptions) {
  let next = query;
  if (options.courseId) next = next.eq("course_id", options.courseId);
  if (options.status) next = next.eq("status", options.status);
  if (options.visibility === "student") {
    next = options.includeDraft ? next.in("status", ["published", "draft"]) : next.eq("status", "published");
  }
  return next;
}

function toAssessmentRow(assessment: Assessment) {
  return {
    id: assessment.id,
    course_id: assessment.courseId,
    title: assessment.title,
    description: assessment.description,
    duration_minutes: assessment.durationMinutes,
    question_count: assessment.questionCount,
    blueprint: assessment.blueprint,
    status: assessment.status ?? "draft",
  };
}

/**
 * Supabase-backed Assessment repository. The client factory is injectable so the
 * server-only admin content boundary (Task 39E) can supply the service-role
 * client without duplicating this implementation.
 */
export function createAssessmentSupabaseRepository(clientFactory: () => SupabaseClient<Database> = createSupabaseBrowserClient): AssessmentRepository {
  return {
  async listAssessments(options = {}) {
    const client = clientFactory();
    const query = applyAssessmentFilters(client.from("assessments").select("*"), options).order("id", { ascending: true });
    const limitedQuery = options.limit && options.limit > 0 ? query.limit(options.limit) : query;
    const { data, error } = await limitedQuery;
    if (error) throw error;
    return ((data ?? []) as SupabaseAssessmentRow[]).map(mapAssessment);
  },
  async getAssessment(assessmentId, options = {}) {
    const client = clientFactory();
    const visibility = options.visibility === "student";
    let query = client.from("assessments").select("*").eq("id", assessmentId);
    query = visibility ? (options.includeDraft ? query.in("status", ["published", "draft"]) : query.eq("status", "published")) : query;
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ? mapAssessment(data as SupabaseAssessmentRow) : undefined;
  },
  async createAssessment(assessment) {
    const client = clientFactory();
    const { error } = await client.from("assessments").insert(toAssessmentRow(assessment) as never);
    if (error) throw error;
    return assessment;
  },
  async updateAssessment(assessment) {
    const client = clientFactory();
    const { error } = await client.from("assessments").update(toAssessmentRow(assessment) as never).eq("id", assessment.id);
    if (error) throw error;
    return assessment;
  },
  async deleteAssessment(assessmentId) {
    const client = clientFactory();
    const { error } = await client.from("assessments").delete().eq("id", assessmentId);
    if (error) throw error;
  },
  };
}

export const assessmentSupabaseRepository: AssessmentRepository = createAssessmentSupabaseRepository();

export type AssessmentRepositorySource = "local" | "supabase";

export function createAssessmentRepository(source: AssessmentRepositorySource = "local"): AssessmentRepository {
  return source === "supabase" ? assessmentSupabaseRepository : assessmentLocalRepository;
}

