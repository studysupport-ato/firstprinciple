"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Layers,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listMockStudents, loginMockStudent, MockStudent } from "@/lib/auth/mock";

type AuthView = "select" | "success";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthModal({
  open,
  onClose,
  redirectTo,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  initialView?: AuthView;
  redirectTo?: string;
  onSuccess?: (destination: string) => void;
}) {
  const router = useRouter();
  const [view, setView] = useState<AuthView>("select");
  const [selectedStudent, setSelectedStudent] = useState<MockStudent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const students = listMockStudents();

  useEffect(() => {
    if (open) {
      setView("select");
      setSelectedStudent(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSelectStudent = async (student: MockStudent) => {
    setSelectedStudent(student);
    setIsSubmitting(true);
    await wait(900);
    loginMockStudent(student.studentId);
    setView("success");
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (view !== "success") return;
    const destination = redirectTo ?? "/courses?onboarding=true";
    const timeout = window.setTimeout(() => {
      onClose();
      onSuccess?.(destination);
      if (destination === "/courses?onboarding=true") {
        window.location.assign(destination);
      } else {
        router.push(destination);
        router.refresh();
      }
    }, 1400);
    return () => window.clearTimeout(timeout);
  }, [view, onClose, router, redirectTo, onSuccess]);

  const handleClose = () => {
    onClose();
    setView("select");
    setSelectedStudent(null);
    setIsSubmitting(false);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="auth-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 cursor-pointer bg-[radial-gradient(120%_120%_at_50%_0%,rgba(17,17,17,0.42),rgba(17,17,17,0.6)_85%)] backdrop-blur-[6px]"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[820px]"
          >
            <div className="rounded-[30px] bg-gradient-to-b from-white/70 via-white/15 to-white/5 p-px shadow-[0_60px_140px_-40px_rgba(0,0,0,0.75)]">
              <div className="relative overflow-hidden rounded-[30px] bg-white" style={{ height: "min(560px, 90vh)" }}>
                <div className="pointer-events-none absolute inset-0 z-20 rounded-[30px] ring-1 ring-inset ring-white/10" />
                <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-40 bg-[radial-gradient(90%_100%_at_50%_0%,rgba(37,99,235,0.06),transparent_70%)]" />

                <button
                  type="button"
                  onClick={handleClose}
                  className="absolute right-5 top-5 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E5E5] bg-white/90 text-[#111111] shadow-sm backdrop-blur transition-all duration-200 hover:scale-105 hover:border-[#111111] active:scale-95"
                  aria-label="Close authentication panel"
                >
                  <X size={16} />
                </button>

                <div className="grid h-full lg:grid-cols-[1fr_1.1fr]">
                  {/* Left · Brand panel */}
                  <div className="relative hidden min-h-full overflow-hidden bg-[#0E0E10] lg:block">
                    <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_20%_0%,rgba(37,99,235,0.38),transparent_60%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_90%_100%,rgba(225,29,72,0.16),transparent_60%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_50%,rgba(79,70,229,0.12),transparent_65%)]" />
                    <div
                      className="absolute inset-0 opacity-[0.05]"
                      style={{
                        backgroundImage:
                          "linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)",
                        backgroundSize: "44px 44px",
                      }}
                    />
                    <div className="pointer-events-none absolute -right-8 top-8 select-none">
                      <span className="font-serif text-9xl leading-none text-white/[0.05]">∑</span>
                    </div>

                    <div className="relative z-10 flex h-full flex-col p-10 lg:p-12">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/95 text-[11px] font-black tracking-tight text-[#0E0E10] shadow-lg">
                          FP
                        </div>
                        <div>
                          <div className="text-sm font-serif font-medium tracking-tight text-white">
                            Back2Basics with Kwamina
                          </div>
                          <div className="text-[10px] font-sans font-semibold uppercase tracking-[0.28em] text-white/40">
                            Mathematics
                          </div>
                        </div>
                      </div>

                      <div className="mt-10">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 backdrop-blur">
                          <Sparkles size={13} className="text-[#8AB4FF]" />
                          <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.22em] text-white/70">
                            Master the foundations
                          </span>
                        </div>
                        <h2 className="font-serif text-[40px] leading-[1.05] tracking-tight text-white">
                          Every idea.
                          <br />
                          Built{" "}
                          <span className="bg-gradient-to-r from-[#8AB4FF] via-white to-[#F6A8C0] bg-clip-text text-transparent">
                            from scratch.
                          </span>
                        </h2>
                        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/55">
                          Learn mathematics the way it was discovered — one logical step at a time, no hand-waving.
                        </p>
                      </div>

                      <div className="mt-10">
                        <div className="mb-3 flex items-center justify-between text-[10px] font-sans font-bold uppercase tracking-[0.24em] text-white/35">
                          <span>Current focus</span>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-white/60">MATH 151</span>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
                          <div className="flex items-baseline gap-2.5 font-serif text-4xl tracking-tight text-white">
                            <span className="text-[#8AB4FF]">x²</span>
                            <span className="text-white/40">+</span>
                            <span className="text-[#4cc38a]">y²</span>
                            <span className="text-white/40">=</span>
                            <span className="bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">r²</span>
                          </div>
                          <div className="mt-4 h-px w-full bg-gradient-to-r from-white/15 via-white/5 to-transparent" />
                          <div className="mt-4 flex items-center justify-between text-xs text-white/45">
                            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#8AB4FF]" />Trigonometry</span>
                            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#4cc38a]" />Unit circle</span>
                            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#F6A8C0]" />Complex plane</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
                        <div>
                          <div className="font-serif text-2xl text-white">12k+</div>
                          <div className="text-[11px] font-sans uppercase tracking-[0.14em] text-white/40">Learners</div>
                        </div>
                        <div>
                          <div className="font-serif text-2xl text-white">4.9★</div>
                          <div className="text-[11px] font-sans uppercase tracking-[0.14em] text-white/40">Rated</div>
                        </div>
                        <div>
                          <div className="font-serif text-2xl text-white">∞</div>
                          <div className="text-[11px] font-sans uppercase tracking-[0.14em] text-white/40">Repetition</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right · Account selector / Success panel */}
                  <div className="relative flex min-h-full overflow-y-auto bg-[#FBFAF9] p-6 sm:p-10 lg:p-12">
                    <motion.div
                      key={view}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                      className="mx-auto my-auto w-full max-w-[420px]"
                    >
                      {view === "success" ? (
                        <div className="space-y-7 text-center">
                          <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#059669] to-[#10B981] opacity-15 blur-md" />
                            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-[0_20px_45px_-15px_rgba(16,185,129,0.6)]">
                              <CheckCircle2 size={30} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.24em] text-[#059669]">Access granted</p>
                            <h2 id="auth-modal-title" className="font-serif text-4xl tracking-tight text-[#111111]">
                              Welcome, {selectedStudent?.fullName?.split(" ")[0]}.
                            </h2>
                          </div>
                          <p className="text-base text-[#666666]">Opening your learning workspace.</p>
                          <div className="overflow-hidden rounded-full bg-[#EDEDEC] p-1">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 1.4, ease: "easeInOut" }}
                              className="h-2 rounded-full bg-gradient-to-r from-[#0E0E10] to-[#2563EB]"
                            />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4 text-left shadow-sm">
                              <div className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-[0.18em] text-[#666666]">
                                <Layers size={13} className="text-[#2563EB]" /> Course
                              </div>
                              <div className="mt-3 font-serif text-2xl text-[#111111]">MATH 151</div>
                            </div>
                            <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4 text-left shadow-sm">
                              <div className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-[0.18em] text-[#666666]">
                                <TrendingUp size={13} className="text-[#059669]" /> Learning
                              </div>
                              <div className="mt-3 font-serif text-2xl text-[#111111]">In progress</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.24em] text-[#9a9a9a]">
                              Back2Basics with Kwamina
                            </p>
                            <h2 id="auth-modal-title" className="font-serif text-[34px] leading-tight tracking-tight text-[#111111]">
                              Continue as
                            </h2>
                            <p className="text-[15px] text-[#666666]">Select your demo student account to continue.</p>
                          </div>

                          <div className="flex flex-col gap-3">
                            {students.map((student) => {
                              const isSelected = selectedStudent?.studentId === student.studentId;
                              return (
                                <button
                                  key={student.studentId}
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={() => handleSelectStudent(student)}
                                  className={`flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] disabled:opacity-60 disabled:cursor-not-allowed ${
                                    isSelected
                                      ? "border-[#111111] bg-[#111111] text-white shadow-[0_8px_20px_rgba(17,17,17,0.18)]"
                                      : "border-[#E5E5E5] bg-white hover:border-[#999999] hover:shadow-sm"
                                  }`}
                                >
                                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isSelected ? "bg-white/20 text-white" : "bg-[#F7F7F8] text-[#111111]"}`}>
                                    {student.fullName.charAt(0)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className={`font-sans text-sm font-semibold ${isSelected ? "text-white" : "text-[#111111]"}`}>
                                      {student.fullName}
                                    </div>
                                    <div className={`truncate font-sans text-xs ${isSelected ? "text-white/70" : "text-[#666666]"}`}>
                                      {student.email}
                                    </div>
                                  </div>
                                  {isSelected && isSubmitting && (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                  )}
                                  {!student.profileCompleted && (
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isSelected ? "bg-white/15 text-white/80" : "bg-[#FFF7ED] text-[#D97706]"}`}>
                                      New
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          <p className="text-center text-xs text-[#999999]">
                            These are demo accounts for exploring the platform.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}