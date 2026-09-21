"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { listStudentProfiles, StudentProfile } from "@/lib/student/profileRepository";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";

export default function AdminStudentsPage() {
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setProfiles(listStudentProfiles());
    setMounted(true);
  }, []);

  const filteredProfiles = profiles.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchName = p.fullName.toLowerCase().includes(q);
    const matchPhone = p.phoneNumber.toLowerCase().includes(q);
    const matchEmail = p.email?.toLowerCase().includes(q) ?? false;
    return matchName || matchPhone || matchEmail;
  });

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Students"
        description="View all students currently registered in the platform."
      />

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#666666]">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search students by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E5E5E5] rounded-xl text-sm focus:outline-none focus:border-[#111111] transition-colors"
          />
        </div>
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-[24px] border border-[#E5E5E5] bg-white p-8 text-center shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <h3 className="font-serif text-3xl text-[#111111]">No students found</h3>
          <p className="mt-3 text-sm text-[#666666]">
            Students will appear here after they complete their profile during onboarding.
          </p>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="rounded-[24px] border border-[#E5E5E5] bg-white p-8 text-center shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <h3 className="font-serif text-2xl text-[#111111]">No results matching "{searchQuery}"</h3>
          <p className="mt-3 text-sm text-[#666666]">
            Try adjusting your search terms.
          </p>
        </div>
      ) : (
        <AdminTable<StudentProfile>
          rows={filteredProfiles as any}
          columns={[
            {
              key: "fullName",
              label: "Name",
              render: (row) => (
                <Link
                  href={`/admin/students/${row.studentId}`}
                  className="font-medium text-[#2563EB] hover:underline"
                >
                  {row.fullName}
                </Link>
              ),
            },
            {
              key: "email",
              label: "Email",
              render: (row) => (
                <span className={row.email ? "" : "italic text-[#999999]"}>
                  {row.email || "Not provided"}
                </span>
              ),
            },
            {
              key: "phoneNumber",
              label: "Phone",
            },
            {
              key: "status",
              label: "Profile",
              render: (row) => (
                <AdminStatusBadge
                  status={row.profileCompleted ? "published" : "draft"}
                  label={row.profileCompleted ? "Complete" : "Incomplete"}
                />
              ),
            },
            {
              key: "createdAt",
              label: "Joined",
              render: (row) => {
                const date = new Date(row.createdAt);
                const formatted = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
                return <span className="text-[#666666]">{formatted}</span>;
              },
            },
          ]}
        />
      )}
    </div>
  );
}
