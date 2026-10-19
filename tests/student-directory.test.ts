import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildStudentDirectorySearchFilter,
  mapStudentDirectoryRow,
  normalizeStudentDirectoryPageRequest,
  normalizeStudentDirectorySearch,
  studentDirectoryPageBounds,
  STUDENT_DIRECTORY_MAX_PAGE_SIZE,
} from "../lib/student/adminDirectory";

describe("admin student directory query parameters", () => {
  it("normalizes invalid pages and caps the requested page size", () => {
    assert.deepEqual(normalizeStudentDirectoryPageRequest(-4, 500), {
      page: 1,
      pageSize: STUDENT_DIRECTORY_MAX_PAGE_SIZE,
    });
    assert.deepEqual(normalizeStudentDirectoryPageRequest(2.9, Number.NaN), {
      page: 2,
      pageSize: 25,
    });
  });

  it("builds name, email and phone search without allowing PostgREST filter syntax injection", () => {
    assert.equal(
      buildStudentDirectorySearchFilter("  Ada Lovelace  "),
      "display_name.ilike.%Ada Lovelace%,email.ilike.%Ada Lovelace%,phone_number.ilike.%Ada Lovelace%",
    );
    assert.equal(normalizeStudentDirectorySearch('Ada, (email)%_ "x"'), "Ada email x");
    assert.equal(buildStudentDirectorySearchFilter("  "), null);
  });

  it("clamps out-of-range pages and calculates accurate result ranges", () => {
    assert.deepEqual(studentDirectoryPageBounds(9, 25, 51), {
      page: 3,
      totalPages: 3,
      from: 50,
      to: 74,
    });
    assert.deepEqual(studentDirectoryPageBounds(9, 25, 0), {
      page: 1,
      totalPages: 0,
      from: 0,
      to: 24,
    });
    assert.deepEqual(studentDirectoryPageBounds(2, 25), {
      page: 2,
      totalPages: 0,
      from: 25,
      to: 49,
    });
    assert.deepEqual(studentDirectoryPageBounds(3, 25, 55), {
      page: 3,
      totalPages: 3,
      from: 50,
      to: 74,
    });
  });
});

describe("student directory profile mapping", () => {
  it("uses the persisted students identity, name, email, phone, and timestamps", () => {
    assert.deepEqual(mapStudentDirectoryRow({
      id: "student-123",
      display_name: "  Ada Lovelace  ",
      email: " ada@example.test ",
      phone_number: " +233 20 123 4567 ",
      created_at: "2026-10-01T12:00:00.000Z",
      updated_at: "2026-10-02T12:00:00.000Z",
    }), {
      studentId: "student-123",
      fullName: "Ada Lovelace",
      email: "ada@example.test",
      phoneNumber: "+233 20 123 4567",
      profileCompleted: true,
      createdAt: "2026-10-01T12:00:00.000Z",
      updatedAt: "2026-10-02T12:00:00.000Z",
    });
  });

  it("does not fabricate unavailable contact information or profile completion", () => {
    const mapped = mapStudentDirectoryRow({
      id: "student-456",
      display_name: "Grace",
      email: null,
      phone_number: null,
      created_at: "2026-10-03T12:00:00.000Z",
      updated_at: "2026-10-03T12:00:00.000Z",
    });
    assert.equal(mapped.email, null);
    assert.equal(mapped.phoneNumber, null);
    assert.equal(mapped.profileCompleted, false);
  });
});
