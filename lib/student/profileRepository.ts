export interface StudentProfile {
  studentId: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

const PROFILE_KEY = "first-principles-student-profile-v1";

export function getStudentProfile(): StudentProfile | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(PROFILE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as StudentProfile;
  } catch (error) {
    console.error("[ProfileRepository] Failed to parse student profile:", error);
    return null;
  }
}

export function saveStudentProfile(profile: StudentProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
