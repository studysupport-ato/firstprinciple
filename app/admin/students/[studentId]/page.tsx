"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, UserRound, Phone, Mail, Clock, CalendarDays, CheckCircle2, AlertCircle } from "lucide-react";
import { getStudentProfileById, StudentProfile } from "@/lib/student/profileRepository";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";

export default function AdminStudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = typeof params.studentId === "string" ? params.studentId : "";
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    const data = getStudentProfileById(studentId);
    setProfile(data);
    setMounted(true);
  }, [studentId]);

  if (!mounted) return null;

  if (!profile) {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/admin/students" className="inline-flex items-center gap-2 text-sm font-semibold text-[#666666] hover:text-[#111111]">
          <ArrowLeft size={16} /> Back to students
        </Link>
        <div className="rounded-[24px] border border-[#E5E5E5] bg-white p-8 text-center shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <h3 className="font-serif text-3xl text-[#111111]">Student not found</h3>
          <p className="mt-3 text-sm text-[#666666]">
            The requested student profile could not be found or does not exist.
          </p>
        </div>
      </div>
    );
  }

  const joinedDate = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(profile.createdAt));
  const updatedDate = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "numeric" }).format(new Date(profile.updatedAt));

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div className="flex flex-col items-start gap-6">
        <Link href="/admin/students" className="inline-flex items-center gap-2 text-sm font-semibold text-[#666666] hover:text-[#111111] transition-colors">
          <ArrowLeft size={16} /> Back to students
        </Link>
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="font-serif text-4xl text-[#111111]">{profile.fullName}</h1>
            <p className="text-sm text-[#666666] mt-2 font-mono">{profile.studentId}</p>
          </div>
          <AdminStatusBadge
            status={profile.profileCompleted ? "published" : "draft"}
            label={profile.profileCompleted ? "Profile Complete" : "Profile Incomplete"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="rounded-3xl border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)] flex flex-col gap-5">
          <h2 className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-[#999999]">
            Contact Information
          </h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F7F8] text-[#666666]">
                <UserRound size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#666666]">Full Name</div>
                <div className="truncate text-sm font-medium text-[#111111]">{profile.fullName}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F7F8] text-[#666666]">
                <Mail size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#666666]">Email Address</div>
                <div className="truncate text-sm font-medium text-[#111111]">{profile.email || "Not provided"}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F7F8] text-[#666666]">
                <Phone size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#666666]">Phone Number</div>
                <div className="truncate text-sm font-medium text-[#111111]">{profile.phoneNumber}</div>
              </div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="rounded-3xl border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)] flex flex-col gap-5">
          <h2 className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-[#999999]">
            System Record
          </h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F7F8] text-[#666666]">
                <CalendarDays size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#666666]">Joined Date</div>
                <div className="truncate text-sm font-medium text-[#111111]">{joinedDate}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F7F8] text-[#666666]">
                <Clock size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#666666]">Last Updated</div>
                <div className="truncate text-sm font-medium text-[#111111]">{updatedDate}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F7F8] text-[#666666]">
                {profile.profileCompleted ? <CheckCircle2 size={18} className="text-[#059669]" /> : <AlertCircle size={18} className="text-[#D97706]" />}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#666666]">Setup Status</div>
                <div className="truncate text-sm font-medium text-[#111111]">{profile.profileCompleted ? "Onboarding Complete" : "Pending Profile Setup"}</div>
              </div>
            </div>
          </div>
        </div>

      </div>
      
      {/* Explicitly omitting course/enrollment information per requirement */}
      <div className="rounded-3xl border border-[#E5E5E5] border-dashed bg-transparent p-6 flex flex-col items-center justify-center text-center gap-2">
        <h3 className="font-sans text-sm font-semibold text-[#666666]">Course Enrollment</h3>
        <p className="font-sans text-xs text-[#999999] max-w-md">
          Enrollment data is not yet connected to the temporary local profile. This section will populate when the backend student model is implemented.
        </p>
      </div>
    </div>
  );
}
