export interface MockStudent {
  studentId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  profileCompleted: boolean;
}

export const DEMO_STUDENTS: MockStudent[] = [
  {
    studentId: "demo-student-a",
    fullName: "Kwame Mensah",
    email: "kwame@example.demo",
    phoneNumber: "0241111111",
    profileCompleted: true,
  },
  {
    studentId: "demo-student-b",
    fullName: "Ama Osei",
    email: "ama@example.demo",
    phoneNumber: "0242222222",
    profileCompleted: false,
  },
  {
    studentId: "demo-student-c",
    fullName: "Kofi Annan",
    email: "kofi@example.demo",
    phoneNumber: "0243333333",
    profileCompleted: true,
  },
  {
    studentId: "demo-student-d",
    fullName: "Yaa Asantewaa",
    email: "yaa@example.demo",
    phoneNumber: "0244444444",
    profileCompleted: true,
  },
];

const MOCK_AUTH_KEY = "first-principles-mock-auth-v1";

export function listMockStudents(): MockStudent[] {
  return DEMO_STUDENTS;
}

export function getMockStudent(studentId: string): MockStudent | undefined {
  return DEMO_STUDENTS.find((s) => s.studentId === studentId);
}

export function getCurrentMockStudentId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MOCK_AUTH_KEY);
}

export function getCurrentMockStudent(): MockStudent | null {
  const id = getCurrentMockStudentId();
  if (!id) return null;
  return getMockStudent(id) || null;
}

export function loginMockStudent(studentId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MOCK_AUTH_KEY, studentId);
  window.dispatchEvent(new Event("mock-auth-change"));
}

export function logoutMockStudent(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MOCK_AUTH_KEY);
  window.dispatchEvent(new Event("mock-auth-change"));
}

export function getActiveStudentId(): string {
  // Graceful fallback to legacy local-student for SSR/tests or unauthenticated edge cases
  return getCurrentMockStudentId() || "local-student";
}
