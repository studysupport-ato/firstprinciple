import { createSupabaseAdminClient } from "../supabase/client";
import { createCourseStructureSupabaseRepository, createDayContentSupabaseRepository } from "./repository";

/** Server-only published-content repository before Auth/RLS is introduced. */
export function createCourseStructureServerRepository() {
  return createCourseStructureSupabaseRepository(createSupabaseAdminClient);
}

export function createDayContentServerRepository() {
  return createDayContentSupabaseRepository(createSupabaseAdminClient);
}