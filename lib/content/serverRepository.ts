import { createSupabaseAdminClient } from "../supabase/client";
import { createCourseStructureSupabaseRepository, createDayContentSupabaseRepository } from "./repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/types";

export type ContentClientFactory = () => SupabaseClient<Database>;

/**
 * Server-only published-content repository.
 *
 * Task 40G.5C: the client is now injectable. Student server pages pass a
 * request-scoped client (`createSupabaseServerClient`), so these reads run under
 * the authenticated (or anonymous) user JWT and are constrained by the hardened
 * `public_courses_select` / `public_weeks_select` / `public_days_select` RLS
 * policies (`status = 'published'`).
 *
 * Omitting the factory keeps the previous service-role behaviour. That default
 * is retained deliberately for admin, infrastructure and verification callers
 * which legitimately need to see drafts, and it is the reason the student pages
 * must pass explicitly rather than relying on an implicit default.
 *
 * No client is created at module scope and none is cached: the factory is
 * invoked per repository instance, per request.
 */
export function createCourseStructureServerRepository(clientFactory: ContentClientFactory = createSupabaseAdminClient) {
  return createCourseStructureSupabaseRepository(clientFactory);
}

export function createDayContentServerRepository(clientFactory: ContentClientFactory = createSupabaseAdminClient) {
  return createDayContentSupabaseRepository(clientFactory);
}