export interface StudentProfile {
  studentId: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

const PROFILE_KEY_PREFIX = "first-principles-student-profile-v1";

function getProfileKey(studentId: string): string {
  if (!studentId || studentId === "local-student") return PROFILE_KEY_PREFIX;
  return `${PROFILE_KEY_PREFIX}:${studentId}`;
}

function getActiveStudentId(): string {
  if (typeof window === "undefined") return "local-student";
  const MOCK_AUTH_KEY = "first-principles-mock-auth-v1";
  return window.localStorage.getItem(MOCK_AUTH_KEY) || "local-student";
}

export function getStudentProfile(): StudentProfile | null {
  if (typeof window === "undefined") return null;
  const studentId = getActiveStudentId();
  const stored = localStorage.getItem(getProfileKey(studentId));
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
  const storageKey = getProfileKey(profile.studentId);
  localStorage.setItem(storageKey, JSON.stringify(profile));
}

export function listStudentProfiles(): StudentProfile[] {
  if (typeof window === "undefined") return [];
  const profiles: StudentProfile[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PROFILE_KEY_PREFIX)) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          profiles.push(JSON.parse(stored) as StudentProfile);
        }
      } catch (error) {
        console.error("[ProfileRepository] Failed to parse student profile for key", key, error);
      }
    }
  }
  return profiles;
}

export function getStudentProfileById(studentId: string): StudentProfile | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(getProfileKey(studentId));
  if (!stored) return null;
  try {
    return JSON.parse(stored) as StudentProfile;
  } catch (error) {
    console.error("[ProfileRepository] Failed to parse student profile for", studentId, error);
    return null;
  }
}
