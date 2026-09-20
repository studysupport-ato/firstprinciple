import { getQuestion, getQuestions, type QuestionFilters, validateQuestion } from "../content/access";
import { getLocalQuestionOverride, removeQuestionOverride, removeQuestionRecord, saveQuestionOverride, saveQuestionRecord } from "../content/overrides";
import { isPreviewVisible, legacyStatus } from "../content/lifecycle";
import type { Database } from "../supabase/types";
import { createSupabaseAdminClient, createSupabaseBrowserClient } from "../supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Question, QuestionMetadata, QuestionOption, QuestionStatus, QuestionSource } from "../content/types/question";

export type QuestionRepositoryVisibility = "all" | "student";

export type QuestionRepositoryListOptions = Omit<QuestionFilters, "limit" | "status"> & {
  status?: QuestionStatus;
  visibility?: QuestionRepositoryVisibility;
  includeDraft?: boolean;
  limit?: number;
};

export interface QuestionRepository {
  listQuestions(options?: QuestionRepositoryListOptions): Promise<Question[]>;
  getQuestion(questionId: string, options?: Pick<QuestionRepositoryListOptions, "visibility" | "includeDraft">): Promise<Question | undefined>;
  createQuestion(question: Question): Promise<Question>;
  updateQuestion(question: Question): Promise<Question>;
  deleteQuestion(questionId: string): Promise<void>;
}

function applyStudentVisibility(questions: Question[], options: QuestionRepositoryListOptions) {
  if (options.visibility !== "student") return questions;
  return questions.filter((question) => isPreviewVisible(legacyStatus(question.metadata?.status), { preview: options.includeDraft }));
}

export const questionLocalRepository: QuestionRepository = {
  async listQuestions(options = {}) {
    const { limit, ...filters } = options;
    const questions = applyStudentVisibility(getQuestions(filters), options);
    return limit && limit > 0 ? questions.slice(0, limit) : questions;
  },
  async getQuestion(questionId, options = {}) {
    const question = getQuestion(questionId);
    if (!question) return undefined;
    return applyStudentVisibility([question], options)[0];
  },
  async createQuestion(question) {
    const errors = validateQuestion(question);
    if (errors.length > 0) throw new Error(`Invalid question: ${errors.join("; ")}`);
    saveQuestionRecord(question);
    return question;
  },
  async updateQuestion(question) {
    const errors = validateQuestion(question);
    if (errors.length > 0) throw new Error(`Invalid question: ${errors.join("; ")}`);
    const existingOverride = getLocalQuestionOverride(question.id);
    saveQuestionOverride({ questionId: question.id, updatedAt: new Date().toISOString(), question: { ...existingOverride?.question, ...question } });
    return question;
  },
  async deleteQuestion(questionId) {
    removeQuestionOverride(questionId);
    removeQuestionRecord(questionId);
  },
};

type SupabaseQuestionRow = Database["public"]["Tables"]["questions"]["Row"];

function mapQuestion(row: SupabaseQuestionRow): Question {
  const correctAnswer = row.correct_answer;
  if (typeof correctAnswer !== "string" && typeof correctAnswer !== "number" && typeof correctAnswer !== "boolean") {
    throw new Error(`Question ${row.id} has an unsupported correct_answer value.`);
  }

  const metadata: QuestionMetadata = {
    source: row.source as QuestionSource,
    status: row.status as QuestionStatus,
    variantOf: row.variant_of ?? undefined,
    author: row.author ?? undefined,
  };
  const question: Question = {
    id: row.id,
    courseId: row.course_id,
    chapterId: row.chapter_id ?? "",
    lessonId: row.lesson_id ?? "",
    topic: row.topic,
    subtopic: row.subtopic,
    type: row.type as Question["type"],
    prompt: row.prompt,
    options: Array.isArray(row.options) ? (row.options as unknown as QuestionOption[]) : undefined,
    correctAnswer,
    explanation: row.explanation,
    hint: row.hint ?? undefined,
    difficulty: row.difficulty as Question["difficulty"],
    marks: row.marks,
    tags: row.tags ?? [],
    metadata,
  };
  const errors = validateQuestion(question);
  if (errors.length > 0) throw new Error(`Invalid question ${row.id}: ${errors.join("; ")}`);
  return question;
}

function applyQuestionFilters(query: any, options: QuestionRepositoryListOptions) {
  let next = query;
  if (options.courseId) next = next.eq("course_id", options.courseId);
  if (options.chapterId) next = next.eq("chapter_id", options.chapterId);
  if (options.lessonId) next = next.eq("lesson_id", options.lessonId);
  if (options.topic) next = next.eq("topic", options.topic);
  if (options.subtopic) next = next.eq("subtopic", options.subtopic);
  if (options.difficulty) next = next.eq("difficulty", options.difficulty);
  if (options.type) next = next.eq("type", options.type);
  if (options.status) next = next.eq("status", options.status);
  if (options.tags?.length) {
    next = options.tagMatch === "all" ? next.contains("tags", options.tags) : next.overlaps("tags", options.tags);
  }
  if (options.visibility === "student") {
    next = options.includeDraft ? next.in("status", ["published", "draft"]) : next.eq("status", "published");
  }
  return next;
}

function toQuestionRow(question: Question) {
  return {
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
    status: question.metadata?.status ?? "draft",
    source: question.metadata?.source ?? "authored",
    variant_of: question.metadata?.variantOf ?? null,
    author: question.metadata?.author ?? null,
  };
}

function getSupabaseClientForRepository() {
  return typeof window === "undefined" ? createSupabaseAdminClient() : createSupabaseBrowserClient();
}

/**
 * Supabase-backed Question repository. The client factory is injectable so the
 * server-only admin content boundary (Task 39E) can supply the service-role
 * client without duplicating this implementation.
 */
export function createQuestionSupabaseRepository(clientFactory: () => SupabaseClient<Database> = getSupabaseClientForRepository): QuestionRepository {
  return {
  async listQuestions(options = {}) {
    const client = clientFactory();
    const query = applyQuestionFilters(client.from("questions").select("*"), options).order("id", { ascending: true });
    const limitedQuery = options.limit && options.limit > 0 ? query.limit(options.limit) : query;
    const { data, error } = await limitedQuery;
    if (error) throw error;
    return ((data ?? []) as SupabaseQuestionRow[]).map(mapQuestion);
  },
  async getQuestion(questionId, options = {}) {
    const client = clientFactory();
    const visibility = options.visibility === "student";
    let query = client.from("questions").select("*").eq("id", questionId);
    query = visibility ? (options.includeDraft ? query.in("status", ["published", "draft"]) : query.eq("status", "published")) : query;
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ? mapQuestion(data as SupabaseQuestionRow) : undefined;
  },
  async createQuestion(question) {
    const errors = validateQuestion(question);
    if (errors.length > 0) throw new Error(`Invalid question: ${errors.join("; ")}`);
    const client = clientFactory();
    const { error } = await client.from("questions").insert(toQuestionRow(question) as never);
    if (error) throw error;
    return question;
  },
  async updateQuestion(question) {
    const errors = validateQuestion(question);
    if (errors.length > 0) throw new Error(`Invalid question: ${errors.join("; ")}`);
    const client = clientFactory();
    const { error } = await client.from("questions").update(toQuestionRow(question) as never).eq("id", question.id);
    if (error) throw error;
    return question;
  },
  async deleteQuestion(questionId) {
    const client = clientFactory();
    const { error } = await client.from("questions").delete().eq("id", questionId);
    if (error) throw error;
  },
  };
}

export const questionSupabaseRepository: QuestionRepository = createQuestionSupabaseRepository();

export type QuestionRepositorySource = "local" | "supabase";

export function createQuestionRepository(source: QuestionRepositorySource = "local"): QuestionRepository {
  return source === "supabase" ? questionSupabaseRepository : questionLocalRepository;
}

export async function listStudentQuestions(
  filters: Omit<QuestionRepositoryListOptions, "visibility"> = {},
  options: Pick<QuestionRepositoryListOptions, "includeDraft"> = {},
): Promise<Question[]> {
  const repository = createQuestionRepository("supabase");
  return repository.listQuestions({ ...filters, visibility: "student", ...options });
}

export async function getStudentQuestion(
  questionId: string,
  options: Pick<QuestionRepositoryListOptions, "includeDraft"> = {},
): Promise<Question | undefined> {
  const repository = createQuestionRepository("supabase");
  return repository.getQuestion(questionId, { visibility: "student", ...options });
}

export async function listQuestionsForPractice(
  filters: Omit<QuestionRepositoryListOptions, "visibility" | "status"> = {},
  options: Pick<QuestionRepositoryListOptions, "includeDraft"> = {},
): Promise<Question[]> {
  return listStudentQuestions(filters, options);
}

export async function listQuestionsForAssessment(
  filters: Omit<QuestionRepositoryListOptions, "visibility" | "status"> = {},
  options: Pick<QuestionRepositoryListOptions, "includeDraft"> = {},
): Promise<Question[]> {
  return listStudentQuestions(filters, options);
}

