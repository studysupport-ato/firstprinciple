export const STUDENT_DIRECTORY_DEFAULT_PAGE_SIZE = 25;
export const STUDENT_DIRECTORY_MAX_PAGE_SIZE = 100;
export const STUDENT_DIRECTORY_MAX_SEARCH_LENGTH = 120;

export type StudentDirectoryProfile = {
  studentId: string;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StudentDirectoryPage = {
  students: StudentDirectoryProfile[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type StudentRecipientPage = {
  students: StudentDirectoryProfile[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
};

export type StudentDirectoryResult =
  | { ok: true; data: StudentDirectoryPage }
  | { ok: false; error: string };

export type StudentDirectoryRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizeStudentDirectoryPageRequest(page: unknown, pageSize: unknown) {
  const requestedPage = typeof page === "number" && Number.isFinite(page) ? Math.floor(page) : 1;
  const requestedPageSize = typeof pageSize === "number" && Number.isFinite(pageSize)
    ? Math.floor(pageSize)
    : STUDENT_DIRECTORY_DEFAULT_PAGE_SIZE;

  return {
    page: Math.max(1, requestedPage),
    pageSize: Math.min(STUDENT_DIRECTORY_MAX_PAGE_SIZE, Math.max(1, requestedPageSize)),
  };
}

export function normalizeStudentDirectorySearch(search: unknown): string {
  if (typeof search !== "string") return "";
  return search
    .slice(0, STUDENT_DIRECTORY_MAX_SEARCH_LENGTH)
    .replace(/[,%()"'\\*_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildStudentDirectorySearchFilter(search: string): string | null {
  const term = normalizeStudentDirectorySearch(search);
  if (!term) return null;
  const pattern = `%${term}%`;
  return `display_name.ilike.${pattern},email.ilike.${pattern},phone_number.ilike.${pattern}`;
}

export function mapStudentDirectoryRow(row: StudentDirectoryRow): StudentDirectoryProfile {
  const fullName = row.display_name?.trim() ?? "";
  const phoneNumber = row.phone_number?.trim() ?? "";

  return {
    studentId: row.id,
    fullName,
    email: row.email?.trim() || null,
    phoneNumber: phoneNumber || null,
    profileCompleted: Boolean(fullName && phoneNumber),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function studentDirectoryPageBounds(page: number, pageSize: number, totalCount?: number) {
  if (totalCount === undefined) {
    const currentPage = Math.max(1, page);
    return {
      page: currentPage,
      totalPages: 0,
      from: (currentPage - 1) * pageSize,
      to: currentPage * pageSize - 1,
    };
  }

  const totalPages = Math.ceil(totalCount / pageSize);
  const currentPage = totalPages === 0 ? 1 : Math.max(1, Math.min(page, totalPages));
  return {
    page: currentPage,
    totalPages,
    from: (currentPage - 1) * pageSize,
    to: currentPage * pageSize - 1,
  };
}
