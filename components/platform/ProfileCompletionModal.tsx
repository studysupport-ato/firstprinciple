"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Phone } from "lucide-react";
import { usePathname } from "next/navigation";
import { getStudentProfile, saveStudentProfile as saveLocalProfile } from "@/lib/student/profileRepository";
import { saveSupabaseStudentProfile, getSupabaseStudentProfile } from "@/lib/student/supabaseProfileRepository";
import { resolveAuthenticatedReadStudentId } from "@/lib/student/readIdentity";
import { getActiveStudentId, getCurrentMockStudent } from "@/lib/auth/mock";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthSession } from "@/lib/auth/useAuthSession";

function getProfilePromptKey(userId?: string) {
  return userId ? `first-principles-profile-prompt-v1:${userId}` : "first-principles-profile-prompt-v1";
}

function getTourKey(userId: string) {
  return `first-principles-onboarding-v1:${userId}`;
}

function validateGhanaPhoneNumber(phone: string): boolean {
  // Matches local format (e.g. 0241234567) or international format (e.g. +233241234567)
  // Must be 10 digits starting with 0, or 13 chars starting with +233
  const cleaned = phone.replace(/\s+/g, "");
  return /^0\d{9}$/.test(cleaned) || /^\+233\d{9}$/.test(cleaned);
}

function normalizeGhanaPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.startsWith("+233")) {
    return "0" + cleaned.slice(4);
  }
  return cleaned;
}

export function ProfileCompletionModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  
  const [errors, setErrors] = useState<{ phoneNumber?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);

  const pathname = usePathname();
  const { authenticated, user, student } = useAuthSession();

  useEffect(() => {
    if (!user) {
      setTourCompleted(false);
      return;
    }

    const syncTourState = () => {
      setTourCompleted(localStorage.getItem(getTourKey(user.id)) === "true");
    };
    syncTourState();
    window.addEventListener("onboarding-tour-completed", syncTourState);
    return () => window.removeEventListener("onboarding-tour-completed", syncTourState);
  }, [user]);

  useEffect(() => {
    if (pathname !== "/courses") return;
    if (authenticated !== true) return;
    if (!user || !tourCompleted) return;
    let cancelled = false;

    const promptKey = getProfilePromptKey(user?.id);
    const shouldPrompt = localStorage.getItem(promptKey) === "true";

    void (async () => {
      try {
        const studentId = await resolveAuthenticatedReadStudentId();
        const profile = studentId
          ? await getSupabaseStudentProfile(createSupabaseBrowserClient(), studentId)
          : getStudentProfile();
        const completed = Boolean(profile?.phoneNumber.trim());
        if (cancelled) return;

        if (shouldPrompt && !completed) {
          const timer = setTimeout(() => {
            setIsVisible(true);
          }, 600);
          return () => clearTimeout(timer);
        }

        if (completed) {
          localStorage.removeItem(promptKey);
        }
      } catch (error) {
        console.error("[Back2Basics with Kwamina] Failed to check profile completion", error);
        if (!cancelled && shouldPrompt) setIsVisible(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, authenticated, tourCompleted, user]);

  const handleSubmit = (e: React.FormEvent) => {
    void handleSubmitAsync(e);
  };

  const handleSubmitAsync = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const nextErrors: typeof errors = {};
    if (!phoneNumber.trim()) {
      nextErrors.phoneNumber = "Please enter your phone number.";
    } else if (!validateGhanaPhoneNumber(phoneNumber)) {
      nextErrors.phoneNumber = "Please enter a valid Ghana phone number (e.g. 024...).";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    
    // Normalize phone
    const normalizedPhone = normalizeGhanaPhoneNumber(phoneNumber);

    // Resolve the existing student record; signup already captured and saved
    // the student's name. This prompt only collects the missing phone number.
    if (authenticated === true) {
      try {
        const client = createSupabaseBrowserClient();
        const studentId = await resolveAuthenticatedReadStudentId();
        if (!studentId) {
          setErrors({ phoneNumber: "Could not resolve your student account. Please sign in again." });
          setIsSubmitting(false);
          return;
        }

        const savedProfile = await saveSupabaseStudentProfile(client, studentId, { phoneNumber: normalizedPhone });
        saveLocalProfile({
          studentId,
          fullName: savedProfile.fullName,
          phoneNumber: normalizedPhone,
          email: savedProfile.email ?? user?.email ?? null,
          profileCompleted: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (profileError) {
        setErrors({ phoneNumber: profileError instanceof Error ? profileError.message : "Could not save your phone number." });
        setIsSubmitting(false);
        return;
      }
    } else {
      // No Supabase session: explicit demo/local mode only.
      saveLocalProfile({
        studentId: getActiveStudentId(),
        fullName: student?.displayName ?? getCurrentMockStudent()?.fullName ?? "",
        phoneNumber: normalizedPhone,
        email: user?.email ?? getCurrentMockStudent()?.email ?? null,
        profileCompleted: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (user?.id) {
      localStorage.removeItem(getProfilePromptKey(user.id));
    }

    // Same contract as the Settings save path: tell useAuthSession to drop its
    // module cache and re-read students.display_name so the dashboard greeting
    // reflects the just-saved canonical name without a full page reload.
    window.dispatchEvent(new CustomEvent("profile-updated"));

    // Briefly show success state then close
    setTimeout(() => {
      setIsVisible(false);
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-transparent/90 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Modal Content */}
          <motion.div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-[0_20px_40px_rgba(17,17,17,0.08)] border border-[#E5E5E5] overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
          >
            <div className="p-8 md:p-10">
              <div className="mb-8">
                <h2 id="profile-modal-title" className="font-serif text-3xl text-[#111111] mb-3">One last thing</h2>
                <p className="font-sans text-sm text-[#666666] leading-relaxed">
                  Your name is already on your account. Add a phone number so we can provide student support and course updates.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="phoneNumber" className="text-xs font-bold uppercase tracking-widest text-[#777777]">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#999999]">
                      <Phone size={16} />
                    </div>
                    <input
                      id="phoneNumber"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: undefined });
                      }}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.phoneNumber ? "border-[#E11D48] bg-[#E11D48]/5" : "border-[#E5E5E5] bg-white"} text-sm text-[#111111] placeholder-[#999999] focus:outline-none focus:border-[#FFBE00] focus:ring-1 focus:ring-[#FFBE00] transition-all`}
                      placeholder="e.g. 0241234567"
                    />
                  </div>
                  {errors.phoneNumber && (
                    <span className="text-xs font-medium text-[#E11D48] ml-1">{errors.phoneNumber}</span>
                  )}
                  <p className="text-[10px] text-[#999999] mt-0.5 ml-1">
                    Used strictly for student support and course updates.
                  </p>
                </div>

                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-[#111111] hover:bg-[#FFBE00] text-white text-sm font-sans font-semibold py-3.5 rounded-xl transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FFBE00] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      "Saving..."
                    ) : (
                      <>
                        Save phone number <CheckCircle2 size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
