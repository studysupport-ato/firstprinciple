import { createSupabaseAdminClient } from "../supabase/client";
import { createCourseStructureSupabaseRepository, createDayContentSupabaseRepository } from "./repository";
import { createQuestionSupabaseRepository } from "../questions/repository";
import { createAssessmentSupabaseRepository } from "../assessment/repository";
import { createResourceSupabaseRepository } from "./resourceRepository";
import { createCourseMaterialsSupabaseRepository } from "../courseMaterialsRepository";

/**
 * ============================================================================
 * Task 39E — SERVER-ONLY admin content write boundary.
 * ============================================================================
 *
 * ADMIN_AUTH_RLS_REQUIRED_BEFORE_PUBLIC_PRODUCTION
 *
 * This module binds the existing repository implementations (Tasks 26–30) to the
 * server-only service-role Supabase client so admin content workflows can write
 * to the hosted database.
 *
 * TEMPORARY PRE-AUTH CONTENT-MANAGEMENT BOUNDARY — NOT a production security model.
 *
 *   Admin UI (client)
 *     -> server content service (lib/content/adminService.ts)
 *     -> repository (this module's factories)
 *     -> createSupabaseAdminClient()  (service role, server only)
 *     -> Supabase
 *
 * Rules enforced here:
 *   - The service-role key never leaves the server; no client module may import
 *     this file or lib/content/adminService.ts.
 *   - No public/anon RLS write policies are added or weakened.
 *   - LocalStorage is not an authority once a Supabase write has succeeded.
 *
 * BEFORE PUBLIC PRODUCTION THIS MUST BE REPLACED WITH:
 *   Admin Auth -> authenticated server boundary -> Supabase
 * (see the task's Auth/RLS work; do NOT add auth here).
 */

if (typeof window !== "undefined") {
  throw new Error(
    "[Back2Basics with Kwamina] lib/content/adminRepository.ts is server-only and must never be bundled into client code. ADMIN_AUTH_RLS_REQUIRED_BEFORE_PUBLIC_PRODUCTION",
  );
}

export function createCourseStructureAdminRepository() {
  return createCourseStructureSupabaseRepository(createSupabaseAdminClient);
}

export function createDayContentAdminRepository() {
  return createDayContentSupabaseRepository(createSupabaseAdminClient);
}

export function createQuestionAdminRepository() {
  return createQuestionSupabaseRepository(createSupabaseAdminClient);
}

export function createAssessmentAdminRepository() {
  return createAssessmentSupabaseRepository(createSupabaseAdminClient);
}

export function createResourceAdminRepository() {
  return createResourceSupabaseRepository(createSupabaseAdminClient);
}

export function createCourseMaterialsAdminRepository() {
  return createCourseMaterialsSupabaseRepository(createSupabaseAdminClient);
}
