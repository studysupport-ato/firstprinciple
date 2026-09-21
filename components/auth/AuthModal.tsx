"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Layers,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";

type AuthView = "signin" | "signup" | "forgot" | "success";
type AuthAction = AuthView | "google";

type AuthFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type FormErrors = Partial<Record<keyof AuthFormValues | "general", string>>;

const initialValues: AuthFormValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function mockAuthRequest(view: AuthAction, values: AuthFormValues) {
  if (view === "google") {
    await wait(1200);
    return;
  }

  await wait(1200);

  if (view === "signin") {
    if (!values.email || !values.password) {
      throw new Error("Please provide both your email and password.");
    }
    return;
  }

  if (view === "signup") {
    if (!values.name || !values.email || !values.password || !values.confirmPassword) {
      throw new Error("Please complete every field to create your account.");
    }
    if (values.password !== values.confirmPassword) {
      throw new Error("The passwords do not match.");
    }
    return;
  }

  if (view === "forgot") {
    if (!values.email) {
      throw new Error("Please enter the email address for your account.");
    }
    return;
  }
}

function getHeading(view: AuthView) {
  switch (view) {
    case "signin":
      return "Welcome back";
    case "signup":
      return "Create your account";
    case "forgot":
      return "Reset your password";
    case "success":
      return "You're in";
    default:
      return "Welcome back";
  }
}

function getSubheading(view: AuthView) {
  switch (view) {
    case "signin":
      return "Continue your learning journey.";
    case "signup":
      return "Start building your Back2Basics with Kwamina learning journey.";
    case "forgot":
      return "Enter your email and we'll help you get back in.";
    case "success":
      return "Preparing your study space and opening your learning dashboard.";
    default:
      return "Continue your learning journey.";
  }
}
export function AuthModal({
  open,
  onClose,
  initialView = "signin",
  redirectTo,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  initialView?: AuthView;
  /** If provided, router.push is called with this path after successful auth instead of /dashboard. */
  redirectTo?: string;
  /** Optional callback fired immediately before navigation so callers can react. */
  onSuccess?: (destination: string) => void;
}) {
  const router = useRouter();
  const [view, setView] = useState<AuthView>(initialView);
  const [values, setValues] = useState<AuthFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setView(initialView);
      setValues(initialValues);
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open, initialView]);

  const updateField = (field: keyof AuthFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, general: undefined }));
  };

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (view === "signup") {
      if (!values.name.trim()) nextErrors.name = "Please add your name.";
      if (!values.email.trim()) nextErrors.email = "Email is required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) nextErrors.email = "Enter a valid email.";
      if (!values.password) nextErrors.password = "Choose a password.";
      else if (values.password.length < 8) nextErrors.password = "Use at least 8 characters.";
      if (!values.confirmPassword) nextErrors.confirmPassword = "Confirm your password.";
      else if (values.confirmPassword !== values.password) nextErrors.confirmPassword = "Passwords must match.";
    }

    if (view === "signin" || view === "forgot") {
      if (view === "signin") {
        if (!values.email.trim()) nextErrors.email = "Email is required.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) nextErrors.email = "Enter a valid email.";
        if (!values.password) nextErrors.password = "Password is required.";
      }

      if (view === "forgot") {
        if (!values.email.trim()) nextErrors.email = "Email is required.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) nextErrors.email = "Enter a valid email.";
      }
    }

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await mockAuthRequest(view, values);
      setView("success");
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setIsSubmitting(true);
    setErrors({});
    try {
      await mockAuthRequest("google", values);
      setView("success");
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : "Google sign-in is unavailable right now." });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (view !== "success") return;

    const timeout = window.setTimeout(() => {
      const destination = redirectTo ?? "/courses?onboarding=true";
      onClose();
      onSuccess?.(destination);
      router.push(destination);
    }, 1400);

    return () => window.clearTimeout(timeout);
  }, [view, onClose, router, redirectTo, onSuccess]);

  const handleClose = () => {
    onClose();
    setView(initialView);
    setValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
  };

  const showNameField = view === "signup";
  const showPasswordField = view !== "forgot";

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
            className="relative w-full max-w-[1080px]"
          >
            <div className="rounded-[30px] bg-gradient-to-b from-white/70 via-white/15 to-white/5 p-px shadow-[0_60px_140px_-40px_rgba(0,0,0,0.75)]">
              <div className="relative overflow-hidden rounded-[30px] bg-white" style={{ height: "620px" }}>
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
{/* Focus card */}
                      <div className="mt-10">
                        <div className="mb-3 flex items-center justify-between text-[10px] font-sans font-bold uppercase tracking-[0.24em] text-white/35">
                          <span>Current focus</span>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-white/60">
                            MATH 151
                          </span>
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
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#8AB4FF]" />
                              Trigonometry
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#4cc38a]" />
                              Unit circle
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#F6A8C0]" />
                              Complex plane
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="mt-auto grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-white/50">
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

                  {/* Right · Form panel */}
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
                            <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.24em] text-[#059669]">
                              Access granted
                            </p>
                            <h2 id="auth-modal-title" className="font-serif text-4xl tracking-tight text-[#111111]">
                              Welcome to Back2Basics with Kwamina.
                            </h2>
                          </div>

                          <p className="text-base text-[#666666]">
                            Preparing your study environment and opening your learning workspace.
                          </p>

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
                                <TrendingUp size={13} className="text-[#059669]" /> Progress
                              </div>
                              <div className="mt-3 font-serif text-2xl text-[#111111]">42%</div>
                            </div>
                          </div>

                          <AuthButton
                            variant="primary"
                            className="w-full"
                            onClick={handleClose}
                          >
                            Continue to learning
                          </AuthButton>
                        </div>
                      ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                          <div className="mb-2 flex items-center justify-between">
                            {view !== "signin" && view !== "signup" ? (
                              <button
                                type="button"
                                onClick={() => setView("signin")}
                                className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-[#666666] transition-colors hover:border-[#111111] hover:text-[#111111]"
                              >
                                <ArrowLeft size={12} />
                                Back
                              </button>
                            ) : (
                              <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.24em] text-[#9a9a9a]">
                                Back2Basics with Kwamina
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <h2 id="auth-modal-title" className="font-serif text-[34px] leading-tight tracking-tight text-[#111111]">
                              {getHeading(view)}
                            </h2>
                            <p className="text-[15px] text-[#666666]">{getSubheading(view)}</p>
                          </div>
{errors.general ? (
                            <div
                              role="alert"
                              className="flex items-start gap-3 rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]"
                            >
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F59E0B] text-[11px] font-bold text-white">
                                !
                              </span>
                              {errors.general}
                            </div>
                          ) : null}

                          {showNameField ? (
                            <AuthInput
                              label="Name"
                              name="name"
                              value={values.name}
                              onChange={(event) => updateField("name", event.target.value)}
                              error={errors.name}
                              icon={<UserRound size={16} />}
                              autoComplete="name"
                              placeholder="Kwame Boateng"
                            />
                          ) : null}

                          <AuthInput
                            label="Email"
                            name="email"
                            type="email"
                            value={values.email}
                            onChange={(event) => updateField("email", event.target.value)}
                            error={errors.email}
                            icon={<Mail size={16} />}
                            autoComplete="email"
                            placeholder="you@back2basics.edu"
                          />

                          {showPasswordField ? (
                            <AuthInput
                              label="Password"
                              name="password"
                              type="password"
                              value={values.password}
                              onChange={(event) => updateField("password", event.target.value)}
                              error={errors.password}
                              icon={<Lock size={16} />}
                              autoComplete={view === "signin" ? "current-password" : "new-password"}
                              placeholder={view === "signin" ? "Enter your password" : "Create a secure password"}
                            />
                          ) : null}

                          {view === "signup" ? (
                            <AuthInput
                              label="Confirm password"
                              name="confirmPassword"
                              type="password"
                              value={values.confirmPassword}
                              onChange={(event) => updateField("confirmPassword", event.target.value)}
                              error={errors.confirmPassword}
                              icon={<Lock size={16} />}
                              autoComplete="new-password"
                              placeholder="Re-enter your password"
                            />
                          ) : null}

                          {view === "signin" ? (
                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setValues((current) => ({ ...current, password: "" }));
                                  setErrors({});
                                  setView("forgot");
                                }}
                                className="text-xs font-sans font-semibold text-[#666666] transition-colors hover:text-[#2563EB]"
                              >
                                Forgot password?
                              </button>
                            </div>
                          ) : null}
<AuthButton
                            type="submit"
                            variant="primary"
                            isLoading={isSubmitting}
                            className="w-full"
                          >
                            {view === "signin"
                              ? "Sign in"
                              : view === "signup"
                                ? "Create account"
                                : "Send reset link"}
                          </AuthButton>

                          <div className="flex items-center gap-4 py-1">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#E5E5E5] to-[#E5E5E5]" />
                            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.24em] text-[#9a9a9a]">
                              or
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#E5E5E5] to-[#E5E5E5]" />
                          </div>

                          <AuthButton
                            type="button"
                            variant="secondary"
                            isLoading={isSubmitting}
                            className="w-full justify-center border-[#E5E5E5] bg-white hover:bg-[#F7F7F8]"
                            onClick={handleGoogle}
                          >
                            <span className="flex items-center gap-3">
                              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  fill="#4285F4"
                                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
                                />
                                <path
                                  fill="#34A853"
                                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
                                />
                                <path
                                  fill="#FBBC05"
                                  d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84Z"
                                />
                                <path
                                  fill="#EA4335"
                                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
                                />
                              </svg>
                              <span className="text-[#111111]">Continue with Google</span>
                            </span>
                          </AuthButton>

                          <p className="pt-2 text-center text-sm text-[#666666]">
                            {view === "signin" ? "Don't have an account? " : "Already have an account? "}
                            <button
                              type="button"
                              onClick={() => {
                                setErrors({});
                                setView(view === "signin" ? "signup" : "signin");
                              }}
                              className="font-semibold text-[#111111] underline decoration-[#111111]/20 underline-offset-4 transition-colors hover:text-[#2563EB] hover:decoration-[#2563EB]/40"
                            >
                              {view === "signin" ? "Create account" : "Sign in"}
                            </button>
                          </p>

                          {view === "forgot" ? (
                            <button
                              type="button"
                              onClick={() => setView("signin")}
                              className="mx-auto mt-1 flex items-center gap-2 text-sm font-medium text-[#666666] transition-colors hover:text-[#111111]"
                            >
                              <ArrowLeft size={14} />
                              Back to sign in
                            </button>
                          ) : null}

                          <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-[#9a9a9a]">
                            <ShieldCheck size={13} className="text-[#666666]" />
                            Protected by Back2Basics with Kwamina security
                          </div>
                        </form>
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