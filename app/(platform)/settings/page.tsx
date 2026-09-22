"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Bell, Shield, Monitor, LogOut, Check, Save, ChevronDown, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { resetStudentProgress } from "@/lib/progress";
import { getStudentProfile, StudentProfile } from "@/lib/student/profileRepository";
import { getCurrentMockStudent, listMockStudents, loginMockStudent, logoutMockStudent, MockStudent } from "@/lib/auth/mock";

const tabs = [
  { id: "account", label: "Account", icon: User },
  { id: "appearance", label: "Appearance", icon: Monitor },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
];

type Theme = "Light" | "System" | "Dark";
type Density = "Comfortable" | "Compact";

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("account");
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState<Theme>("Light");
  const [density, setDensity] = useState<Density>("Comfortable");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [streakReminders, setStreakReminders] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [currentMockStudent, setCurrentMockStudent] = useState<MockStudent | null>(null);
  const allStudents = listMockStudents();

  useEffect(() => {
    setProfile(getStudentProfile());
    setCurrentMockStudent(getCurrentMockStudent());

    const handleAuthChange = () => {
      setProfile(getStudentProfile());
      setCurrentMockStudent(getCurrentMockStudent());
    };
    window.addEventListener("mock-auth-change", handleAuthChange);
    return () => window.removeEventListener("mock-auth-change", handleAuthChange);
  }, []);

  useEffect(() => {
    const stored = window.sessionStorage.getItem("first-principles-settings");
    if (!stored) return;

    try {
      const preferences = JSON.parse(stored) as Partial<{
        theme: Theme;
        density: Density;
        reducedMotion: boolean;
        emailUpdates: boolean;
        streakReminders: boolean;
      }>;
      if (preferences.theme) setTheme(preferences.theme);
      if (preferences.density) setDensity(preferences.density);
      if (typeof preferences.reducedMotion === "boolean") setReducedMotion(preferences.reducedMotion);
      if (typeof preferences.emailUpdates === "boolean") setEmailUpdates(preferences.emailUpdates);
      if (typeof preferences.streakReminders === "boolean") setStreakReminders(preferences.streakReminders);
    } catch {
      window.sessionStorage.removeItem("first-principles-settings");
    }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem("first-principles-settings", JSON.stringify({
      theme,
      density,
      reducedMotion,
      emailUpdates,
      streakReminders,
    }));
  }, [theme, density, reducedMotion, emailUpdates, streakReminders]);

  const handleSave = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  return (
    <div className={`min-h-screen px-6 py-8 transition-colors md:px-10 lg:px-14 ${theme === "Dark" ? "bg-[#15171B]" : "bg-[#FBFBFA]"}`}>
      <div className="mx-auto max-w-[1180px]">
      
        <header className="mb-10 flex flex-col gap-6 border-b border-[#E5E5E5] pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#777777]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FFBE00]" />
              Account workspace
            </div>
            <h1 className={`font-serif text-5xl tracking-tight md:text-6xl ${theme === "Dark" ? "text-white" : "text-[#111111]"}`}>Settings</h1>
            <p className={`mt-4 max-w-2xl font-sans text-base leading-7 ${theme === "Dark" ? "text-white/60" : "text-[#666666]"}`}>
              Shape your learning environment, profile, and university details.
            </p>
          </div>
          <div className={`flex items-center gap-3 self-start rounded-full border px-3 py-2 shadow-[0_4px_16px_rgba(17,17,17,0.03)] md:self-auto ${theme === "Dark" ? "border-white/10 bg-white/[0.06]" : "border-[#E5E5E5] bg-white"}`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111111] font-sans text-[10px] font-bold text-white">
              {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : "S"}
            </span>
            <div className="pr-2">
              <div className="font-sans text-xs font-semibold text-[#111111]">{profile?.fullName || "Student"}</div>
              <div className="font-sans text-[10px] text-[#777777]">Learner</div>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        
        {/* Settings Navigation */}
        <aside className="w-full shrink-0 lg:w-56">
          <div className="mb-4 px-3 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#999999]">Preferences</div>
          <nav className="flex flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-sans font-medium transition-all ${
                  tab.id === activeTab
                    ? "bg-[#111111] text-white shadow-[0_8px_18px_rgba(17,17,17,0.12)]"
                    : theme === "Dark" ? "text-white/60 hover:bg-white/[0.06] hover:text-white" : "text-[#666666] hover:bg-white hover:text-[#111111] hover:shadow-sm"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Settings Content */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="min-w-0 flex-1"
        >
          {activeTab === "account" ? (
            <>
            <div className="mb-8 rounded-[24px] border border-[#E5E5E5] bg-white p-6 shadow-[0_12px_30px_rgba(17,17,17,0.035)] md:p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#111111]"><User size={13} /> Personal identity</div>
                <h2 className="font-serif text-3xl tracking-tight text-[#111111]">Profile information</h2>
                <p className="mt-2 font-sans text-sm text-[#777777]">The details your learning community sees.</p>
              </div>
              <Sparkles size={20} className="text-[#D97706]" />
            </div>
            <div className="mb-8 flex flex-wrap items-center gap-5 rounded-2xl bg-[#F7F7F8] p-5">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#111111] shadow-[0_8px_20px_rgba(17,17,17,0.16)]">
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName || "Student")}&background=111111&color=fff&size=200`} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="font-sans text-base font-semibold text-[#111111]">{profile?.fullName || "Student"}</div>
                <div className="mt-1 font-sans text-xs text-[#777777]">Student profile</div>
                <button type="button" className="mt-3 rounded-full border border-[#D9D9D9] bg-white px-4 py-2 font-sans text-xs font-semibold text-[#111111] transition-colors hover:border-[#111111]">Change avatar</button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="font-sans text-xs font-semibold uppercase tracking-widest text-[#666666]">Full Name</label>
                <input type="text" value={profile?.fullName || ""} readOnly className="h-12 rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] px-4 text-[#777777] outline-none cursor-not-allowed" />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="font-sans text-xs font-semibold uppercase tracking-widest text-[#666666]">Phone Number</label>
                <input type="tel" value={profile?.phoneNumber || ""} readOnly className="h-12 rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] px-4 text-[#777777] outline-none cursor-not-allowed" />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="font-sans text-xs font-semibold uppercase tracking-widest text-[#666666]">Email Address</label>
                <input type="email" value={profile?.email || ""} readOnly className="h-12 rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] px-4 text-[#777777] outline-none cursor-not-allowed" />
              </div>
            </div>
          </div>

          <div className="mb-8 rounded-[24px] border border-[#E5E5E5] bg-white p-6 shadow-[0_12px_30px_rgba(17,17,17,0.035)] md:p-8">
            <div className="mb-8">
              <div className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#059669]">Academic context</div>
              <h2 className="font-serif text-3xl tracking-tight text-[#111111]">University details</h2>
              <p className="mt-2 font-sans text-sm text-[#777777]">Help us keep your curriculum and progress relevant.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="font-sans text-xs font-semibold uppercase tracking-widest text-[#666666]">Institution</label>
                <div className="relative">
                <select className="h-12 w-full appearance-none rounded-xl border border-[#E5E5E5] bg-[#FBFBFA] px-4 text-[#111111] outline-none transition-colors focus:border-[#059669] focus:bg-white">
                  <option>Kwame Nkrumah University of Science and Technology</option>
                  <option>University of Ghana</option>
                  <option>Ashesi University</option>
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#777777]" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-sans text-xs font-semibold uppercase tracking-widest text-[#666666]">Student ID</label>
                <input type="text" defaultValue="20834221" className="h-12 rounded-xl border border-[#E5E5E5] bg-[#FBFBFA] px-4 text-[#111111] outline-none transition-colors focus:border-[#059669] focus:bg-white" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-sans text-xs font-semibold uppercase tracking-widest text-[#666666]">Major / Program</label>
                <input type="text" defaultValue="Computer Engineering" className="h-12 rounded-xl border border-[#E5E5E5] bg-[#FBFBFA] px-4 text-[#111111] outline-none transition-colors focus:border-[#059669] focus:bg-white" />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
            <p className="font-sans text-xs text-[#888888]">Your information is stored locally for this demo.</p>
            <div className="flex gap-3">
            <button type="button" className="h-12 rounded-full px-6 text-sm font-semibold text-[#666666] transition-colors hover:bg-white hover:text-[#111111]">
              Cancel
            </button>
            <button type="button" onClick={handleSave} className="inline-flex h-12 items-center gap-2 rounded-full bg-[#111111] px-7 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(17,17,17,0.16)] transition-all hover:-translate-y-0.5 hover:bg-[#FFBE00]">
              {saved ? <Check size={16} /> : <Save size={16} />}
              {saved ? "Saved" : "Save changes"}
            </button>
            </div>
          </div>
          </>
          ) : activeTab === "appearance" ? (
            <div className={`space-y-6 ${density === "Compact" ? "text-sm" : ""}`}>
              <div className={`rounded-[24px] border p-6 shadow-[0_12px_30px_rgba(17,17,17,0.035)] md:p-8 ${theme === "Dark" ? "border-white/10 bg-[#202329] text-white" : "border-[#E5E5E5] bg-white"}`}>
                <div className="mb-8">
                  <div className="mb-2 flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#4F46E5]"><Monitor size={13} /> Learning environment</div>
                  <h2 className="font-serif text-3xl tracking-tight">Appearance</h2>
                  <p className={`mt-2 font-sans text-sm ${theme === "Dark" ? "text-white/55" : "text-[#777777]"}`}>Tune the way Back2Basics with Kwamina feels while you study.</p>
                </div>
                <div className="space-y-6">
                  <div>
                    <div className="mb-3 font-sans text-sm font-semibold text-[#111111]">Theme</div>
                    <div className={`grid grid-cols-3 gap-2 rounded-2xl p-1.5 ${theme === "Dark" ? "bg-white/[0.06]" : "bg-[#F7F7F8]"}`}>
                      {['Light', 'System', 'Dark'].map((option) => (
                        <button key={option} type="button" onClick={() => setTheme(option as Theme)} className={`rounded-xl px-3 py-2.5 font-sans text-xs font-semibold transition-all ${theme === option ? 'bg-white text-[#111111] shadow-sm' : option === 'Dark' ? 'text-white/60 hover:text-white' : 'text-[#777777] hover:text-[#111111]'}`}>{option}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-3 font-sans text-sm font-semibold text-[#111111]">Interface density</div>
                    <div className="flex gap-2">
                      {(['Comfortable', 'Compact'] as Density[]).map((option) => <button key={option} type="button" onClick={() => setDensity(option)} className={`rounded-full px-5 py-2.5 font-sans text-xs font-semibold transition-colors ${density === option ? 'bg-[#111111] text-white' : theme === 'Dark' ? 'border border-white/10 text-white/60 hover:text-white' : 'border border-[#E5E5E5] bg-white text-[#777777] hover:border-[#111111] hover:text-[#111111]'}`}>{option}</button>)}
                    </div>
                  </div>
                  <div className={`flex items-center justify-between border-t pt-5 ${theme === "Dark" ? "border-white/10" : "border-[#E5E5E5]"}`}>
                    <div><div className="font-sans text-sm font-semibold text-[#111111]">Reduce motion</div><div className="mt-1 font-sans text-xs text-[#777777]">Use calmer transitions throughout the platform.</div></div>
                    <button type="button" aria-pressed={reducedMotion} onClick={() => setReducedMotion(!reducedMotion)} className={`relative h-7 w-12 rounded-full transition-colors ${reducedMotion ? 'bg-[#111111]' : 'bg-[#D9D9D9]'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${reducedMotion ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "notifications" ? (
            <div className={`rounded-[24px] border p-6 shadow-[0_12px_30px_rgba(17,17,17,0.035)] md:p-8 ${theme === "Dark" ? "border-white/10 bg-[#202329] text-white" : "border-[#E5E5E5] bg-white"}`}>
              <div className="mb-8"><div className="mb-2 flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#E11D48]"><Bell size={13} /> Stay in rhythm</div><h2 className="font-serif text-3xl tracking-tight text-[#111111]">Notifications</h2><p className="mt-2 font-sans text-sm text-[#777777]">Choose the signals that help you keep learning.</p></div>
              <div className="divide-y divide-[#E5E5E5]">
                {[['Course updates', 'New lessons, practice sets, and curriculum notes.', emailUpdates, setEmailUpdates], ['Streak reminders', 'A gentle reminder before your learning streak slips.', streakReminders, setStreakReminders]].map(([title, description, enabled, setEnabled]) => (
                  <div key={title as string} className="flex items-center justify-between gap-6 py-5 first:pt-0 last:pb-0"><div><div className="font-sans text-sm font-semibold text-[#111111]">{title as string}</div><div className="mt-1 font-sans text-xs leading-5 text-[#777777]">{description as string}</div></div><button type="button" aria-pressed={enabled as boolean} onClick={() => (setEnabled as (value: boolean) => void)(!(enabled as boolean))} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${(enabled as boolean) ? 'bg-[#059669]' : 'bg-[#D9D9D9]'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${(enabled as boolean) ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Demo Account Panel */}
              <div className={`rounded-[24px] border p-6 shadow-[0_12px_30px_rgba(17,17,17,0.035)] md:p-8 ${theme === "Dark" ? "border-white/10 bg-[#202329] text-white" : "border-[#E5E5E5] bg-white"}`}>
                <div className="mb-6">
                  <div className="mb-2 flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#111111]"><Sparkles size={13} /> Demo account</div>
                  <h2 className="font-serif text-3xl tracking-tight text-[#111111]">Active student</h2>
                  <p className="mt-2 font-sans text-sm text-[#777777]">Switch between demo student accounts for testing or demonstrations.</p>
                </div>

                {/* Current student */}
                {currentMockStudent ? (
                  <div className="mb-5 flex items-center gap-4 rounded-2xl bg-[#F7F7F8] p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#111111] text-sm font-bold text-white">
                      {currentMockStudent.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-sans text-sm font-semibold text-[#111111]">{currentMockStudent.fullName}</div>
                      <div className="truncate font-sans text-xs text-[#666666]">{currentMockStudent.email}</div>
                    </div>
                    <span className="rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[#059669]">Active</span>
                  </div>
                ) : (
                  <div className="mb-5 rounded-2xl border border-dashed border-[#E5E5E5] p-4 text-center text-sm text-[#999999]">No student selected</div>
                )}

                {/* Student switcher */}
                <div className="flex flex-col gap-2">
                  {allStudents.map((student) => {
                    const isActive = currentMockStudent?.studentId === student.studentId;
                    return (
                      <button
                        key={student.studentId}
                        type="button"
                        disabled={isActive}
                        onClick={() => {
                          loginMockStudent(student.studentId);
                          window.location.reload();
                        }}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                          isActive
                            ? "border-[#111111] bg-[#111111] text-white cursor-default"
                            : "border-[#E5E5E5] bg-white text-[#111111] hover:border-[#999999] hover:shadow-sm"
                        }`}
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isActive ? "bg-white/20 text-white" : "bg-[#F7F7F8] text-[#111111]"}`}>
                          {student.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`font-semibold ${isActive ? "text-white" : "text-[#111111]"}`}>{student.fullName}</div>
                          <div className={`truncate text-xs ${isActive ? "text-white/70" : "text-[#666666]"}`}>{student.email}</div>
                        </div>
                        {isActive && <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Current</span>}
                        {!student.profileCompleted && !isActive && <span className="rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#D97706]">New</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Session Actions */}
              <div className={`rounded-[24px] border p-6 shadow-[0_12px_30px_rgba(17,17,17,0.035)] md:p-8 ${theme === "Dark" ? "border-white/10 bg-[#202329] text-white" : "border-[#E5E5E5] bg-white"}`}>
                <div className="mb-6">
                  <div className="mb-2 flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#D97706]"><Shield size={13} /> Session</div>
                  <h2 className="font-serif text-3xl tracking-tight text-[#111111]">Account actions</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl border border-[#E5E5E5] p-5">
                    <div>
                      <div className="font-sans text-sm font-semibold">Sign out</div>
                      <div className="mt-1 font-sans text-xs text-[#777777]">End your session and return to the course library.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        logoutMockStudent();
                        router.push("/courses");
                      }}
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-sans text-xs font-semibold text-[#E11D48] hover:bg-[#FFF1F2]"
                    >
                      <LogOut size={13} /> Sign out
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-[#E5E5E5] p-5">
                    <div>
                      <div className="font-sans text-sm font-semibold">Reset local progress</div>
                      <div className="mt-1 font-sans text-xs text-[#777777]">Clears current student&apos;s progress data only. Content and other students are not affected.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { resetStudentProgress(); showNotice("Local progress cleared."); }}
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-sans text-xs font-semibold text-[#E11D48] hover:bg-[#FFF1F2]"
                    >
                      <LogOut size={13} /> Reset progress
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {notice ? <div role="status" className="fixed bottom-6 right-6 z-50 rounded-full bg-[#111111] px-5 py-3 font-sans text-sm font-semibold text-white shadow-xl">{notice}</div> : null}
        </motion.div>

      </div>
        </div>
      </div>
  );
}
