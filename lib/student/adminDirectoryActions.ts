"use server";

import { AdminUnauthorizedError, requireAdmin } from "@/lib/adminSession";
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import {
  buildStudentDirectorySearchFilter,
  mapStudentDirectoryRow,
  normalizeStudentDirectoryPageRequest,
  normalizeStudentDirectorySearch,
  studentDirectoryPageBounds,
  type StudentDirectoryPage,
  type StudentDirectoryResult,
  type StudentDirectoryRow,
  type StudentRecipientPage,
} from "./adminDirectory";

const DIRECTORY_COLUMNS = "id,display_name,email,phone_number,created_at,updated_at";
const DIRECTORY_PAGE_TIMEOUT_MS = 60_000;

async function authorizeAdmin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch (error) {
    if (error instanceof AdminUnauthorizedError) {
      console.warn("[student directory denied] Missing or invalid admin session.");
    } else {
      console.error("[student directory denied] Admin session guard failed:", error);
    }
    return false;
  }
}

export async function getAdminStudentDirectoryAction(
  requestedPage: unknown,
  requestedPageSize: unknown,
  requestedSearch: unknown,
): Promise<StudentDirectoryResult> {
  if (!await authorizeAdmin()) {
    return { ok: false, error: "Unauthorized. A valid admin session is required." };
  }

  try {
    const { page, pageSize } = normalizeStudentDirectoryPageRequest(requestedPage, requestedPageSize);
    const search = normalizeStudentDirectorySearch(requestedSearch);
    const filter = buildStudentDirectorySearchFilter(search);
    const client = createSupabaseAdminClient();

    const readPage = async (targetPage: number, knownTotalCount?: number) => {
      let query = client
        .from("students")
        .select(DIRECTORY_COLUMNS, { count: "exact" });
      if (filter) query = query.or(filter);

      const bounds = knownTotalCount !== undefined
        ? studentDirectoryPageBounds(targetPage, pageSize, knownTotalCount)
        : studentDirectoryPageBounds(targetPage, pageSize);
      return query
        .abortSignal(AbortSignal.timeout(DIRECTORY_PAGE_TIMEOUT_MS))
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(bounds.from, bounds.to);
    };

    const firstRead = await readPage(page);
    if (firstRead.error) throw firstRead.error;
    if (firstRead.count === null) throw new Error("The student directory count was not returned.");

    const bounds = studentDirectoryPageBounds(page, pageSize, firstRead.count);
    let rows = firstRead.data ?? [];
    if (bounds.page !== page) {
      const correctedRead = await readPage(bounds.page, firstRead.count);
      if (correctedRead.error) throw correctedRead.error;
      rows = correctedRead.data ?? [];
    }

    const result: StudentDirectoryPage = {
      students: (rows as StudentDirectoryRow[]).map(mapStudentDirectoryRow),
      totalCount: firstRead.count,
      page: bounds.page,
      pageSize,
      totalPages: bounds.totalPages,
    };
    return { ok: true, data: result };
  } catch (error) {
    console.error("[student directory] Failed to load directory:", error);
    const message = error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : "The student directory could not be loaded.";
    return { ok: false, error: message };
  }
}

export async function getAdminStudentRecipientPageAction(
  requestedPage: unknown,
  requestedPageSize: unknown,
  requestedSearch: unknown,
): Promise<{ ok: true; data: StudentRecipientPage } | { ok: false; error: string }> {
  if (!await authorizeAdmin()) {
    return { ok: false, error: "Unauthorized. A valid admin session is required." };
  }
  try {
    const { page, pageSize } = normalizeStudentDirectoryPageRequest(requestedPage, requestedPageSize);
    const search = normalizeStudentDirectorySearch(requestedSearch);
    const filter = buildStudentDirectorySearchFilter(search);
    let query = createSupabaseAdminClient()
      .from("students")
      .select(DIRECTORY_COLUMNS);
    if (filter) query = query.or(filter);
    const from = (page - 1) * pageSize;
    const { data, error } = await query
      .abortSignal(AbortSignal.timeout(DIRECTORY_PAGE_TIMEOUT_MS))
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + pageSize);
    if (error) throw error;
    const rows = (data ?? []) as StudentDirectoryRow[];
    return {
      ok: true,
      data: {
        students: rows.slice(0, pageSize).map(mapStudentDirectoryRow),
        page,
        pageSize,
        hasNextPage: rows.length > pageSize,
      },
    };
  } catch (error) {
    console.error("[student directory] Failed to load recipient page:", error);
    return { ok: false, error: "Student recipients could not be loaded. Try again." };
  }
}

export async function getAdminStudentProfileAction(studentId: unknown): Promise<
  | { ok: true; data: ReturnType<typeof mapStudentDirectoryRow> | null }
  | { ok: false; error: string }
> {
  if (!await authorizeAdmin()) {
    return { ok: false, error: "Unauthorized. A valid admin session is required." };
  }
  if (typeof studentId !== "string" || !studentId.trim()) {
    return { ok: false, error: "A student ID is required." };
  }

  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("students")
      .select(DIRECTORY_COLUMNS)
      .eq("id", studentId.trim())
      .abortSignal(AbortSignal.timeout(15_000))
      .maybeSingle();
    if (error) throw error;
    return { ok: true, data: data ? mapStudentDirectoryRow(data as StudentDirectoryRow) : null };
  } catch (error) {
    console.error("[student directory] Failed to load student profile:", error);
    const message = error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : "The student profile could not be loaded.";
    return { ok: false, error: message };
  }
}
