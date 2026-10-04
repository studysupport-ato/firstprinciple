"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Layers, Sparkles, TrendingUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/branding/BrandLogo";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";
type AuthState = {
  email: string;
  password: string;
  confirmPassword: string;
};

const defaultAuthState: AuthState = {
  email: "",
  password: "",
  confirmPassword: "",
};

function parseFriendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();

  if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
    return "Incorrect email or password. Please try again.";
  }

  if (message.includes("already registered") || message.includes("user already")) {
    return "An account with this email already exists. Please log in instead.";
  }

  if (message.includes("signup is disabled") || message.includes("signups are disabled")) {
    return "New signups are temporarily disabled. Please try again later.";
  }

  if (message.includes("email") && message.includes("valid")) {
    return "Please provide a valid email address.";
  }

  if (message.includes("password") && (message.includes("at least") || message.includes("minimum") || message.includes("too short"))) {
    return "Password must be at least 8 characters long.";
  }

  if (message.includes("network") || message.includes("fetch")) {
    return "We could not reach the authentication service. Please try again.";
  }

  return "Something went wrong while authenticating. Please try again.";
}

export function AuthModal({
  open,
  onClose,
  redirectTo,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  initialView?: "login" | "signup";
  redirectTo?: string;
  onSuccess?: (destination: string) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<AuthState>(defaultAuthState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode("login");
    setForm(defaultAuthState);
    setError(null);
    setStatusMessage(null);
    setIsSubmitting(false);
  }, [open]);

  const destination = redirectTo ?? "/courses?onboarding=true";

  const finishLoginFlow = () => {
    onClose();
    onSuccess?.(destination);

    if (destination === "/courses?onboarding=true") {
      window.location.assign(destination);
      return;
    }

    router.push(destination);
    router.refresh();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatusMessage(null);

    const email = form.email.trim();
    const password = form.password;

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please provide a valid email address.");
      return;
    }

    if (mode === "signup") {
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }

      if (password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "login") {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (!data.session) {
          throw new Error("Unable to establish an authenticated session.");
        }

        setStatusMessage("Signing you in...");
        setTimeout(() => finishLoginFlow(), 350);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;

      if (data.session) {
        setStatusMessage("Account created. Redirecting...");
        setTimeout(() => finishLoginFlow(), 350);
        return;
      }

      setStatusMessage("Check your email to confirm your account before logging in.");
      setMode("login");
      setForm({ ...defaultAuthState, email });
    } catch (caughtError) {
      setError(parseFriendlyAuthError(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setForm(defaultAuthState);
    setStatusMessage(null);
    setError(null);
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
                      <BrandLogo className="h-14 w-64 rounded-lg shadow-lg" priority />

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

                  <div className="relative flex min-h-full overflow-y-auto bg-[#FBFAF9] p-6 sm:p-10 lg:p-12">
                    <motion.div
                      key={mode}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                      className="mx-auto my-auto w-full max-w-[420px]"
                    >
                      <div className="space-y-6">
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.24em] text-[#9a9a9a]">
                            Back2Basics with Kwamina
                          </p>
                          <h2 id="auth-modal-title" className="font-serif text-[34px] leading-tight tracking-tight text-[#111111]">
                            {mode === "login" ? "Welcome back" : "Create account"}
                          </h2>
                          <p className="text-[15px] text-[#666666]">
                            {mode === "login"
                              ? "Use your email and password to access your learning space."
                              : "Create a dedicated student account using real Supabase Auth."}
                          </p>
                        </div>

                        <div className="mb-4 flex rounded-full border border-[#E5E5E5] bg-[#F5F5F4] p-1">
                          <button
                            type="button"
                            onClick={() => setMode("login")}
                            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${mode === "login" ? "bg-[#111111] text-white shadow-sm" : "text-[#666666]"}`}
                          >
                            Login
                          </button>
                          <button
                            type="button"
                            onClick={() => setMode("signup")}
                            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${mode === "signup" ? "bg-[#111111] text-white shadow-sm" : "text-[#666666]"}`}
                          >
                            Sign up
                          </button>
                        </div>

                        <form className="space-y-4" onSubmit={handleSubmit}>
                          <div className="space-y-2">
                            <label htmlFor="auth-email" className="text-[11px] font-sans font-bold uppercase tracking-[0.18em] text-[#666666]">
                              Email
                            </label>
                            <input
                              id="auth-email"
                              type="email"
                              value={form.email}
                              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3.5 py-3 text-sm text-[#111111] outline-none transition focus:border-[#111111]"
                              placeholder="you@example.com"
                              autoComplete="email"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="auth-password" className="text-[11px] font-sans font-bold uppercase tracking-[0.18em] text-[#666666]">
                              Password
                            </label>
                            <input
                              id="auth-password"
                              type="password"
                              value={form.password}
                              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                              className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3.5 py-3 text-sm text-[#111111] outline-none transition focus:border-[#111111]"
                              placeholder="Minimum 8 characters"
                              autoComplete={mode === "login" ? "current-password" : "new-password"}
                              required
                            />
                          </div>

                          {mode === "signup" ? (
                            <div className="space-y-2">
                              <label htmlFor="auth-confirm-password" className="text-[11px] font-sans font-bold uppercase tracking-[0.18em] text-[#666666]">
                                Confirm password
                              </label>
                              <input
                                id="auth-confirm-password"
                                type="password"
                                value={form.confirmPassword}
                                onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3.5 py-3 text-sm text-[#111111] outline-none transition focus:border-[#111111]"
                                placeholder="Repeat your password"
                                autoComplete="new-password"
                                required
                              />
                            </div>
                          ) : null}

                          {error ? (
                            <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#991B1B]">
                              {error}
                            </div>
                          ) : null}

                          {statusMessage ? (
                            <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-sm text-[#166534]">
                              {statusMessage}
                            </div>
                          ) : null}

                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full rounded-full bg-[#111111] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSubmitting
                              ? mode === "login"
                                ? "Signing in..."
                                : "Creating account..."
                              : mode === "login"
                                ? "Log in"
                                : "Create account"}
                          </button>
                        </form>

                        <div className="flex items-center justify-between gap-3 text-xs text-[#666666]">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              router.push("/reset-password");
                            }}
                            className="font-medium text-[#111111] underline-offset-2 hover:underline"
                          >
                            Forgot password?
                          </button>
                          <span>Secure student access</span>
                        </div>
                      </div>
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