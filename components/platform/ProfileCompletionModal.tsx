"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, UserRound, Phone, Mail } from "lucide-react";
import { usePathname } from "next/navigation";
import { getStudentProfile, saveStudentProfile } from "@/lib/student/profileRepository";
import { getActiveStudentId, getCurrentMockStudent } from "@/lib/auth/mock";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useAuthSession } from "@/lib/auth/useAuthSession";

const TOUR_KEY = "first-principles-onboarding-v1";

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
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  
  const [errors, setErrors] = useState<{ fullName?: string; phoneNumber?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false); // temporary session dismiss

  const pathname = usePathname();
  const { authenticated, student } = useAuthSession();

  useEffect(() => {
    // Only check on client
    if (pathname !== "/courses") return;
    if (authenticated !== true) return;
    if (hasDismissed) return;

    // Use student-aware onboarding key
    const currentTourKey = student ? `${TOUR_KEY}:${student.studentId}` : TOUR_KEY;
    const isTourCompleted = localStorage.getItem(currentTourKey) === "true";
    const profile = getStudentProfile();

    if (isTourCompleted && !profile) {
      // Delay slightly so it doesn't instantly flash after tour closes
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [pathname, authenticated, hasDismissed, student]);

  useEffect(() => {
    // Try email from mock student first, then Supabase if configured
    if (isVisible && !email) {
      const mockStudent = getCurrentMockStudent();
      if (mockStudent?.email) {
        setEmail(mockStudent.email);
        return;
      }
      if (isSupabaseConfigured()) {
        const supabase = createSupabaseBrowserClient();
        supabase.auth.getSession().then(({ data }) => {
          if (data.session?.user?.email) {
            setEmail(data.session.user.email);
          }
        });
      }
    }
  }, [isVisible, email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const nextErrors: typeof errors = {};
    if (!fullName.trim()) {
      nextErrors.fullName = "Please enter your full name.";
    }
    
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
    
    const now = new Date().toISOString();
    const activeStudentId = getActiveStudentId();
    // Pre-fill email from the mock student if not already loaded from Supabase
    const resolvedEmail = email ?? getCurrentMockStudent()?.email ?? null;
    saveStudentProfile({
      studentId: activeStudentId,
      fullName: fullName.trim(),
      phoneNumber: normalizedPhone,
      email: resolvedEmail,
      profileCompleted: true,
      createdAt: now,
      updatedAt: now,
    });

    // Briefly show success state then close
    setTimeout(() => {
      setIsVisible(false);
      setIsSubmitting(false);
    }, 400);
  };

  const handleDismiss = () => {
    setHasDismissed(true);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-[#FFFBF5]/90 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleDismiss}
          />

          {/* Modal Content */}
          <motion.div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-[0_20px_40px_rgba(17,17,17,0.08)] border border-[#E5E5E5] overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-labelledby="profile-modal-title"
          >
            <div className="p-8 md:p-10">
              <button
                type="button"
                onClick={handleDismiss}
                className="absolute top-6 right-6 p-2 rounded-full text-[#999999] hover:bg-[#F7F7F8] hover:text-[#111111] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C96B2D]"
                aria-label="Close profile setup"
              >
                <X size={18} />
              </button>

              <div className="mb-8">
                <h2 id="profile-modal-title" className="font-serif text-3xl text-[#111111] mb-3">
                  Complete your profile
                </h2>
                <p className="font-sans text-sm text-[#666666] leading-relaxed">
                  Just a few details so we know who we&apos;re helping. This helps us support you during your learning journey.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="fullName" className="text-xs font-bold uppercase tracking-widest text-[#777777]">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#999999]">
                      <UserRound size={16} />
                    </div>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (errors.fullName) setErrors({ ...errors, fullName: undefined });
                      }}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.fullName ? "border-[#E11D48] bg-[#E11D48]/5" : "border-[#E5E5E5] bg-white"} text-sm text-[#111111] placeholder-[#999999] focus:outline-none focus:border-[#C96B2D] focus:ring-1 focus:ring-[#C96B2D] transition-all`}
                      placeholder="e.g. Kwame Boateng"
                    />
                  </div>
                  {errors.fullName && (
                    <span className="text-xs font-medium text-[#E11D48] ml-1">{errors.fullName}</span>
                  )}
                </div>

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
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.phoneNumber ? "border-[#E11D48] bg-[#E11D48]/5" : "border-[#E5E5E5] bg-white"} text-sm text-[#111111] placeholder-[#999999] focus:outline-none focus:border-[#C96B2D] focus:ring-1 focus:ring-[#C96B2D] transition-all`}
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

                {email && (
                  <div className="flex flex-col gap-1.5 opacity-70 cursor-not-allowed">
                    <label htmlFor="emailDisplay" className="text-xs font-bold uppercase tracking-widest text-[#777777]">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#999999]">
                        <Mail size={16} />
                      </div>
                      <input
                        id="emailDisplay"
                        type="text"
                        value={email}
                        readOnly
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] text-sm text-[#666666] cursor-not-allowed"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-[#111111] hover:bg-[#C96B2D] text-white text-sm font-sans font-semibold py-3.5 rounded-xl transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C96B2D] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      "Saving..."
                    ) : (
                      <>
                        Save profile <CheckCircle2 size={16} />
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
